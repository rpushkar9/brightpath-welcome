import { Circle, CircleCheck, CircleDashed, ClockAlert, Hourglass } from 'lucide-react'
import { formatShort } from '../domain/dates'
import { DEPARTMENT_LABEL } from '../domain/people'
import { ownerName } from '../domain/rules'
import type { HealthKind, Hire, PlanTask, TaskStatus } from '../domain/types'

type StatusKind = TaskStatus['kind']

export const CONFIRMATION_NOTE =
  'Checking this off records your confirmation. It doesn’t submit forms or verify work in other systems.'

export const STATUS_TONE: Record<StatusKind, string> = {
  completed: 'text-done',
  upcoming: 'text-later',
  waiting: 'text-waiting',
  overdue: 'text-overdue',
  outstanding: 'text-ink',
}

export function statusLabel(status: TaskStatus, hire: Hire): string {
  switch (status.kind) {
    case 'completed':
      return `Done ${formatShort(status.on)}`
    case 'upcoming':
      return `Opens ${formatShort(status.opensOn)}`
    case 'waiting':
      return `Waiting on ${ownerName(status.onOwner, hire)}`
    case 'overdue':
      return `Was due ${formatShort(status.dueOn)}`
    case 'outstanding':
      return status.dueToday ? 'Due today' : `Due ${formatShort(status.dueOn)}`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

export function StatusIcon({ status, size = 20 }: { status: TaskStatus; size?: number }) {
  const props = { size, 'aria-hidden': true, className: `shrink-0 ${STATUS_TONE[status.kind]}` }
  switch (status.kind) {
    case 'completed':
      return <CircleCheck {...props} />
    case 'upcoming':
      return <CircleDashed {...props} />
    case 'waiting':
      return <Hourglass {...props} />
    case 'overdue':
      return <ClockAlert {...props} />
    case 'outstanding':
      return <Circle {...props} className={`shrink-0 text-control`} />
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

export function scopeLabel(task: PlanTask): string {
  return task.template.scope === 'company' ? 'Company' : DEPARTMENT_LABEL[task.template.scope]
}

export function ScopeTag({ task }: { task: PlanTask }) {
  const isDepartment = task.template.scope !== 'company'
  return (
    <span
      className={
        isDepartment
          ? 'rounded-control bg-accent-tint px-1.5 py-px text-xs font-medium text-accent-strong'
          : 'text-xs text-muted'
      }
    >
      {scopeLabel(task)}
    </span>
  )
}

export const HEALTH_LABEL: Record<HealthKind, string> = {
  'needs-attention': 'Needs attention',
  watch: 'Watch',
  'on-track': 'On track',
  complete: 'Complete',
}

const HEALTH_TONE: Record<HealthKind, string> = {
  'needs-attention': 'bg-overdue-tint text-overdue',
  watch: 'bg-soon-tint text-soon',
  'on-track': 'bg-accent-tint text-accent-strong',
  complete: 'bg-done-tint text-done',
}

export function HealthChip({ kind }: { kind: HealthKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-control px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${HEALTH_TONE[kind]}`}
    >
      {HEALTH_LABEL[kind]}
    </span>
  )
}
