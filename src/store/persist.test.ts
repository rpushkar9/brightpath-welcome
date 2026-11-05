import { describe, expect, it } from 'vitest'
import { iso } from '../domain/dates'
import { createSeed } from '../domain/seed'
import { STORAGE_KEY, loadData, parseAppData, saveData, type StorageLike } from './persist'

const today = iso('2026-11-04')

const memoryStorage = (initial?: string): StorageLike & { value: string | null } => {
  const storage = {
    value: initial ?? null,
    getItem: () => storage.value,
    setItem: (_key: string, value: string) => {
      storage.value = value
    },
    removeItem: () => {
      storage.value = null
    },
  }
  return storage
}

const withSeed = (change: (seed: Record<string, unknown>) => void): string => {
  const seed: Record<string, unknown> = JSON.parse(JSON.stringify(createSeed(today)))
  change(seed)
  return JSON.stringify(seed)
}

describe('loadData', () => {
  it('seeds and saves when nothing is stored', () => {
    const storage = memoryStorage()
    const { data, notice } = loadData(storage, today)
    expect(notice).toBe('none')
    expect(data.hires).toHaveLength(6)
    expect(storage.value).not.toBeNull()
  })

  it('returns saved data unchanged', () => {
    const seed = createSeed(today)
    const { data, notice } = loadData(memoryStorage(JSON.stringify(seed)), today)
    expect(notice).toBe('none')
    expect(data).toEqual(seed)
  })

  it.each([
    ['broken JSON', '{not json'],
    ['the wrong shape', '[1,2,3]'],
    ['null', 'null'],
    ['a future version', withSeed((seed) => { seed.version = 2 })],
    ['a missing hires list', withSeed((seed) => { delete seed.hires })],
    ['a bad date', withSeed((seed) => { seed.seededOn = '2026-13-40' })],
    ['a completion for nobody', withSeed((seed) => { seed.completions = { 'ghost:c-profile': { on: '2026-11-04', byName: 'X' } } })],
    ['a nudge for an unknown task', withSeed((seed) => { seed.nudges = [{ hireId: 'emily-carter', taskId: 'nope', fromName: 'X', on: '2026-11-04', dismissed: false }] })],
    ['duplicate hires', withSeed((seed) => {
      const hires = seed.hires as unknown[]
      seed.hires = [...hires, hires[0]]
    })],
  ])('restores the sample data after %s', (_label, raw) => {
    const storage = memoryStorage(raw)
    const { data, notice } = loadData(storage, today)
    expect(notice).toBe('restored')
    expect(data.hires).toHaveLength(6)
    expect(parseAppData(JSON.parse(storage.value ?? 'null'))).toEqual(data)
  })

  it('accepts data saved before help requests existed', () => {
    const raw = withSeed((seed) => { delete seed.helpRequests })
    const { data, notice } = loadData(memoryStorage(raw), today)
    expect(notice).toBe('none')
    expect(data.helpRequests).toEqual([])
  })

  it('restores sample data after a help request for nobody', () => {
    const raw = withSeed((seed) => {
      seed.helpRequests = [{ id: 'x', hireId: 'ghost', taskId: null, toLeaderId: 'sarah', message: 'Hi', on: '2026-11-04', status: 'open', resolvedBy: null }]
    })
    expect(loadData(memoryStorage(raw), today).notice).toBe('restored')
  })

  it('works in memory when storage is not available', () => {
    const { data, notice } = loadData(null, today)
    expect(notice).toBe('unavailable')
    expect(data.hires).toHaveLength(6)
  })

  it('reports unavailable when reading throws', () => {
    const storage = memoryStorage()
    storage.getItem = () => {
      throw new DOMException('Denied', 'SecurityError')
    }
    expect(loadData(storage, today).notice).toBe('unavailable')
  })
})

describe('saveData', () => {
  it('returns false when the write fails, such as a full quota', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError')
    }
    expect(saveData(storage, createSeed(today))).toBe(false)
  })

  it('uses the versioned key', () => {
    expect(STORAGE_KEY).toBe('brightpath-welcome:v1')
  })
})
