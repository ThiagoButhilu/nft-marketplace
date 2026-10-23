import { expect, test } from './fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto mostra galeria, edições e compra @main', async ({
    app,
    page,
  }) => {
    await app.open('/nft/emerald-ape-042')
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }).first(),
    ).toBeVisible()
    await expect(page).toHaveTitle(/Emerald Ape #042/)
    await expect(
      page.getByRole('radio', { name: '1/10', exact: true }).first(),
    ).toBeChecked()
  })

  test('NFT inexistente mostra 404 @main', async ({ app, page }) => {
    await app.open('/nft/nao-existe-000')
    await expect(
      page.getByRole('heading', { name: 'NFT não encontrado' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
    await expect(page).toHaveURL(/#catalogo/)
  })

  test('rota inexistente mostra 404 do app', async ({ app, page }) => {
    await app.open('/rota/que/nao/existe')
    await expect(
      page.getByRole('heading', { name: 'Página não encontrada' }),
    ).toBeVisible()
  })

  test('edição indisponível bloqueia a compra e explica o motivo', async ({
    app,
    page,
  }) => {
    await app.open('/nft/emerald-ape-042?edicao=1-1')
    const article = page
      .getByRole('article')
      .filter({ has: page.locator('#nft-title') })
    await expect(
      article.getByRole('radio', { name: '1/1 (esgotada)', exact: true }),
    ).toBeChecked()
    await expect(
      article.getByRole('button', { name: 'Comprar' }),
    ).toBeDisabled()
    await expect(
      article
        .getByText('Edição indisponível: esta edição está esgotada.')
        .first(),
    ).toBeVisible()
  })

  test('quantidade limitada pelo estoque e compra adiciona ao carrinho', async ({
    app,
    page,
  }) => {
    await app.open('/nft/emerald-ape-042?edicao=1-10')
    const article = page
      .getByRole('article')
      .filter({ has: page.locator('#nft-title') })
    const plus = article.getByRole('button', { name: /Aumentar quantidade/ })
    while (await plus.isEnabled()) await plus.click()
    await expect(article.locator('output')).toContainText('3')

    await article.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(
      page.getByRole('link', { name: 'Carrinho, 3 itens' }),
    ).toBeVisible()

    await page.goBack()
    await expect(
      article.getByRole('button', { name: 'Comprar' }),
    ).toBeDisabled()
    await expect(
      article.getByText(/máximo desta edição no carrinho/),
    ).toBeVisible()
  })

  test('compra no mobile pela barra fixa @main', async ({
    app,
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Barra de compra fixa só existe no mobile')
    await app.open('/nft/sage-nomad-009')
    await expect(
      page.getByRole('navigation', { name: 'Navegação móvel' }),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Comprar NFT' }).click()
    await expect(page).toHaveURL(/\/cart$/)
  })

  test('edições navegáveis por setas do teclado', async ({ app, page }) => {
    await app.open('/nft/emerald-ape-042')
    await page.getByRole('radio', { name: '1/10', exact: true }).first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/edicao=1-50/)
  })
})
