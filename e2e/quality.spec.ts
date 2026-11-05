import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
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

test.describe('tour', () => {
  const card = (page: Page) => page.getByRole('dialog')

  test('walks from new hire to manager to HR, then returns, without changing data', async ({ page }) => {
    const noErrors = watchForErrors(page)
    await openApp(page)
    const before = await page.evaluate(() => localStorage.getItem('brightpath-welcome:v1'))
    await page.getByRole('button', { name: 'Show me around' }).click()
    await expect(card(page)).toContainText('Step 1 of 7')
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused()

    const expected = [
      ['Three tasks, not 18', /me\/emily-carter$/],
      ['Waiting isn’t late', /me\/emily-carter$/],
      ['Ask a question', /me\/emily-carter$/],
      ['What a manager sees', /team\/david$/],
      ['Requests reach the right person', /team\/sarah$/],
      ['See it from any side', /team\/sarah$/],
    ] as const
    for (const [title, url] of expected) {
      await page.getByRole('button', { name: 'Next', exact: true }).click()
      await expect(card(page)).toContainText(title)
      await expect(page).toHaveURL(url)
    }

    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(card(page)).toContainText('Requests reach the right person')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await expect(card(page)).toHaveCount(0)
    await expect(page).toHaveURL(/me\/emily-carter$/)
    await expect(page.locator('main')).toBeFocused()
    expect(await page.evaluate(() => localStorage.getItem('brightpath-welcome:v1'))).toBe(before)
    noErrors()
  })

  // Every step: the spotlight is on the right element, and the card is fully on screen.
  const TARGETS = ['journey', 'start-here', 'waiting', 'ask', 'attention', 'help-requests', 'view-as']

  async function checkEveryStep(page: Page) {
    for (const [index, name] of TARGETS.entries()) {
      await expect(card(page)).toContainText(`Step ${index + 1} of 7`)
      const target = page.locator(`[data-tour="${name}"]`)
      await expect(async () => {
        const spot = await page.locator('[data-tour-spotlight]').boundingBox()
        const box = await target.boundingBox()
        expect(spot && box && Math.abs(spot.x + 6 - box.x)).toBeLessThan(2)
        expect(spot && box && Math.abs(spot.y + 6 - box.y)).toBeLessThan(2)
      }).toPass({ timeout: 3000 })
      await expect(card(page)).toBeInViewport({ ratio: 1 })
      await expect(target).toBeInViewport()
      if (index < TARGETS.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click()
    }
  }

  test('puts the spotlight on the right element, with the card on screen, at every step', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Show me around' }).click()
    await checkEveryStep(page)
  })

  test('the card does not cover its target on a desktop screen', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Show me around' }).click()
    for (const [index, name] of TARGETS.entries()) {
      await expect(card(page)).toContainText(`Step ${index + 1} of 7`)
      const target = page.locator(`[data-tour="${name}"]`)
      await expect(async () => {
        const spot = await page.locator('[data-tour-spotlight]').boundingBox()
        const box = await target.boundingBox()
        expect(spot && box && Math.abs(spot.y + 6 - box.y)).toBeLessThan(2)
      }).toPass({ timeout: 3000 })
      const a = await card(page).boundingBox()
      const b = await target.boundingBox()
      if (a && b) {
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
        expect(overlapX > 0 && overlapY > 0, `${name} is covered`).toBe(false)
      }
      if (index < TARGETS.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click()
    }
  })

  test('blocks clicks on the page behind it', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Show me around' }).click()
    await expect(card(page)).toBeVisible()
    await page.mouse.click(280, 590)
    await expect(page.locator('header')).toContainText('Whole plan: 6 of 18')
    await expect(card(page)).toBeVisible()
  })

  test('works by keyboard, and Escape closes it where it started', async ({ page }) => {
    await openApp(page, '#/me/marcus-webb')
    await page.getByRole('button', { name: 'Show me around' }).click()
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(card(page)).toContainText('Step 2 of 7')
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused()
    // Focus stays inside the card.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab')
    expect(await card(page).evaluate((element) => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(card(page)).toHaveCount(0)
    await expect(page).toHaveURL(/me\/marcus-webb$/)
  })

  test('still works when a step’s target is gone', async ({ page }) => {
    await openApp(page, '#/team/sarah')
    await page.getByRole('button', { name: /Mark.*resolved/i }).click()
    await page.getByRole('button', { name: 'Show me around' }).click()
    for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(card(page)).toContainText('Requests reach the right person')
    await expect(page).toHaveURL(/team\/sarah$/)
  })

  test('has no accessibility violations', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Show me around' }).click()
    await expect(card(page)).toBeVisible()
    await page.waitForTimeout(400)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(violations.map((violation) => violation.id)).toEqual([])
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('starts from the menu and stays on screen', async ({ page }) => {
      await openApp(page)
      await page.getByRole('button', { name: /Emily Carter/ }).click()
      await page.getByRole('menuitem', { name: /Show me around/ }).click()
      await expect(card(page)).toContainText('Step 1 of 7')
      await checkEveryStep(page)
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflows).toBe(false)
    })
  })
})
