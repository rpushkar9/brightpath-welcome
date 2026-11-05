import {
  addBusinessDays,
  businessDaysBetween,
  nextBusinessDayOnOrAfter,
} from './dates'
import { COMPANY_TASKS, ENGINEERING_TASKS, SALES_TASKS } from './templates'
import type {
  AppData,
  Department,
  Hire,
  HireHealth,
  IsoDate,
  PhaseId,
  PlanTask,
  Stage,
  TaskStatus,
  TaskTemplate,
} from './types'

export const completionKey = (hireId: string, taskId: string): string => `${hireId}:${taskId}`

export const templatesFor = (department: Department): readonly TaskTemplate[] => [
  ...COMPANY_TASKS,
  ...(department === 'engineering' ? ENGINEERING_TASKS : SALES_TASKS),
]

export const PHASES: readonly { id: PhaseId; label: string }[] = [
  { id: 'before', label: 'Before day one' },
  { id: 'first-day', label: 'First day' },
  { id: 'first-week', label: 'First week' },
  { id: 'weeks-2-4', label: 'Weeks 2–4' },
]

export function phaseOfDay(day: number): PhaseId {
  if (day < 0) return 'before'
  if (day === 0) return 'first-day'
  if (day <= 4) return 'first-week'
  return 'weeks-2-4'
}

export function stageOf(hire: Hire, today: IsoDate): Stage {
  if (today < hire.startDate) return 'before'
  if (today === hire.startDate) return 'first-day'
  const offset = businessDaysBetween(hire.startDate, today)
  if (offset <= 4) return 'first-week'
  return offset <= 21 ? 'weeks-2-4' : 'past'
}

function dueDateFor(hire: Hire, template: TaskTemplate): IsoDate {
  const computed = addBusinessDays(hire.startDate, template.dueDay)
  if (!hire.planCreatedOn) return computed
  const earliest = nextBusinessDayOnOrAfter(hire.planCreatedOn)
  return computed < earliest ? earliest : computed
}

export function buildPlan(hire: Hire, data: AppData, today: IsoDate): PlanTask[] {
  const templates = templatesFor(hire.department)

  return templates.map((template, order) => {
    const opensOn = addBusinessDays(hire.startDate, template.opensDay)
    const dueOn = dueDateFor(hire, template)
    const prerequisite = template.requires
      ? templates.find((item) => item.id === template.requires)
      : undefined
    const prerequisiteOpen =
      prerequisite && !data.completions[completionKey(hire.id, prerequisite.id)]

    const statusOf = (): TaskStatus => {
      const completion = data.completions[completionKey(hire.id, template.id)]
      if (completion) return { kind: 'completed', on: completion.on, byName: completion.byName }
      if (today < opensOn) return { kind: 'upcoming', opensOn }
      if (prerequisite && prerequisiteOpen) {
        return { kind: 'waiting', onTitle: prerequisite.title, onOwner: prerequisite.owner }
      }
      const daysLate = businessDaysBetween(dueOn, today)
      if (daysLate >= 1) return { kind: 'overdue', dueOn, daysLate }
      return { kind: 'outstanding', dueOn, dueToday: today === dueOn }
    }

    return { template, status: statusOf(), opensOn, dueOn, order }
  })
}

export function nextSteps(plan: PlanTask[]): { shown: PlanTask[]; moreCount: number } {
  const urgency = (task: PlanTask): number =>
    task.status.kind === 'overdue' ? task.status.daysLate : 0

  const open = plan
    .filter(
      (task) =>
        task.template.owner === 'employee' &&
        (task.status.kind === 'overdue' || task.status.kind === 'outstanding'),
    )
    .sort(
      (a, b) =>
        urgency(b) - urgency(a) || a.dueOn.localeCompare(b.dueOn) || a.order - b.order,
    )

  return { shown: open.slice(0, 3), moreCount: Math.max(0, open.length - 3) }
}

export function progress(plan: PlanTask[]): { done: number; total: number; percent: number } {
  const done = plan.filter((task) => task.status.kind === 'completed').length
  const total = plan.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** The new hire's own share of the plan, so tasks owned by others do not look like theirs. */
export const ownProgress = (plan: PlanTask[]) =>
  progress(plan.filter((task) => task.template.owner === 'employee'))

export function hireHealth(plan: PlanTask[]): HireHealth {
  const overdue = plan.filter((task) => task.status.kind === 'overdue')
  const maxDaysLate = overdue.reduce(
    (max, task) => (task.status.kind === 'overdue' ? Math.max(max, task.status.daysLate) : max),
    0,
  )
  const base = { overdue, maxDaysLate, total: plan.length }

  if (plan.length > 0 && plan.every((task) => task.status.kind === 'completed')) {
    return { ...base, kind: 'complete' }
  }
  if (overdue.length >= 2 || maxDaysLate >= 3) return { ...base, kind: 'needs-attention' }
  if (overdue.length === 1) return { ...base, kind: 'watch' }
  return { ...base, kind: 'on-track' }
}
