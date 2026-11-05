import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openApp, watchForErrors } from './helpers'

const SCREENS = [
  ['first-day home', '#/me/emily-carter'],
  ['overdue home', '#/me/marcus-webb'],
  ['finished home', '#/me/aisha-rahman'],
  ['full plan', '#/me/priya-nair/plan'],
  ['task drawer', '#/me/emily-carter/task/c-handbook'],
  ['manager roster', '#/team/david'],
  ['HR roster', '#/team/sarah'],
  ['hire detail', '#/team/sarah/hire/marcus-webb'],
  ['new plan form', '#/team/sarah/new'],
  ['nudge and help on a late plan', '#/me/tomas-rivera'],
  ['not found', '#/nope'],
] as const

for (const [label, width, height] of [
  ['desktop', 1440, 900],
  ['phone', 360, 740],
] as const) {
  test.describe(`${label} quality`, () => {
    test.use({ viewport: { width, height } })

    for (const [name, hash] of SCREENS) {
      test(`${name} has no accessibility violations or sideways scroll`, async ({ page }) => {
        const noErrors = watchForErrors(page)
        await openApp(page, hash)
        await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('dialog')).first()).toBeVisible()
        // Waits for entry animations, because axe measures contrast from the current opacity.
        await page.waitForTimeout(400)
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        const summary = violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target.join(' ')).slice(0, 4),
          detail: violation.nodes[0]?.failureSummary,
        }))
        expect(summary).toEqual([])
        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
        expect(overflows).toBe(false)
        noErrors()
      })
    }
  })
}

test.describe('main journey', () => {
  test('runs from new hire to manager to HR with no errors', async ({ context }) => {
    const emily = await context.newPage()
    const noErrors = watchForErrors(emily)
    await openApp(emily)
    await expect(emily.getByText('Start here')).toBeVisible()
    await emily.getByRole('button', { name: 'Mark complete' }).click()
    await expect(emily.locator('header')).toContainText('Whole plan: 7 of 18')

    const manager = await context.newPage()
    const managerClean = watchForErrors(manager)
    await openApp(manager, '#/team/david')
    await expect(manager.locator('table')).toContainText('7 of 18')
    await manager.locator('table').getByRole('link', { name: 'Priya Nair' }).click()
    await manager.getByRole('button', { name: 'Nudge Priya' }).click()
    await expect(manager.getByText('Nudged today')).toBeVisible()

    await manager.goto('/#/team/sarah/hire/emily-carter/task/e-repo-grant')
    await manager.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(emily.getByRole('heading', { name: 'Waiting on someone else' })).toHaveCount(0)

    noErrors()
    managerClean()
  })
})

test.describe('keyboard', () => {
  test('a task can be opened, completed and closed with the keyboard alone', async ({ page }) => {
    await openApp(page)
    const link = page.getByRole('link', { name: 'Task details' })
    await link.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Focus starts on the scrollable content, so arrow keys can scroll it straight away.
    await expect(dialog.locator(':focus')).toHaveCount(1)
    // The scroll area, then the sample document, then the action.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Mark complete' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog.getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.locator('header')).toContainText('7 of 18')
  })

  test('the View as menu works with the keyboard', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /Emily Carter/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.type('David')
    await expect(page.getByRole('menuitem', { name: /David Park/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/team\/david$/)
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('state changes stay visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openApp(page)
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('7 of 18')
    await page.locator('[data-task-link="e-docs"]').click()
    await expect(page.getByRole('dialog')).toContainText('Why it matters')
    const duration = await page
      .getByRole('dialog')
      .evaluate((element) => getComputedStyle(element).animationDuration)
    expect(duration).toBe('0.1s')
  })
})
