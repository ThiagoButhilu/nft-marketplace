import { expect, test } from './fixtures'

/**
 * Visual regression of the four screens required by the challenge, on both
 * projects. Data comes from the seeded fixtures (no latency scenario), and
 * fonts/images are awaited before each capture, so baselines are stable.
 *
 * Baselines are OS-specific (font rendering); regenerate them with
 * `npm run test:e2e:update` on a new platform.
 */
test.describe('Regressão visual', () => {
  test('Início @visual', async ({ app, page }) => {
    await app.open('/')
    await expect.poll(() => app.catalogNames()).toHaveLength(9)
    await app.settleVisuals()
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('Detalhe do NFT @visual', async ({ app, page }) => {
    await app.open('/nft/emerald-ape-042')
    await expect(page.locator('#related-title')).toBeVisible()
    await expect(
      page.locator('section[aria-labelledby="related-title"] h3'),
    ).toHaveCount(5)
    await app.settleVisuals()
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('Carrinho @visual', async ({ app, page }) => {
    await app.open('/')
    await app.addToCart([
      ['emerald-ape-042', '1-50', 2],
      ['violet-nomad-314', '1-10', 6],
      ['ivory-baron-088', '1-50', 9],
    ])
    await app.goto('/cart')
    await expect(page.getByText('26.846 ETH')).toBeVisible()
    await expect(page.locator('#also-viewed ~ ul h3')).toHaveCount(5)
    await app.settleVisuals()
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('Pagamento @visual', async ({ app, page }) => {
    await app.startCheckout({
      items: [
        ['emerald-ape-042', '1-50', 2],
        ['violet-nomad-314', '1-10', 6],
        ['ivory-baron-088', '1-50', 9],
      ],
    })
    await expect(page.getByText('26.846 ETH').first()).toBeVisible()
    await app.settleVisuals()
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
