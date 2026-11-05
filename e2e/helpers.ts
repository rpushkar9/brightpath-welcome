import { expect, type Page } from '@playwright/test'

/** A Wednesday, so every date in the suite is predictable whenever it runs. */
export const FIXED_NOW = new Date('2026-11-04T10:00:00')

export async function openApp(page: Page, hash = '#/me/emily-carter', now: Date = FIXED_NOW) {
  await page.clock.setFixedTime(now)
  await page.goto(`/${hash}`)
}

/** Fails a test on any uncaught error or console error. */
export function watchForErrors(page: Page): () => void {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return () => expect(errors).toEqual([])
}
