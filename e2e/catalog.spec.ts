import { expect, test } from './fixtures'

const search = (url: string) => decodeURIComponent(new URL(url).search)

test.describe('Catálogo: busca, filtros, ordenação, paginação e URL', () => {
  test('filtros combinados e ordenação refletem na URL e no resultado @main', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/')
    if (isMobile) await page.getByRole('button', { name: /^Filtros/ }).click()

    await app.toggleFilter('Música')
    await expect(page).toHaveURL(/collection/)
    await app.toggleFilter('Polygon')
    await expect(page).toHaveURL(/network/)
    await expect
      .poll(() => app.catalogNames())
      .toEqual(['Golden Beat #207', 'Golden Frequency #071'])

    await page.getByRole('combobox', { name: /Ordenar por/ }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    if (isMobile) await page.keyboard.press('Escape')
    await expect
      .poll(() => app.catalogNames())
      .toEqual(['Golden Frequency #071', 'Golden Beat #207'])
    expect(search(page.url())).toContain('"music"')
    expect(search(page.url())).toContain('"polygon"')
  })

  test('histórico do navegador e refresh restauram o estado', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await app.toggleFilter('Música')
    await app.toggleFilter('Polygon')
    await expect(page).toHaveURL(/network/)

    await page.goBack()
    await expect(page).not.toHaveURL(/network/)
    await expect(
      page.getByRole('checkbox', { name: /Polygon/ }),
    ).not.toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Música/ })).toBeChecked()

    await page.goForward()
    await expect(page.getByRole('checkbox', { name: /Polygon/ })).toBeChecked()
    await page.reload()
    await app.waitForMocks()
    await expect(page.getByRole('checkbox', { name: /Polygon/ })).toBeChecked()
    await expect.poll(() => app.catalogNames()).toHaveLength(2)
  })

  test('paginação mantém filtros, reinicia ao filtrar e sobrevive ao refresh', async ({
    app,
    page,
  }) => {
    await app.open('/')
    await page.getByRole('link', { name: 'Página 3' }).click()
    await expect(page).toHaveURL(/page=3/)
    await expect(page.getByRole('link', { name: 'Página 3' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const pageThree = await app.catalogNames()

    await app.toggleFilter('Arte digital')
    await expect(page).not.toHaveURL(/page=/)

    await page.goBack()
    await expect(page).toHaveURL(/page=3/)
    await expect.poll(() => app.catalogNames()).toEqual(pageThree)

    await page.reload()
    await app.waitForMocks()
    await expect.poll(() => app.catalogNames()).toEqual(pageThree)
  })

  test('busca pelo header e remoção pelo chip', async ({ app, page }) => {
    await app.open('/')
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('searchbox', { name: 'Termo de busca' }).fill('golden')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(page).toHaveURL(/q=golden/)
    await expect.poll(() => app.catalogNames()).toHaveLength(3)

    await page.getByRole('button', { name: /Remover filtro “golden”/ }).click()
    await expect(page).not.toHaveURL(/q=/)
    await expect.poll(() => app.catalogNames()).toHaveLength(9)
  })

  test('busca mobile com debounce não cria uma entrada de histórico por letra @main', async ({
    app,
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Campo de busca visível só no layout mobile')
    await app.open('/')
    await page
      .getByRole('searchbox', { name: 'Buscar NFTs' })
      .pressSequentially('golden', { delay: 40 })
    await expect(page).toHaveURL(/q=golden/)
    await expect.poll(() => app.catalogNames()).toHaveLength(3)
    await page.goBack()
    await expect(page).not.toHaveURL(/q=/)
  })

  test('respostas fora de ordem não sobrescrevem a busca mais recente', async ({
    app,
    page,
  }) => {
    await app.open('/', { scenario: 'out-of-order' })
    const searchFor = async (term: string) => {
      await page.getByRole('button', { name: 'Buscar NFTs' }).click()
      await page.getByRole('searchbox', { name: 'Termo de busca' }).fill(term)
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    }
    // "e" answers after ~1.4 s, "eme" after ~0.75 s: the older request finishes last.
    await searchFor('e')
    await searchFor('eme')
    await expect(page).toHaveURL(/q=eme/)
    await page.waitForTimeout(2_000)
    expect(await app.catalogNames()).toEqual(['Emerald Ape #042'])
  })

  test('parâmetros inválidos na URL são ignorados', async ({ app, page }) => {
    await app.open('/?page=abc&sort=zzz&collection=%5B%22nope%22%5D')
    await expect.poll(() => app.catalogNames()).toHaveLength(9)
    await expect(
      page.getByRole('combobox', { name: /Ordenar por/ }),
    ).toContainText('Listados recentemente')
  })
})

test.describe('Catálogo: carregamento, vazio, erro e recuperação', () => {
  test('skeletons durante carregamento lento @main', async ({ app, page }) => {
    await app.open('/', { scenario: 'slow' })
    await expect(
      page.locator('#catalogo .skeleton:visible').first(),
    ).toBeVisible()
    // Catalog and spotlight are separate requests, each 1.5–3 s in this scenario.
    await expect(page.locator('#catalogo h3').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('#catalogo .skeleton:visible')).toHaveCount(0, {
      timeout: 15_000,
    })
  })

  test('resultado vazio', async ({ app, page }) => {
    await app.open('/', { scenario: 'empty' })
    await expect(
      page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
    ).toBeVisible()
  })

  test('falha 503 mostra erro e se recupera ao tentar novamente @main', async ({
    app,
    page,
  }) => {
    await app.open('/', { scenario: 'catalog-unavailable' })
    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await app.setScenario('fast')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect.poll(() => app.catalogNames()).toHaveLength(9)
  })

  test('falhas transitórias são repetidas automaticamente', async ({
    app,
    page,
  }) => {
    await app.open('/', { scenario: 'catalog-error' })
    await expect
      .poll(() => app.catalogNames(), { timeout: 10_000 })
      .toHaveLength(9)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
