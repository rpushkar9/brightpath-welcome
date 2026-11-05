import { addCalendarDays, isWeekend, parseIsoDate } from './dates'
import { managerIdFor } from './people'
import type { AppData, Department, Hire, IsoDate } from './types'

export type NewHireInput = {
  name: string
  title: string
  department: string
  startDate: string
}

export type NewHireErrors = Partial<Record<keyof NewHireInput, string>>

const MAX_TEXT = 80
const MAX_DAYS_AHEAD = 180

const clean = (value: string): string => value.trim().replace(/\s+/g, ' ')
const isDepartment = (value: string): value is Department =>
  value === 'engineering' || value === 'sales'

function makeId(name: string, data: AppData): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'new-hire'
  const taken = new Set(data.hires.map((hire) => hire.id))
  if (!taken.has(slug)) return slug
  let suffix = 2
  while (taken.has(`${slug}-${suffix}`)) suffix += 1
  return `${slug}-${suffix}`
}

function startDateError(startDate: IsoDate | null, today: IsoDate): string | undefined {
  if (!startDate) return 'Enter a valid start date.'
  if (startDate < today) return 'Choose today or a later date.'
  if (startDate > addCalendarDays(today, MAX_DAYS_AHEAD)) {
    return 'Choose a date within the next 180 days.'
  }
  if (isWeekend(startDate)) return 'Choose a weekday. Plans are scheduled in business days.'
  return undefined
}

export function validateNewHire(
  input: NewHireInput,
  data: AppData,
  today: IsoDate,
): { ok: true; hire: Hire } | { ok: false; errors: NewHireErrors } {
  const name = clean(input.name)
  const title = clean(input.title)
  const startDate = parseIsoDate(input.startDate)
  const errors: NewHireErrors = {}

  if (!name) errors.name = 'Enter the new hire’s full name.'
  else if (name.length > MAX_TEXT) errors.name = `Keep the name to ${MAX_TEXT} characters or fewer.`

  if (!title) errors.title = 'Enter a job title.'
  else if (title.length > MAX_TEXT) errors.title = `Keep the title to ${MAX_TEXT} characters or fewer.`

  if (!isDepartment(input.department)) errors.department = 'Choose a department.'

  const dateError = startDateError(startDate, today)
  if (dateError) errors.startDate = dateError

  const isDuplicate = data.hires.some(
    (hire) =>
      hire.name.toLowerCase() === name.toLowerCase() && hire.startDate === input.startDate,
  )
  if (name && !errors.name && isDuplicate) {
    errors.name = 'This person already has a plan with this start date.'
  }

  if (Object.keys(errors).length > 0 || !startDate || !isDepartment(input.department)) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    hire: {
      id: makeId(name, data),
      name,
      title,
      department: input.department,
      managerId: managerIdFor(input.department),
      startDate,
      planCreatedOn: today,
    },
  }
}

export const addHire = (data: AppData, hire: Hire): AppData => ({
  ...data,
  hires: [...data.hires, hire],
})
