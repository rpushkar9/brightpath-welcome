import { describe, expect, it } from 'vitest'
import { iso } from './dates'
import { addHire, validateNewHire } from './newHire'
import { buildPlan, hireHealth, nextSteps } from './plan'
import { createSeed } from './seed'

const today = iso('2026-11-04')
const valid = {
  name: 'Lena Okafor',
  title: 'Backend Engineer',
  department: 'engineering',
  startDate: '2026-11-16',
}

const errorsFor = (input: Partial<typeof valid>) => {
  const result = validateNewHire({ ...valid, ...input }, createSeed(today), today)
  return result.ok ? {} : result.errors
}

describe('validateNewHire', () => {
  it('accepts valid input and assigns the department manager', () => {
    const result = validateNewHire(valid, createSeed(today), today)
    expect(result).toMatchObject({
      ok: true,
      hire: { name: 'Lena Okafor', managerId: 'david', planCreatedOn: today },
    })
  })

  it('trims and collapses whitespace in names', () => {
    const result = validateNewHire({ ...valid, name: '  Lena   Okafor ' }, createSeed(today), today)
    expect(result).toMatchObject({ ok: true, hire: { name: 'Lena Okafor' } })
  })

  it('rejects blank and overlong text', () => {
    expect(errorsFor({ name: '   ' }).name).toBeDefined()
    expect(errorsFor({ title: '' }).title).toBeDefined()
    expect(errorsFor({ name: 'x'.repeat(81) }).name).toBeDefined()
    expect(errorsFor({ title: 'x'.repeat(81) }).title).toBeDefined()
  })

  it('accepts names with accents and apostrophes', () => {
    expect(errorsFor({ name: "Siobhán O'Neill" }).name).toBeUndefined()
  })

  it('rejects a missing or unknown department', () => {
    expect(errorsFor({ department: '' }).department).toBeDefined()
    expect(errorsFor({ department: 'marketing' }).department).toBeDefined()
  })

  it('rejects missing, invalid, past, weekend and far-future dates', () => {
    expect(errorsFor({ startDate: '' }).startDate).toBeDefined()
    expect(errorsFor({ startDate: '2026-02-30' }).startDate).toBeDefined()
    expect(errorsFor({ startDate: '2026-11-03' }).startDate).toBeDefined()
    expect(errorsFor({ startDate: '2026-11-07' }).startDate).toBeDefined()
    expect(errorsFor({ startDate: '2027-05-04' }).startDate).toBeDefined()
  })

  it('accepts today and exactly 180 days ahead', () => {
    expect(errorsFor({ startDate: '2026-11-04' }).startDate).toBeUndefined()
    expect(errorsFor({ startDate: '2027-05-03' }).startDate).toBeUndefined()
  })

  it('rejects the same person and start date, ignoring case and spacing', () => {
    const data = createSeed(today)
    const existing = data.hires.find((hire) => hire.id === 'jordan-lee')
    if (!existing) throw new Error('Missing Jordan')
    const errors = errorsFor({ name: ' JORDAN  lee ', startDate: existing.startDate })
    expect(errors.name).toContain('already')
  })
})

describe('addHire', () => {
  it('adds a hire with an unused id and no completed tasks', () => {
    const data = createSeed(today)
    const result = validateNewHire(valid, data, today)
    if (!result.ok) throw new Error('Expected valid input')
    const next = addHire(data, result.hire)
    expect(next.hires).toHaveLength(data.hires.length + 1)
    expect(Object.keys(next.completions)).toEqual(Object.keys(data.completions))
  })

  it('creates a usable plan with no overdue tasks when starting today', () => {
    const data = createSeed(today)
    const result = validateNewHire({ ...valid, startDate: today }, data, today)
    if (!result.ok) throw new Error('Expected valid input')
    const next = addHire(data, result.hire)
    const plan = buildPlan(result.hire, next, today)
    expect(hireHealth(plan).kind).toBe('on-track')
    expect(nextSteps(plan).shown.length).toBeGreaterThan(0)
  })

  it('keeps ids unique for two people with the same name', () => {
    const data = createSeed(today)
    const first = validateNewHire(valid, data, today)
    if (!first.ok) throw new Error('Expected valid input')
    const next = addHire(data, first.hire)
    const second = validateNewHire({ ...valid, startDate: '2026-11-17' }, next, today)
    if (!second.ok) throw new Error('Expected valid input')
    expect(second.hire.id).not.toBe(first.hire.id)
  })
})
