import type { ApiErrorCode } from '@/api/contracts'
import { seededRandom } from './server/crypto'

/**
 * Named, deterministic mock scenarios. Pick one with `?scenario=<name>` (it
 * is remembered in localStorage) or `window.__kurioMock.setScenario(name)`.
 */

export type FailureResponse =
  | { type: 'status'; status: number; code: ApiErrorCode; message?: string }
  /** Connection-level failure (`TypeError: Failed to fetch`). */
  | { type: 'network' }
  /** Never answers; the client's timeout has to kick in. */
  | { type: 'timeout' }

export interface FailureRule {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** API path without the `/api` prefix; `*` matches one segment. */
  path: string
  response: FailureResponse
  /** How many matching requests fail before the rule stops; default: all. */
  times?: number
}

export interface ScenarioConfig {
  description: string
  /** Latency range in ms; the jitter sequence is reproducible from `seed`. */
  latency: { min: number; max: number }
  seed: number
  /** Catalog requests with shorter `q` answer later, forcing out-of-order responses. */
  outOfOrderCatalog: boolean
  /** Every request fails at the network level and sockets are refused. */
  offline: boolean
  failures: FailureRule[]
  emptyCatalog: boolean
  /** Outcome of the simulated payment. */
  payment: 'confirmed' | 'declined'
  paymentDelayMs: number
  sessionTtlMs: number
  /** The order is created, but the first response never arrives. */
  orderCreateTimeout: boolean
  /** Bumps the price of the first cart item right before the first order attempt. */
  priceChangeAtCheckout: boolean
  /** Sells out the first cart item right before the first order attempt. */
  soldOutAtCheckout: boolean
  /** The wallet refuses the connection request. */
  walletRejects: boolean
  /** Periodically changes the price of items sitting in carts (demo of `nft.updated`). */
  liveMarketIntervalMs: number | null
}

const BASE: ScenarioConfig = {
  description: 'Fluxo feliz com latência curta e variável.',
  latency: { min: 120, max: 450 },
  seed: 42,
  outOfOrderCatalog: false,
  offline: false,
  failures: [],
  emptyCatalog: false,
  payment: 'confirmed',
  paymentDelayMs: 2500,
  sessionTtlMs: 30 * 60 * 1000,
  orderCreateTimeout: false,
  priceChangeAtCheckout: false,
  soldOutAtCheckout: false,
  walletRejects: false,
  liveMarketIntervalMs: null,
}

const define = (overrides: Partial<ScenarioConfig>): ScenarioConfig => ({
  ...BASE,
  ...overrides,
})

export const SCENARIOS = {
  default: BASE,
  fast: define({
    description: 'Sem latência (testes e auditorias).',
    latency: { min: 0, max: 0 },
    paymentDelayMs: 800,
  }),
  slow: define({
    description: 'Rede lenta: 1,5–3 s por requisição.',
    latency: { min: 1500, max: 3000 },
  }),
  'variable-latency': define({
    description: 'Latência muito variável (50 ms–2,5 s).',
    latency: { min: 50, max: 2500 },
  }),
  'out-of-order': define({
    description:
      'Buscas mais curtas respondem por último: respostas fora de ordem.',
    outOfOrderCatalog: true,
  }),
  empty: define({
    description: 'Catálogo sem resultados.',
    emptyCatalog: true,
  }),
  offline: define({
    description: 'Sem conexão: todas as requisições e o socket falham.',
    offline: true,
  }),
  'catalog-error': define({
    description:
      'Catálogo responde 500 nas duas primeiras tentativas e depois se recupera.',
    failures: [
      {
        method: 'GET',
        path: '/nfts',
        response: { type: 'status', status: 500, code: 'INTERNAL_ERROR' },
        times: 2,
      },
    ],
  }),
  'catalog-unavailable': define({
    description: 'Catálogo e detalhe fora do ar (503) até trocar de cenário.',
    failures: [
      {
        method: 'GET',
        path: '/nfts',
        response: { type: 'status', status: 503, code: 'SERVICE_UNAVAILABLE' },
      },
      {
        method: 'GET',
        path: '/nfts/*',
        response: { type: 'status', status: 503, code: 'SERVICE_UNAVAILABLE' },
      },
    ],
  }),
  'network-failure': define({
    description: 'Falha de conexão no catálogo na primeira tentativa.',
    failures: [
      { method: 'GET', path: '/nfts', response: { type: 'network' }, times: 1 },
    ],
  }),
  'favorite-error': define({
    description:
      'Favoritar falha (500): exercita rollback da atualização otimista.',
    failures: [
      {
        method: 'PUT',
        path: '/favorites/*',
        response: { type: 'status', status: 500, code: 'INTERNAL_ERROR' },
      },
      {
        method: 'DELETE',
        path: '/favorites/*',
        response: { type: 'status', status: 500, code: 'INTERNAL_ERROR' },
      },
    ],
  }),
  'session-expired': define({
    description: 'Sessões expiram 20 s após o login.',
    sessionTtlMs: 20_000,
  }),
  forbidden: define({
    description: 'Perfil e carteiras respondem 403.',
    failures: [
      {
        path: '/profile',
        response: { type: 'status', status: 403, code: 'FORBIDDEN' },
      },
      {
        path: '/wallets',
        response: { type: 'status', status: 403, code: 'FORBIDDEN' },
      },
    ],
  }),
  'price-change': define({
    description:
      'O preço do primeiro item muda na primeira tentativa de compra.',
    priceChangeAtCheckout: true,
  }),
  'sold-out': define({
    description: 'O primeiro item esgota na primeira tentativa de compra.',
    soldOutAtCheckout: true,
  }),
  'order-timeout': define({
    description:
      'O pedido é criado, mas a primeira resposta nunca chega (recuperação por idempotência).',
    orderCreateTimeout: true,
  }),
  'payment-declined': define({
    description: 'O pagamento é recusado.',
    payment: 'declined',
  }),
  'wallet-rejected': define({
    description: 'A carteira recusa a conexão.',
    walletRejects: true,
  }),
  'live-market': define({
    description:
      'Preços dos itens em carrinhos mudam a cada 20 s via Socket.IO.',
    liveMarketIntervalMs: 20_000,
  }),
} satisfies Record<string, ScenarioConfig>

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio.mock-scenario'

function readStoredScenario(): {
  name: ScenarioName
  overrides: Partial<ScenarioConfig>
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      name?: unknown
      overrides?: Partial<ScenarioConfig>
    }
    return isScenarioName(parsed.name)
      ? { name: parsed.name, overrides: parsed.overrides ?? {} }
      : null
  } catch {
    return null
  }
}

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && value in SCENARIOS
}

class ScenarioState {
  name: ScenarioName = 'default'
  config: ScenarioConfig = BASE
  private random = seededRandom(BASE.seed)
  private ruleHits = new Map<FailureRule, number>()
  private consumed = new Set<string>()
  private listeners = new Set<() => void>()

  constructor() {
    const fromUrl = new URLSearchParams(window.location.search).get('scenario')
    const stored = readStoredScenario()
    if (isScenarioName(fromUrl)) this.set(fromUrl)
    else if (stored) this.set(stored.name, stored.overrides)
    else this.set('default')
  }

  set(name: ScenarioName, overrides: Partial<ScenarioConfig> = {}) {
    this.name = name
    this.config = { ...SCENARIOS[name], ...overrides }
    this.random = seededRandom(this.config.seed)
    this.ruleHits.clear()
    this.consumed.clear()
    // Name and overrides persist, so a configured scenario survives reloads.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, overrides }))
    } catch {
      /* storage unavailable */
    }
    for (const listener of this.listeners) listener()
  }

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Next latency in the deterministic sequence. */
  nextLatency() {
    const { min, max } = this.config.latency
    return Math.round(min + (max - min) * this.random())
  }

  /** Returns the failure for this request, counting the hit. */
  matchFailure(method: string, path: string): FailureResponse | null {
    for (const rule of this.config.failures) {
      if (rule.method && rule.method !== method) continue
      if (!pathMatches(rule.path, path)) continue
      const hits = this.ruleHits.get(rule) ?? 0
      if (rule.times !== undefined && hits >= rule.times) continue
      this.ruleHits.set(rule, hits + 1)
      return rule.response
    }
    return null
  }

  /** True only the first time a one-shot behaviour is requested. */
  consumeOnce(flag: string) {
    if (this.consumed.has(flag)) return false
    this.consumed.add(flag)
    return true
  }
}

function pathMatches(pattern: string, path: string) {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('/').filter(Boolean)
  return (
    a.length === b.length &&
    a.every((segment, i) => segment === '*' || segment === b[i])
  )
}

export const scenario = new ScenarioState()
