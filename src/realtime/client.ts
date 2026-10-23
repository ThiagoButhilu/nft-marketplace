import type { QueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import {
  NftUpdatedEvent,
  OrderUpdatedEvent,
  SOCKET_EVENTS,
  SOCKET_PATH,
  type Cart,
  type FeaturedResponse,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
  type Order,
} from '@/api/contracts'
import { compareEth, formatEth } from '@/lib/eth'
import { notices } from '@/lib/notices'
import { sessionStore } from '@/lib/session-store'
import { queryKeys } from '@/queries/keys'
import { isTerminal, onOrderSettled } from '@/queries/orders'
import { realtimeStatus } from './status'

const SEEN_LIMIT = 500

/**
 * Socket.IO client. Owns one connection per session, applies events to the
 * TanStack Query cache and reconciles with REST after every reconnect.
 *
 * Ordering guarantees: events are dropped when their `id` was already seen
 * (duplicates) or their `version` is not newer than what the cache holds
 * (stale), so an old event can never roll back newer state.
 */
export class RealtimeClient {
  private socket: Socket | null = null
  private token: string | null | undefined = undefined
  private userId: string | null = null
  private seenIds = new Set<string>()
  private versions = new Map<string, number>()
  private hasConnected = false
  private unsubscribe: (() => void) | null = null
  private readonly queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  start() {
    this.unsubscribe = sessionStore.subscribe(() => this.syncSession())
    this.syncSession()
  }

  stop() {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.teardown()
    this.token = undefined
    realtimeStatus.set('idle')
  }

  /** Mainly for tests and debugging. */
  get connected() {
    return this.socket?.connected ?? false
  }

  private syncSession() {
    const token = sessionStore.getToken()
    if (token === this.token) return
    this.token = token
    this.userId = sessionStore.getUserId()
    this.connect()
  }

  private connect() {
    this.teardown()
    this.hasConnected = false
    realtimeStatus.set('connecting')

    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      // The mock reads the token from the query (see docs/api.md); a real
      // server would read `auth`.
      query: this.token ? { token: this.token } : {},
      auth: this.token ? { token: this.token } : {},
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
    })
    this.socket = socket

    socket.on('connect', () => {
      realtimeStatus.set('connected')
      if (this.hasConnected) this.reconcile()
      this.hasConnected = true
    })
    socket.on('disconnect', (reason) => {
      realtimeStatus.set(
        reason === 'io client disconnect' ? 'idle' : 'reconnecting',
      )
    })
    socket.on('connect_error', () => {
      realtimeStatus.set(socket.active ? 'reconnecting' : 'offline')
    })
    socket.on(SOCKET_EVENTS.nftUpdated, (payload: unknown) =>
      this.handleNftUpdated(payload),
    )
    socket.on(SOCKET_EVENTS.orderUpdated, (payload: unknown) =>
      this.handleOrderUpdated(payload),
    )
  }

  /** Releases every listener of the previous session's socket. */
  private teardown() {
    if (!this.socket) return
    this.socket.removeAllListeners()
    this.socket.io.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
    // Order versions belong to the previous user.
    for (const key of [...this.versions.keys()])
      if (key.startsWith('order:')) this.versions.delete(key)
  }

  /** Returns false for duplicates and stale versions. */
  private accept(id: string, resourceKey: string, version: number) {
    if (this.seenIds.has(id)) return false
    this.seenIds.add(id)
    if (this.seenIds.size > SEEN_LIMIT)
      this.seenIds.delete(this.seenIds.values().next().value!)
    const known = this.versions.get(resourceKey) ?? 0
    if (version <= known) return false
    this.versions.set(resourceKey, version)
    return true
  }

  private handleNftUpdated(payload: unknown) {
    const parsed = NftUpdatedEvent.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    const id = event.resource.id
    if (!this.accept(event.id, `nft:${id}`, event.version)) return

    const { price, compareAtPrice, soldOut, editions } = event.data
    const patchSummary = <T extends NftSummary>(item: T): T =>
      item.id === id && item.version < event.version
        ? { ...item, price, compareAtPrice, soldOut, version: event.version }
        : item

    const qc = this.queryClient
    qc.setQueryData<NftDetail>(queryKeys.nfts.detail(id), (old) => {
      if (!old || old.version >= event.version) return old
      const available = new Map(editions.map((e) => [e.id, e.available]))
      return {
        ...patchSummary(old),
        editions: old.editions.map((e) => ({
          ...e,
          available: available.get(e.id) ?? e.available,
        })),
      }
    })
    qc.setQueriesData<NftListResponse>(
      { queryKey: queryKeys.nfts.lists() },
      (old) => (old ? { ...old, items: old.items.map(patchSummary) } : old),
    )
    qc.setQueryData<FeaturedResponse>(queryKeys.nfts.featured(), (old) =>
      old
        ? {
            hero: old.hero.map(patchSummary),
            spotlight: patchSummary(old.spotlight),
          }
        : old,
    )

    // Carts holding this NFT: tell the user and resync cart + quote from REST
    // (the server owns the priceChanged flags and the totals).
    for (const [key, cart] of qc.getQueriesData<Cart>({
      queryKey: queryKeys.cart.all,
    })) {
      if (key.length !== 2 || !cart?.lines) continue
      const lines = cart.lines.filter((l) => l.nftId === id)
      if (!lines.length) continue
      const line = lines[0]
      if (compareEth(line.unitPrice, price) !== 0) {
        notices.push({
          tone: 'warning',
          title: `O preço de ${line.name} mudou`,
          description: `Agora ${formatEth(price)} (antes ${formatEth(line.unitPrice)}). O resumo foi atualizado.`,
        })
      }
      const short = lines.find(
        (l) => (available(editions, l.editionId) ?? l.available) < l.quantity,
      )
      if (short) {
        const left = available(editions, short.editionId) ?? 0
        notices.push({
          tone: 'warning',
          title:
            left === 0
              ? `${short.name} esgotou`
              : `Disponibilidade de ${short.name} mudou`,
          description:
            left === 0
              ? 'Remova o item para continuar.'
              : `Restam ${left} unidade(s).`,
        })
      }
      void qc.invalidateQueries({ queryKey: key })
    }
  }

  private handleOrderUpdated(payload: unknown) {
    const parsed = OrderUpdatedEvent.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    // Never apply another user's (or a previous session's) event.
    const userId = sessionStore.getUserId()
    if (!userId || event.userId !== userId || event.userId !== this.userId)
      return
    if (!this.accept(event.id, `order:${event.resource.id}`, event.version))
      return

    const qc = this.queryClient
    const key = queryKeys.user.order(userId, event.resource.id)
    const cached = qc.getQueryData<Order>(key)
    if (cached && cached.version >= event.version) return
    if (cached) {
      qc.setQueryData<Order>(key, {
        ...cached,
        ...event.data,
        version: event.version,
        updatedAt: event.occurredAt,
      })
    }
    const settled = isTerminal(event.data)
    if (settled) {
      // Fetch the full receipt (explorer link etc.) and resync dependants.
      void qc.invalidateQueries({ queryKey: key })
      onOrderSettled(qc, userId, event.resource.id)
      notices.push(
        event.data.status === 'confirmed'
          ? {
              tone: 'success',
              title: 'Pedido confirmado',
              description: 'Seus NFTs já estão na sua carteira.',
            }
          : {
              tone: 'error',
              title: 'Pagamento recusado',
              description: event.data.failureReason ?? undefined,
            },
      )
    } else if (!cached) {
      void qc.invalidateQueries({ queryKey: key })
    }
  }

  /** After a reconnect, refetch everything the socket might have missed. */
  private reconcile() {
    const qc = this.queryClient
    void qc.invalidateQueries({ queryKey: queryKeys.nfts.all })
    void qc.invalidateQueries({ queryKey: queryKeys.cart.all })
    if (this.userId) {
      void qc.invalidateQueries({
        queryKey: queryKeys.user.ordersAll(this.userId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.user.all(this.userId),
        predicate: (query) => query.queryKey[2] === 'order',
      })
    }
  }
}

function available(
  editions: Array<{ id: string; available: number }>,
  editionId: string,
) {
  return editions.find((e) => e.id === editionId)?.available
}
