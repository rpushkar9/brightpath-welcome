import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const back = (page: import('@playwright/test').Page, name: string | RegExp) =>
  page.getByRole('navigation', { name: 'Go back' }).getByRole('link', { name })

test.describe('getting back', () => {
  for (const [label, hash, name, url] of [
    ['a manager’s hire page', '#/team/david/hire/priya-nair', 'Back to your team', /team\/david$/],
    ['HR’s hire page', '#/team/sarah/hire/marcus-webb', 'Back to all new hires', /team\/sarah$/],
    ['the new plan form', '#/team/sarah/new', 'Back to all new hires', /team\/sarah$/],
    ['the full plan', '#/me/emily-carter/plan', 'Back to my next steps', /me\/emily-carter$/],
  ] as const) {
    test(`${label} has a clear way back`, async ({ page }) => {
      await openApp(page, hash)
      await back(page, name).click()
      await expect(page).toHaveURL(url)
    })
  }

  test('main screens show no back button', async ({ page }) => {
    await openApp(page, '#/team/david')
    await expect(page.getByRole('navigation', { name: 'Go back' })).toHaveCount(0)
  })

  test('the back button stays on screen while scrolling, and names where you are', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 })
    await openApp(page, '#/team/david/hire/priya-nair')
    const bar = page.getByRole('navigation', { name: 'Go back' })
    await expect(bar).toContainText('Priya Nair')
    await page.evaluate(() => window.scrollTo(0, 500))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    await expect(back(page, 'Back to your team')).toBeInViewport({ ratio: 1 })
  })

  test('the back bar passes an accessibility scan', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    await page.waitForTimeout(400)
    const { violations } = await new AxeBuilder({ page })
      .include('nav')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(violations.map((violation) => violation.id)).toEqual([])
  })

  test('opening someone starts at the top of their page, and going back returns to your place', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 })
    await openApp(page, '#/team/sarah')
    const link = page.locator('table').getByRole('link', { name: 'Jordan Lee' })
    await link.scrollIntoViewIfNeeded()
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(100)
    await link.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jordan Lee')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await back(page, 'Back to all new hires').click()
    await expect(page.getByRole('heading', { name: 'All new hires' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y)
  })

  test('opening and closing a task does not lose your place', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 })
    await openApp(page, '#/team/david/hire/priya-nair')
    const row = page.locator('[data-task-link="e-on-call"]')
    await row.scrollIntoViewIfNeeded()
    const y = await page.evaluate(() => window.scrollY)
    await row.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    expect(await page.evaluate(() => window.scrollY)).toBe(y)
  })

  test('the logo goes to your own home, not to someone else’s', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    await page.getByRole('link', { name: 'BrightPath Welcome' }).click()
    await expect(page).toHaveURL(/team\/david$/)
    await page.goto('/#/me/marcus-webb/plan')
    await page.getByRole('link', { name: 'BrightPath Welcome' }).click()
    await expect(page).toHaveURL(/me\/marcus-webb$/)
  })

  test('the task drawer has a labelled Close button', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair/task/c-benefits')
    const close = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })
    await expect(close).toHaveText('Close')
    await close.click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL(/hire\/priya-nair$/)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 360, height: 740 } })

    test('the bar fits, with a long name', async ({ page }) => {
      await openApp(page, '#/team/sarah/new')
      await page.getByLabel('Full name').fill('Wolfeschlegelsteinhausenbergerdorff Mackenzie-Abernathy')
      await page.getByLabel('Job title').fill('Engineer')
      await page.getByRole('radio', { name: 'Sales' }).check()
      await page.getByLabel('Start date').fill('2026-11-16')
      await page.getByRole('button', { name: 'Start plan' }).click()
      await expect(back(page, 'Back to all new hires')).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    })
  })
})
