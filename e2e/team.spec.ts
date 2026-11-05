import { expect, test, type Page } from '@playwright/test'
import { openApp, watchForErrors } from './helpers'

const rowFor = (page: Page, name: string) => page.locator('table tbody tr').filter({ hasText: name })

test.describe('manager view', () => {
  test('David sees only the Engineering team, with the person needing help first', async ({ page }) => {
    await openApp(page, '#/team/david')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('One person needs your help.')
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(3)
    await expect(rows.first()).toContainText('Priya Nair')
    await expect(rows.first()).toContainText('Needs attention')
    await expect(rows.first()).toContainText('2 overdue, owned by Priya')
    await expect(page.locator('table')).not.toContainText('Marcus')
  })

  test('Renee sees the Sales team and who owns each overdue task', async ({ page }) => {
    await openApp(page, '#/team/renee')
    await expect(rowFor(page, 'Marcus Webb')).toContainText('3 overdue: 2 Marcus, 1 Renee')
    await expect(rowFor(page, 'Tomás Rivera')).toContainText('1 overdue, owned by IT')
    await expect(page.locator('table')).not.toContainText('Priya')
  })

  test('Sarah’s overview shows urgent work, and People shows everyone', async ({ page }) => {
    await openApp(page, '#/team/sarah')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Two people need your help.')
    await expect(page.locator('header')).toContainText('2 Needs attention')
    await expect(page.locator('table')).toHaveCount(0)
    await page.getByRole('link', { name: 'See all 6 new hires' }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(6)
  })

  test('People can be filtered by department and sorted', async ({ page }) => {
    await openApp(page, '#/team/sarah/people')
    await page.getByLabel('Department').selectOption('sales')
    await expect(page.locator('table tbody tr')).toHaveCount(3)
    await expect(page.getByRole('button', { name: /^All/ })).toContainText('(3)')
    await page.getByLabel('Sort by').selectOption('name')
    await expect(page.locator('table tbody tr').first()).toContainText('Aisha Rahman')
    await page.getByRole('button', { name: /^Watch/ }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await page.getByLabel('Department').selectOption('engineering')
    await expect(page.getByText('Nobody is marked “Watch” right now.')).toBeVisible()
    await page.getByRole('button', { name: 'Show everyone' }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(6)
  })

  test('a manager can see what IT or HR is holding up, without being offered it', async ({ page }) => {
    await openApp(page, '#/team/david')
    const others = page.getByRole('heading', { name: 'With IT or HR' }).locator('..')
    await expect(others).toContainText('Grant repository access')
    await expect(others).toContainText('Blocks Emily: Run the local setup')
    await others.getByRole('link', { name: 'Grant repository access' }).click()
    await expect(page.getByRole('dialog')).toContainText('IT owns this task')
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Mark complete' })).toHaveCount(0)
  })

  test('what changed shows real activity, survives moving around, and clears on the next visit', async ({ context }) => {
    const david = await context.newPage()
    const emily = await context.newPage()
    await openApp(david, '#/team/david')
    const changed = david.getByRole('heading', { name: 'What changed since your last visit' }).locator('..')
    await expect(changed).toContainText('Nothing new')
    await openApp(emily)
    await emily.getByRole('button', { name: 'Mark complete' }).click()
    const item = 'Emily completed “Set up your laptop and sign in”'
    await expect(changed).toContainText(item)

    // Opening someone and coming back, or refreshing, is still the same visit.
    await david.locator('table').getByRole('link', { name: 'Priya Nair' }).click()
    await david.getByRole('navigation', { name: 'Go back' }).getByRole('link').click()
    await expect(changed).toContainText(item)
    await david.reload()
    await expect(changed).toContainText(item)

    // A new session is a new visit.
    const later = await context.newPage()
    await openApp(later, '#/team/david')
    const again = later.getByRole('heading', { name: 'What changed since your last visit' }).locator('..')
    await expect(again).toContainText('Nothing new')
  })

  test('a question sent to HR does not appear for the manager', async ({ context }) => {
    const david = await context.newPage()
    const emily = await context.newPage()
    await openApp(david, '#/team/david')
    const changed = david.getByRole('heading', { name: 'What changed since your last visit' }).locator('..')
    await openApp(emily)
    await emily.getByRole('button', { name: 'Ask Sarah in HR' }).click()
    await emily.getByLabel('Your message').fill('A private question')
    await emily.getByRole('button', { name: 'Send request' }).click()
    await expect(emily.getByText('A private question')).toBeVisible()
    await david.reload()
    await expect(changed).toContainText('Nothing new')
    await expect(david.locator('main')).not.toContainText('Help requests')
    await david.goto('/#/team/sarah')
    await expect(david.locator('main')).toContainText('A private question')
  })

  test('the filter narrows the roster and explains an empty result', async ({ page }) => {
    await openApp(page, '#/team/david')
    await page.getByRole('button', { name: /^Needs attention/ }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await page.getByRole('button', { name: /^Complete/ }).click()
    await expect(page.getByText('Nobody is marked “Complete” right now.')).toBeVisible()
    await page.getByRole('button', { name: 'Show everyone' }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(3)
  })

  test('a manager opens a hire, and reaches the same plan', async ({ page }) => {
    await openApp(page, '#/team/david')
    await page.locator('table').getByRole('link', { name: 'Priya Nair' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Priya Nair')
    await expect(page.getByRole('heading', { name: 'Why flagged' })).toBeVisible()
    await expect(page.getByText('This plan has 11 company tasks and 7 Engineering tasks.')).toBeVisible()
  })

  test('a manager cannot open someone outside their team', async ({ page }) => {
    await openApp(page, '#/team/david/hire/marcus-webb')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This person isn’t on your team')
    await expect(page.locator('main')).not.toContainText('Why flagged')
  })

  test('a manager cannot complete a task the new hire owns', async ({ page }) => {
    await openApp(page, '#/team/david/hire/emily-carter/task/c-handbook')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Emily owns this task')
    await expect(dialog.getByRole('button', { name: 'Mark complete' })).toHaveCount(0)
  })

  test('a manager can complete their own task', async ({ page }) => {
    await openApp(page, '#/team/david/hire/emily-carter/task/c-welcome')
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('7 of 18 done.')).toBeVisible()
  })
})

test.describe('your next actions', () => {
  test('a manager sees their own tasks, each linking to the real task', async ({ page }) => {
    await openApp(page, '#/team/david')
    const section = page.getByRole('heading', { name: 'Your next actions' }).locator('..')
    await expect(section.getByRole('listitem')).toHaveCount(2)
    await section.getByRole('link', { name: 'Hold the first-day welcome meeting' }).click()
    await expect(page).toHaveURL(/team\/david\/hire\/emily-carter\/task\/c-welcome$/)
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/team\/david$/)
    await expect(section.getByRole('listitem')).toHaveCount(1)
    await expect(section).not.toContainText('welcome meeting')
  })

  test('Sarah sees HR and IT tasks apart, with the blocked work named', async ({ page }) => {
    await openApp(page, '#/team/sarah')
    const it = page.getByRole('heading', { name: /IT tasks/ }).locator('..')
    const hr = page.getByRole('heading', { name: 'HR tasks' }).locator('..')
    await expect(hr).toContainText('Verify I-9 documents')
    await expect(hr).not.toContainText('Create CRM account')
    await expect(it.getByRole('listitem').first()).toContainText('Create CRM account')
    await expect(it.getByRole('listitem').first()).toContainText('Blocks Tomás: Review CRM workflows')
    await expect(it).toContainText('Blocks Emily: Run the local setup')
    // Two per group keeps the roster high on the screen.
    await expect(it.getByRole('listitem')).toHaveCount(2)
    await it.getByRole('button', { name: 'Show all 3' }).click()
    await expect(it).toContainText('Prepare laptop')
  })

  test('closing a task returns focus to the link for that same person', async ({ page }) => {
    await openApp(page, '#/team/david')
    const link = page.locator('[data-task-link="jordan-lee:e-buddy"]')
    await link.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/team\/david$/)
    await expect(link).toBeFocused()
    await link.click()
    await page.goBack()
    await expect(link).toBeFocused()
  })

  test('blocked work names who is actually blocked', async ({ page }) => {
    await openApp(page, '#/team/sarah/hire/jordan-lee')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jordan Lee')
    // Jordan starts next Wednesday. Thursday's date makes the I-9 and access request late.
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00'))
    await page.reload()
    const why = page.getByRole('heading', { name: 'Why flagged' }).locator('..')
    await expect(why).toContainText('Blocks HR: Verify I-9 documents')
    await expect(why).toContainText('Blocks IT: Grant repository access')
    // A late laptop really does hold up Jordan's own task.
    await expect(why).toContainText('Blocks Jordan: Set up your laptop and sign in')
  })

  test('Sarah still sees the real owner of an IT task', async ({ page }) => {
    await openApp(page, '#/team/sarah/hire/tomas-rivera/task/s-crm-account')
    await expect(page.getByRole('dialog')).toContainText('IT. HR stands in for IT in this prototype.')
    await page.keyboard.press('Escape')
    const row = page.locator('li').filter({ has: page.locator('[data-task-link="s-crm-account"]') })
    await expect(row).toContainText('Owner: IT')
    await expect(page.locator('main')).toContainText('Blocks Tomás: Review CRM workflows')
  })

  test('a long list expands and collapses', async ({ page }) => {
    // These people start soon, so their manager tasks are already open.
    await openApp(page, '#/team/sarah/new')
    for (const [name, date] of [['Ana One', '2026-11-05'], ['Ben Two', '2026-11-06'], ['Cy Three', '2026-11-09']]) {
      await page.goto('/#/team/sarah/new')
      await page.getByLabel('Full name').fill(name ?? '')
      await page.getByLabel('Job title').fill('Engineer')
      await page.getByRole('radio', { name: 'Engineering' }).check()
      await page.getByLabel('Start date').fill(date ?? '')
      await page.getByRole('button', { name: 'Start plan' }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name ?? '')
    }
    await page.goto('/#/team/david')
    const section = page.getByRole('heading', { name: 'Your next actions' }).locator('..')
    await expect(section.getByRole('listitem')).toHaveCount(3)
    await section.getByRole('button', { name: /Show all/ }).click()
    expect(await section.getByRole('listitem').count()).toBeGreaterThan(3)
    await section.getByRole('button', { name: 'Show fewer' }).click()
    await expect(section.getByRole('listitem')).toHaveCount(3)
  })

  test('headline does not say everyone is on track while someone is on Watch', async ({ page }) => {
    await openApp(page, '#/team/renee/hire/marcus-webb/task/s-territory')
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.goto('/#/me/marcus-webb')
    for (const done of ['Complete product orientation', 'Review CRM workflows']) {
      await page.getByRole('heading', { name: done }).waitFor()
      await page.getByRole('button', { name: 'Mark complete' }).click()
      await expect(page.getByRole('heading', { name: done })).toHaveCount(0)
    }
    await page.goto('/#/team/renee')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('One person to watch.')
    await expect(page.locator('header')).not.toContainText('more to watch')
  })
})

test.describe('employee and manager stay consistent', () => {
  test('a completion appears on the manager roster in another window', async ({ context }) => {
    const emily = await context.newPage()
    const david = await context.newPage()
    await openApp(emily)
    await expect(emily.locator('header')).toContainText('6 of 18')
    await openApp(david, '#/team/david')
    await expect(rowFor(david, 'Emily Carter')).toContainText('6 of 18')
    await emily.getByRole('button', { name: 'Mark complete' }).click()
    await expect(rowFor(david, 'Emily Carter')).toContainText('7 of 18')
    await david.reload()
    await expect(rowFor(david, 'Emily Carter')).toContainText('7 of 18')
  })

  test('HR clearing the IT task unblocks the new hire, and undo order is protected', async ({ page }) => {
    await openApp(page, '#/me/emily-carter')
    await expect(page.getByRole('heading', { name: 'Waiting on someone else' })).toBeVisible()

    await page.goto('/#/team/sarah/hire/emily-carter/task/e-repo-grant')
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()

    await page.goto('/#/me/emily-carter/task/e-local-setup')
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()

    await page.goto('/#/me/emily-carter')
    await expect(page.getByRole('heading', { name: 'Waiting on someone else' })).toHaveCount(0)

    await page.goto('/#/team/sarah/hire/emily-carter/task/e-repo-grant')
    await page.getByRole('dialog').getByRole('button', { name: 'Undo completion' }).click()
    await expect(page.getByText('“Run the local setup” depends on this. Undo that first.')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
  })

  test('an overdue IT task is not blamed on the new hire, and offers no nudge', async ({ page }) => {
    await openApp(page, '#/team/sarah/hire/tomas-rivera')
    await expect(page.getByText('1 overdue, owned by IT')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Nudge/ })).toHaveCount(0)
    await expect(page.getByText('You can mark it complete in the plan below.')).toBeVisible()
  })
})

test.describe('nudge', () => {
  test('reaches the new hire, can be dismissed, and is limited to once a day', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    await page.getByRole('button', { name: 'Nudge Priya' }).click()
    await expect(page.getByRole('button', { name: 'Nudge Priya' })).toHaveCount(0)
    await expect(page.getByText('Nudged today')).toBeVisible()

    await page.goto('/#/team/david')
    await expect(rowFor(page, 'Priya Nair')).toContainText('Nudged today')

    await page.goto('/#/me/priya-nair')
    await expect(page.getByText('David checked in')).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Dismiss this note' }).click()
    await expect(page.getByText('David checked in')).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('David checked in')).toHaveCount(0)
  })
})

test.describe('links to the task being discussed', () => {
  test('a nudge links to its task, and goes away once the task is done', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    await page.getByRole('button', { name: 'Nudge Priya' }).click()
    await expect(page.getByText('Nudged today about “Choose your benefits”')).toBeVisible()

    await page.goto('/#/me/priya-nair')
    const note = page.getByRole('status').filter({ hasText: 'David checked in' })
    await note.getByRole('link', { name: 'View task' }).click()
    await expect(page).toHaveURL(/task\/c-benefits$/)
    const drawer = page.getByRole('dialog')
    await expect(drawer).toContainText('Choose your benefits')
    await drawer.getByRole('button', { name: 'Mark complete' }).click()
    await expect(drawer.getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('David checked in')).toHaveCount(0)
    await expect(page.locator('main')).toBeFocused()
  })

  test('a nudged person can ask for help right from the note', async ({ page }) => {
    await openApp(page, '#/team/david/hire/priya-nair')
    await page.getByRole('button', { name: 'Nudge Priya' }).click()
    await page.goto('/#/me/priya-nair')
    const note = page.getByRole('status').filter({ hasText: 'David checked in' })
    await note.getByRole('button', { name: /Need help/ }).click()
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(note).toContainText('Request sent to David')
  })

  test('why flagged links to the late task', async ({ page }) => {
    await openApp(page, '#/team/renee/hire/marcus-webb')
    await page.locator('[data-task-link="why:s-territory"]').click()
    await expect(page).toHaveURL(/task\/s-territory$/)
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Mark complete' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-task-link="why:s-territory"]')).toBeFocused()
  })

  test('a blocked task links to what it is waiting on, and Back returns to it', async ({ page }) => {
    await openApp(page, '#/me/emily-carter')
    await page.locator('[data-task-link="e-local-setup"]').click()
    const drawer = page.getByRole('dialog')
    await drawer.getByRole('link', { name: '“Grant repository access”' }).click()
    await expect(page).toHaveURL(/task\/e-repo-grant$/)
    await expect(drawer).toContainText('IT owns this task')
    await page.goBack()
    await expect(page).toHaveURL(/task\/e-local-setup$/)
    await expect(drawer).toContainText('Run the local setup')
  })

  test('a request links to its task', async ({ page }) => {
    await openApp(page, '#/me/tomas-rivera')
    const requests = page.getByRole('heading', { name: 'Your requests' }).locator('..')
    await requests.getByRole('link', { name: 'View task' }).click()
    await expect(page).toHaveURL(/task\/s-crm$/)
  })
})

test.describe('start a new plan', () => {
  const fill = async (
    page: Page,
    { name, title, department, date }: { name: string; title: string; department: string; date: string },
  ) => {
    await page.getByLabel('Full name').fill(name)
    await page.getByLabel('Job title').fill(title)
    await page.getByRole('radio', { name: department }).check()
    await page.getByLabel('Start date').fill(date)
  }

  test('only HR can use it', async ({ page }) => {
    await openApp(page, '#/team/david/new')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Only HR can start a plan')
    await page.goto('/#/team/david')
    await expect(page.getByRole('link', { name: 'Start a new plan' })).toHaveCount(0)
  })

  test('rejects empty input and moves focus to the first problem', async ({ page }) => {
    await openApp(page, '#/team/sarah/new')
    await page.getByRole('button', { name: 'Start plan' }).click()
    await expect(page.getByText('Enter the new hire’s full name.')).toBeVisible()
    await expect(page.getByText('Enter a job title.')).toBeVisible()
    await expect(page.getByText('Choose a department.')).toBeVisible()
    await expect(page.getByText('Enter a valid start date.')).toBeVisible()
    await expect(page.getByLabel('Full name')).toBeFocused()
    await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true')
  })

  for (const [label, date, message] of [
    ['a past date', '2026-11-03', 'Choose today or a later date.'],
    ['a weekend', '2026-11-07', 'Choose a weekday.'],
    ['a date too far ahead', '2027-06-01', 'Choose a date within the next 180 days.'],
  ] as const) {
    test(`rejects ${label}`, async ({ page }) => {
      await openApp(page, '#/team/sarah/new')
      await fill(page, { name: 'Lena Okafor', title: 'Engineer', department: 'Engineering', date })
      await page.getByRole('button', { name: 'Start plan' }).click()
      await expect(page.getByText(message)).toBeVisible()
      await expect(page.getByLabel('Start date')).toBeFocused()
    })
  }

  test('rejects a duplicate, ignoring case and spacing, and a blank title', async ({ page }) => {
    await openApp(page, '#/team/sarah/new')
    await fill(page, { name: 'Lena  Okafor', title: 'Engineer', department: 'Sales', date: '2026-11-16' })
    await page.getByRole('button', { name: 'Start plan' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lena Okafor')

    await page.goto('/#/team/sarah/new')
    await fill(page, { name: 'LENA OKAFOR', title: '   ', department: 'Sales', date: '2026-11-16' })
    await page.getByRole('button', { name: 'Start plan' }).click()
    await expect(page.getByText('This person already has a plan with this start date.')).toBeVisible()
    await expect(page.getByText('Enter a job title.')).toBeVisible()
  })

  test('rejects a plan another tab already added', async ({ context }) => {
    const first = await context.newPage()
    const second = await context.newPage()
    const details = { name: 'Lena Okafor', title: 'Engineer', department: 'Sales', date: '2026-11-16' }
    await openApp(first, '#/team/sarah/new')
    await openApp(second, '#/team/sarah/new')
    await fill(first, details)
    await fill(second, details)
    await first.getByRole('button', { name: 'Start plan' }).click()
    await expect(first.getByRole('heading', { level: 1 })).toHaveText('Lena Okafor')
    await second.getByRole('button', { name: 'Start plan' }).click()
    await expect(second.getByText('This person already has a plan with this start date.')).toBeVisible()
    await second.reload()
    await expect(second.getByText('Saved progress could not be read')).toHaveCount(0)
  })

  test('explains that department, not job title, sets the template', async ({ page }) => {
    await openApp(page, '#/team/sarah/new')
    await expect(
      page.getByText('Department selects the task template and manager. Job title is descriptive and doesn’t change tasks.'),
    ).toBeVisible()
  })

  test('the preview changes with the department', async ({ page }) => {
    await openApp(page, '#/team/sarah/new')
    await expect(page.getByText('Choose a department and the plan appears here.')).toBeVisible()
    await page.getByRole('radio', { name: 'Engineering' }).check()
    await expect(page.getByText('18 tasks: 11 company and 7 Engineering')).toBeVisible()
    await expect(page.getByText('Grant repository access')).toBeVisible()
    await page.getByRole('radio', { name: 'Sales' }).check()
    await expect(page.getByText('18 tasks: 11 company and 7 Sales')).toBeVisible()
    await expect(page.getByText('Review CRM workflows')).toBeVisible()
    await expect(page.getByText('Grant repository access')).toHaveCount(0)
  })

  test('a valid plan reaches the roster, the right manager and the new hire', async ({ page }) => {
    const noErrors = watchForErrors(page)
    await openApp(page, '#/team/sarah/new')
    await fill(page, { name: 'Siobhán O’Neill', title: 'Sales Engineer', department: 'Sales', date: '2026-11-04' })
    await page.getByRole('button', { name: 'Start plan' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Siobhán O’Neill')
    await expect(page).toHaveURL(/hire\/siobhan-o-neill$/)

    await page.goto('/#/team/renee')
    await expect(rowFor(page, 'Siobhán O’Neill')).toContainText('0 of 18')
    await expect(rowFor(page, 'Siobhán O’Neill')).toContainText('On track')

    await page.goto('/#/team/david')
    await expect(page.locator('table')).not.toContainText('Siobhán')

    await page.goto('/#/me/siobhan-o-neill')
    await expect(page.getByText('Start here')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('Was due')
    await page.reload()
    await expect(page.getByText('Start here')).toBeVisible()

    await page.getByRole('button', { name: /Siobhán/ }).click()
    await page.getByRole('menuitem', { name: /Reset demo data/ }).click()
    await page.getByRole('button', { name: 'Reset data' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Emily')

    await page.goto('/#/me/siobhan-o-neill')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We can’t find that person')
    noErrors()
  })

  test('a very long name wraps without breaking the page', async ({ page }) => {
    await openApp(page, '#/team/sarah/new')
    const name = 'Wolfeschlegelsteinhausenbergerdorffwelchevoralternwarenbewahrenundsicherzustellen'.slice(0, 80)
    await fill(page, { name, title: 'Engineer', department: 'Engineering', date: '2026-11-16' })
    await page.getByRole('button', { name: 'Start plan' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 800 })
      for (const hash of ['#/team/sarah', `#/team/sarah/hire/${name.toLowerCase()}`, `#/me/${name.toLowerCase()}`]) {
        await page.goto(`/${hash}`)
        await expect(page.locator('main')).toBeVisible()
        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        expect(overflows, `${hash} at ${width}`).toBe(false)
      }
    }
  })
})

test.describe('questions and help requests', () => {
  test('answers common questions from the real plan, and updates as it changes', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'What am I waiting on?' }).click()
    const panel = page.getByRole('region', { name: 'Have a question?' })
    await expect(panel).toContainText('IT to finish “Grant repository access”')
    await expect(panel).toContainText('Answers come from your plan, not AI.')
    await page.getByLabel('Ask about your onboarding').fill('Who can help me with repository access?')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    await expect(panel).toContainText('IT owns this. Sarah Mitchell can follow up on it.')
    // An answer links to the real task.
    await panel.getByRole('link', { name: /Grant repository access/ }).click()
    await expect(page).toHaveURL(/task\/e-repo-grant$/)
  })

  test('admits what it does not know, and offers a person', async ({ page }) => {
    await openApp(page)
    await page.getByLabel('Ask about your onboarding').fill('What is the dress code?')
    await page.keyboard.press('Enter')
    const panel = page.getByRole('region', { name: 'Have a question?' })
    await expect(panel).toContainText('That isn’t in your onboarding plan')
    await panel.getByRole('button', { name: 'Ask David' }).click()
    await expect(page.getByLabel('Your message')).toHaveValue('What is the dress code?')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByRole('heading', { name: 'Your requests' }).locator('..')).toContainText('Waiting for a response.')
    await page.goto('/#/team/david')
    await expect(page.getByRole('heading', { name: 'Help requests' }).locator('..')).toContainText('What is the dress code?')
  })

  test('Emily asks about a blocker, Sarah sees it, resolves it, and Emily sees the result', async ({ context }) => {
    const emily = await context.newPage()
    const sarah = await context.newPage()
    const noErrors = watchForErrors(emily)
    await openApp(emily)
    await openApp(sarah, '#/team/sarah')

    await emily.getByRole('button', { name: /Ask for help.*Run the local setup/ }).click()
    const message = emily.getByLabel('Your message')
    await expect(message).toHaveValue(/Grant repository access/)
    await expect(emily.getByRole('dialog')).toContainText('No email is sent in this prototype.')
    await emily.getByRole('button', { name: 'Send request' }).click()
    await expect(emily.getByText('Request sent to Sarah. Waiting for a response.')).toBeVisible()
    await expect(emily.locator('main')).toBeFocused()
    await expect(emily.getByRole('button', { name: /Ask for help.*Run the local setup/ })).toHaveCount(0)

    const requests = sarah.getByRole('heading', { name: 'Help requests' }).locator('..')
    await expect(requests).toContainText('Emily Carter')
    await requests.getByRole('button', { name: /Mark.*resolved.*Emily/i }).click()
    await expect(requests).not.toContainText('Emily Carter')

    await expect(emily.getByText('Resolved by Sarah Mitchell.')).toBeVisible()
    noErrors()
  })

  test('the status names who actually received the request, even after the task changes', async ({ page }) => {
    // Tomás's request went to Sarah about a task waiting on IT.
    await openApp(page, '#/team/sarah/hire/tomas-rivera/task/s-crm-account')
    await page.getByRole('dialog').getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Undo completion' })).toBeVisible()
    await page.goto('/#/me/tomas-rivera/task/s-crm')
    await expect(page.getByRole('dialog')).toContainText('Request sent to Sarah.')
    await expect(page.getByRole('dialog')).not.toContainText('Request sent to Renee')
  })

  test('a finished hire can still see the status of a request', async ({ page }) => {
    await openApp(page, '#/me/aisha-rahman')
    await page.getByLabel('Ask about your onboarding').fill('Can I work from home?')
    await page.keyboard.press('Enter')
    const panel = page.getByRole('region', { name: 'Have a question?' })
    await panel.getByRole('button', { name: 'Ask Renee' }).click()
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByRole('heading', { name: 'Your requests' }).locator('..')).toContainText('Waiting for a response.')
  })

  test('a manager is not told to wait when the new hire has late tasks too', async ({ page }) => {
    await openApp(page, '#/team/sarah')
    const card = page.locator('li').filter({ has: page.getByRole('heading', { name: 'Marcus Webb' }) })
    await card.getByRole('button', { name: 'Nudge Marcus' }).click()
    await expect(page.getByText('It appears in their workspace. No email is sent.')).toBeVisible()
    await expect(card).toContainText('Nudged today')
    await expect(card).not.toContainText('Waiting on')
  })

  test('rejects an empty help message', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /Ask for help.*Run the local setup/ }).click()
    await page.getByLabel('Your message').fill('   ')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Write a short message first.' })).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('sample documents can be read and say they are samples', async ({ page }) => {
    await openApp(page, '#/me/emily-carter/task/c-handbook')
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Read BrightPath Employee Handbook').click()
    await expect(dialog).toContainText('Time off: ask your manager first')
    await expect(dialog).toContainText('not a real document')
  })
})
