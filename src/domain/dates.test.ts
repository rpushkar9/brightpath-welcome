import { describe, expect, it } from 'vitest'
import {
  addBusinessDays,
  businessDaysBetween,
  formatLong,
  formatShort,
  isWeekend,
  iso,
  latestBusinessDay,
  parseIsoDate,
  todayIso,
} from './dates'

describe('addBusinessDays', () => {
  it('skips weekends going forward', () => {
    expect(addBusinessDays(iso('2026-11-06'), 1)).toBe('2026-11-09') // Fri to Mon
    expect(addBusinessDays(iso('2026-11-04'), 5)).toBe('2026-11-11')
  })

  it('skips weekends going backward', () => {
    expect(addBusinessDays(iso('2026-11-09'), -1)).toBe('2026-11-06') // Mon to Fri
  })

  it('returns the same date for zero', () => {
    expect(addBusinessDays(iso('2026-11-04'), 0)).toBe('2026-11-04')
  })
})

describe('businessDaysBetween', () => {
  it('counts weekdays after the first date through the second', () => {
    expect(businessDaysBetween(iso('2026-11-04'), iso('2026-11-05'))).toBe(1)
    expect(businessDaysBetween(iso('2026-11-06'), iso('2026-11-09'))).toBe(1)
  })

  it('does not count a weekend day as a day late', () => {
    expect(businessDaysBetween(iso('2026-11-06'), iso('2026-11-07'))).toBe(0)
    expect(businessDaysBetween(iso('2026-11-06'), iso('2026-11-08'))).toBe(0)
  })

  it('is negative when the second date is earlier', () => {
    expect(businessDaysBetween(iso('2026-11-11'), iso('2026-11-04'))).toBe(-5)
  })

  it('is the inverse of addBusinessDays from a weekday', () => {
    const start = iso('2026-11-04')
    for (const offset of [-12, -5, -1, 0, 1, 4, 11, 25]) {
      expect(businessDaysBetween(start, addBusinessDays(start, offset))).toBe(offset)
    }
  })
})

describe('date helpers', () => {
  it('finds the most recent business day', () => {
    expect(latestBusinessDay(iso('2026-11-04'))).toBe('2026-11-04')
    expect(latestBusinessDay(iso('2026-11-07'))).toBe('2026-11-06')
    expect(latestBusinessDay(iso('2026-11-08'))).toBe('2026-11-06')
  })

  it('identifies weekends', () => {
    expect(isWeekend(iso('2026-11-07'))).toBe(true)
    expect(isWeekend(iso('2026-11-06'))).toBe(false)
  })

  it('uses the local calendar date late at night', () => {
    expect(todayIso(new Date(2026, 10, 4, 23, 30))).toBe('2026-11-04')
    expect(todayIso(new Date(2026, 10, 4, 0, 5))).toBe('2026-11-04')
  })

  it('formats without shifting the day in any time zone', () => {
    expect(formatShort(iso('2026-11-04'))).toBe('Wed, Nov 4')
    expect(formatLong(iso('2026-11-04'))).toBe('Wednesday, November 4, 2026')
  })

  it('rejects dates that are malformed or do not exist', () => {
    expect(parseIsoDate('2026-11-04')).toBe('2026-11-04')
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('11/04/2026')).toBeNull()
    expect(parseIsoDate('')).toBeNull()
  })
})
