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

const EMILY_STEPS = ['journey', 'start-here', 'waiting', 'ask', 'full-plan', 'view-as']
const DAVID_STEPS = ['attention', 'next-actions', 'roster', 'view-as']
const SARAH_STEPS = ['attention', 'next-actions', 'help-requests', 'new-plan', 'view-as']

const card = (page: Page) => page.getByRole('dialog')
const next = (page: Page) => page.getByRole('button', { name: 'Next', exact: true })

/** At every step: the spotlight is on the right element, and the card is fully on screen. */
async function checkEveryStep(page: Page, targets: readonly string[], { noOverlap = false } = {}) {
  for (const [index, name] of targets.entries()) {
    await expect(card(page)).toContainText(`Step ${index + 1} of ${targets.length}`)
    const target = page.locator(`[data-tour="${name}"]`)
    await expect(async () => {
      const spot = await page.locator('[data-tour-spotlight]').boundingBox()
      const box = await target.boundingBox()
      expect(spot && box && Math.abs(spot.x + 6 - box.x)).toBeLessThan(2)
      expect(spot && box && Math.abs(spot.y + 6 - box.y)).toBeLessThan(2)
    }).toPass({ timeout: 3000 })
    await expect(card(page)).toBeInViewport({ ratio: 1 })
    await expect(target).toBeInViewport()
    if (noOverlap) {
      const a = await card(page).boundingBox()
      const b = await target.boundingBox()
      if (a && b) {
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
        expect(overlapX > 0 && overlapY > 0, `${name} is covered`).toBe(false)
      }
    }
    if (index < targets.length - 1) await next(page).click()
  }
}

test.describe('tour, replayed from the button', () => {
  const start = (page: Page) => page.getByRole('button', { name: 'Show me around' }).click()

  test('walks through a new hire’s screen, then returns, without changing data', async ({ page }) => {
    const noErrors = watchForErrors(page)
    await openApp(page)
    const before = await page.evaluate(() => localStorage.getItem('brightpath-welcome:v1'))
    await start(page)
    await checkEveryStep(page, EMILY_STEPS, { noOverlap: true })
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(card(page)).toContainText('Everything is one click away')
    await next(page).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await expect(card(page)).toHaveCount(0)
    await expect(page.locator('main')).toBeFocused()
    expect(await page.evaluate(() => localStorage.getItem('brightpath-welcome:v1'))).toBe(before)
    noErrors()
  })

  test('gives a manager and HR their own steps', async ({ page }) => {
    await openApp(page, '#/team/david')
    await start(page)
    await checkEveryStep(page, DAVID_STEPS, { noOverlap: true })
    await page.getByRole('button', { name: 'Finish' }).click()

    await page.goto('/#/team/sarah')
    await start(page)
    await checkEveryStep(page, SARAH_STEPS, { noOverlap: true })
  })

  test('leaves out steps that are not on this person’s screen', async ({ page }) => {
    await openApp(page, '#/me/aisha-rahman')
    await start(page)
    await checkEveryStep(page, ['journey', 'ask', 'full-plan', 'view-as'])
  })

  test('starting from a detail screen tours the main screen, then returns', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    await start(page)
    await expect(card(page)).toContainText('Who needs your help')
    await expect(page).toHaveURL(/team\/david$/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/hire\/priya-nair$/)
  })

  test('blocks clicks on the page behind it', async ({ page }) => {
    await openApp(page)
    await start(page)
    await expect(card(page)).toBeVisible()
    await page.mouse.click(280, 590)
    await expect(page.locator('header')).toContainText('Whole plan: 6 of 18')
    await expect(card(page)).toBeVisible()
  })

  test('works by keyboard', async ({ page }) => {
    await openApp(page, '#/me/marcus-webb')
    await start(page)
    await expect(next(page)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(card(page)).toContainText('Step 2 of')
    await expect(next(page)).toBeFocused()
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab')
    expect(await card(page).evaluate((element) => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(card(page)).toHaveCount(0)
    await expect(page).toHaveURL(/me\/marcus-webb$/)
  })

  test('has no accessibility violations', async ({ page }) => {
    await openApp(page)
    await start(page)
    await expect(card(page)).toBeVisible()
    await page.waitForTimeout(400)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(violations.map((violation) => violation.id)).toEqual([])
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('starts from the menu, and the spotlight and card stay on screen', async ({ page }) => {
      await openApp(page)
      await page.getByRole('button', { name: /Emily Carter/ }).click()
      await page.getByRole('menuitem', { name: /Show me around/ }).click()
      await checkEveryStep(page, EMILY_STEPS)
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflows).toBe(false)
    })
  })
})

test.describe('tour on a first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('opens by itself once, and not again after a refresh', async ({ page }) => {
    const noErrors = watchForErrors(page)
    await openApp(page, '#/')
    await expect(card(page)).toContainText('See where you are')
    await expect(page).toHaveURL(/me\/emily-carter$/)
    await page.reload()
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(card(page)).toHaveCount(0)
    noErrors()
  })

  test('skipping counts as seen', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Skip tour' }).click()
    await expect(card(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(card(page)).toHaveCount(0)
  })

  test('each person gets their own tour the first time', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Skip tour' }).click()
    await page.getByRole('button', { name: /Emily Carter/ }).click()
    await page.getByRole('menuitem', { name: /David Park/ }).click()
    await expect(card(page)).toContainText('Who needs your help')
    await page.getByRole('button', { name: 'Skip tour' }).click()
    await expect(card(page)).toHaveCount(0)
    await page.goto('/#/me/emily-carter')
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(card(page)).toHaveCount(0)
    await page.goto('/#/team/david')
    await expect(page.getByRole('heading', { name: 'Who needs attention' })).toBeVisible()
    await expect(card(page)).toHaveCount(0)
  })

  test('does not interrupt a link to a task, and shows once that closes', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/task/c-handbook')
    await expect(page.getByRole('dialog')).toContainText('Why it matters')
    await expect(page.getByText('See where you are')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByText('See where you are')).toBeVisible()
  })

  test('does not open on a bad link', async ({ page }) => {
    await openApp(page, '#/me/nobody')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We can’t find that person')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('resetting the demo data does not bring tours back', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Skip tour' }).click()
    await page.getByRole('button', { name: /Emily Carter/ }).click()
    await page.getByRole('menuitem', { name: /Reset demo data/ }).click()
    await page.getByRole('button', { name: 'Reset data' }).click()
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(page.getByText('See where you are')).toHaveCount(0)
  })

  test('a browser that blocks saving does not replay the tour every time', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('Blocked', 'SecurityError')
      }
    })
    await openApp(page)
    await expect(page.getByText('This browser is blocking saved data')).toBeVisible()
    await expect(card(page)).toHaveCount(0)
  })
})
