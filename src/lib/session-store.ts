import { Session } from '@/api/contracts'

/**
 * Client-side session: the bearer token and the user it belongs to. Persisted
 * so the session survives refreshes; validated against GET /auth/session on
 * boot. Kept outside React so the Axios client and the socket can read it.
 */

const SESSION_KEY = 'kurio.session'
const CART_ID_KEY = 'kurio.cart-id'

export type SessionEndReason = 'logout' | 'expired' | 'invalid' | 'other-tab'

type Listener = () => void

function read<T>(key: string, parse: (raw: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? parse(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}

const parseSession = (raw: unknown) => {
  const result = Session.safeParse(raw)
  return result.success ? result.data : null
}

class SessionStore {
  private session: Session | null = read(SESSION_KEY, parseSession)
  private cartId: string =
    read(CART_ID_KEY, (v) => (typeof v === 'string' ? v : null)) ??
    this.newCartId()
  private listeners = new Set<Listener>()
  private endListeners = new Set<
    (reason: SessionEndReason, previous: Session) => void
  >()

  constructor() {
    // Login/logout in another tab: follow it, so tabs never mix users.
    window.addEventListener('storage', (event) => {
      if (event.key !== SESSION_KEY) return
      const previous = this.session
      this.session = read(SESSION_KEY, parseSession)
      if (previous && previous.user.id !== this.session?.user.id) {
        for (const listener of this.endListeners)
          listener('other-tab', previous)
      }
      this.notify()
    })
  }

  private newCartId() {
    const id = crypto.randomUUID()
    write(CART_ID_KEY, id)
    return id
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  getSession = () => this.session

  getToken = () => this.session?.token ?? null

  getUserId = () => this.session?.user.id ?? null

  /** Anonymous cart identifier sent as X-Cart-Id while logged out. */
  getCartId = () => this.cartId

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Called when a session ends for any reason (cache and socket cleanup). */
  onEnd(listener: (reason: SessionEndReason, previous: Session) => void) {
    this.endListeners.add(listener)
    return () => {
      this.endListeners.delete(listener)
    }
  }

  start(session: Session) {
    const previous = this.session
    if (previous && previous.user.id !== session.user.id) {
      for (const listener of this.endListeners) listener('other-tab', previous)
    }
    this.session = session
    write(SESSION_KEY, session)
    this.notify()
  }

  /** Refreshes user data without ending the session. */
  update(session: Session) {
    if (this.session?.token !== session.token) return
    if (JSON.stringify(this.session) === JSON.stringify(session)) return
    this.session = session
    write(SESSION_KEY, session)
    this.notify()
  }

  end(reason: SessionEndReason) {
    const previous = this.session
    if (!previous) return
    this.session = null
    write(SESSION_KEY, null)
    // A fresh visitor cart: nothing from the previous user leaks into it.
    this.cartId = this.newCartId()
    for (const listener of this.endListeners) listener(reason, previous)
    this.notify()
  }
}

export const sessionStore = new SessionStore()
