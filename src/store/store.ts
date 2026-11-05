import { useSyncExternalStore } from 'react'
import { todayIso } from '../domain/dates'
import { createSeed } from '../domain/seed'
import type { AppData, IsoDate, Result } from '../domain/types'
import {
  STORAGE_KEY,
  loadData,
  parseAppData,
  saveData,
  type StorageLike,
  type StoreNotice,
} from './persist'

export type StoreSnapshot = { data: AppData; notice: StoreNotice }

export function createStore(storage: StorageLike | null, today: () => IsoDate) {
  let snapshot: StoreSnapshot = loadData(storage, today())
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  /** Picks up changes from other tabs, so a stale tab never overwrites newer work. */
  const latest = (): AppData => {
    if (!storage || snapshot.notice === 'unavailable') return snapshot.data
    try {
      const raw = storage.getItem(STORAGE_KEY)
      const parsed = raw === null ? null : parseAppData(JSON.parse(raw))
      return parsed ?? snapshot.data
    } catch {
      return snapshot.data
    }
  }

  const write = (data: AppData) => {
    const saved = saveData(storage, data)
    const notice: StoreNotice = saved
      ? snapshot.notice === 'unavailable'
        ? 'none'
        : snapshot.notice
      : 'unavailable'
    snapshot = { data, notice }
    emit()
  }

  return {
    getSnapshot: () => snapshot,
    /** The newest saved data, for validation that must not trust this tab's copy. */
    latest,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Applies a domain action to the newest saved data. Returns the reason if refused. */
    apply(action: (data: AppData) => Result): { ok: true } | { ok: false; reason: string } {
      const result = action(latest())
      if (!result.ok) {
        // A refusal can still mean this tab was behind, so show what is actually true.
        const fresh = latest()
        if (fresh !== snapshot.data) {
          snapshot = { ...snapshot, data: fresh }
          emit()
        }
        return result
      }
      write(result.data)
      return { ok: true }
    },
    update(action: (data: AppData) => AppData) {
      write(action(latest()))
    },
    reset() {
      const data = createSeed(today())
      const saved = saveData(storage, data)
      snapshot = { data, notice: saved ? 'none' : 'unavailable' }
      emit()
    },
    dismissNotice() {
      if (snapshot.notice === 'restored') {
        snapshot = { ...snapshot, notice: 'none' }
        emit()
      }
    },
    /** Called when another tab changes storage. */
    syncFromStorage() {
      if (!storage) return
      try {
        const raw = storage.getItem(STORAGE_KEY)
        const parsed = raw === null ? null : parseAppData(JSON.parse(raw))
        if (parsed) {
          snapshot = { ...snapshot, data: parsed }
          emit()
        }
      } catch {
        // Another tab wrote something unreadable. Keep what this tab has.
      }
    },
  }
}

export type AppStore = ReturnType<typeof createStore>

function browserStorage(): StorageLike | null {
  try {
    const storage = window.localStorage
    const probe = `${STORAGE_KEY}:probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

export const store = createStore(browserStorage(), () => todayIso())

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === null) store.syncFromStorage()
})

export const useStore = (): StoreSnapshot =>
  useSyncExternalStore(store.subscribe, store.getSnapshot)
