import { describe, expect, it } from 'vitest'
import { activitySince, markSeen } from './activity'
import { iso } from './dates'
import { resolveHelp, requestHelp } from './help'
import { DAVID, RENEE, SARAH } from './people'
import { blockedElsewhere, completeTask, sendNudge, undoTask } from './rules'
import { createSeed } from './seed'
import type { AppData, Persona, Result } from './types'

const today = iso('2026-11-04')
const asEmily = (data: AppData): Persona => ({
  kind: 'employee',
  hire: data.hires.find((hire) => hire.id === 'emily-carter') ?? data.hires[0]!,
})
const asDavid: Persona = { kind: 'leader', leader: DAVID }
const asSarah: Persona = { kind: 'leader', leader: SARAH }
const mustOk = (result: Result): AppData => {
  if (!result.ok) throw new Error(result.reason)
  return result.data
}

describe('activity', () => {
  it('starts empty, because sample history did not happen while anyone watched', () => {
    expect(activitySince(createSeed(today), DAVID, 0)).toEqual([])
  })

  it('reports real actions on the leader’s own team, newest first', () => {
    const start = createSeed(today)
    let data = mustOk(completeTask(start, asEmily(start), 'emily-carter', 'c-handbook', today))
    data = mustOk(requestHelp(data, asEmily(data), 'c-benefits', 'Help', today))
    expect(activitySince(data, DAVID, 0).map((item) => item.text)).toEqual([
      'Emily asked for help with “Choose your benefits”',
      'Emily completed “Review the employee handbook”',
    ])
    expect(activitySince(data, RENEE, 0)).toEqual([])
    expect(activitySince(data, SARAH, 0)).toHaveLength(2)
  })

  it('leaves out the leader’s own actions', () => {
    const data = mustOk(sendNudge(createSeed(today), asDavid, 'priya-nair', today))
    expect(activitySince(data, DAVID, 0)).toEqual([])
    expect(activitySince(data, SARAH, 0).map((item) => item.text)).toEqual([
      'David nudged Priya about “Choose your benefits”',
    ])
  })

  it('cancels a completion that was undone', () => {
    const start = createSeed(today)
    const done = mustOk(completeTask(start, asEmily(start), 'emily-carter', 'c-handbook', today))
    const undone = mustOk(undoTask(done, asEmily(done), 'emily-carter', 'c-handbook', today))
    expect(activitySince(undone, DAVID, 0)).toEqual([])
  })

  it('reports only what is new since the last visit', () => {
    const start = createSeed(today)
    const first = mustOk(completeTask(start, asEmily(start), 'emily-carter', 'c-handbook', today))
    const seen = markSeen(first, 'david')
    expect(activitySince(seen, DAVID, seen.seenThrough.david ?? 0)).toEqual([])
    const second = mustOk(completeTask(seen, asEmily(seen), 'emily-carter', 'e-docs', today))
    expect(activitySince(second, DAVID, second.seenThrough.david ?? 0)).toHaveLength(1)
  })

  it('records when a request is resolved', () => {
    const data = mustOk(resolveHelp(createSeed(today), asSarah, 'help-tomas-rivera-1', today))
    expect(activitySince(data, RENEE, 0).map((item) => item.text)).toEqual([
      'Sarah resolved Tomás’s request',
    ])
  })
})

describe('work with someone else', () => {
  it('shows a manager the IT work holding up their team', () => {
    const items = blockedElsewhere(asDavid, createSeed(today), today)
    expect(items.map((item) => item.task.template.id)).toEqual(['e-repo-grant'])
    expect(items[0]?.blocks.map((task) => task.template.id)).toEqual(['e-local-setup'])
  })

  it('leaves out work the viewer can act on', () => {
    expect(blockedElsewhere(asSarah, createSeed(today), today).map((item) => item.task.template.owner)).not.toContain('it')
  })
})
