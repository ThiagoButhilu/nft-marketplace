import type { Network, Order, ServerEvent, Wallet } from '@/api/contracts'
import {
  COUPON_FIXTURES,
  FIXTURE_USERS,
  createWalletFixtures,
  type CouponRecord,
} from '../fixtures/accounts'
import {
  FIXTURE_NOW,
  createNftFixtures,
  type NftRecord,
} from '../fixtures/nfts'
import { hashPassword, randomToken } from './crypto'

/**
 * In-memory database behind the mock API, persisted to localStorage so the
 * simulation survives refreshes. Only the mock layer reads or writes it.
 */

export interface UserRecord {
  id: string
  username: string
  email: string
  displayName: string
  ensName: string | null
  walletNickname: string | null
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  updatedAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: number
  expiresAt: number
}

export interface CartLineRecord {
  nftId: string
  editionId: string
  quantity: number
  /** Unit price the visitor last saw; differs from the catalog after a change. */
  seenUnitPrice: string
}

export interface CartRecord {
  key: string
  id: string
  lines: CartLineRecord[]
  couponCode: string | null
  updatedAt: string
}

export interface QuoteRecord {
  id: string
  cartKey: string
  network: Network
  fingerprint: string
  expiresAt: number
}

export interface OrderRecord extends Order {
  userId: string
  requestFingerprint: string
  /** When the simulated payment settles. */
  resolveAt: number
  outcome: 'confirmed' | 'declined'
}

export interface DbState {
  schema: number
  users: Record<string, UserRecord>
  sessions: Record<string, SessionRecord>
  nfts: Record<string, NftRecord>
  nftOrder: string[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  coupons: CouponRecord[]
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  /** `${userId}:${idempotencyKey}` → order id */
  idempotency: Record<string, string>
  wallets: Record<string, Wallet[]>
  seq: number
}

const SCHEMA = 1
const STORAGE_KEY = 'kurio.mock-db.v1'

async function seed(): Promise<DbState> {
  const nfts = createNftFixtures()
  const state: DbState = {
    schema: SCHEMA,
    users: {},
    sessions: {},
    nfts: Object.fromEntries(nfts.map((n) => [n.id, n])),
    nftOrder: nfts.map((n) => n.id),
    favorites: {},
    carts: {},
    coupons: COUPON_FIXTURES,
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: {},
    seq: 0,
  }
  for (const user of FIXTURE_USERS) {
    // Fixed salts keep the seeded state byte-for-byte reproducible.
    const passwordSalt = `seed-${user.id}`
    state.users[user.id] = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      ensName: user.ensName,
      walletNickname: user.walletNickname,
      avatarUrl: null,
      passwordSalt,
      passwordHash: await hashPassword(user.password, passwordSalt),
      updatedAt: new Date(FIXTURE_NOW).toISOString(),
    }
    state.favorites[user.id] = [...user.favorites]
    state.wallets[user.id] = createWalletFixtures(user)
  }
  return state
}

function readPersisted(): DbState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbState
    return parsed.schema === SCHEMA ? parsed : null
  } catch {
    return null
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

type Listener<T> = (payload: T) => void

class Emitter<T> {
  private listeners = new Set<Listener<T>>()
  on(listener: Listener<T>) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  emit(payload: T) {
    for (const listener of this.listeners) listener(payload)
  }
}

class Store {
  private state!: DbState
  readonly ready: Promise<void>
  /** Domain events, fanned out by the Socket.IO mock. */
  readonly events = new Emitter<ServerEvent>()
  /** Fired after a reset or when another tab replaced the state. */
  readonly replaced = new Emitter<void>()

  constructor() {
    this.ready = this.init()
  }

  private async init() {
    this.state = readPersisted() ?? (await seed())
    this.persist()
    // Another tab running the same mock wrote new state: adopt it.
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return
      const next = readPersisted()
      if (next) {
        this.state = next
        this.replaced.emit()
      }
    })
  }

  get db(): DbState {
    return this.state
  }

  nextId(prefix: string) {
    this.state.seq += 1
    return `${prefix}_${this.state.seq.toString(36).padStart(4, '0')}${randomToken(2)}`
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch (error) {
      console.warn('[mocks] could not persist state', error)
    }
  }

  /** Runs a mutation and persists the result. */
  mutate<T>(fn: (db: DbState) => T): T {
    const result = fn(this.state)
    this.persist()
    return result
  }

  emit(event: DistributiveOmit<ServerEvent, 'id' | 'occurredAt'>) {
    const full = {
      ...event,
      id: this.nextId('evt'),
      occurredAt: new Date().toISOString(),
    } as ServerEvent
    this.persist()
    this.events.emit(full)
    return full
  }

  /** Restores the seeded scenario, discarding every change. */
  async reset() {
    this.state = await seed()
    this.persist()
    this.replaced.emit()
  }
}

export const store = new Store()
