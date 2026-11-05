import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

const back = (page: import('@playwright/test').Page, name: string | RegExp) =>
  page.getByRole('navigation', { name: 'Go back' }).getByRole('link', { name })

test.describe('getting back', () => {
  for (const [label, hash, name, url] of [
    ['a manager’s hire page', '#/team/david/hire/priya-nair', 'Back to your team', /team\/david$/],
    ['HR’s hire page', '#/team/sarah/hire/marcus-webb', 'Back to People', /team\/sarah\/people$/],
    ['the new plan form', '#/team/sarah/new', 'Back to People', /team\/sarah\/people$/],
    ['the full plan', '#/me/emily-carter/plan', 'Back to my next steps', /me\/emily-carter$/],
  ] as const) {
    test(`${label} has a clear way back`, async ({ page }) => {
      await openApp(page, hash)
      await back(page, name).click()
      await expect(page).toHaveURL(url)
    })
  }

  test('HR returns to the area they came from', async ({ page }) => {
    await openApp(page, '#/team/sarah')
    await page.locator('li').filter({ has: page.getByRole('heading', { name: 'Marcus Webb' }) }).getByRole('link', { name: 'Open plan' }).click()
    await back(page, 'Back to Overview').click()
    await expect(page).toHaveURL(/team\/sarah$/)
  })

  test('main navigation shows where you are, and HR has three areas', async ({ page }) => {
    await openApp(page, '#/team/sarah')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    await nav.getByRole('link', { name: 'Insights' }).click()
    await expect(page).toHaveURL(/team\/sarah\/insights$/)
    await expect(nav.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page')
    await nav.getByRole('link', { name: 'People' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('People')
  })

  test('managers and new hires do not see HR areas', async ({ page }) => {
    await openApp(page, '#/team/david')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'Insights' })).toHaveCount(0)
    await page.goto('/#/me/emily-carter')
    await expect(nav.getByRole('link', { name: 'Insights' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Full plan' })).toBeVisible()
  })

  test('main screens show no back button', async ({ page }) => {
    await openApp(page, '#/team/david')
    await expect(page.getByRole('navigation', { name: 'Go back' })).toHaveCount(0)
  })

  test('the back button sits at the left above the title, and stands out', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    const button = back(page, 'Back to your team')
    await expect(button).toBeInViewport({ ratio: 1 })
    await expect(button).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    const a = await button.boundingBox()
    const title = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(a && title && Math.abs(a.x - title.x)).toBeLessThan(2)
    expect(a && title && a.y + a.height <= title.y).toBe(true)
    // It belongs to the page, so it scrolls away instead of being pinned to the screen.
    await page.setViewportSize({ width: 1280, height: 500 })
    await page.evaluate(() => window.scrollTo(0, 500))
    await expect(button).not.toBeInViewport()
  })

  test('long pages have another way back at the end', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 })
    await openApp(page, '#/team/david/hire/priya-nair')
    const atEnd = page.locator('main').getByRole('link', { name: 'Back to your team' })
    await atEnd.scrollIntoViewIfNeeded()
    await expect(atEnd).toBeInViewport()
    await atEnd.click()
    await expect(page).toHaveURL(/team\/david$/)
  })

  test('the back button passes an accessibility scan', async ({ page }) => {
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
    await openApp(page, '#/team/sarah/people')
    const link = page.locator('table').getByRole('link', { name: 'Jordan Lee' })
    await link.scrollIntoViewIfNeeded()
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(100)
    await link.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jordan Lee')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await back(page, 'Back to People').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('People')
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

    test('a tab bar reaches every HR area, and requests come before task lists', async ({ page }) => {
      await openApp(page, '#/team/sarah')
      const nav = page.getByRole('navigation', { name: 'Main' })
      await expect(nav).toBeInViewport({ ratio: 1 })
      const requests = await page.getByRole('heading', { name: /Help requests/ }).boundingBox()
      const actions = await page.getByRole('heading', { name: /Your next actions/ }).boundingBox()
      expect(requests && actions && requests.y < actions.y).toBe(true)
      await page.getByRole('button', { name: /Show all 5/ }).click()
      await expect(page.getByRole('heading', { name: 'HR tasks' })).toBeVisible()
      await nav.getByRole('link', { name: 'People' }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('People')
      await expect(page.getByRole('link', { name: 'Marcus Webb' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    })

    test('the button fits, with a long name', async ({ page }) => {
      await openApp(page, '#/team/sarah/new')
      await page.getByLabel('Full name').fill('Wolfeschlegelsteinhausenbergerdorff Mackenzie-Abernathy')
      await page.getByLabel('Job title').fill('Engineer')
      await page.getByRole('radio', { name: 'Sales' }).check()
      await page.getByLabel('Start date').fill('2026-11-16')
      await page.getByRole('button', { name: 'Start plan' }).click()
      await expect(back(page, 'Back to People')).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    })
  })
})
