import { useSyncExternalStore } from 'react'

export type Route =
  | { screen: 'root' }
  | { screen: 'home'; hireId: string; taskId: string | null }
  | { screen: 'plan'; hireId: string; taskId: string | null }
  | { screen: 'team'; leaderId: string }
  | { screen: 'hire'; leaderId: string; hireId: string; taskId: string | null }
  | { screen: 'new'; leaderId: string }
  | { screen: 'not-found' }

const NOT_FOUND: Route = { screen: 'not-found' }

function decodeSegments(hash: string): string[] | null {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '')
  if (!path) return []
  try {
    return path.split('/').map(decodeURIComponent)
  } catch {
    return null
  }
}

export function parseRoute(hash: string): Route {
  const parts = decodeSegments(hash)
  if (!parts) return NOT_FOUND
  if (parts.length === 0) return { screen: 'root' }
  if (parts.some((part) => !part)) return NOT_FOUND

  const [area, id, section, sub, subId, ...rest] = parts
  if (rest.length > 0 || !id) return NOT_FOUND

  if (area === 'me') {
    if (section === undefined) return { screen: 'home', hireId: id, taskId: null }
    if (section === 'plan') {
      if (sub === undefined) return { screen: 'plan', hireId: id, taskId: null }
      return sub === 'task' && subId && parts.length === 5
        ? { screen: 'plan', hireId: id, taskId: subId }
        : NOT_FOUND
    }
    return section === 'task' && sub && parts.length === 4
      ? { screen: 'home', hireId: id, taskId: sub }
      : NOT_FOUND
  }

  if (area === 'team') {
    if (section === undefined) return { screen: 'team', leaderId: id }
    if (section === 'new') return parts.length === 3 ? { screen: 'new', leaderId: id } : NOT_FOUND
    if (section === 'hire' && sub) {
      if (subId === undefined) return { screen: 'hire', leaderId: id, hireId: sub, taskId: null }
      return subId === 'task' ? NOT_FOUND : NOT_FOUND
    }
  }

  return NOT_FOUND
}

/** Parses the long hire-task route, which has more segments than the general pattern. */
function parseHireTask(hash: string): Route | null {
  const parts = decodeSegments(hash)
  if (parts?.length !== 6) return null
  const [area, leaderId, hire, hireId, task, taskId] = parts
  if (area !== 'team' || hire !== 'hire' || task !== 'task') return null
  if (!leaderId || !hireId || !taskId) return null
  return { screen: 'hire', leaderId, hireId, taskId }
}

export const routeFromHash = (hash: string): Route => parseHireTask(hash) ?? parseRoute(hash)

export function hrefFor(route: Route): string {
  const join = (...parts: string[]) => `#/${parts.map(encodeURIComponent).join('/')}`
  switch (route.screen) {
    case 'root':
      return '#/'
    case 'home':
      return route.taskId
        ? join('me', route.hireId, 'task', route.taskId)
        : join('me', route.hireId)
    case 'plan':
      return route.taskId
        ? join('me', route.hireId, 'plan', 'task', route.taskId)
        : join('me', route.hireId, 'plan')
    case 'team':
      return join('team', route.leaderId)
    case 'hire':
      return route.taskId
        ? join('team', route.leaderId, 'hire', route.hireId, 'task', route.taskId)
        : join('team', route.leaderId, 'hire', route.hireId)
    case 'new':
      return join('team', route.leaderId, 'new')
    case 'not-found':
      return '#/not-found'
    default: {
      const exhaustive: never = route
      return exhaustive
    }
  }
}

/** Identifies a page, ignoring any open task drawer. */
export const pageKeyOf = (route: Route): string =>
  hrefFor(
    route.screen === 'home' || route.screen === 'plan' || route.screen === 'hire'
      ? { ...route, taskId: null }
      : route,
  )

let returning = false

/** Asks the next page to restore its scroll position, because the person is going back. */
export const markReturning = (): void => {
  returning = true
}

export const takeReturning = (): boolean => {
  const value = returning
  returning = false
  return value
}

/** The same screen, with a task's drawer open. */
export function withTask(route: Route, taskId: string): Route {
  return route.screen === 'home' || route.screen === 'plan' || route.screen === 'hire'
    ? { ...route, taskId }
    : route
}

export const navigate = (route: Route): void => {
  window.location.hash = hrefFor(route)
}

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

const getHash = () => window.location.hash

export const useRoute = (): Route => routeFromHash(useSyncExternalStore(subscribe, getHash))

let overlayTrigger: string | null = null

/** Returns the link that opened the last drawer, once, so focus can go back to it. */
export const takeOverlayTrigger = (): string | null => {
  const trigger = overlayTrigger
  overlayTrigger = null
  return trigger
}

/** Opens a task drawer. The history entry records this, so Back and Forward stay correct. */
export const openOverlay = (route: Route, trigger?: string): void => {
  overlayTrigger = trigger ?? null
  window.history.pushState({ overlay: true }, '', hrefFor(route))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Steps back if the drawer was opened in the app. A direct link is replaced, so Back leaves it. */
export const closeOverlay = (parent: Route): void => {
  if (window.history.state?.overlay === true) {
    window.history.back()
    return
  }
  window.location.replace(hrefFor(parent))
}
