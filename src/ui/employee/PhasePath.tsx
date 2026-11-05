import { Check } from 'lucide-react'
import { PHASES, phaseOfDay } from '../../domain/plan'
import type { PlanTask, Stage } from '../../domain/types'

export const STAGE_LABEL: Record<Stage, string> = {
  before: 'Before your first day',
  'first-day': 'Day one',
  'first-week': 'First week',
  'weeks-2-4': 'First month',
  past: 'Past day 30',
}

const PHASE_ORDER: readonly Stage[] = ['before', 'first-day', 'first-week', 'weeks-2-4', 'past']

/**
 * The journey. Node position and fill show where the person is in time.
 * Only the text shows completed tasks, so finishing work never moves the marker.
 */
export function PhasePath({
  plan,
  stage,
  currentLabel = 'You are here',
}: {
  plan: PlanTask[]
  stage: Stage
  currentLabel?: string
}) {
  const now = PHASE_ORDER.indexOf(stage)
  return (
    <ol className="hidden grid-cols-4 sm:grid" aria-label="Onboarding phases">
      {PHASES.map((phase, index) => {
        const tasks = plan.filter((task) => phaseOfDay(task.template.dueDay) === phase.id)
        const done = tasks.filter((task) => task.status.kind === 'completed').length
        const here = phase.id === stage
        const past = index < now
        return (
          <li key={phase.id} aria-current={here ? 'step' : undefined} className="min-w-0 pr-4">
            <div className="relative flex h-6 items-center">
              {index < PHASES.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-1/2 right-[-16px] left-3 border-t-2 ${past ? 'border-path-fill' : 'border-dashed border-band-line'}`}
                />
              )}
              {here ? (
                <span
                  aria-hidden
                  data-phase-marker
                  className="relative size-4 rounded-full bg-path-marker ring-[5px] ring-path-marker/25"
                />
              ) : past ? (
                // A check only when everything is done. A passed phase can still have open work.
                <span aria-hidden className="relative grid size-4 place-items-center rounded-full bg-path-fill">
                  {done === tasks.length && <Check size={11} strokeWidth={3.5} className="text-band" />}
                </span>
              ) : (
                <span aria-hidden className="relative size-4 rounded-full border-2 border-band-line bg-band" />
              )}
            </div>
            <div className="mt-1.5 text-sm">
              <span className={`block ${here ? 'font-semibold text-white' : 'text-band-soft'}`}>
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
