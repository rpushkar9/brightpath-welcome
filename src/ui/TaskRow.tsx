import { Check } from 'lucide-react'
import type { MouseEvent } from 'react'
import { openOverlay, type Route } from '../app/route'
import { canAct, isOwner, ownerName } from '../domain/rules'
import type { Hire, Persona, PlanTask } from '../domain/types'
import { isRepeatClick, undoAction, useFinish } from './actions'
import { STATUS_TONE, ScopeTag, StatusIcon, statusLabel } from './status'
import { hrefFor } from '../app/route'

/** Opens the drawer through history, keeping modifier-clicks as normal link behaviour. */
export function openTask(event: MouseEvent<HTMLAnchorElement>, route: Route): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  openOverlay(route, event.currentTarget.dataset.taskLink)
}

export function TaskControl({
  task,
  hire,
  persona,
}: {
  task: PlanTask
  hire: Hire
  persona: Persona
}) {
  const allowed = canAct(persona, hire, task.template.owner)
  const { kind } = task.status
  const title = task.template.title
  const { finishing, finish } = useFinish(persona, hire.id, task)

  if (allowed && (kind === 'outstanding' || kind === 'overdue')) {
    return (
      <button
        type="button"
        aria-label={`Mark “${title}” complete`}
        onClick={finish}
        className="group/check relative z-10 -m-3 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full"
      >
        <span
          className={`grid size-5 place-items-center rounded-full border-[1.5px] transition-colors duration-100 group-hover/check:border-accent group-hover/check:bg-accent-tint ${
            finishing
              ? 'border-accent bg-accent! text-white'
              : kind === 'overdue'
                ? 'border-overdue text-accent'
                : 'border-control text-accent'
          }`}
        >
          <Check
            size={13}
            strokeWidth={3}
            aria-hidden
            className={`transition-opacity duration-100 ${finishing ? 'check-in text-white' : 'opacity-0 group-hover/check:opacity-100'}`}
          />
        </span>
      </button>
    )
  }

  if (allowed && kind === 'completed') {
    return (
      <button
        type="button"
        aria-label={`Undo completion of “${title}”`}
        onClick={(event) => {
          if (!isRepeatClick(event)) undoAction(persona, hire.id, task)
        }}
        className="check-in relative z-10 -m-3 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full"
      >
        <StatusIcon status={task.status} />
      </button>
    )
  }

  return (
    <span className="grid size-5 shrink-0 place-items-center">
      <StatusIcon status={task.status} />
    </span>
  )
}

export function TaskRow({
  task,
  hire,
  persona,
  route,
}: {
  task: PlanTask
  hire: Hire
  persona: Persona
  route: Route
}) {
  const done = task.status.kind === 'completed'
  const dim = done || task.status.kind === 'upcoming'
  const owner = task.template.owner
  const showOwner = !isOwner(persona, hire, owner)

  return (
    <li className="relative flex items-start gap-3 px-4 py-3 transition-colors duration-100 hover:bg-white/60 sm:px-5">
      <span className="flex h-6 items-center">
        <TaskControl task={task} hire={hire} persona={persona} />
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={hrefFor(route)}
          data-task-link={task.template.id}
          onClick={(event) => openTask(event, route)}
          className={`font-medium break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-control focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent ${
            dim ? 'text-muted' : 'text-ink'
          }`}
        >
          {task.template.title}
        </a>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
          <span
            className={`${STATUS_TONE[task.status.kind]} ${task.status.kind === 'overdue' ? 'font-medium' : ''}`}
          >
            {statusLabel(task.status, hire)}
          </span>
          {showOwner && <span className="text-muted">Owner: {ownerName(owner, hire)}</span>}
          <ScopeTag task={task} />
        </div>
      </div>
    </li>
  )
}
