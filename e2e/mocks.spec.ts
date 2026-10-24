import { expect, test } from './fixtures'

test.describe('Mock backend', () => {
  test('?mock-reset restaura as fixtures e o cenário padrão', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.loginViaApi('bruno')
    await app.addToCart([['sage-nomad-009', '1-50', 2]])
    await app.setScenario('empty')
    await app.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
    ).toBeVisible()

    await app.goto('/?mock-reset')
    await expect(page).not.toHaveURL(/mock-reset/)
    const current = await app.mock<{ name: string }>('getScenario')
    expect(current.name).toBe('default')
    await expect.poll(() => app.catalogNames()).toHaveLength(9)

    // Seeded data again: the session and the cart created above are gone.
    const carts = await page.evaluate(async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bruno@kurio.test',
          password: 'Colecao2026',
        }),
      })
      const { token } = (await response.json()) as { token: string }
      const cart = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return ((await cart.json()) as { lines: unknown[] }).lines.length
    })
    expect(carts).toBe(0)
  })
})
