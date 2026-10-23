import { expect, test } from './fixtures'

const summaryTotal = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-labelledby="summary-title"] dd').last()

test.describe('Carrinho', () => {
  test('quantidades, remoção e resumo calculado pela API @main', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.addToCart([
      ['emerald-ape-042', '1-10', 1],
      ['violet-nomad-314', '1-10', 2],
    ])
    const patches: string[] = []
    page.on(
      'request',
      (r) => r.method() === 'PATCH' && patches.push(r.postData() ?? ''),
    )
    await app.goto('/cart')
    await expect(summaryTotal(page)).toHaveText('3.986 ETH')

    // A burst of clicks becomes one request with the final value; stock caps at 3.
    const plus = page.getByRole('button', {
      name: 'Aumentar quantidade de Emerald Ape #042',
    })
    await plus.click()
    await plus.click()
    await expect(plus).toBeDisabled()
    await expect(summaryTotal(page)).toHaveText('6.366 ETH')
    expect(patches).toEqual(['{"quantity":3}'])

    await page.getByRole('button', { name: /Remover Emerald Ape #042/ }).click()
    const cartItems = page.locator(
      'section[aria-labelledby="cart-items-title"]',
    )
    await expect(
      cartItems.getByRole('heading', { name: /Emerald Ape/ }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('heading', { level: 1, name: /Carrinho/ }),
    ).toBeFocused()
    await expect(summaryTotal(page)).toHaveText('2.796 ETH')

    await page
      .getByRole('button', { name: /Remover Violet Nomad #314/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
    ).toBeVisible()
  })

  test('cupom inválido, expirado, válido e removido', async ({ app, page }) => {
    await app.open('/')
    await app.addToCart([['violet-nomad-314', '1-10', 2]])
    await app.goto('/cart')
    const input = page.getByRole('textbox', { name: 'Código promocional' })
    const apply = page.getByRole('button', { name: 'Aplicar' })

    await input.fill('nada')
    await apply.click()
    await expect(page.getByText('Código promocional inválido.')).toBeVisible()
    await expect(input).toHaveAttribute('aria-invalid', 'true')

    await input.fill('verao2025')
    await apply.click()
    await expect(
      page.getByText('Este código promocional expirou.'),
    ).toBeVisible()

    await input.fill('kurio10')
    await apply.click()
    await expect(page.getByText('Desconto (KURIO10)')).toBeVisible()
    await expect(page.getByText('(-) 0.278 ETH')).toBeVisible()
    await expect(summaryTotal(page)).toHaveText('2.518 ETH')

    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(page.getByText('Desconto do lançamento')).toBeVisible()
    await expect(summaryTotal(page)).toHaveText('2.796 ETH')
  })

  test('persiste após refresh e preserva itens do visitante ao autenticar @main', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/')
    await app.addToCart([['sage-nomad-009', '1-50', 2]])
    await app.goto('/cart')
    await page.reload()
    await app.waitForMocks()
    await expect(
      page.getByRole('heading', { name: /Sage Nomad #009/ }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Entrar e finalizar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    const scope = isMobile
      ? page.locator('main')
      : page.getByRole('dialog', { name: 'Entrar' })
    await scope
      .getByRole('textbox', { name: 'E-mail' })
      .fill('bruno@kurio.test')
    await scope.getByLabel(/^Senha\*?$/).fill('Colecao2026')
    await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === '/checkout')

    const cart = await app.api<{
      lines: Array<{ nftId: string; quantity: number }>
    }>('/cart')
    expect(cart.lines).toEqual([
      expect.objectContaining({ nftId: 'sage-nomad-009', quantity: 2 }),
    ])
  })
})
