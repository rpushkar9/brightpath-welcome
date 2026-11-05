import { PHASES, phaseOfDay } from '../../domain/plan'
import type { PlanTask, Stage } from '../../domain/types'

export const STAGE_LABEL: Record<Stage, string> = {
  before: 'Before day one',
  'first-day': 'First day',
  'first-week': 'First week',
  'weeks-2-4': 'Weeks 2–4',
  past: 'Past day 30',
}

/** The plan's shape at a glance: where the person is, and how much of each phase is done. */
export function PhasePath({
  plan,
  stage,
  currentLabel = 'You are here',
}: {
  plan: PlanTask[]
  stage: Stage
  currentLabel?: string
}) {
  return (
    <ol className="hidden grid-cols-4 gap-2 sm:grid" aria-label="Onboarding phases">
      {PHASES.map((phase) => {
        const tasks = plan.filter((task) => phaseOfDay(task.template.dueDay) === phase.id)
        const done = tasks.filter((task) => task.status.kind === 'completed').length
        const percent = tasks.length === 0 ? 0 : (done / tasks.length) * 100
        const here = phase.id === stage
        return (
          <li key={phase.id} aria-current={here ? 'step' : undefined}>
            <div className="h-1 rounded-full bg-band-line">
              <div
                className="progress-fill h-full rounded-full bg-path-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2.5 text-sm">
              <span
                className={`flex items-center gap-1.5 ${here ? 'font-semibold text-white' : 'text-band-soft'}`}
              >
                {/* Marks the current phase by date. The bar above shows only completed tasks. */}
                {here && <span aria-hidden className="size-2.5 rounded-full bg-path-marker" />}
                {phase.label}
              </span>
              <span className="block text-[13px] text-band-soft tabular-nums">
                {here ? `${currentLabel}, ` : ''}
                {done} of {tasks.length} done
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The phone version: one line and a bar, so the first task stays on screen. */
export function CompactProgress({
  stageLabel,
  done,
  total,
  percent,
  countLabel,
  note,
}: {
  stageLabel: string
  done: number
  total: number
  percent: number
  countLabel?: string
  note?: string
}) {
  return (
    <div className="sm:hidden">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{stageLabel}</span>
        <span className="text-band-soft tabular-nums">
          {countLabel && `${countLabel}: `}
          {done} of {total} done
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-band-line">
        <div className="progress-fill h-full rounded-full bg-path-fill" style={{ width: `${percent}%` }} />
      </div>
      {note && <p className="mt-1.5 text-right text-[13px] text-band-soft tabular-nums">{note}</p>}
    </div>
  )
}
