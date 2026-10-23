import { test as base, expect, type Page } from '@playwright/test'

/**
 * Test helpers. Every test runs in a fresh browser context, so the mock
 * database (localStorage) starts from the seeded fixtures: tests are
 * isolated and order-independent.
 *
 * The `mock` helpers drive the *server side* through `window.__kurioMock`
 * (scenarios, catalog changes, socket drops). The app under test still only
 * sees REST responses from MSW and events through socket.io-client.
 */

export const USERS = {
  ana: {
    email: 'ana@kurio.test',
    password: 'Kurio2026',
    name: 'Ana Lima',
    id: 'usr_ana',
  },
  bruno: {
    email: 'bruno@kurio.test',
    password: 'Colecao2026',
    name: 'Bruno Costa',
    id: 'usr_bruno',
  },
} as const
export type UserKey = keyof typeof USERS

type CartItem = [nftId: string, edition: string, quantity: number]

export class App {
  constructor(readonly page: Page) {}

  /** Opens a path once the mock backend is intercepting. */
  async open(path = '/', { scenario = 'fast' }: { scenario?: string } = {}) {
    const separator = path.includes('?') ? '&' : '?'
    await this.page.goto(`${path}${separator}scenario=${scenario}`)
    await this.waitForMocks()
  }

  async goto(path: string) {
    await this.page.goto(path)
    await this.waitForMocks()
  }

  /** Mock backend intercepting and the React tree rendered. */
  async waitForMocks() {
    await this.page.waitForFunction(
      () => !!window.__kurioMock && !!document.querySelector('main#conteudo'),
    )
  }

  /** Calls a `window.__kurioMock` method in the page. */
  async mock<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(
      ([name, params]) => {
        const control = window.__kurioMock as unknown as Record<
          string,
          (...a: unknown[]) => unknown
        >
        return control[name as string](...(params as unknown[])) as never
      },
      [method, args] as const,
    )
  }

  setScenario(name: string, overrides: Record<string, unknown> = {}) {
    return this.mock('setScenario', name, {
      latency: { min: 0, max: 0 },
      ...overrides,
    })
  }

  /** Logs in through the API and stores the session like the app does. */
  async loginViaApi(user: UserKey = 'ana') {
    const { email, password } = USERS[user]
    await this.page.evaluate(
      async ({ email, password }) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        localStorage.setItem(
          'kurio.session',
          JSON.stringify(await response.json()),
        )
      },
      { email, password },
    )
  }

  /** Seeds the cart of the current visitor or user through the API. */
  async addToCart(items: CartItem[]) {
    await this.page.evaluate(async (list) => {
      const session = JSON.parse(
        localStorage.getItem('kurio.session') ?? 'null',
      )
      const cartId = JSON.parse(localStorage.getItem('kurio.cart-id') ?? 'null')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (session) headers.Authorization = `Bearer ${session.token}`
      else headers['X-Cart-Id'] = cartId
      for (const [nftId, edition, quantity] of list) {
        await fetch('/api/cart/items', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nftId,
            editionId: `${nftId}:${edition}`,
            quantity,
          }),
        })
      }
    }, items)
  }

  /** Authenticated GET from the page (to assert server-side outcomes). */
  async api<T = unknown>(path: string): Promise<T> {
    return this.page.evaluate(async (p) => {
      const session = JSON.parse(
        localStorage.getItem('kurio.session') ?? 'null',
      )
      const response = await fetch(`/api${p}`, {
        headers: session ? { Authorization: `Bearer ${session.token}` } : {},
      })
      return response.json()
    }, path)
  }

  /** Logged-in user with items in the cart, sitting on the checkout. */
  async startCheckout({
    user = 'ana',
    items = [['ivory-baron-088', '1-50', 2]],
    scenario,
    overrides,
  }: {
    user?: UserKey
    items?: CartItem[]
    scenario?: string
    overrides?: Record<string, unknown>
  } = {}) {
    await this.open('/')
    await this.loginViaApi(user)
    await this.addToCart(items)
    if (scenario)
      await this.setScenario(scenario, { paymentDelayMs: 600, ...overrides })
    else await this.setScenario('fast', { paymentDelayMs: 600, ...overrides })
    await this.goto('/checkout')
    await expect(
      this.page.getByRole('heading', { name: 'Carteira e rede' }),
    ).toBeVisible()
    await expect(
      this.page.getByRole('textbox', { name: /^Nome de exibição/ }),
    ).toHaveValue(USERS[user].name)
  }

  async connectWallet() {
    await this.page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(this.page.getByText(/Conectada:/)).toBeVisible()
  }

  reviewDialog() {
    return this.page.getByRole('dialog', { name: 'Revise seu pedido' })
  }

  async openReview() {
    await this.page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(this.reviewDialog()).toBeVisible()
  }

  /** Toggles a catalog filter by clicking its visible row (as a user does). */
  async toggleFilter(label: string) {
    const row = this.page
      .locator('label:visible')
      .filter({ hasText: new RegExp(`^\\s*${label}\\b`) })
      .first()
    const checkbox = row.locator('input[type=checkbox]')
    const before = await checkbox.isChecked()
    await row.click()
    await expect(checkbox).toBeChecked({ checked: !before })
  }

  /** Product titles in the catalog grid, in order. */
  catalogNames() {
    return this.page.locator('#catalogo ul[aria-busy] h3').allInnerTexts()
  }

  /**
   * Waits for fonts and every image (lazy ones are switched to eager first,
   * since a full-page capture includes them) so screenshots are stable.
   */
  async settleVisuals() {
    await this.page.evaluate(async () => {
      await document.fonts.ready
      const images = [...document.images]
      for (const img of images)
        if (img.loading === 'lazy') img.loading = 'eager'
      await Promise.all(
        images.map((img) =>
          img.complete
            ? null
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true })
                img.addEventListener('error', resolve, { once: true })
              }),
        ),
      )
    })
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use(new App(page))
  },
})

export { expect }
