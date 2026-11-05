import { parseIsoDate } from '../domain/dates'
import { managerIdFor } from '../domain/people'
import { completionKey, templatesFor } from '../domain/plan'
import { createSeed } from '../domain/seed'
import { leaderById } from '../domain/people'
import type { AppData, Completion, HelpRequest, Hire, IsoDate, Nudge } from '../domain/types'

export const STORAGE_KEY = 'brightpath-welcome:v1'

export type StoreNotice = 'none' | 'restored' | 'unavailable'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const dateOf = (value: unknown): IsoDate | null =>
  typeof value === 'string' ? parseIsoDate(value) : null

function parseHire(value: unknown): Hire | null {
  if (!isRecord(value)) return null
  const { id, name, title, department, startDate, planCreatedOn } = value
  if (typeof id !== 'string' || !id) return null
  if (typeof name !== 'string' || !name) return null
  if (typeof title !== 'string') return null
  if (department !== 'engineering' && department !== 'sales') return null
  const start = dateOf(startDate)
  if (!start) return null
  const created = planCreatedOn === null ? null : dateOf(planCreatedOn)
  if (planCreatedOn !== null && !created) return null
  return {
    id,
    name,
    title,
    department,
    managerId: managerIdFor(department),
    startDate: start,
    planCreatedOn: created,
  }
}

function parseCompletion(value: unknown): Completion | null {
  if (!isRecord(value) || typeof value.byName !== 'string') return null
  const on = dateOf(value.on)
  return on ? { on, byName: value.byName } : null
}

function parseNudge(value: unknown): Nudge | null {
  if (!isRecord(value)) return null
  const { hireId, taskId, fromName, dismissed } = value
  const on = dateOf(value.on)
  if (typeof hireId !== 'string' || typeof taskId !== 'string') return null
  if (typeof fromName !== 'string' || typeof dismissed !== 'boolean' || !on) return null
  return { hireId, taskId, fromName, on, dismissed }
}

function parseHelpRequest(value: unknown): HelpRequest | null {
  if (!isRecord(value)) return null
  const { id, hireId, taskId, toLeaderId, message, status, resolvedBy } = value
  const on = dateOf(value.on)
  if (typeof id !== 'string' || typeof hireId !== 'string' || !on) return null
  if (taskId !== null && typeof taskId !== 'string') return null
  if (typeof toLeaderId !== 'string' || !leaderById(toLeaderId)) return null
  if (typeof message !== 'string' || (status !== 'open' && status !== 'resolved')) return null
  if (resolvedBy !== null && typeof resolvedBy !== 'string') return null
  return { id, hireId, taskId, toLeaderId, message, on, status, resolvedBy }
}

/** Accepts saved data only if every part is well formed and refers to something real. */
export function parseAppData(value: unknown): AppData | null {
  if (!isRecord(value) || value.version !== 1) return null
  const seededOn = dateOf(value.seededOn)
  if (!seededOn || !Array.isArray(value.hires) || !isRecord(value.completions)) return null
  if (!Array.isArray(value.nudges)) return null

  const hires: Hire[] = []
  for (const raw of value.hires) {
    const hire = parseHire(raw)
    if (!hire || hires.some((item) => item.id === hire.id)) return null
    hires.push(hire)
  }

  const validKeys = new Set(
    hires.flatMap((hire) =>
      templatesFor(hire.department).map((task) => completionKey(hire.id, task.id)),
    ),
  )
  const completions: Record<string, Completion> = {}
  for (const [key, raw] of Object.entries(value.completions)) {
    const completion = parseCompletion(raw)
    if (!completion || !validKeys.has(key)) return null
    completions[key] = completion
  }

  const nudges: Nudge[] = []
  for (const raw of value.nudges) {
    const nudge = parseNudge(raw)
    if (!nudge || !validKeys.has(completionKey(nudge.hireId, nudge.taskId))) return null
    nudges.push(nudge)
  }

  // Data saved before help requests existed simply has none yet.
  const rawRequests = value.helpRequests === undefined ? [] : value.helpRequests
  if (!Array.isArray(rawRequests)) return null
  const helpRequests: HelpRequest[] = []
  for (const raw of rawRequests) {
    const request = parseHelpRequest(raw)
    if (!request || !hires.some((hire) => hire.id === request.hireId)) return null
    if (request.taskId && !validKeys.has(completionKey(request.hireId, request.taskId))) return null
    helpRequests.push(request)
  }

  return { version: 1, seededOn, hires, completions, nudges, helpRequests }
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function loadData(
  storage: StorageLike | null,
  today: IsoDate,
): { data: AppData; notice: StoreNotice } {
  if (!storage) return { data: createSeed(today), notice: 'unavailable' }
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) {
      const data = createSeed(today)
      storage.setItem(STORAGE_KEY, JSON.stringify(data))
      return { data, notice: 'none' }
    }
    const parsed = parseAppData(JSON.parse(raw))
    if (parsed) return { data: parsed, notice: 'none' }
  } catch (error) {
    if (!(error instanceof SyntaxError)) return { data: createSeed(today), notice: 'unavailable' }
  }

  const data = createSeed(today)
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { data, notice: 'restored' }
  } catch {
    return { data, notice: 'unavailable' }
  }
}

export function saveData(storage: StorageLike | null, data: AppData): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
