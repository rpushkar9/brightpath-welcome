import * as Dialog from '@radix-ui/react-dialog'
import { ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { closeOverlay, type Route } from '../app/route'
import { formatLong } from '../domain/dates'
import { RESOURCE_EXCERPTS } from '../domain/resources'
import { canAct, isOwner, ownerName } from '../domain/rules'
import type { Hire, Persona, PlanTask } from '../domain/types'
import { NeedHelp } from './NeedHelp'
import { completeAction, undoAction } from './actions'
import { CONFIRMATION_NOTE, STATUS_TONE, StatusIcon, scopeLabel, statusLabel } from './status'

const PANEL =
  'drawer-panel fixed inset-0 z-50 flex flex-col bg-surface shadow-2xl focus:outline-none sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[460px] sm:rounded-l-panel'

function ownerText(task: PlanTask, hire: Hire, persona: Persona): string {
  const { owner } = task.template
  if (isOwner(persona, hire, owner)) return 'You'
  if (canAct(persona, hire, owner)) return `${ownerName(owner, hire)}. HR stands in for ${ownerName(owner, hire)} in this prototype.`
  return ownerName(owner, hire)
}

function NotAvailableNote({ task, hire, persona }: { task: PlanTask; hire: Hire; persona: Persona }) {
  const { status } = task
  if (status.kind === 'waiting') {
    return (
      <p className="text-sm text-waiting">
        Waiting on {ownerName(status.onOwner, hire)} to finish “{status.onTitle}”. It opens as soon as
        that is done.
      </p>
    )
  }
  if (status.kind === 'upcoming') {
    return <p className="text-sm text-muted">This task opens on {formatLong(status.opensOn)}.</p>
  }
  if (status.kind === 'completed') {
    return <p className="text-sm text-muted">Marked complete by {status.byName}.</p>
  }
  if (!canAct(persona, hire, task.template.owner)) {
    return (
      <p className="text-sm text-muted">
        {ownerName(task.template.owner, hire)} owns this task, so you can follow it here but not
        complete it.
      </p>
    )
  }
  return null
}

function Resource({ name }: { name: string }) {
  const excerpt = RESOURCE_EXCERPTS[name]
  if (!excerpt) {
    return (
      <p className="mt-6 rounded-control bg-canvas px-3 py-2.5 text-sm text-muted">
        <span className="font-medium text-ink">{name}</span> is sample content. Documents and systems
        are not connected in this prototype.
      </p>
    )
  }
  return (
    <details className="group mt-6 rounded-control bg-canvas text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-medium">
        <ChevronRight size={16} aria-hidden className="transition-transform duration-200 group-open:rotate-90" />
        Read {name}
      </summary>
      <div className="px-3 pb-3">
        <ul className="list-disc space-y-1 pl-5 leading-relaxed">
          {excerpt.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-muted">Sample excerpt written for this demo, not a real document.</p>
      </div>
    </details>
  )
}

function DrawerContent({
  task,
  hire,
  persona,
}: {
  task: PlanTask
  hire: Hire
  persona: Persona
}) {
  const allowed = canAct(persona, hire, task.template.owner)
  const { status, template } = task
  const canComplete = allowed && (status.kind === 'outstanding' || status.kind === 'overdue')
  const canUndo = allowed && status.kind === 'completed'

  return (
    <>
      {/* Focusable so keyboard users can scroll long content on small screens. */}
      <div tabIndex={0} className="flex-1 overflow-y-auto px-6 pt-5 pb-6 focus-visible:outline-offset-[-2px]">
        <div className="pr-10">
          <div className={`flex items-center gap-2 text-sm font-medium ${STATUS_TONE[status.kind]}`}>
            <StatusIcon status={status} size={18} />
            {statusLabel(status, hire)}
          </div>
          <Dialog.Title className="mt-3 font-display text-2xl leading-tight font-semibold break-words">
            {template.title}
          </Dialog.Title>
        </div>
        <Dialog.Description className="mt-3 text-[15px] leading-relaxed text-ink">
          {template.summary}
        </Dialog.Description>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted">Owner</dt>
          <dd>{ownerText(task, hire, persona)}</dd>
          <dt className="text-muted">Due</dt>
          <dd>{formatLong(task.dueOn)}</dd>
          {template.minutes !== null && (
            <>
              <dt className="text-muted">Time</dt>
              <dd>About {template.minutes} minutes</dd>
            </>
          )}
          <dt className="text-muted">Part of</dt>
          <dd>{scopeLabel(task)}</dd>
        </dl>

        <h3 className="mt-7 font-display text-base font-semibold">Why it matters</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed">{template.why}</p>

        <h3 className="mt-6 font-display text-base font-semibold">What to do</h3>
        <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed marker:text-muted">
          {template.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {template.reference && <Resource name={template.reference} />}
      </div>

      <div className="border-t border-hairline px-6 py-4">
        <NotAvailableNote task={task} hire={hire} persona={persona} />
        {canComplete && (
          <p className="mb-3 text-[13px] leading-snug text-muted">{CONFIRMATION_NOTE}</p>
        )}
        {canComplete && (
          <button
            type="button"
            onClick={() => completeAction(persona, hire.id, task)}
            className="min-h-11 w-full cursor-pointer rounded-control bg-accent px-4 font-semibold text-white transition-colors duration-100 hover:bg-accent-strong"
          >
            Mark complete
          </button>
        )}
        {canUndo && (
          <button
            type="button"
            onClick={() => undoAction(persona, hire.id, task)}
            className="mt-3 min-h-11 w-full cursor-pointer rounded-control border border-control bg-surface px-4 font-semibold transition-colors duration-100 hover:bg-canvas"
          >
            Undo completion
          </button>
        )}
        {persona.kind === 'employee' && status.kind !== 'completed' && (
          <div className="mt-2 flex justify-center">
            <NeedHelp hire={hire} persona={persona} task={task} />
          </div>
        )}
      </div>
    </>
  )
}

export function TaskDrawer({
  taskId,
  plan,
  hire,
  persona,
  parent,
}: {
  taskId: string | null
  plan: PlanTask[]
  hire: Hire
  persona: Persona
  parent: Route
}) {
  // Keeps the last task on screen while the drawer animates closed.
  const [lastId, setLastId] = useState(taskId)
  useEffect(() => {
    if (taskId) setLastId(taskId)
  }, [taskId])

  const shownId = taskId ?? lastId
  const task = plan.find((item) => item.template.id === shownId)

  return (
    <Dialog.Root
      open={taskId !== null}
      onOpenChange={(open) => {
        if (!open) closeOverlay(parent)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content
          className={PANEL}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // A finished task can leave the list, so fall back to the content area rather than losing focus.
            const target =
              document.querySelector<HTMLElement>(`[data-task-link="${shownId}"]`) ??
              document.querySelector<HTMLElement>('main')
            if (target) {
              event.preventDefault()
              target.focus()
            }
          }}
        >
          {task ? (
            <DrawerContent task={task} hire={hire} persona={persona} />
          ) : (
            <div className="flex-1 px-6 pt-5">
              <Dialog.Title className="pr-10 font-display text-2xl font-semibold">
                We can’t find that task
              </Dialog.Title>
              <p className="mt-3 text-[15px] leading-relaxed">
                It isn’t part of {hire.name}’s plan. The link may be out of date.
              </p>
            </div>
          )}
          <Dialog.Close
            aria-label="Close"
            className="absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full text-muted transition-colors duration-100 hover:bg-canvas hover:text-ink"
          >
            <X size={20} aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
