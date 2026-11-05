import type { ActivityEvent, AppData } from './types'

const MAX_EVENTS = 300

/** Adds to the activity log. It only records what actually happened, as it happens. */
export function recordEvent(
  data: AppData,
  event: Omit<ActivityEvent, 'seq'>,
): AppData {
  const seq = (data.events.at(-1)?.seq ?? 0) + 1
  return { ...data, events: [...data.events, { ...event, seq }].slice(-MAX_EVENTS) }
}

export const latestSeq = (data: AppData): number => data.events.at(-1)?.seq ?? 0
