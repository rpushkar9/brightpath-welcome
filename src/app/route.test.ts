import { describe, expect, it } from 'vitest'
import { hrefFor, routeFromHash, type Route } from './route'

describe('routes', () => {
  const routes: Route[] = [
    { screen: 'home', hireId: 'emily-carter', taskId: null },
    { screen: 'home', hireId: 'emily-carter', taskId: 'c-handbook' },
    { screen: 'plan', hireId: 'emily-carter', taskId: null },
    { screen: 'plan', hireId: 'emily-carter', taskId: 'c-handbook' },
    { screen: 'team', leaderId: 'david' },
    { screen: 'hire', leaderId: 'david', hireId: 'priya-nair', taskId: null },
    { screen: 'hire', leaderId: 'david', hireId: 'priya-nair', taskId: 'e-first-pr' },
    { screen: 'new', leaderId: 'sarah' },
    { screen: 'people', leaderId: 'sarah' },
    { screen: 'insights', leaderId: 'sarah', taskId: null },
    { screen: 'insights', leaderId: 'sarah', taskId: 's-crm' },
  ]

  it.each(routes)('round-trips %o', (route) => {
    expect(routeFromHash(hrefFor(route))).toEqual(route)
  })

  it.each(['', '#', '#/'])('treats %j as the root', (hash) => {
    expect(routeFromHash(hash)).toEqual({ screen: 'root' })
  })

  it.each([
    '#/nope',
    '#/me',
    '#/me/emily/unknown',
    '#/me/emily/task',
    '#/me/emily/plan/task',
    '#/me/emily/plan/other/x',
    '#/team/david/other',
    '#/team/david/hire',
    '#/team/david/hire/x/task',
    '#/team/david/hire/x/other/y',
    '#/team/david/new/extra',
    '#/team/david/people/extra',
    '#/team/david/insights/a/b',
    '#/me/%E0%A4%A',
    '#/me//task/x',
    '#/a/b/c/d/e/f/g',
  ])('treats %j as not found', (hash) => {
    expect(routeFromHash(hash)).toEqual({ screen: 'not-found' })
  })

  it('encodes unusual ids so they survive a round trip', () => {
    const route: Route = { screen: 'home', hireId: 'a/b c', taskId: null }
    expect(routeFromHash(hrefFor(route))).toEqual(route)
  })
})
