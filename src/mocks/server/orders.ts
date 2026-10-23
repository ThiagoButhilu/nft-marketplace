import type { CreateOrderRequest, Network, Order } from '@/api/contracts'
import { scenario } from '../scenarios'
import { getWallet } from './accounts'
import { getNftRecord, updateNft } from './catalog'
import { removePurchased, revalidateQuote, userCartKey } from './cart'
import { fingerprint, randomToken } from './crypto'
import { MockApiError, notFound } from './errors'
import { eth, toEth } from './money'
import { store, type OrderRecord } from './store'

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function toOrder(record: OrderRecord): Order {
  const {
    userId: _u,
    requestFingerprint: _f,
    resolveAt: _r,
    outcome: _o,
    ...order
  } = record
  return order
}

function adjustAvailability(order: OrderRecord, direction: 1 | -1) {
  for (const line of order.lines) {
    const nft = getNftRecord(line.nftId)
    const edition = nft.editions.find((e) => e.id === line.editionId)
    if (!edition) continue
    updateNft(nft.id, {
      editions: { [edition.id]: edition.available + direction * line.quantity },
    })
  }
}

/** Applies hooks of scenarios that change the catalog mid-checkout. */
function applyCheckoutScenario(userId: string) {
  const cart = store.db.carts[userCartKey(userId)]
  const first = cart?.lines[0]
  if (!first) return
  if (
    scenario.config.priceChangeAtCheckout &&
    scenario.consumeOnce('price-change')
  ) {
    const nft = getNftRecord(first.nftId)
    updateNft(nft.id, { price: toEth(eth(nft.price).plus('0.05')) })
  }
  if (scenario.config.soldOutAtCheckout && scenario.consumeOnce('sold-out')) {
    updateNft(first.nftId, { editions: { [first.editionId]: 0 } })
  }
}

export function createOrder(
  userId: string,
  idempotencyKey: string,
  input: CreateOrderRequest,
) {
  const scopedKey = `${userId}:${idempotencyKey}`
  const requestFingerprint = fingerprint(input)

  // Same key: same order, or a conflict when the payload differs.
  const existingId = store.db.idempotency[scopedKey]
  if (existingId) {
    const existing = store.db.orders[existingId]
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new MockApiError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Esta chave de idempotência já foi usada com outro pedido.',
      )
    }
    return { order: toOrder(existing), replayed: true }
  }

  applyCheckoutScenario(userId)
  const wallet = getWallet(userId, input.walletId)
  const values = revalidateQuote(
    userCartKey(userId),
    input.quoteId,
    input.network,
  )

  const now = Date.now()
  const record: OrderRecord = {
    id: store.nextId('ord'),
    status: 'pending',
    version: 1,
    idempotencyKey,
    network: input.network,
    wallet: {
      id: wallet.id,
      provider: wallet.provider,
      label: wallet.label,
      address: wallet.address,
    },
    lines: values.lines,
    couponCode: values.coupon?.code ?? null,
    subtotal: values.subtotal,
    discount: values.discount,
    networkFee: values.networkFee,
    total: values.total,
    transactionHash: null,
    explorerUrl: null,
    failureReason: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    userId,
    requestFingerprint,
    resolveAt: now + scenario.config.paymentDelayMs,
    outcome: scenario.config.payment,
  }
  store.mutate((db) => {
    db.orders[record.id] = record
    db.idempotency[scopedKey] = record.id
  })
  // Reserve stock while the payment is pending.
  adjustAvailability(record, -1)
  schedule(record)
  return { order: toOrder(record), replayed: false }
}

function resolve(orderId: string) {
  timers.delete(orderId)
  const order = store.db.orders[orderId]
  if (!order || order.status !== 'pending') return
  const confirmed = order.outcome === 'confirmed'
  const hash = `0x${randomToken(32)}`
  store.mutate(() => {
    order.status = order.outcome
    order.version += 1
    order.updatedAt = new Date().toISOString()
    order.transactionHash = confirmed ? hash : null
    order.explorerUrl = confirmed ? EXPLORERS[order.network] + hash : null
    order.failureReason = confirmed
      ? null
      : 'O pagamento foi recusado pela carteira.'
  })
  if (confirmed) removePurchased(order.userId, order.lines)
  else adjustAvailability(order, 1)
  store.emit({
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    userId: order.userId,
    version: order.version,
    data: {
      status: order.status,
      transactionHash: order.transactionHash,
      failureReason: order.failureReason,
    },
  })
}

function schedule(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  timers.set(
    order.id,
    setTimeout(
      () => resolve(order.id),
      Math.max(0, order.resolveAt - Date.now()),
    ),
  )
}

/** Re-arms settlement timers after a reload (pending orders survive refresh). */
export function resumePendingOrders() {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  for (const order of Object.values(store.db.orders)) schedule(order)
}

/** Mock control: settles every pending order now. */
export function settlePendingOrders() {
  for (const order of Object.values(store.db.orders)) {
    if (order.status === 'pending') resolve(order.id)
  }
}

export function getOrder(userId: string, orderId: string) {
  const order = store.db.orders[orderId]
  if (!order) throw notFound('Pedido')
  if (order.userId !== userId) {
    throw new MockApiError(
      403,
      'FORBIDDEN',
      'Você não tem acesso a este pedido.',
    )
  }
  return toOrder(order)
}

export function listOrders(userId: string, status?: Order['status']) {
  return Object.values(store.db.orders)
    .filter((o) => o.userId === userId && (!status || o.status === status))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(toOrder)
}
