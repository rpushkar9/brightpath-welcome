import type { ActivityEvent, AppData, IsoDate } from './types'

const MAX_EVENTS = 300

/** Adds to the activity log. It only records what actually happened, as it happens. */
export function recordEvent(
  data: AppData,
  event: { kind: ActivityEvent['kind']; on: IsoDate; hireId: string; taskId: string | null; actor: string },
): AppData {
  const seq = (data.events.at(-1)?.seq ?? 0) + 1
  return { ...data, events: [...data.events, { ...event, seq }].slice(-MAX_EVENTS) }
}

export const latestSeq = (data: AppData): number => data.events.at(-1)?.seq ?? 0
