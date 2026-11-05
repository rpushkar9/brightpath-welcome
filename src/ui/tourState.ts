import { useSyncExternalStore } from 'react'

const SEEN_KEY = 'brightpath-welcome:tour-seen'
// Turns off first-visit tours entirely. Automated tests use this.
const ALL_SEEN = '*'

let open = false
const listeners = new Set<() => void>()

const setOpen = (next: boolean) => {
  open = next
  listeners.forEach((listener) => listener())
}

export const startTour = (): void => setOpen(true)
export const stopTour = (): void => setOpen(false)

export const useTourOpen = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => open,
  )

function readSeen(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/**
 * Records that this person has now seen their tour. Returns true only the first time.
 * If nothing can be saved it returns false, so a blocked browser never replays the tour on each visit.
 */
export function claimFirstVisit(viewerId: string): boolean {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    if (raw === ALL_SEEN) return false
    const seen = readSeen(raw)
    if (seen.includes(viewerId)) return false
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, viewerId]))
    return true
  } catch {
    return false
  }
}
