import { describe, expect, it } from 'vitest'
import { iso } from './dates'
import {
  answerQuestion,
  draftHelpMessage,
  helpRecipient,
  openRequestFor,
  openRequestsFor,
  requestHelp,
  resolveHelp,
} from './help'
import { DAVID, RENEE, SARAH } from './people'
import { buildPlan } from './plan'
import { completeTask, undoTask } from './rules'
import { createSeed } from './seed'
import type { AppData, Hire, Persona, Result } from './types'

const today = iso('2026-11-04')
const seed = () => createSeed(today)
const hireOf = (data: AppData, id: string): Hire => {
  const hire = data.hires.find((item) => item.id === id)
  if (!hire) throw new Error(`No hire ${id}`)
  return hire
}
const asEmployee = (data: AppData, id: string): Persona => ({ kind: 'employee', hire: hireOf(data, id) })
const asLeader = (leader: typeof DAVID): Persona => ({ kind: 'leader', leader })
const mustOk = (result: Result): AppData => {
  if (!result.ok) throw new Error(result.reason)
  return result.data
}
const taskOf = (data: AppData, hireId: string, taskId: string) => {
  const task = buildPlan(hireOf(data, hireId), data, today).find((item) => item.template.id === taskId)
  if (!task) throw new Error(`No task ${taskId}`)
  return task
}
const ask = (question: string, hireId = 'emily-carter') => {
  const data = seed()
  return answerQuestion(question, hireOf(data, hireId), data, today)
}

describe('who a help request goes to', () => {
  it('sends a task waiting on IT to Sarah', () => {
    const data = seed()
    expect(helpRecipient(hireOf(data, 'emily-carter'), taskOf(data, 'emily-carter', 'e-local-setup'))).toBe(SARAH)
  })

  it('sends a person’s own task and general questions to their manager', () => {
    const data = seed()
    const emily = hireOf(data, 'emily-carter')
    expect(helpRecipient(emily, taskOf(data, 'emily-carter', 'c-handbook'))).toBe(DAVID)
    expect(helpRecipient(emily, null)).toBe(DAVID)
    expect(helpRecipient(hireOf(data, 'marcus-webb'), null)).toBe(RENEE)
  })

  it('prepares a message that names the blocker', () => {
    const data = seed()
    expect(draftHelpMessage(taskOf(data, 'emily-carter', 'e-local-setup'))).toContain('Grant repository access')
  })
})

describe('asking for help', () => {
  it('creates an open request for the responsible person', () => {
    const data = seed()
    const next = mustOk(requestHelp(data, asEmployee(data, 'emily-carter'), 'e-local-setup', '  Please check  ', today))
    const request = openRequestFor(next, 'emily-carter', 'e-local-setup')
    expect(request).toMatchObject({ toLeaderId: 'sarah', message: 'Please check', status: 'open' })
    expect(openRequestsFor(next, SARAH).map((item) => item.hireId)).toContain('emily-carter')
    expect(openRequestsFor(next, DAVID)).toEqual([])
  })

  it('rejects blank and overlong messages', () => {
    const data = seed()
    const persona = asEmployee(data, 'emily-carter')
    expect(requestHelp(data, persona, null, '   ', today).ok).toBe(false)
    expect(requestHelp(data, persona, null, 'x'.repeat(501), today).ok).toBe(false)
  })

  it('refuses a second open request about the same task', () => {
    const data = seed()
    const persona = asEmployee(data, 'emily-carter')
    const next = mustOk(requestHelp(data, persona, 'c-handbook', 'Help', today))
    expect(requestHelp(next, persona, 'c-handbook', 'Help again', today).ok).toBe(false)
  })

  it('allows several general questions, each with its own id', () => {
    const data = seed()
    const persona = asEmployee(data, 'emily-carter')
    const once = mustOk(requestHelp(data, persona, null, 'One', today))
    const twice = mustOk(requestHelp(once, persona, null, 'Two', today))
    const ids = twice.helpRequests.map((request) => request.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('refuses an unknown or completed task, and a leader acting as the new hire', () => {
    const data = seed()
    const persona = asEmployee(data, 'emily-carter')
    expect(requestHelp(data, persona, 'nope', 'Help', today).ok).toBe(false)
    expect(requestHelp(data, persona, 'c-profile', 'Help', today).ok).toBe(false)
    expect(requestHelp(data, asLeader(DAVID), null, 'Help', today).ok).toBe(false)
  })

  it('lets only the recipient resolve it, once', () => {
    const data = seed()
    const next = mustOk(requestHelp(data, asEmployee(data, 'emily-carter'), 'e-local-setup', 'Help', today))
    const id = openRequestFor(next, 'emily-carter', 'e-local-setup')?.id ?? ''
    expect(resolveHelp(next, asLeader(DAVID), id).ok).toBe(false)
    expect(resolveHelp(next, asEmployee(next, 'emily-carter'), id).ok).toBe(false)
    const resolved = mustOk(resolveHelp(next, asLeader(SARAH), id))
    expect(resolved.helpRequests.find((item) => item.id === id)).toMatchObject({
      status: 'resolved',
      resolvedBy: 'Sarah Mitchell',
    })
    expect(resolveHelp(resolved, asLeader(SARAH), id).ok).toBe(false)
  })
})

describe('answering questions from the plan', () => {
  it('gives the same order as the next steps list', () => {
    const answer = ask('What should I do next?')
    expect(answer.found).toBe(true)
    expect(answer.lines.map((line) => line.taskId)).toEqual(['c-laptop-setup', 'c-handbook', 'e-docs'])
  })

  it('names what is blocking the person, and who owns it', () => {
    const answer = ask('What am I waiting on?')
    expect(answer.lines).toHaveLength(1)
    expect(answer.lines[0]?.text).toContain('IT to finish “Grant repository access”')
  })

  it('lists only the person’s own tasks due by Friday', () => {
    expect(ask('What’s due this week?').lines.map((line) => line.taskId)).toEqual([
      'c-laptop-setup',
      'c-handbook',
      'e-docs',
    ])
  })

  it('says who owns repository access', () => {
    const answer = ask('Who can help me with repository access?')
    const grant = answer.lines.find((line) => line.taskId === 'e-repo-grant')
    expect(grant?.text).toContain('IT owns this')
    expect(grant?.text).toContain('Sarah Mitchell')
  })

  it('reports late work and progress from real numbers', () => {
    expect(ask('Am I behind?', 'marcus-webb').lines.map((line) => line.taskId)).toEqual(['s-product', 's-crm'])
    expect(ask('Am I behind?').heading).toBe('None of your tasks are late')
    expect(ask('How much is left?').lines[0]?.text).toBe('You’ve finished 4 of your 12 tasks.')
  })

  it('finds a task from a loose question', () => {
    expect(ask('benefits').lines[0]?.taskId).toBe('c-benefits')
    expect(ask('laptop setup').lines[0]?.taskId).toBe('c-laptop-setup')
  })

  it('updates when the plan changes', () => {
    const data = seed()
    const hire = hireOf(data, 'emily-carter')
    const next = mustOk(completeTask(data, asLeader(SARAH), 'emily-carter', 'e-repo-grant', today))
    expect(answerQuestion('What am I waiting on?', hire, next, today).heading).toBe('You’re not waiting on anyone')
  })

  it('answers a named task ahead of a general question', () => {
    expect(ask('When are my benefits due?').lines[0]?.taskId).toBe('c-benefits')
    expect(ask('When is my I-9 due?', 'jordan-lee').lines[0]?.taskId).toBe('c-i9')
    expect(ask('What do I do about payroll?').lines[0]?.text).toContain('Submit tax and payroll forms')
    expect(ask('When is my 30 day check in?').lines[0]?.taskId).toBe('c-30-day')
    expect(ask('Who owns my laptop?').heading).toBe('Who to ask')
  })

  it('answers am I done and start date questions from real data', () => {
    expect(ask('Am I done?', 'aisha-rahman').lines[0]?.text).toBe('You’ve finished 12 of your 12 tasks.')
    expect(ask('When do I start?', 'jordan-lee').lines[0]?.text).toBe('You start on Wednesday, November 11, 2026.')
    expect(ask('When do I start?').lines[0]?.text).toContain('You started on')
  })

  it('does not treat a short word as part of a longer one', () => {
    expect(ask('Can I work from home?').found).toBe(false)
  })

  it('does not say someone is waiting on themselves as if it were someone else', () => {
    const data = seed()
    const priya = hireOf(data, 'priya-nair')
    const undone = mustOk(undoTask(data, asEmployee(data, 'priya-nair'), 'priya-nair', 'e-local-setup', today))
    const answer = answerQuestion('What am I waiting on?', priya, undone, today)
    expect(answer.lines[0]?.text).toBe('“Ship your first pull request” opens once you finish “Run the local setup”.')
  })

  it('answers how long things will take from real estimates', () => {
    const answer = ask('How long will this take?')
    expect(answer.found).toBe(true)
    expect(answer.lines[0]?.text).toBe('About 2 hours of your tasks are open now.')
    expect(ask('How long is left?', 'aisha-rahman').lines[0]?.text).toBe('None of your tasks are open right now.')
  })

  it('includes the estimate when asked about one task', () => {
    expect(ask('employee handbook').lines[0]?.text).toContain('About 25 minutes.')
    expect(ask('Who can help with repository access?').lines.find((line) => line.taskId === 'e-repo-grant')?.text).not.toContain('About')
  })

  it('admits when it cannot answer, rather than guessing', () => {
    const answer = ask('What is the dress code?')
    expect(answer.found).toBe(false)
    expect(answer.lines[0]?.text).toContain('David')
    expect(ask('').found).toBe(false)
  })
})
