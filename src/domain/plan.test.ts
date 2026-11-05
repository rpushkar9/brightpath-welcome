import { describe, expect, it } from 'vitest'
import { addBusinessDays, iso } from './dates'
import {
  buildPlan,
  completionKey,
  hireHealth,
  nextSteps,
  ownProgress,
  progress,
  stageOf,
  templatesFor,
} from './plan'
import { COMPANY_TASKS, ENGINEERING_TASKS, SALES_TASKS } from './templates'
import type { AppData, Hire, PlanTask } from './types'

const start = iso('2026-11-02') // A Monday

const hire = (overrides: Partial<Hire> = {}): Hire => ({
  id: 'h1',
  name: 'Test Person',
  title: 'Engineer',
  department: 'engineering',
  managerId: 'david',
  startDate: start,
  planCreatedOn: null,
  ...overrides,
})

const data = (hires: Hire[], done: string[] = []): AppData => ({
  version: 1,
  seededOn: start,
  hires,
  completions: Object.fromEntries(
    done.map((taskId) => [completionKey('h1', taskId), { on: start, byName: 'Test' }]),
  ),
  nudges: [],
  helpRequests: [],
})

const find = (plan: PlanTask[], id: string): PlanTask => {
  const task = plan.find((item) => item.template.id === id)
  if (!task) throw new Error(`No task ${id}`)
  return task
}

describe('templates', () => {
  const all = [COMPANY_TASKS, ENGINEERING_TASKS, SALES_TASKS]

  it('gives each department 18 tasks with the department tasks differing', () => {
    expect(templatesFor('engineering')).toHaveLength(18)
    expect(templatesFor('sales')).toHaveLength(18)
    const engineering = new Set(templatesFor('engineering').map((task) => task.id))
    expect(SALES_TASKS.some((task) => engineering.has(task.id))).toBe(false)
  })

  it('has unique ids and opens tasks on or before they are due', () => {
    const tasks = all.flat()
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length)
    for (const task of tasks) expect(task.opensDay).toBeLessThanOrEqual(task.dueDay)
  })

  it('only uses prerequisites in the same plan that open first and fall due earlier', () => {
    for (const department of ['engineering', 'sales'] as const) {
      const plan = templatesFor(department)
      for (const task of plan) {
        if (!task.requires) continue
        const prerequisite = plan.find((item) => item.id === task.requires)
        expect(prerequisite, `${task.id} prerequisite`).toBeDefined()
        expect(prerequisite!.opensDay).toBeLessThanOrEqual(task.opensDay)
        expect(prerequisite!.dueDay).toBeLessThan(task.dueDay)
      }
    }
  })
})

describe('task status', () => {
  it('marks a task completed before any other status', () => {
    const today = addBusinessDays(start, 15)
    const plan = buildPlan(hire(), data([hire()], ['c-handbook']), today)
    expect(find(plan, 'c-handbook').status.kind).toBe('completed')
  })

  it('marks a task upcoming before its open date', () => {
    const plan = buildPlan(hire(), data([hire()]), start)
    const status = find(plan, 'c-30-day').status
    expect(status.kind).toBe('upcoming')
    if (status.kind === 'upcoming') expect(status.opensOn).toBe(addBusinessDays(start, 18))
  })

  it('marks a task waiting while its prerequisite is incomplete, even after its due date', () => {
    const plan = buildPlan(hire(), data([hire()]), addBusinessDays(start, 5))
    const status = find(plan, 'e-local-setup').status
    expect(status).toEqual({ kind: 'waiting', onTitle: 'Grant repository access', onOwner: 'it' })
  })

  it('treats the due date as still on time', () => {
    const plan = buildPlan(hire(), data([hire()]), addBusinessDays(start, 2))
    expect(find(plan, 'c-handbook').status).toEqual({
      kind: 'outstanding',
      dueOn: addBusinessDays(start, 2),
      dueToday: true,
    })
  })

  it('makes a task overdue on the next business day', () => {
    const plan = buildPlan(hire(), data([hire()]), addBusinessDays(start, 3))
    expect(find(plan, 'c-handbook').status).toEqual({
      kind: 'overdue',
      dueOn: addBusinessDays(start, 2),
      daysLate: 1,
    })
  })

  it('does not make a Friday task overdue until Monday', () => {
    const friday = iso('2026-11-06')
    const startFourDaysEarlier = addBusinessDays(friday, -2) // handbook due on day 2
    const person = hire({ startDate: startFourDaysEarlier })
    const saturday = buildPlan(person, data([person]), iso('2026-11-07'))
    expect(find(saturday, 'c-handbook').status.kind).toBe('outstanding')
    const monday = buildPlan(person, data([person]), iso('2026-11-09'))
    expect(find(monday, 'c-handbook').status).toMatchObject({ kind: 'overdue', daysLate: 1 })
  })

  it('moves passed due dates to the plan creation date for a late plan', () => {
    const today = iso('2026-11-04')
    const person = hire({ startDate: today, planCreatedOn: today })
    const plan = buildPlan(person, data([person]), today)
    expect(plan.filter((task) => task.status.kind === 'overdue')).toEqual([])
    expect(find(plan, 'c-profile').dueOn).toBe(today)
  })

  it('does not place moved due dates on a weekend', () => {
    const saturday = iso('2026-11-07')
    const person = hire({ startDate: iso('2026-11-09'), planCreatedOn: saturday })
    const plan = buildPlan(person, data([person]), saturday)
    expect(find(plan, 'c-profile').dueOn).toBe('2026-11-09')
  })
})

describe('next steps', () => {
  it('only includes open tasks the employee owns, limited to three', () => {
    const steps = nextSteps(buildPlan(hire(), data([hire()]), start))
    expect(steps.shown).toHaveLength(3)
    for (const task of steps.shown) {
      expect(task.template.owner).toBe('employee')
      expect(['overdue', 'outstanding']).toContain(task.status.kind)
    }
    expect(steps.moreCount).toBeGreaterThan(0)
  })

  it('puts the most overdue task first, then the soonest due', () => {
    const today = addBusinessDays(start, 7)
    const steps = nextSteps(buildPlan(hire(), data([hire()]), today))
    const late = steps.shown.map((task) =>
      task.status.kind === 'overdue' ? task.status.daysLate : 0,
    )
    expect(late).toEqual([...late].sort((a, b) => b - a))
  })

  it('returns nothing when no employee task is open', () => {
    const today = addBusinessDays(start, -30)
    const steps = nextSteps(buildPlan(hire(), data([hire()]), today))
    expect(steps).toEqual({ shown: [], moreCount: 0 })
  })
})

describe('progress', () => {
  it('counts every task in the plan, whoever owns it', () => {
    const plan = buildPlan(hire(), data([hire()], ['c-profile', 'c-laptop-prep']), start)
    expect(progress(plan)).toEqual({ done: 2, total: 18, percent: 11 })
  })
})

describe('own progress', () => {
  it('counts only tasks the new hire owns', () => {
    const plan = buildPlan(hire(), data([hire()], ['c-profile', 'c-laptop-prep']), start)
    expect(ownProgress(plan)).toEqual({ done: 1, total: 12, percent: 8 })
  })
})

describe('hire health', () => {
  const doneThrough = (dueDay: number) =>
    templatesFor('engineering')
      .filter((task) => task.dueDay <= dueDay)
      .map((task) => task.id)

  it('is on track when nothing is overdue', () => {
    expect(hireHealth(buildPlan(hire(), data([hire()], doneThrough(0)), start)).kind).toBe(
      'on-track',
    )
  })

  it('is complete when every task is done', () => {
    const allDone = templatesFor('engineering').map((task) => task.id)
    expect(hireHealth(buildPlan(hire(), data([hire()], allDone), start)).kind).toBe('complete')
  })

  it('is watch for one task under three business days late', () => {
    const allButOne = doneThrough(4).filter((id) => id !== 'c-security')
    const plan = buildPlan(hire(), data([hire()], allButOne), addBusinessDays(start, 5))
    const health = hireHealth(plan)
    expect(health.kind).toBe('watch')
    expect(health.overdue.map((task) => task.template.id)).toEqual(['c-security'])
  })

  it('needs attention for one task three business days late', () => {
    const allButOne = doneThrough(4).filter((id) => id !== 'c-security')
    const plan = buildPlan(hire(), data([hire()], allButOne), addBusinessDays(start, 7))
    expect(hireHealth(plan).kind).toBe('needs-attention')
  })

  it('needs attention for two overdue tasks', () => {
    const missingTwo = doneThrough(4).filter((id) => id !== 'c-security' && id !== 'c-handbook')
    const plan = buildPlan(hire(), data([hire()], missingTwo), addBusinessDays(start, 5))
    expect(hireHealth(plan).kind).toBe('needs-attention')
  })

  it('counts one late prerequisite once, against its own owner', () => {
    const missingGrant = doneThrough(1).filter((id) => id !== 'e-repo-grant')
    const plan = buildPlan(hire(), data([hire()], missingGrant), addBusinessDays(start, 2))
    const overdue = hireHealth(plan).overdue
    expect(overdue.map((task) => task.template.id)).toEqual(['e-repo-grant'])
    expect(overdue[0]?.template.owner).toBe('it')
    expect(find(plan, 'e-local-setup').status.kind).toBe('waiting')
  })
})

describe('stage', () => {
  it('follows the business-day ranges', () => {
    expect(stageOf(hire(), addBusinessDays(start, -1))).toBe('before')
    expect(stageOf(hire(), start)).toBe('first-day')
    expect(stageOf(hire(), addBusinessDays(start, 1))).toBe('first-week')
    expect(stageOf(hire(), addBusinessDays(start, 4))).toBe('first-week')
    expect(stageOf(hire(), addBusinessDays(start, 5))).toBe('weeks-2-4')
    expect(stageOf(hire(), addBusinessDays(start, 21))).toBe('weeks-2-4')
    expect(stageOf(hire(), addBusinessDays(start, 22))).toBe('past')
  })

  it('treats the weekend after a Friday start as the first week', () => {
    expect(stageOf(hire({ startDate: iso('2026-11-06') }), iso('2026-11-07'))).toBe('first-week')
  })
})
