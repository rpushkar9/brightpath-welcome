import { describe, expect, it } from 'vitest'
import { iso } from './dates'
import { DAVID, SARAH } from './people'
import {
  affectedSummary,
  evidenceGaps,
  insightFacts,
  ownerShares,
  proposeImprovement,
  setImprovementStatus,
  suggestionFor,
  taskInsights,
} from './insights'
import { requestHelp } from './help'
import { completeTask } from './rules'
import { createSeed } from './seed'
import type { AppData, Persona, Result } from './types'

const today = iso('2026-11-04')
const seed = () => createSeed(today)
const hr: Persona = { kind: 'leader', leader: SARAH }
const david: Persona = { kind: 'leader', leader: DAVID }
const mustOk = (result: Result): AppData => {
  if (!result.ok) throw new Error(result.reason)
  return result.data
}
const insight = (data: AppData, id: string) => {
  const found = taskInsights(data, today).find((item) => item.template.id === id)
  if (!found) throw new Error(`No insight for ${id}`)
  return found
}

describe('task insights', () => {
  it('counts assigned hires by department, so Sales tasks do not include engineers', () => {
    expect(insight(seed(), 's-crm-account').assigned.map((hire) => hire.department)).toEqual([
      'sales',
      'sales',
      'sales',
    ])
  })

  it('separates overdue now, finished late, and blocking, for the same task', () => {
    const crm = insight(seed(), 's-crm-account')
    expect(crm.overdueNow.map((item) => item.hire.id)).toEqual(['tomas-rivera'])
    expect(crm.completedLate.map((item) => item.hire.id).sort()).toEqual(['aisha-rahman', 'marcus-webb'])
    expect(crm.blockingNow.map((item) => item.task.template.id)).toEqual(['s-crm'])
  })

  it('counts a hire once, even with several kinds of friction', () => {
    const crm = insight(seed(), 's-crm-account')
    expect(crm.affected).toHaveLength(3)
    expect(affectedSummary(crm)).toBe('3 of 3 hires')
  })

  it('counts requests apart from the distinct people asking', () => {
    let data = seed()
    const tomas = data.hires.find((hire) => hire.id === 'tomas-rivera')
    if (!tomas) throw new Error('Missing hire')
    const crm = insight(data, 's-crm')
    expect(crm.requests).toHaveLength(2)
    expect(crm.requesters.map((hire) => hire.id).sort()).toEqual(['marcus-webb', 'tomas-rivera'])
    expect(insightFacts(crm)).toContain('2 help requests from 2 hires')
    data = mustOk(requestHelp(data, { kind: 'employee', hire: data.hires.find((h) => h.id === 'marcus-webb') ?? tomas }, 'c-benefits', 'Help', today))
    expect(insight(data, 'c-benefits').requesters).toHaveLength(1)
  })

  it('moves a task from overdue to finished late once it is done, using the plan’s overdue rule', () => {
    const data = mustOk(completeTask(seed(), hr, 'tomas-rivera', 's-crm-account', today))
    const crm = insight(data, 's-crm-account')
    expect(crm.overdueNow).toEqual([])
    expect(crm.blockingNow).toEqual([])
    // Finished one business day after it was due, so it now counts as finished late.
    expect(crm.completedLate.map((item) => item.hire.id)).toContain('tomas-rivera')
  })

  it('ranks by distinct hires affected', () => {
    const list = taskInsights(seed(), today)
    const sizes = list.map((item) => item.affected.length)
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
  })

  it('is empty when nothing has gone wrong', () => {
    const data = seed()
    expect(taskInsights({ ...data, hires: [], helpRequests: [], completions: {} }, today)).toEqual([])
  })

  it('names owners for where to look first', () => {
    expect(ownerShares(taskInsights(seed(), today)).map((share) => share.label)).toContain('IT')
  })
})

describe('suggestions and limits', () => {
  it('frames suggestions as things to review, based on the kind of problem', () => {
    expect(suggestionFor(insight(seed(), 's-crm-account'))).toContain('before the first day')
    const dependent = suggestionFor(insight(seed(), 's-crm'))
    expect(dependent).toContain('depends on “Create CRM account”, so check that first')
    expect(dependent).toContain('clearer instructions')
  })

  it('does not suggest moving a legal deadline', () => {
    const data = mustOk(requestHelp(seed(), { kind: 'employee', hire: seed().hires.find((h) => h.id === 'jordan-lee') ?? seed().hires[0]! }, 'c-i9', 'Help', today))
    expect(suggestionFor(insight(data, 'c-i9'))).toContain('Legal deadlines can’t move')
  })

  it('says what the records cannot show', () => {
    const gaps = evidenceGaps(insight(seed(), 's-crm-account'))
    expect(gaps.join(' ')).toContain('Only 3 hires')
    expect(gaps.join(' ')).toContain('not why')
  })
})

describe('plan improvements', () => {
  it('records a proposal for HR, and does not change anyone’s plan', () => {
    const data = seed()
    const next = mustOk(proposeImprovement(data, hr, 's-crm-account', '  Create accounts earlier ', today))
    expect(next.improvements[0]).toMatchObject({
      taskId: 's-crm-account',
      note: 'Create accounts earlier',
      status: 'proposed',
      by: 'Sarah Mitchell',
    })
    expect(next.completions).toEqual(data.completions)
    expect(next.hires).toEqual(data.hires)
  })

  it('refuses non-HR, blank, overlong, and unknown tasks', () => {
    const data = seed()
    expect(proposeImprovement(data, david, 's-crm', 'X', today).ok).toBe(false)
    expect(proposeImprovement(data, hr, 's-crm', '   ', today).ok).toBe(false)
    expect(proposeImprovement(data, hr, 's-crm', 'x'.repeat(501), today).ok).toBe(false)
    expect(proposeImprovement(data, hr, 'nope', 'X', today).ok).toBe(false)
  })

  it('moves through its statuses, and only HR can change them', () => {
    const next = mustOk(proposeImprovement(seed(), hr, 's-crm', 'X', today))
    const id = next.improvements[0]?.id ?? ''
    expect(setImprovementStatus(next, david, id, 'addressed').ok).toBe(false)
    const reviewed = mustOk(setImprovementStatus(next, hr, id, 'under-review'))
    expect(reviewed.improvements[0]?.status).toBe('under-review')
    expect(setImprovementStatus(next, hr, 'nope', 'addressed').ok).toBe(false)
  })
})
