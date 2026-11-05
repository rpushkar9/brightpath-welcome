import { useSyncExternalStore } from 'react'

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
