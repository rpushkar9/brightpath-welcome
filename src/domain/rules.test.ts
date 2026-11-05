import { describe, expect, it } from 'vitest'
import { addBusinessDays, iso } from './dates'
import { DAVID, RENEE, SARAH } from './people'
import { buildPlan, completionKey, hireHealth } from './plan'
import {
  blockedBy,
  canAct,
  canView,
  completeTask,
  dismissNudge,
  healthReason,
  isOwner,
  leaderActions,
  nudgeTarget,
  rosterOrder,
  sendNudge,
  undoTask,
} from './rules'
import { createSeed } from './seed'
import type { AppData, Hire, Persona } from './types'

const today = iso('2026-11-04')
const seed = () => createSeed(today)

const hireOf = (data: AppData, id: string): Hire => {
  const hire = data.hires.find((item) => item.id === id)
  if (!hire) throw new Error(`No hire ${id}`)
  return hire
}

const emilyPersona = (data: AppData): Persona => ({
  kind: 'employee',
  hire: hireOf(data, 'emily-carter'),
})
const asDavid: Persona = { kind: 'leader', leader: DAVID }
const asRenee: Persona = { kind: 'leader', leader: RENEE }
const asSarah: Persona = { kind: 'leader', leader: SARAH }

const mustOk = (result: ReturnType<typeof completeTask>): AppData => {
  if (!result.ok) throw new Error(result.reason)
  return result.data
}

describe('who can see a hire', () => {
  it('limits managers to their own team and lets HR see everyone', () => {
    const data = seed()
    const emily = hireOf(data, 'emily-carter')
    const marcus = hireOf(data, 'marcus-webb')
    expect(canView(asDavid, emily)).toBe(true)
    expect(canView(asDavid, marcus)).toBe(false)
    expect(canView(asRenee, marcus)).toBe(true)
    expect(canView(asSarah, marcus)).toBe(true)
  })

  it('limits employees to themselves', () => {
    const data = seed()
    expect(canView(emilyPersona(data), hireOf(data, 'emily-carter'))).toBe(true)
    expect(canView(emilyPersona(data), hireOf(data, 'marcus-webb'))).toBe(false)
  })
})

describe('who can act on a task', () => {
  it('follows the ownership table', () => {
    const data = seed()
    const emily = hireOf(data, 'emily-carter')
    const persona = emilyPersona(data)
    expect(canAct(persona, emily, 'employee')).toBe(true)
    expect(canAct(persona, emily, 'it')).toBe(false)
    expect(canAct(asDavid, emily, 'manager')).toBe(true)
    expect(canAct(asDavid, emily, 'employee')).toBe(false)
    expect(canAct(asRenee, emily, 'manager')).toBe(false)
    expect(canAct(asSarah, emily, 'it')).toBe(true)
    expect(canAct(asSarah, emily, 'hr')).toBe(true)
    expect(canAct(asSarah, emily, 'employee')).toBe(false)
    expect(canAct(asSarah, emily, 'manager')).toBe(false)
  })
})

describe('completing a task', () => {
  it('records the completion with the date and name', () => {
    const data = seed()
    const next = mustOk(completeTask(data, emilyPersona(data), 'emily-carter', 'c-handbook', today))
    expect(next.completions[completionKey('emily-carter', 'c-handbook')]).toEqual({
      on: today,
      byName: 'Emily Carter',
    })
  })

  it('changes nothing on a second completion', () => {
    const data = seed()
    const persona = emilyPersona(data)
    const once = mustOk(completeTask(data, persona, 'emily-carter', 'c-handbook', today))
    const twice = completeTask(once, persona, 'emily-carter', 'c-handbook', today)
    expect(twice).toMatchObject({ ok: false, reason: expect.stringContaining('already') })
  })

  it('refuses a task that has not opened', () => {
    const data = seed()
    const result = completeTask(data, emilyPersona(data), 'emily-carter', 'c-30-day', today)
    expect(result).toMatchObject({ ok: false })
  })

  it('refuses a task that is waiting on someone else', () => {
    const data = seed()
    const result = completeTask(data, emilyPersona(data), 'emily-carter', 'e-local-setup', today)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('IT') })
  })

  it('refuses someone who does not own the task', () => {
    const data = seed()
    const result = completeTask(data, asDavid, 'emily-carter', 'c-handbook', today)
    expect(result.ok).toBe(false)
  })

  it('refuses an unknown hire or task', () => {
    const data = seed()
    expect(completeTask(data, asSarah, 'nobody', 'c-handbook', today).ok).toBe(false)
    expect(completeTask(data, emilyPersona(data), 'emily-carter', 'nope', today).ok).toBe(false)
  })

  it('opens the dependent task once HR completes the IT prerequisite', () => {
    const data = seed()
    const hire = hireOf(data, 'emily-carter')
    const before = buildPlan(hire, data, today).find((t) => t.template.id === 'e-local-setup')
    expect(before?.status.kind).toBe('waiting')
    const next = mustOk(completeTask(data, asSarah, 'emily-carter', 'e-repo-grant', today))
    const after = buildPlan(hire, next, today).find((t) => t.template.id === 'e-local-setup')
    expect(after?.status.kind).toBe('outstanding')
  })
})

describe('undoing a task', () => {
  it('restores the task', () => {
    const data = seed()
    const persona = emilyPersona(data)
    const done = mustOk(completeTask(data, persona, 'emily-carter', 'c-handbook', today))
    const undone = mustOk(undoTask(done, persona, 'emily-carter', 'c-handbook', today))
    expect(undone.completions[completionKey('emily-carter', 'c-handbook')]).toBeUndefined()
  })

  it('refuses while a completed task depends on it, and names that task', () => {
    const data = seed()
    let next = mustOk(completeTask(data, asSarah, 'emily-carter', 'e-repo-grant', today))
    next = mustOk(completeTask(next, emilyPersona(next), 'emily-carter', 'e-local-setup', today))
    const result = undoTask(next, asSarah, 'emily-carter', 'e-repo-grant', today)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('Run the local setup') })
  })

  it('refuses a task that is not complete', () => {
    const data = seed()
    expect(undoTask(data, emilyPersona(data), 'emily-carter', 'c-handbook', today).ok).toBe(false)
  })
})

describe('nudging', () => {
  it('targets the most overdue task the new hire owns', () => {
    const data = seed()
    const priya = hireOf(data, 'priya-nair')
    expect(nudgeTarget(asDavid, priya, data, today)?.template.owner).toBe('employee')
  })

  it('is not offered for tasks owned by others', () => {
    const data = seed()
    const tomas = hireOf(data, 'tomas-rivera')
    expect(nudgeTarget(asSarah, tomas, data, today)).toBeNull()
  })

  it('is not offered outside the manager team or to the employee', () => {
    const data = seed()
    const priya = hireOf(data, 'priya-nair')
    expect(nudgeTarget(asRenee, priya, data, today)).toBeNull()
    expect(nudgeTarget({ kind: 'employee', hire: priya }, priya, data, today)).toBeNull()
  })

  it('allows one nudge per hire per day', () => {
    const data = seed()
    const next = mustOk(sendNudge(data, asDavid, 'priya-nair', today))
    expect(next.nudges).toHaveLength(1)
    expect(sendNudge(next, asDavid, 'priya-nair', today).ok).toBe(false)
    const tomorrow = addBusinessDays(today, 1)
    expect(sendNudge(next, asDavid, 'priya-nair', tomorrow).ok).toBe(true)
  })

  it('can be dismissed by the employee', () => {
    const data = mustOk(sendNudge(seed(), asDavid, 'priya-nair', today))
    expect(dismissNudge(data, 'priya-nair').nudges[0]?.dismissed).toBe(true)
  })
})

describe('owner identity', () => {
  it('treats Sarah as the owner of HR tasks but only a stand-in for IT', () => {
    const data = seed()
    const emily = hireOf(data, 'emily-carter')
    expect(isOwner(asSarah, emily, 'hr')).toBe(true)
    expect(isOwner(asSarah, emily, 'it')).toBe(false)
    expect(canAct(asSarah, emily, 'it')).toBe(true)
  })

  it('recognises new hires and managers as owners of their own tasks only', () => {
    const data = seed()
    const emily = hireOf(data, 'emily-carter')
    expect(isOwner(emilyPersona(data), emily, 'employee')).toBe(true)
    expect(isOwner(emilyPersona(data), emily, 'manager')).toBe(false)
    expect(isOwner(asDavid, emily, 'manager')).toBe(true)
    expect(isOwner(asRenee, emily, 'manager')).toBe(false)
  })
})

describe('blocked work', () => {
  it('lists open tasks waiting on a task, and leaves out those not open yet', () => {
    const data = seed()
    const emily = hireOf(data, 'emily-carter')
    const plan = buildPlan(emily, data, today)
    // Ship your first pull request also follows this chain, but it has not opened.
    expect(blockedBy(plan, 'e-repo-grant').map((task) => task.template.id)).toEqual(['e-local-setup'])
    expect(blockedBy(plan, 'c-handbook')).toEqual([])
  })

  it('shows a late IT task blocking the new hire', () => {
    const data = seed()
    const tomas = hireOf(data, 'tomas-rivera')
    const plan = buildPlan(tomas, data, today)
    expect(blockedBy(plan, 's-crm-account').map((task) => task.template.title)).toEqual([
      'Review CRM workflows',
    ])
  })
})

describe('your next actions', () => {
  const ids = (persona: Persona) =>
    leaderActions(persona, seed(), today).map((item) => `${item.hire.id}:${item.task.template.id}`)

  it('gives a manager only their own open tasks on their own team', () => {
    expect(ids(asDavid)).toEqual(['emily-carter:c-welcome', 'jordan-lee:e-buddy'])
  })

  it('puts overdue work first', () => {
    expect(ids(asRenee)[0]).toBe('marcus-webb:s-territory')
    expect(ids(asRenee)).toContain('tomas-rivera:s-territory')
  })

  it('gives Sarah HR and IT tasks, and no manager or new hire tasks', () => {
    const items = leaderActions(asSarah, seed(), today)
    expect(new Set(items.map((item) => item.task.template.owner))).toEqual(new Set(['hr', 'it']))
    expect(items[0]?.task.template.id).toBe('s-crm-account')
  })

  it('leaves out completed, upcoming and waiting tasks', () => {
    for (const { task } of leaderActions(asSarah, seed(), today)) {
      expect(['overdue', 'outstanding']).toContain(task.status.kind)
    }
  })

  it('drops a task once it is completed', () => {
    const next = mustOk(completeTask(seed(), asDavid, 'emily-carter', 'c-welcome', today))
    expect(leaderActions(asDavid, next, today).map((item) => item.task.template.id)).toEqual(['e-buddy'])
  })

  it('returns nothing for a new hire persona', () => {
    expect(ids(emilyPersona(seed()))).toEqual([])
  })
})

describe('roster and reasons', () => {
  it('sorts by need, then by how overdue', () => {
    const data = seed()
    const order = rosterOrder(data.hires, data, today).map((row) => row.hire.id)
    expect(order[0]).toBe('marcus-webb')
    expect(order[1]).toBe('priya-nair')
    expect(order[2]).toBe('tomas-rivera')
    expect(order.at(-1)).toBe('aisha-rahman')
  })

  it('writes the reason with owners', () => {
    const data = seed()
    const reason = (id: string) => {
      const hire = hireOf(data, id)
      return healthReason(hireHealth(buildPlan(hire, data, today)), hire)
    }
    expect(reason('marcus-webb')).toBe('3 overdue: 2 Marcus, 1 Renee')
    expect(reason('tomas-rivera')).toBe('1 overdue, owned by IT')
    expect(reason('priya-nair')).toBe('2 overdue, owned by Priya')
    expect(reason('emily-carter')).toBe('Nothing overdue')
    expect(reason('aisha-rahman')).toBe('All 18 tasks done')
  })
})
