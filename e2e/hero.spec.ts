import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** A real one-finger touch drag (CDP), so `touch-action` and pointer events apply. */
async function swipe(page: Page, target: Locator, dx: number) {
  const box = await target.boundingBox()
  if (!box) throw new Error('swipe target not visible')
  const y = box.y + box.height / 2
  const x = box.x + box.width / 2 - dx / 2
  const cdp = await page.context().newCDPSession(page)
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: { x: number; y: number }[],
  ) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
  await touch('touchStart', [{ x, y }])
  for (let step = 1; step <= 5; step++) {
    await touch('touchMove', [{ x: x + (dx * step) / 5, y }])
  }
  await touch('touchEnd', [])
}

const pressedDot = (page: Page) =>
  page
    .getByRole('group', { name: 'Destaques' })
    .getByRole('button', { pressed: true })

test.describe('Hero: troca de destaque por gesto', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('arrastar para os lados troca o destaque, com volta ao início', async ({
    app,
    page,
  }) => {
    await app.open('/')
    const hero = page.locator('section[aria-labelledby="mobile-hero-title"]')
    const dots = page
      .getByRole('group', { name: 'Destaques' })
      .getByRole('button')
    const total = await dots.count()
    expect(total).toBeGreaterThan(1)
    await expect(pressedDot(page)).toHaveAccessibleName(
      new RegExp(`destaque 1 de ${total}`),
    )

    // Swipe left on the artwork: next slide, and the link does not open.
    await swipe(page, hero.getByRole('link', { name: /^Ver / }), -120)
    await expect(pressedDot(page)).toHaveAccessibleName(
      new RegExp(`destaque 2 de ${total}`),
    )
    await expect(page).toHaveURL(/\/\?scenario=fast$/)

    // Swipe right twice: back to the first, then wraps to the last.
    await swipe(page, hero, 120)
    await swipe(page, hero, 120)
    await expect(pressedDot(page)).toHaveAccessibleName(
      new RegExp(`destaque ${total} de ${total}`),
    )

    // A short drag is a tap, not a swipe.
    await swipe(page, hero, 20)
    await expect(pressedDot(page)).toHaveAccessibleName(
      new RegExp(`destaque ${total} de ${total}`),
    )
  })
})
