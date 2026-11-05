import { expect, test } from '@playwright/test'
import { FIXED_NOW, openApp, watchForErrors } from './helpers'

const STORAGE_KEY = 'brightpath-welcome:v1'

test.describe('employee journey', () => {
  test('shows a first-day hire what to do first, not the whole plan', async ({ page }) => {
    const noErrors = watchForErrors(page)
    await openApp(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to your first day, Emily.')
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Set up your laptop and sign in' })).toBeVisible()
    await expect(page.getByText('1 more open in your plan.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'See the full plan (18 tasks)' })).toBeVisible()
    // The other 15 tasks stay out of the next steps list.
    await expect(page.getByRole('heading', { name: 'Your next steps' }).locator('..').locator('ul > li')).toHaveCount(3)
    noErrors()
  })

  test('completing a task updates progress at once, and Undo restores it', async ({ page }) => {
    await openApp(page)
    await expect(page.locator('header')).toContainText('Whole plan: 6 of 18')
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
    await expect(page.getByRole('heading', { name: 'Review the employee handbook' })).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.locator('header')).toContainText('Whole plan: 6 of 18')
    await expect(page.getByRole('heading', { name: 'Set up your laptop and sign in' })).toBeVisible()
  })

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`a double click completes only one task (motion: ${reducedMotion})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion })
      await openApp(page)
      await page.getByRole('button', { name: 'Mark complete' }).dblclick()
      await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
      await expect(page.getByRole('heading', { name: 'Review the employee handbook' })).toBeVisible()
      await expect(page.getByText('This task is already complete.')).toHaveCount(0)
    })
  }

  test('the finished task shows Done before the next one arrives', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Mark complete' }).click()
    const card = page.getByText('Start here').locator('..')
    await expect(card.getByRole('button', { name: 'Done' })).toBeVisible()
    await expect(card).toContainText('Set up your laptop and sign in')
    await expect(card).toContainText('Review the employee handbook')
    await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
  })

  test('progress survives a refresh', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
    await page.reload()
    await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
  })

  test('the drawer has its own link, Back closes it, and focus returns', async ({ page }) => {
    await openApp(page)
    const row = page.locator('[data-task-link="c-handbook"]')
    await row.click()
    await expect(page).toHaveURL(/task\/c-handbook$/)
    await expect(page.getByRole('dialog')).toContainText('Why it matters')
    await page.goBack()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL(/#\/me\/emily-carter$/)
    await row.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(row).toBeFocused()
  })

  test('Back and Forward through a drawer leave no stray entries', async ({ page }) => {
    await openApp(page)
    await page.locator('[data-task-link="c-handbook"]').click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.goForward()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL(/#\/me\/emily-carter$/)
    await page.goForward()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('closing a drawer opened from a direct link stays on the page', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/task/c-handbook')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL(/#\/me\/emily-carter$/)
  })

  test('the Undo offer does not follow a switch to another person', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
    await page.getByRole('button', { name: /Emily Carter/ }).click()
    await page.getByRole('menuitem', { name: /Sarah Mitchell/ }).click()
    await expect(page).toHaveURL(/team\/sarah$/)
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0)
  })

  test('a screen left open overnight moves to the new date', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-04T23:59:00') })
    await page.goto('/#/me/emily-carter')
    await expect(page.locator('main')).toContainText('Due today')
    await page.clock.runFor(2 * 60 * 60 * 1000)
    await expect(page.locator('main')).toContainText('Was due')
  })

  test('focus is not lost when the finished task leaves the list', async ({ page }) => {
    await openApp(page, '#/me/emily-carter')
    await page.getByRole('link', { name: 'Task details' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.locator('main')).toBeFocused()
    // Focus moved here by code, so it must not draw a ring around the whole page.
    await expect(page.locator('main')).toHaveCSS('outline-style', 'none')
  })

  test('the blocked task explains who it is waiting on and cannot be completed', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('heading', { name: 'Waiting on someone else' })).toBeVisible()
    await page.locator('[data-task-link="e-local-setup"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Waiting on IT')
    await expect(dialog.getByRole('button', { name: 'Mark complete' })).toHaveCount(0)
  })

  test('an upcoming task is read-only and says when it opens', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/task/c-security')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('This task opens on Thursday, November 5, 2026')
    await expect(dialog.getByRole('button', { name: 'Mark complete' })).toHaveCount(0)
  })

  test('Engineering and Sales see different plans', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/plan')
    for (const name of ['Before your first day', 'Day one', 'First week', 'First month']) {
      const button = page.getByRole('button', { name: new RegExp(name) })
      if ((await button.getAttribute('aria-expanded')) === 'false') await button.click()
    }
    await expect(page.getByText('Request repository access')).toBeVisible()
    await expect(page.getByText('Review CRM workflows')).toHaveCount(0)

    await page.goto('/#/me/marcus-webb/plan')
    for (const name of ['Before your first day', 'Day one', 'First week', 'First month']) {
      const button = page.getByRole('button', { name: new RegExp(name) })
      if ((await button.getAttribute('aria-expanded')) === 'false') await button.click()
    }
    await expect(page.getByText('Review CRM workflows')).toBeVisible()
    await expect(page.getByText('Request repository access')).toHaveCount(0)
    await expect(page.getByText('Set up your laptop and sign in')).toBeVisible()
  })

  test('overdue work sorts first and is worded calmly', async ({ page }) => {
    await openApp(page, '#/me/marcus-webb')
    await expect(page.getByText('Start here').locator('..')).toContainText('Complete product orientation')
    await expect(page.getByText('Start here').locator('..')).toContainText('Was due')
  })
})

test.describe('honest progress and wording', () => {
  test('separates the new hire’s own tasks from the whole plan', async ({ page }) => {
    await openApp(page)
    await expect(page.locator('header')).toContainText('Your tasks: 4 of 12 done. Whole plan: 6 of 18.')
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('Your tasks: 5 of 12 done. Whole plan: 7 of 18.')
    // A task owned by someone else moves the whole plan, but not the new hire's own count.
    await page.goto('/#/team/sarah/hire/emily-carter/task/e-repo-grant')
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.goto('/#/me/emily-carter')
    await expect(page.locator('header')).toContainText('Your tasks: 5 of 12 done. Whole plan: 8 of 18.')
  })

  test('says that checking off is the person’s own confirmation', async ({ page }) => {
    const note = 'Checking this off records your confirmation.'
    await openApp(page)
    await expect(page.locator('main').getByText(note)).toBeVisible()
    await page.goto('/#/me/emily-carter/task/c-handbook')
    await expect(page.getByRole('dialog').getByText(note)).toBeVisible()
  })

  test('marks the current phase by date, not by completion', async ({ page }) => {
    await openApp(page)
    const current = page.locator('ol[aria-label="Onboarding phases"] li[aria-current="step"]')
    await expect(current).toContainText('Day one')
    // Text above the path reflows when web fonts arrive, so measure after they load.
    await page.evaluate(() => document.fonts.ready)
    const before = await current.locator('[data-phase-marker]').boundingBox()
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
    await expect(current).toContainText('Day one')
    await expect(current).toContainText('3 of 4 done')
    expect(await current.locator('[data-phase-marker]').boundingBox()).toEqual(before)
  })

  test('a past phase with open work does not show a check mark', async ({ page }) => {
    await openApp(page, '#/me/marcus-webb')
    const phases = page.locator('ol[aria-label="Onboarding phases"] > li')
    await expect(phases.nth(1).locator('svg')).toHaveCount(1) // Day one is finished
    await expect(phases.nth(2).locator('svg')).toHaveCount(0) // First week still has open work
  })

  test('shows how long the open tasks should take, and updates', async ({ page }) => {
    await openApp(page)
    const section = page.getByRole('heading', { name: 'Your next steps' }).locator('..')
    await expect(section).toContainText('About 2 hours of your tasks are open now.')
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(section).toContainText('About 1 hour 45 minutes of your tasks are open now.')
  })

  test('does not show a time estimate when nothing is open', async ({ page }) => {
    await openApp(page)
    for (const done of [7, 8, 9, 10]) {
      await page.getByRole('button', { name: 'Mark complete' }).click()
      await expect(page.locator('header')).toContainText(`Whole plan: ${done} of 18`)
    }
    await expect(page.getByText('Nothing needs you today')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('open now')
  })

  test('does not claim IT is working on something', async ({ page }) => {
    await openApp(page)
    await expect(page.getByText('Waiting for IT to finish “Grant repository access”.')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('is finishing')
  })
})

test.describe('finished and empty states', () => {
  test('a finished hire gets a quiet ending, not an empty list', async ({ page }) => {
    await openApp(page, '#/me/aisha-rahman')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You’ve finished onboarding, Aisha.')
    await expect(page.getByText('There’s nothing left on your plan')).toBeVisible()
  })

  test('preboarding shows only what is open', async ({ page }) => {
    await openApp(page, '#/me/jordan-lee')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Jordan, you start on')
    await expect(page.getByText('Submit tax and payroll forms')).toBeVisible()
    await expect(page.getByText('Start here')).toBeVisible()
  })

  test('nothing open says when the next task arrives', async ({ page }) => {
    await openApp(page)
    // Emily has four tasks open today, so progress runs from 6 to 10.
    for (const done of [7, 8, 9, 10]) {
      await page.getByRole('button', { name: 'Mark complete' }).click()
      await expect(page.locator('header')).toContainText(`Whole plan: ${done} of 18`)
    }
    await expect(page.getByText('Nothing needs you today')).toBeVisible()
    await expect(page.getByText('Complete security awareness training').first()).toBeVisible()
    await expect(page.getByText(/opens on Thursday, November 5, 2026/)).toBeVisible()
    // No dead end: the whole plan stays reachable when nothing is open.
    await page.getByRole('link', { name: /See the full plan/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your full plan')
  })
})

test.describe('bad links and bad data', () => {
  const cases: [string, RegExp | string][] = [
    ['#/me/nobody', 'We can’t find that person'],
    ['#/team/nobody', 'We can’t find that manager'],
    ['#/nonsense/route', 'We can’t find that page'],
    ['#/me/%E0%A4%A', 'We can’t find that page'],
  ]
  for (const [hash, title] of cases) {
    test(`shows a clear message for ${hash}`, async ({ page }) => {
      const noErrors = watchForErrors(page)
      await openApp(page, hash)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await page.getByRole('link', { name: 'Go to my workspace' }).click()
      await expect(page.getByRole('heading', { level: 1 })).toContainText('first day')
      noErrors()
    })
  }

  test('a link to a task outside the plan shows a message in the drawer', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/task/s-crm')
    await expect(page.getByRole('dialog')).toContainText('We can’t find that task')
  })

  for (const [label, value] of [
    ['unreadable JSON', '{broken'],
    ['a wrong shape', '{"version":1,"hires":"nope"}'],
    ['a newer version', '{"version":99}'],
  ] as const) {
    test(`recovers from saved data with ${label}`, async ({ page }) => {
      const noErrors = watchForErrors(page)
      await page.clock.setFixedTime(FIXED_NOW)
      await page.addInitScript(
        ([key, saved]) => {
          if (!sessionStorage.getItem('planted')) {
            localStorage.setItem(key as string, saved as string)
            sessionStorage.setItem('planted', '1')
          }
        },
        [STORAGE_KEY, value],
      )
      await page.goto('/#/me/emily-carter')
      await expect(page.getByText('Saved progress could not be read')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toContainText('first day')
      await page.getByRole('button', { name: 'Dismiss' }).click()
      await expect(page.getByText('Saved progress could not be read')).toBeHidden()
      noErrors()
    })
  }

  test('keeps working in memory and warns when storage is blocked', async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW)
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('Blocked', 'SecurityError')
      }
    })
    await page.goto('/#/me/emily-carter')
    await expect(page.getByText('This browser is blocking saved data')).toBeVisible()
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('Whole plan: 7 of 18')
  })
})

test.describe('two tabs', () => {
  test('a change in one tab appears in the other', async ({ context }) => {
    const first = await context.newPage()
    const second = await context.newPage()
    await openApp(first)
    await expect(first.locator('header')).toContainText('6 of 18')
    await openApp(second)
    await first.getByRole('button', { name: 'Mark complete' }).click()
    await expect(first.locator('header')).toContainText('7 of 18')
    await expect(second.locator('header')).toContainText('7 of 18')
  })

  test('a stale tab that missed an update cannot overwrite it', async ({ context }) => {
    const first = await context.newPage()
    const stale = await context.newPage()
    // Blocks this tab's sync events, so it really is behind when it acts.
    await stale.addInitScript(() => {
      window.addEventListener('storage', (event) => event.stopImmediatePropagation(), true)
    })
    await openApp(first)
    await expect(first.locator('header')).toContainText('6 of 18')
    await openApp(stale)
    await expect(stale.locator('header')).toContainText('6 of 18')

    await first.getByRole('button', { name: 'Mark complete' }).click()
    await expect(first.locator('header')).toContainText('7 of 18')
    await expect(stale.locator('header')).toContainText('6 of 18')

    // The stale tab still shows the laptop task, so completing the handbook must keep both.
    await stale.locator('[data-task-link="c-handbook"]').click()
    await stale.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(stale.locator('header')).toContainText('8 of 18')
    await expect(first.locator('header')).toContainText('8 of 18')
  })
})

test.describe('demo reset', () => {
  test('restores the sample data after confirming', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.locator('header')).toContainText('7 of 18')
    await page.getByRole('button', { name: /Emily Carter/ }).click()
    await page.getByRole('menuitem', { name: /Reset demo data/ }).click()
    await page.getByRole('button', { name: 'Reset data' }).click()
    await expect(page.locator('header')).toContainText('6 of 18')
  })
})

test.describe('dates', () => {
  test('still works when the demo is opened on a Saturday', async ({ page }) => {
    const noErrors = watchForErrors(page)
    await openApp(page, '#/me/emily-carter', new Date('2026-11-07T10:00:00'))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Emily')
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('Was due')
    noErrors()
  })
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('shows all three next steps without scrolling', async ({ page }) => {
    await openApp(page)
    await expect(page.getByText('Start here')).toBeInViewport()
    await expect(page.locator('[data-task-link="e-docs"]')).toBeInViewport({ ratio: 1 })
    await expect(page.getByText('Software Engineer, Engineering. Started today.')).toBeVisible()
  })

  test('the drawer fills the screen', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/task/c-handbook')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Why it matters')
    const box = await dialog.boundingBox()
    expect(box?.width).toBeCloseTo(390, 0)
    expect(box?.height).toBeCloseTo(844, 0)
  })
})
