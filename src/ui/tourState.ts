import { useSyncExternalStore } from 'react'

const SEEN_KEY = 'brightpath-welcome:tour-seen'
// This value turns off opening by itself. "Show me around" still works.
const AUTO_OFF = '*'

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

const shownThisLoad = new Set<string>()
// Keeps the choice for this page load if the browser blocks saving it.
let offThisLoad = false

export function tourOpensOnLoad(): boolean {
  if (offThisLoad) return false
  try {
    return window.localStorage.getItem(SEEN_KEY) !== AUTO_OFF
  } catch {
    return true
  }
}

export function setTourOpensOnLoad(on: boolean): void {
  offThisLoad = !on
  try {
    if (on) window.localStorage.removeItem(SEEN_KEY)
    else window.localStorage.setItem(SEEN_KEY, AUTO_OFF)
  } catch {
    // The choice still holds until the next reload.
  }
}

/** This is a demo, so each person's tour opens again after every reload. Returns true once per load. */
export function claimAutoOpen(viewerId: string): boolean {
  if (!tourOpensOnLoad() || shownThisLoad.has(viewerId)) return false
  shownThisLoad.add(viewerId)
  return true
}
