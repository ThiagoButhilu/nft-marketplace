import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

test.describe('Teclado e foco', () => {
  test('link para pular ao conteúdo', async ({ app, page }) => {
    await app.open('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('filtro operável pelo teclado com foco visível', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const checkbox = page.getByRole('checkbox', { name: /Fotografia/ })
    await checkbox.focus()
    const outline = await page.evaluate(() => {
      const label = document.activeElement?.closest('label')
      return label ? getComputedStyle(label).outlineStyle : 'none'
    })
    expect(outline).not.toBe('none')
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/photography/)
  })

  test('diálogo de login prende o foco e fecha com Esc', async ({
    app,
    page,
  }) => {
    await app.open('/cart')
    await page.getByRole('link', { name: 'Entrar' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('[role=dialog]'),
        ),
      ).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/cart/)
  })

  test('drawer de filtros mobile devolve o foco ao fechar @main', async ({
    app,
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Drawer de filtros é o padrão só no mobile')
    await app.open('/')
    const trigger = page.getByRole('button', { name: /^Filtros/ })
    await trigger.click()
    await expect(
      page.getByRole('dialog', { name: 'Filtrar e ordenar' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })

  test('compra só com teclado até a revisão', async ({ app, page }) => {
    await app.startCheckout()
    await page.getByRole('button', { name: 'Conectar carteira' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText(/Conectada:/)).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar compra' }).focus()
    await page.keyboard.press('Enter')
    await expect(app.reviewDialog()).toBeVisible()
    await expect(
      page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')),
    ).resolves.toBe(true)
  })
})

test.describe('Varredura automática (axe-core)', () => {
  const pages: Array<[string, string]> = [
    ['Início', '/'],
    ['Detalhe', '/nft/emerald-ape-042'],
    ['Carrinho vazio', '/cart'],
    ['Login', '/login'],
    ['Em breve', '/em-breve?secao=criadores'],
  ]
  for (const [name, path] of pages) {
    test(`${name} sem violações graves @main`, async ({ app, page }) => {
      await app.open(path)
      await page.waitForTimeout(600)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      expect(
        serious.map(
          (v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`,
        ),
      ).toEqual([])
    })
  }

  test('Checkout sem violações graves', async ({ app, page }) => {
    await app.startCheckout()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(
      serious.map(
        (v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`,
      ),
    ).toEqual([])
  })
})
