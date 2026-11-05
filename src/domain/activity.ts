import { firstName } from './people'
import { templatesFor } from './plan'
import { canView } from './rules'
import { latestSeq } from './events'
import type { ActivityEvent, AppData, Hire, Leader, Persona } from './types'

export type ActivityItem = { event: ActivityEvent; hire: Hire; text: string }

const taskTitle = (hire: Hire, taskId: string | null): string =>
  templatesFor(hire.department).find((task) => task.id === taskId)?.title ?? 'a task'

function describe(event: ActivityEvent, hire: Hire): string {
  const name = firstName(hire.name)
  const title = `“${taskTitle(hire, event.taskId)}”`
  switch (event.kind) {
    case 'task-completed':
      return event.actor === hire.name
        ? `${name} completed ${title}`
        : `${firstName(event.actor)} completed ${title} for ${name}`
    case 'task-reopened':
      return `${firstName(event.actor)} reopened ${title} for ${name}`
    case 'help-requested':
      return event.taskId ? `${name} asked for help with ${title}` : `${name} asked a question`
    case 'help-resolved':
      return `${firstName(event.actor)} resolved ${name}’s request`
    case 'nudge-sent':
      return `${firstName(event.actor)} nudged ${name} about ${title}`
    case 'plan-started':
      return `${firstName(event.actor)} started a plan for ${name}`
    default: {
      const exhaustive: never = event.kind
      return exhaustive
    }
  }
}

/** A task completed and then reopened cancels out, so nobody is told about a mis-click. */
function withoutCancelled(events: ActivityEvent[]): ActivityEvent[] {
  const cancelled = new Set<number>()
  events.forEach((event, index) => {
    if (event.kind !== 'task-reopened') return
    for (let i = index - 1; i >= 0; i -= 1) {
      const earlier = events[i]
      if (
        earlier?.kind === 'task-completed' &&
        earlier.hireId === event.hireId &&
        earlier.taskId === event.taskId &&
        !cancelled.has(earlier.seq)
      ) {
        cancelled.add(earlier.seq)
        cancelled.add(event.seq)
        break
      }
    }
  })
  return events.filter((event) => !cancelled.has(event.seq))
}

/** What other people did on this leader's team after the given point. Newest first. */
export function activitySince(data: AppData, leader: Leader, afterSeq: number): ActivityItem[] {
  const persona: Persona = { kind: 'leader', leader }
  const recent = data.events.filter((event) => event.seq > afterSeq && event.actor !== leader.name)
  return withoutCancelled(recent)
    .flatMap((event) => {
      const hire = data.hires.find((item) => item.id === event.hireId)
      return hire && canView(persona, hire) ? [{ event, hire, text: describe(event, hire) }] : []
    })
    .reverse()
}

export const markSeen = (data: AppData, leaderId: string): AppData =>
  (data.seenThrough[leaderId] ?? 0) === latestSeq(data)
    ? data
    : { ...data, seenThrough: { ...data.seenThrough, [leaderId]: latestSeq(data) } }
