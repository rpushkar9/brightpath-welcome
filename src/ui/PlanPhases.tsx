import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Route } from '../app/route'
import { PHASES, phaseOfDay } from '../domain/plan'
import type { Hire, Persona, PhaseId, PlanTask, Stage } from '../domain/types'
import { TaskRow } from './TaskRow'

const defaultOpen = (phase: PhaseId, stage: Stage, tasks: PlanTask[]): boolean => {
  const allDone = tasks.every((task) => task.status.kind === 'completed')
  if (allDone) return false
  return phase === stage || tasks.some((task) => task.status.kind === 'overdue')
}

export function PlanPhases({
  plan,
  hire,
  persona,
  stage,
  taskRoute,
  currentLabel = 'You are here',
}: {
  plan: PlanTask[]
  hire: Hire
  persona: Persona
  stage: Stage
  taskRoute: (taskId: string) => Route
  currentLabel?: string
}) {
  const grouped = PHASES.map((phase) => ({
    ...phase,
    tasks: plan.filter((task) => phaseOfDay(task.template.dueDay) === phase.id),
  })).filter((phase) => phase.tasks.length > 0)

  const [manual, setManual] = useState<Partial<Record<PhaseId, boolean>>>({})

  return (
    <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
      {grouped.map((phase) => {
        const open = manual[phase.id] ?? defaultOpen(phase.id, stage, phase.tasks)
        const done = phase.tasks.filter((task) => task.status.kind === 'completed').length
        const overdue = phase.tasks.filter((task) => task.status.kind === 'overdue').length
        const panelId = `phase-${phase.id}`
        return (
          <section key={phase.id} className="border-b border-hairline last:border-b-0">
            <h2 className="font-sans">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setManual((current) => ({ ...current, [phase.id]: !open }))}
                className="flex min-h-13 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-canvas focus-visible:outline-offset-[-2px] sm:px-5"
              >
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`shrink-0 text-muted transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                />
                <span className="font-display text-[17px] font-semibold tracking-tight">
                  {phase.label}
                </span>
                {phase.id === stage && (
                  <span className="rounded-control bg-accent-tint px-1.5 py-px text-xs font-medium text-accent-strong">
                    {currentLabel}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-3 text-[13px] text-muted tabular-nums">
                  {overdue > 0 && (
                    <span className="font-medium text-overdue">{overdue} overdue</span>
                  )}
                  <span>
                    {done} of {phase.tasks.length} done
                  </span>
                </span>
              </button>
            </h2>
            {open && (
              <ul id={panelId} className="fade-in divide-y divide-hairline border-t border-hairline">
                {phase.tasks.map((task) => (
                  <TaskRow
                    key={task.template.id}
                    task={task}
                    hire={hire}
                    persona={persona}
                    route={taskRoute(task.template.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
