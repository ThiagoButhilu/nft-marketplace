import { expect, test } from './fixtures'

/** No horizontal overflow at the widths the challenge requires (390/768/1440). */
const WIDTHS = [390, 768, 1440]
const PUBLIC_PAGES = [
  '/',
  '/nft/emerald-ape-042',
  '/cart',
  '/login',
  '/signup',
  '/em-breve?secao=aprenda',
]

test.describe('Responsividade', () => {
  for (const width of WIDTHS) {
    test(`sem rolagem horizontal em ${width}px`, async ({ app, page }) => {
      await page.setViewportSize({ width, height: 900 })
      await app.open('/')
      await app.addToCart([['emerald-ape-042', '1-50', 2]])
      for (const path of PUBLIC_PAGES) {
        await app.goto(path)
        await page.waitForTimeout(400)
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        expect(overflow, `${path} @ ${width}px`).toBe(0)
      }
      await app.loginViaApi('ana')
      await app.addToCart([['ivory-baron-088', '1-50', 9]])
      for (const path of [
        '/checkout',
        '/account/profile',
        '/account/wallets',
        '/account/favorites',
      ]) {
        await app.goto(path)
        await page.waitForTimeout(600)
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        expect(overflow, `${path} @ ${width}px`).toBe(0)
      }
    })
  }
})
