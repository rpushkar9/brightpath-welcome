import { parseIsoDate } from '../domain/dates'
import { managerIdFor } from '../domain/people'
import { completionKey, templatesFor } from '../domain/plan'
import { createSeed } from '../domain/seed'
import { leaderById } from '../domain/people'
import type {
  ActivityEvent,
  AppData,
  Completion,
  HelpRequest,
  Hire,
  Improvement,
  IsoDate,
  Nudge,
} from '../domain/types'

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

const EVENT_KINDS: ReadonlySet<string> = new Set([
  'task-completed',
  'task-reopened',
  'help-requested',
  'help-resolved',
  'nudge-sent',
  'plan-started',
])
const isEventKind = (value: unknown): value is ActivityEvent['kind'] =>
  typeof value === 'string' && EVENT_KINDS.has(value)

function parseEvent(value: unknown): ActivityEvent | null {
  if (!isRecord(value)) return null
  const { seq, kind, hireId, taskId, actor } = value
  const on = dateOf(value.on)
  if (typeof seq !== 'number' || !Number.isInteger(seq) || !on || !isEventKind(kind)) return null
  if (typeof hireId !== 'string' || typeof actor !== 'string') return null
  if (taskId !== null && typeof taskId !== 'string') return null
  return { seq, on, kind, hireId, taskId, actor }
}

function parseImprovement(value: unknown): Improvement | null {
  if (!isRecord(value)) return null
  const { id, taskId, note, status, by } = value
  const createdOn = dateOf(value.createdOn)
  if (typeof id !== 'string' || typeof taskId !== 'string' || typeof note !== 'string') return null
  if (typeof by !== 'string' || !createdOn) return null
  if (status !== 'proposed' && status !== 'under-review' && status !== 'addressed') return null
  return { id, taskId, note, status, createdOn, by }
}

function parseSeenThrough(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null
  const result: Record<string, number> = {}
  for (const [key, seq] of Object.entries(value)) {
    if (typeof seq !== 'number' || !Number.isInteger(seq)) return null
    result[key] = seq
  }
  return result
}

/** Accepts saved data only if every part is well formed and refers to something real. */
export function parseAppData(value: unknown): AppData | null {
  // Version 1 has no log or improvements yet, so those start empty and nothing is lost.
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2)) return null
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

  const events: ActivityEvent[] = []
  for (const raw of value.events === undefined ? [] : Array.isArray(value.events) ? value.events : [null]) {
    const event = parseEvent(raw)
    if (!event || !hires.some((hire) => hire.id === event.hireId)) return null
    events.push(event)
  }

  const improvements: Improvement[] = []
  const rawImprovements = value.improvements === undefined ? [] : value.improvements
  if (!Array.isArray(rawImprovements)) return null
  for (const raw of rawImprovements) {
    const improvement = parseImprovement(raw)
    if (!improvement) return null
    improvements.push(improvement)
  }

  const seenThrough = value.seenThrough === undefined ? {} : parseSeenThrough(value.seenThrough)
  if (!seenThrough) return null

  return { version: 2, seededOn, hires, completions, nudges, helpRequests, events, seenThrough, improvements }
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
