import type { IsoDate } from './types'

const DAY_MS = 86_400_000
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

// All arithmetic runs on UTC midnights, so local time zones and daylight saving cannot shift a day.
const toUtc = (date: IsoDate): number => Date.parse(`${date}T00:00:00Z`)

const fromUtc = (ms: number): IsoDate => {
  const parsed = parseIsoDate(new Date(ms).toISOString().slice(0, 10))
  if (!parsed) throw new Error(`Invalid time value: ${ms}`)
  return parsed
}

const weekday = (date: IsoDate): number => new Date(toUtc(date)).getUTCDay()

export function parseIsoDate(value: string): IsoDate | null {
  const match = ISO_PATTERN.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const roundTrips = utc.toISOString().slice(0, 10) === value
  return roundTrips ? (value as IsoDate) : null
}

/** For dates known to be valid, such as constants in tests. */
export function iso(value: string): IsoDate {
  const parsed = parseIsoDate(value)
  if (!parsed) throw new Error(`Invalid date: ${value}`)
  return parsed
}

export function todayIso(now: Date = new Date()): IsoDate {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return iso(`${now.getFullYear()}-${month}-${day}`)
}

export const isWeekend = (date: IsoDate): boolean => [0, 6].includes(weekday(date))

export const addCalendarDays = (date: IsoDate, days: number): IsoDate =>
  fromUtc(toUtc(date) + days * DAY_MS)

export function addBusinessDays(date: IsoDate, days: number): IsoDate {
  const step = days < 0 ? -1 : 1
  let current = date
  let remaining = Math.abs(days)
  while (remaining > 0) {
    current = addCalendarDays(current, step)
    if (!isWeekend(current)) remaining -= 1
  }
  return current
}

/** Weekdays after `from`, up to and including `to`. Negative when `to` is earlier. */
export function businessDaysBetween(from: IsoDate, to: IsoDate): number {
  if (to < from) return -businessDaysBetween(to, from)
  let count = 0
  let current = from
  while (current < to) {
    current = addCalendarDays(current, 1)
    if (!isWeekend(current)) count += 1
  }
  return count
}

export const latestBusinessDay = (date: IsoDate): IsoDate => {
  let current = date
  while (isWeekend(current)) current = addCalendarDays(current, -1)
  return current
}

export const nextBusinessDayOnOrAfter = (date: IsoDate): IsoDate => {
  let current = date
  while (isWeekend(current)) current = addCalendarDays(current, 1)
  return current
}

const shortFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const longFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

export const formatShort = (date: IsoDate): string => shortFormat.format(toUtc(date))
export const formatLong = (date: IsoDate): string => longFormat.format(toUtc(date))
