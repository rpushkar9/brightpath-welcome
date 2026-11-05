import { firstName, leaderById } from './people'
import { buildPlan, completionKey, hireHealth, templatesFor } from './plan'
import type {
  AppData,
  HealthKind,
  Hire,
  HireHealth,
  IsoDate,
  Persona,
  PlanTask,
  Result,
  TaskOwner,
} from './types'

const personaName = (persona: Persona): string =>
  persona.kind === 'employee' ? persona.hire.name : persona.leader.name

export function canView(persona: Persona, hire: Hire): boolean {
  if (persona.kind === 'employee') return persona.hire.id === hire.id
  return persona.leader.kind === 'hr' || persona.leader.id === hire.managerId
}

export function canAct(persona: Persona, hire: Hire, owner: TaskOwner): boolean {
  if (persona.kind === 'employee') return owner === 'employee' && persona.hire.id === hire.id
  if (persona.leader.kind === 'hr') return owner === 'hr' || owner === 'it'
  return owner === 'manager' && persona.leader.id === hire.managerId
}

/** Whether this person really owns the task. Sarah can act for IT without being IT. */
export function isOwner(persona: Persona, hire: Hire, owner: TaskOwner): boolean {
  if (persona.kind === 'employee') return owner === 'employee' && persona.hire.id === hire.id
  if (persona.leader.kind === 'hr') return owner === 'hr'
  return owner === 'manager' && persona.leader.id === hire.managerId
}

export function ownerName(owner: TaskOwner, hire: Hire): string {
  switch (owner) {
    case 'employee':
      return firstName(hire.name)
    case 'manager':
      return firstName(leaderById(hire.managerId)?.name ?? 'Manager')
    case 'hr':
      return 'HR'
    case 'it':
      return 'IT'
    default: {
      const exhaustive: never = owner
      return exhaustive
    }
  }
}

function findTask(data: AppData, hireId: string, taskId: string, today: IsoDate) {
  const hire = data.hires.find((item) => item.id === hireId)
  const task = hire && buildPlan(hire, data, today).find((item) => item.template.id === taskId)
  return hire && task ? { hire, task } : null
}

export function completeTask(
  data: AppData,
  persona: Persona,
  hireId: string,
  taskId: string,
  today: IsoDate,
): Result {
  const found = findTask(data, hireId, taskId, today)
  if (!found) return { ok: false, reason: 'That task is no longer in this plan.' }
  const { hire, task } = found

  if (!canAct(persona, hire, task.template.owner)) {
    return { ok: false, reason: `${ownerName(task.template.owner, hire)} owns this task.` }
  }

  switch (task.status.kind) {
    case 'completed':
      return { ok: false, reason: 'This task is already complete.' }
    case 'upcoming':
      return { ok: false, reason: 'This task has not opened yet.' }
    case 'waiting':
      return {
        ok: false,
        reason: `Waiting on ${ownerName(task.status.onOwner, hire)} to finish “${task.status.onTitle}”.`,
      }
    case 'overdue':
    case 'outstanding':
      return {
        ok: true,
        data: {
          ...data,
          completions: {
            ...data.completions,
            [completionKey(hireId, taskId)]: { on: today, byName: personaName(persona) },
          },
        },
      }
    default: {
      const exhaustive: never = task.status
      return exhaustive
    }
  }
}

export function undoTask(
  data: AppData,
  persona: Persona,
  hireId: string,
  taskId: string,
  today: IsoDate,
): Result {
  const found = findTask(data, hireId, taskId, today)
  if (!found) return { ok: false, reason: 'That task is no longer in this plan.' }
  const { hire, task } = found

  if (!canAct(persona, hire, task.template.owner)) {
    return { ok: false, reason: `${ownerName(task.template.owner, hire)} owns this task.` }
  }
  if (task.status.kind !== 'completed') {
    return { ok: false, reason: 'This task is not complete.' }
  }

  const dependent = templatesFor(hire.department).find(
    (item) => item.requires === taskId && data.completions[completionKey(hireId, item.id)],
  )
  if (dependent) {
    return { ok: false, reason: `“${dependent.title}” depends on this. Undo that first.` }
  }

  const { [completionKey(hireId, taskId)]: _removed, ...completions } = data.completions
  return { ok: true, data: { ...data, completions } }
}

const nudgedToday = (data: AppData, hireId: string, today: IsoDate): boolean =>
  data.nudges.some((nudge) => nudge.hireId === hireId && nudge.on === today)

/** The task a nudge would be about, or null when a nudge is not available. */
export function nudgeTarget(
  persona: Persona,
  hire: Hire,
  data: AppData,
  today: IsoDate,
): PlanTask | null {
  if (persona.kind !== 'leader' || !canView(persona, hire)) return null
  if (nudgedToday(data, hire.id, today)) return null
  const own = hireHealth(buildPlan(hire, data, today)).overdue.filter(
    (task) => task.template.owner === 'employee',
  )
  const late = (task: PlanTask) => (task.status.kind === 'overdue' ? task.status.daysLate : 0)
  return [...own].sort((a, b) => late(b) - late(a))[0] ?? null
}

export function sendNudge(
  data: AppData,
  persona: Persona,
  hireId: string,
  today: IsoDate,
): Result {
  const hire = data.hires.find((item) => item.id === hireId)
  if (!hire) return { ok: false, reason: 'That person is no longer on the roster.' }
  const target = nudgeTarget(persona, hire, data, today)
  if (!target || persona.kind !== 'leader') {
    const reason = nudgedToday(data, hireId, today)
      ? `${firstName(hire.name)} has already been nudged today.`
      : 'There is nothing to nudge about.'
    return { ok: false, reason }
  }
  return {
    ok: true,
    data: {
      ...data,
      nudges: [
        ...data.nudges,
        {
          hireId,
          taskId: target.template.id,
          fromName: persona.leader.name,
          on: today,
          dismissed: false,
        },
      ],
    },
  }
}

export const hasNudgedToday = nudgedToday

export const dismissNudge = (data: AppData, hireId: string): AppData => ({
  ...data,
  nudges: data.nudges.map((nudge) =>
    nudge.hireId === hireId ? { ...nudge, dismissed: true } : nudge,
  ),
})

/** Open tasks that cannot start until this task is done. */
export const blockedBy = (plan: PlanTask[], taskId: string): PlanTask[] =>
  plan.filter((task) => task.status.kind === 'waiting' && task.template.requires === taskId)

export type LeaderAction = { hire: Hire; task: PlanTask; blocks: PlanTask[] }

const lateness = (task: PlanTask): number =>
  task.status.kind === 'overdue' ? task.status.daysLate : 0

/** Open tasks this manager or HR lead can complete, most urgent first. */
export function leaderActions(persona: Persona, data: AppData, today: IsoDate): LeaderAction[] {
  if (persona.kind !== 'leader') return []
  return data.hires
    .filter((hire) => canView(persona, hire))
    .flatMap((hire) => {
      const plan = buildPlan(hire, data, today)
      return plan
        .filter(
          (task) =>
            canAct(persona, hire, task.template.owner) &&
            (task.status.kind === 'overdue' || task.status.kind === 'outstanding'),
        )
        .map((task) => ({ hire, task, blocks: blockedBy(plan, task.template.id) }))
    })
    .sort(
      (a, b) =>
        lateness(b.task) - lateness(a.task) ||
        a.task.dueOn.localeCompare(b.task.dueOn) ||
        a.hire.name.localeCompare(b.hire.name),
    )
}

export function healthReason(health: HireHealth, hire: Hire): string {
  if (health.kind === 'complete') return `All ${health.total} tasks done`
  if (health.overdue.length === 0) return 'Nothing overdue'
  const owners: TaskOwner[] = ['employee', 'manager', 'hr', 'it']
  const counts = owners.flatMap((owner) => {
    const count = health.overdue.filter((task) => task.template.owner === owner).length
    return count > 0 ? [{ name: ownerName(owner, hire), count }] : []
  })
  const [only] = counts
  if (only && counts.length === 1) return `${health.overdue.length} overdue, owned by ${only.name}`
  const parts = counts.map(({ name, count }) => `${count} ${name}`)
  return `${health.overdue.length} overdue: ${parts.join(', ')}`
}

const HEALTH_RANK: Record<HealthKind, number> = {
  'needs-attention': 0,
  watch: 1,
  'on-track': 2,
  complete: 3,
}

export type RosterRow = { hire: Hire; plan: PlanTask[]; health: HireHealth }

export function rosterOrder(hires: Hire[], data: AppData, today: IsoDate): RosterRow[] {
  return hires
    .map((hire) => {
      const plan = buildPlan(hire, data, today)
      return { hire, plan, health: hireHealth(plan) }
    })
    .sort(
      (a, b) =>
        HEALTH_RANK[a.health.kind] - HEALTH_RANK[b.health.kind] ||
        b.health.overdue.length - a.health.overdue.length ||
        b.health.maxDaysLate - a.health.maxDaysLate ||
        a.hire.startDate.localeCompare(b.hire.startDate) ||
        a.hire.name.localeCompare(b.hire.name),
    )
}
