import { describe, expect, it } from 'vitest'
import { iso } from './dates'
import { buildPlan, completionKey, hireHealth, nextSteps, progress, stageOf, templatesFor } from './plan'
import { createSeed } from './seed'
import type { AppData, Hire } from './types'

const hireOf = (data: AppData, id: string): Hire => {
  const hire = data.hires.find((item) => item.id === id)
  if (!hire) throw new Error(`No hire ${id}`)
  return hire
}

const summary = (data: AppData, id: string, today = data.seededOn) => {
  const hire = hireOf(data, id)
  const plan = buildPlan(hire, data, today)
  return {
    stage: stageOf(hire, today),
    health: hireHealth(plan).kind,
    done: progress(plan).done,
    next: nextSteps(plan).shown.length,
    plan,
  }
}

describe.each([
  ['a weekday', '2026-11-04'],
  ['a Monday', '2026-11-02'],
  ['a Friday', '2026-11-06'],
])('seed created on %s', (_label, date) => {
  const data = createSeed(iso(date))

  it('gives Emily a first day with three next steps and one task waiting on IT', () => {
    const emily = summary(data, 'emily-carter')
    expect(emily.stage).toBe('first-day')
    expect(emily.health).toBe('on-track')
    expect(emily.next).toBe(3)
    expect(emily.plan.find((t) => t.template.id === 'e-local-setup')?.status.kind).toBe('waiting')
  })

  it('shows Priya needing attention in weeks 2 to 4', () => {
    const priya = summary(data, 'priya-nair')
    expect(priya.stage).toBe('weeks-2-4')
    expect(priya.health).toBe('needs-attention')
  })

  it('shows Jordan in preboarding with fewer tasks', () => {
    const jordan = summary(data, 'jordan-lee')
    expect(jordan.stage).toBe('before')
    expect(jordan.health).toBe('on-track')
    expect(jordan.next).toBe(2)
  })

  it('shows Marcus needing attention', () => {
    const marcus = summary(data, 'marcus-webb')
    expect(marcus.stage).toBe('weeks-2-4')
    expect(marcus.health).toBe('needs-attention')
  })

  it('shows Aisha complete', () => {
    const aisha = summary(data, 'aisha-rahman')
    expect(aisha.health).toBe('complete')
    expect(aisha.done).toBe(18)
  })

  it('shows Tomás on watch because IT is late, without blaming them', () => {
    const tomas = summary(data, 'tomas-rivera')
    expect(tomas.stage).toBe('first-week')
    expect(tomas.health).toBe('watch')
    expect(tomas.plan.find((t) => t.template.id === 's-crm')?.status.kind).toBe('waiting')
  })
})

describe('seed created on a weekend', () => {
  it('still builds a valid demo from the previous Friday', () => {
    const data = createSeed(iso('2026-11-07'))
    expect(data.seededOn).toBe('2026-11-06')
    expect(hireOf(data, 'emily-carter').startDate).toBe('2026-11-06')
    const emily = summary(data, 'emily-carter', iso('2026-11-07'))
    expect(emily.stage).toBe('first-week')
    expect(emily.health).toBe('on-track')
  })
})

describe('seed history', () => {
  it.each(['2026-11-04', '2026-11-02', '2026-11-06', '2026-11-07'])(
    'never finishes a task before its prerequisite, seeded on %s',
    (date) => {
      const data = createSeed(iso(date))
      for (const hire of data.hires) {
        for (const task of templatesFor(hire.department)) {
          const done = data.completions[completionKey(hire.id, task.id)]
          const before = task.requires ? data.completions[completionKey(hire.id, task.requires)] : undefined
          if (done && task.requires) {
            expect(before, `${hire.id} ${task.id} needs its prerequisite done`).toBeDefined()
            if (before) expect(before.on <= done.on, `${hire.id} ${task.id}`).toBe(true)
          }
        }
      }
    },
  )
})

describe('seed dates', () => {
  it('never puts a completion after the seed date', () => {
    const data = createSeed(iso('2026-11-04'))
    for (const completion of Object.values(data.completions)) {
      expect(completion.on <= data.seededOn).toBe(true)
    }
  })
})
