import { businessDaysBetween } from './dates'
import { buildPlan, completionKey, templatesFor } from './plan'
import { blockedBy } from './rules'
import type {
  AppData,
  HelpRequest,
  Hire,
  Improvement,
  ImprovementStatus,
  IsoDate,
  Persona,
  PlanTask,
  Result,
  TaskTemplate,
} from './types'

export const MAX_IMPROVEMENT_NOTE = 500
/** Below this many hires on a task, a pattern is only a prompt to look closer. */
export const LIMITED_SAMPLE = 5

export type TaskInsight = {
  template: TaskTemplate
  /** Hires whose plan includes this task. */
  assigned: Hire[]
  overdueNow: { hire: Hire; daysLate: number }[]
  completedLate: { hire: Hire; daysLate: number }[]
  /** This task cannot start yet, because its own prerequisite is unfinished. */
  waitingNow: Hire[]
  /** Other open tasks cannot start until this one is finished. */
  blockingNow: { hire: Hire; task: PlanTask }[]
  requests: HelpRequest[]
  requesters: Hire[]
  /** Distinct hires with any recorded friction on this task. Each hire counts once. */
  affected: Hire[]
}

const unique = (hires: Hire[]): Hire[] => [...new Map(hires.map((hire) => [hire.id, hire])).values()]

/** Every number comes from current plans, completion dates, and help requests. */
export function taskInsights(data: AppData, today: IsoDate): TaskInsight[] {
  const byTask = new Map<string, TaskInsight>()

  for (const hire of data.hires) {
    const plan = buildPlan(hire, data, today)
    for (const task of plan) {
      const id = task.template.id
      const entry: TaskInsight = byTask.get(id) ?? {
        template: task.template,
        assigned: [],
        overdueNow: [],
        completedLate: [],
        waitingNow: [],
        blockingNow: [],
        requests: [],
        requesters: [],
        affected: [],
      }
      entry.assigned.push(hire)
      if (task.status.kind === 'overdue') {
        entry.overdueNow.push({ hire, daysLate: task.status.daysLate })
      }
      if (task.status.kind === 'waiting') entry.waitingNow.push(hire)
      const completion = data.completions[completionKey(hire.id, id)]
      if (completion) {
        const daysLate = businessDaysBetween(task.dueOn, completion.on)
        if (daysLate >= 1) entry.completedLate.push({ hire, daysLate })
      }
      for (const blocked of blockedBy(plan, id)) entry.blockingNow.push({ hire, task: blocked })
      byTask.set(id, entry)
    }
  }

  for (const request of data.helpRequests) {
    const entry = request.taskId ? byTask.get(request.taskId) : undefined
    const hire = data.hires.find((item) => item.id === request.hireId)
    if (entry && hire) {
      entry.requests.push(request)
      entry.requesters = unique([...entry.requesters, hire])
    }
  }

  for (const entry of byTask.values()) {
    entry.affected = unique([
      ...entry.overdueNow.map((item) => item.hire),
      ...entry.completedLate.map((item) => item.hire),
      ...entry.blockingNow.map((item) => item.hire),
      ...entry.requesters,
    ])
  }

  return [...byTask.values()]
    .filter((entry) => entry.affected.length > 0)
    .sort(
      (a, b) =>
        b.affected.length - a.affected.length ||
        b.overdueNow.length - a.overdueNow.length ||
        b.requests.length - a.requests.length ||
        b.blockingNow.length - a.blockingNow.length ||
        a.template.title.localeCompare(b.template.title),
    )
}

/** A suggestion to look into, based on simple rules. It is not a proven cause. */
export function suggestionFor(insight: TaskInsight): string {
  const { template, overdueNow, completedLate, blockingNow, requests } = insight
  const title = `“${template.title}”`
  if (template.id === 'c-i9' || template.id === 'c-i9-verify') {
    return `Legal deadlines can’t move. Consider clearer instructions for ${title}, and naming who verifies it.`
  }
  const ranLate = overdueNow.length + completedLate.length > 0
  if (template.owner === 'it' && (ranLate || blockingNow.length > 0)) {
    return `Review whether ${title} could be finished before the first day, or started earlier.`
  }
  if (blockingNow.length > 0) {
    return `Review the deadline and owner of ${title}, because other tasks wait on it.`
  }
  if (requests.length > 0) {
    const prerequisite = template.requires ? taskTemplateById(template.requires) : undefined
    return prerequisite
      ? `${title} depends on “${prerequisite.title}”, so check that first. Then consider clearer instructions, and naming who to ask.`
      : `Consider clearer instructions for ${title}, and naming who to ask.`
  }
  return `Review whether the due date for ${title} is realistic.`
}

/** What these records cannot tell you, so nobody over-reads them. */
export function evidenceGaps(insight: TaskInsight): string[] {
  const gaps: string[] = []
  if (insight.assigned.length < LIMITED_SAMPLE) {
    gaps.push(`Only ${insight.assigned.length} hires have this task, so this may not be a pattern.`)
  }
  if (insight.overdueNow.length + insight.completedLate.length > 0) {
    gaps.push('The records show that it ran late, but not why.')
  }
  if (insight.blockingNow.length > 0 || insight.waitingNow.length > 0) {
    gaps.push('Blocks are visible now, but how long past blocks lasted was not recorded.')
  }
  if (insight.requests.length > 0) {
    gaps.push('Requests show that someone asked, not how long an answer took.')
  }
  return gaps
}

export function affectedSummary(insight: TaskInsight): string {
  return `${insight.affected.length} of ${insight.assigned.length} ${insight.assigned.length === 1 ? 'hire' : 'hires'}`
}

/** Short, plain facts for one task. Each one counts distinct hires, not repeated events. */
export function insightFacts(insight: TaskInsight): string[] {
  const facts: string[] = []
  const count = (n: number) => `${n} ${n === 1 ? 'hire' : 'hires'}`
  if (insight.overdueNow.length) facts.push(`Overdue now for ${count(insight.overdueNow.length)}`)
  if (insight.completedLate.length) facts.push(`Finished late by ${count(insight.completedLate.length)}`)
  const blocked = new Set(insight.blockingNow.map((item) => item.hire.id)).size
  if (blocked) facts.push(`Blocking other work for ${count(blocked)}`)
  if (insight.requests.length) {
    const n = insight.requests.length
    facts.push(`${n} help ${n === 1 ? 'request' : 'requests'} from ${count(insight.requesters.length)}`)
  }
  return facts
}

export type OwnerShare = { label: string; tasks: number }

/** How many friction tasks each kind of owner holds. Used for where to look first, not for blame. */
export function ownerShares(insights: TaskInsight[]): OwnerShare[] {
  const labels: Record<TaskTemplate['owner'], string> = {
    employee: 'New hires',
    manager: 'Managers',
    hr: 'HR',
    it: 'IT',
  }
  return (['it', 'hr', 'manager', 'employee'] as const)
    .map((owner) => ({
      label: labels[owner],
      tasks: insights.filter((item) => item.template.owner === owner).length,
    }))
    .filter((share) => share.tasks > 0)
}

export const taskTemplateById = (taskId: string): TaskTemplate | undefined =>
  [...templatesFor('engineering'), ...templatesFor('sales')].find((task) => task.id === taskId)

export function proposeImprovement(
  data: AppData,
  persona: Persona,
  taskId: string,
  note: string,
  today: IsoDate,
): Result {
  if (persona.kind !== 'leader' || persona.leader.kind !== 'hr') {
    return { ok: false, reason: 'Only HR can propose a plan improvement.' }
  }
  if (!taskTemplateById(taskId)) return { ok: false, reason: 'That task is not in any plan.' }
  const text = note.trim()
  if (!text) return { ok: false, reason: 'Describe the improvement first.' }
  if (text.length > MAX_IMPROVEMENT_NOTE) {
    return { ok: false, reason: `Keep it to ${MAX_IMPROVEMENT_NOTE} characters or fewer.` }
  }
  const improvement: Improvement = {
    id: `improvement-${data.improvements.length + 1}-${taskId}`,
    taskId,
    note: text,
    status: 'proposed',
    createdOn: today,
    by: persona.leader.name,
  }
  return { ok: true, data: { ...data, improvements: [...data.improvements, improvement] } }
}

export function setImprovementStatus(
  data: AppData,
  persona: Persona,
  id: string,
  status: ImprovementStatus,
): Result {
  if (persona.kind !== 'leader' || persona.leader.kind !== 'hr') {
    return { ok: false, reason: 'Only HR can change this.' }
  }
  if (!data.improvements.some((item) => item.id === id)) {
    return { ok: false, reason: 'That improvement no longer exists.' }
  }
  return {
    ok: true,
    data: {
      ...data,
      improvements: data.improvements.map((item) => (item.id === id ? { ...item, status } : item)),
    },
  }
}

export const IMPROVEMENT_STATUS_LABEL: Record<ImprovementStatus, string> = {
  proposed: 'Proposed',
  'under-review': 'Under review',
  addressed: 'Addressed',
}
