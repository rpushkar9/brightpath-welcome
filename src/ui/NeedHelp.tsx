import { CircleHelp } from 'lucide-react'
import { openRequestFor } from '../domain/help'
import { firstName, leaderById } from '../domain/people'
import type { Hire, Persona, PlanTask } from '../domain/types'
import { useStore } from '../store/store'
import { HelpDialog } from './HelpDialog'

/** Offers help on a task, or shows that a request is already open. */
export function NeedHelp({
  hire,
  persona,
  task,
  label = 'Need help?',
}: {
  hire: Hire
  persona: Persona
  task: PlanTask
  label?: string
}) {
  const { data } = useStore()
  if (persona.kind !== 'employee' || task.status.kind === 'completed') return null

  const request = openRequestFor(data, hire.id, task.template.id)
  if (request) {
    return (
      <p className="px-2 text-[13px] font-medium text-waiting">
        Request sent to {firstName(leaderById(request.toLeaderId)?.name ?? 'your manager')}. Waiting for a
        response.
      </p>
    )
  }
  return (
    <HelpDialog
      hire={hire}
      persona={persona}
      task={task}
      trigger={
        <button
          type="button"
          aria-label={`${label} Ask about “${task.template.title}”`}
          className="relative z-10 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-accent transition-colors duration-100 hover:bg-accent-tint hover:text-accent-strong"
        >
          <CircleHelp size={16} aria-hidden />
          {label}
        </button>
      }
    />
  )
}
