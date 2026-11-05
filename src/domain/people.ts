import type { Department, Leader } from './types'

export const DAVID: Leader = {
  kind: 'manager',
  id: 'david',
  name: 'David Park',
  title: 'Engineering Manager',
  department: 'engineering',
}

export const RENEE: Leader = {
  kind: 'manager',
  id: 'renee',
  name: 'Renee Walsh',
  title: 'Sales Manager',
  department: 'sales',
}

export const SARAH: Leader = {
  kind: 'hr',
  id: 'sarah',
  name: 'Sarah Mitchell',
  title: 'HR Manager',
}

export const LEADERS: readonly Leader[] = [DAVID, RENEE, SARAH]

export const leaderById = (id: string): Leader | undefined =>
  LEADERS.find((leader) => leader.id === id)

export const managerIdFor = (department: Department): string =>
  department === 'engineering' ? DAVID.id : RENEE.id

export const firstName = (name: string): string => name.split(' ')[0] ?? name

export const DEPARTMENT_LABEL: Record<Department, string> = {
  engineering: 'Engineering',
  sales: 'Sales',
}
