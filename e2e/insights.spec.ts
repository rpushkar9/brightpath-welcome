import { expect, test } from '@playwright/test'
import { openApp, watchForErrors } from './helpers'

const LIST = '#/team/sarah/insights'
const rows = (page: import('@playwright/test').Page) => page.locator('main ul.glass > li')

test.describe('insights', () => {
  test('ranks friction and shows counts', async ({ page }) => {
    const check = watchForErrors(page)
    await openApp(page, LIST)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where people get stuck')
    await expect(rows(page).filter({ hasText: 'Create CRM account' })).toContainText('3 of 3 hires')
    await expect(rows(page).filter({ hasText: 'Review CRM workflows' })).toContainText('2 help requests from 2 hires')
    check()
  })

  test('filters narrow the list and can be cleared', async ({ page }) => {
    await openApp(page, LIST)
    const all = await rows(page).count()
    await page.getByLabel('Department').selectOption({ label: 'Engineering' })
    await expect(rows(page).filter({ hasText: 'Create CRM account' })).toHaveCount(0)
    expect(await rows(page).count()).toBeLessThan(all)
    const empty = page.getByRole('button', { name: 'Clear filters' })
    for (const owner of ['New hire', 'Manager', 'HR', 'IT']) {
      await page.getByLabel('Owner').selectOption({ label: owner })
      if (await empty.isVisible()) break
    }
    await expect(empty).toBeVisible()
    await empty.click()
    await expect(rows(page)).toHaveCount(all)
  })

  test('drilldown links to the hire task', async ({ page }) => {
    await openApp(page, LIST)
    await page.getByRole('link', { name: 'Create CRM account' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create CRM account')
    await expect(page.getByRole('heading', { name: 'Who’s affected' })).toBeVisible()
    await page.getByRole('link', { name: /Tomás Rivera/ }).click()
    await expect(page).toHaveURL(/hire\/tomas-rivera\/task\/s-crm-account$/)
  })

  test('proposal persists and status changes', async ({ page }) => {
    await openApp(page, '#/team/sarah/insights/s-crm-account')
    await page.getByRole('button', { name: 'Propose a plan improvement' }).click()
    await expect(page.getByText('Improvement proposed')).toBeVisible()
    await page.getByRole('link', { name: 'Back to Insights' }).first().click()
    const queue = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Improvement queue' }) })
    await expect(queue).toContainText('Create CRM account')
    await queue.getByLabel(/Status/).selectOption({ label: 'Under review' })
    await page.reload()
    await expect(queue.getByLabel(/Status/)).toHaveValue('under-review')
  })

  test('a blank proposal shows an error', async ({ page }) => {
    await openApp(page, '#/team/sarah/insights/s-crm-account')
    await page.getByLabel('Your proposed improvement').fill('   ')
    await page.getByRole('button', { name: 'Propose a plan improvement' }).click()
    await expect(page.getByRole('alert')).toContainText('Describe the improvement first.')
  })

  test('unknown task and non-HR routes', async ({ page }) => {
    await openApp(page, '#/team/sarah/insights/nope')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We can’t find that task')
    await page.goto('/#/team/david/insights')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Insights are for HR')
  })

  for (const hash of [LIST, '#/team/sarah/insights/s-crm-account']) {
    test(`no sideways scrolling at 360px: ${hash}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      await openApp(page, hash)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('insights with little or no data', () => {
  const empty = JSON.stringify({
    version: 2,
    seededOn: '2026-11-04',
    hires: [],
    completions: {},
    nudges: [],
    helpRequests: [],
    events: [],
    seenThrough: {},
    improvements: [],
  })

  test('says there is not enough activity, with no misleading zero figures', async ({ page }) => {
    await page.addInitScript((saved) => localStorage.setItem('brightpath-welcome:v1', saved), empty)
    await openApp(page, '#/team/sarah/insights')
    await expect(page.getByText('Not enough activity to identify recurring problems yet.')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('0 tasks')
    await expect(page.locator('main')).not.toContainText('0 of 0')
  })

  test('a task with no friction says so, and can still take a proposal', async ({ page }) => {
    await openApp(page, '#/team/sarah/insights/c-profile')
    await expect(page.getByText('No recorded friction on this task right now.')).toBeVisible()
    await page.getByLabel('Your proposed improvement').fill('Shorten the profile form.')
    await page.getByRole('button', { name: 'Propose a plan improvement' }).click()
    await expect(page.getByText('Improvement proposed')).toBeVisible()
  })
})
