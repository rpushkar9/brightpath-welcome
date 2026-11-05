import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hrefFor, type Route, rememberHrArea } from '../../app/route'
import { formatShort } from '../../domain/dates'
import {
  IMPROVEMENT_STATUS_LABEL,
  MAX_IMPROVEMENT_NOTE,
  affectedSummary,
  evidenceGaps,
  insightFacts,
  ownerShares,
  proposeImprovement,
  setImprovementStatus,
  suggestionFor,
  taskInsights,
  taskTemplateById,
  type TaskInsight,
} from '../../domain/insights'
import { DEPARTMENT_LABEL } from '../../domain/people'
import type {
  Hire,
  Improvement,
  ImprovementStatus,
  IsoDate,
  Leader,
  Persona,
  TaskOwner,
  TaskScope,
  TaskTemplate,
} from '../../domain/types'
import { store, useStore } from '../../store/store'
import { Avatar, BAND_H1_COMPACT, Shell } from '../Shell'

const OWNER_LABEL: Record<TaskOwner, string> = {
  employee: 'New hire',
  manager: 'Manager',
  hr: 'HR',
  it: 'IT',
}
const OWNERS = ['employee', 'manager', 'hr', 'it'] as const
const SCOPES = ['company', 'engineering', 'sales'] as const
const scopeText = (scope: TaskScope): string => (scope === 'company' ? 'Company-wide' : DEPARTMENT_LABEL[scope])
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const panel = 'glass rounded-card p-4 sm:p-5'
const h2 = 'text-lg font-semibold'
const field =
  'min-h-11 w-full rounded-control border border-control bg-surface px-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const linkClass =
  'rounded-control font-medium break-words text-accent-strong underline underline-offset-2 hover:text-accent'
const primary =
  'min-h-11 cursor-pointer rounded-control bg-accent px-4 font-semibold text-white hover:bg-accent-strong'
const secondary = 'min-h-11 cursor-pointer rounded-control border border-control px-4 font-medium hover:bg-canvas'

const listRoute = (leader: Leader): Route => ({ screen: 'insights', leaderId: leader.id, taskId: null })

function StatusSelect({ item, persona, title }: { item: Improvement; persona: Persona; title: string }) {
  const id = `status-${item.id}`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted">
        Status<span className="sr-only"> for {title}</span>
      </label>
      <select
        id={id}
        value={item.status}
        className={`${field} w-auto`}
        onChange={(event) => {
          const status = (Object.keys(IMPROVEMENT_STATUS_LABEL) as ImprovementStatus[]).find(
            (key) => key === event.target.value,
          )
          if (!status) return
          const result = store.apply((data) => setImprovementStatus(data, persona, item.id, status))
          if (result.ok) toast(`Marked “${IMPROVEMENT_STATUS_LABEL[status]}”`)
          else toast.error(result.reason)
        }}
      >
        {(Object.keys(IMPROVEMENT_STATUS_LABEL) as ImprovementStatus[]).map((key) => (
          <option key={key} value={key}>
            {IMPROVEMENT_STATUS_LABEL[key]}
          </option>
        ))}
      </select>
    </div>
  )
}

function ImprovementItems({ items, persona, showTask }: { items: Improvement[]; persona: Persona; showTask: boolean }) {
  return (
    <ul className="divide-y divide-hairline">
      {items.map((item) => {
        const title = taskTemplateById(item.taskId)?.title ?? 'Removed task'
        return (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            {showTask && (
              <a
                href={hrefFor({ screen: 'insights', leaderId: persona.kind === 'leader' ? persona.leader.id : '', taskId: item.taskId })}
                className={linkClass}
              >
                {title}
              </a>
            )}
            <p className="mt-0.5 text-[15px] break-words">{item.note}</p>
            <p className="mt-1 text-[13px] text-muted">
              Proposed {formatShort(item.createdOn)} by {item.by}
            </p>
            <div className="mt-2">
              <StatusSelect item={item} persona={persona} title={title} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** One dot per hire with this task, filled for those affected. The written count comes first. */
function AffectedDots({ insight }: { insight: TaskInsight }) {
  if (insight.assigned.length > 12) return null
  return (
    <span aria-hidden className="mt-1 flex justify-end gap-1">
      {insight.assigned.map((hire) => (
        <span
          key={hire.id}
          className={`size-2 rounded-full ${
            insight.affected.some((item) => item.id === hire.id) ? 'bg-accent' : 'bg-later-tint ring-1 ring-control/40'
          }`}
        />
      ))}
    </span>
  )
}

function InsightRow({ insight, leader }: { insight: TaskInsight; leader: Leader }) {
  const { template } = insight
  return (
    <li className="relative flex items-start justify-between gap-4 px-4 py-3 transition-colors duration-100 hover:bg-white/60 sm:px-5">
      <div className="min-w-0">
        <a
          href={hrefFor({ screen: 'insights', leaderId: leader.id, taskId: template.id })}
          className="min-w-0 font-medium break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-control focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
        >
          {template.title}
        </a>
        <p className="mt-0.5 text-[13px] text-muted">
          {scopeText(template.scope)}. Owner: {OWNER_LABEL[template.owner]}
        </p>
        <ul className="mt-1 text-[14px]">
          {insightFacts(insight).map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </div>
      <div className="shrink-0 text-right">
        <span className="font-semibold whitespace-nowrap text-accent-strong">{affectedSummary(insight)}</span>
        <AffectedDots insight={insight} />
      </div>
    </li>
  )
}

// Filters survive opening a task and coming back.
const savedFilters: { scope: TaskScope | 'all'; owner: TaskOwner | 'all' } = { scope: 'all', owner: 'all' }

function ListScreen({ leader, today }: { leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const persona: Persona = { kind: 'leader', leader }
  const [scope, setScopeState] = useState<TaskScope | 'all'>(savedFilters.scope)
  const [owner, setOwnerState] = useState<TaskOwner | 'all'>(savedFilters.owner)
  const setScope = (next: TaskScope | 'all') => {
    savedFilters.scope = next
    setScopeState(next)
  }
  const setOwner = (next: TaskOwner | 'all') => {
    savedFilters.owner = next
    setOwnerState(next)
  }
  useEffect(() => rememberHrArea('insights'), [])

  const all = taskInsights(data, today)
  const shown = all.filter(
    (item) => (scope === 'all' || item.template.scope === scope) && (owner === 'all' || item.template.owner === owner),
  )
  const hires = data.hires.length
  const affectedIds = new Set(all.flatMap((item) => item.affected.map((hire) => hire.id)))
  const shares = ownerShares(all)
  const recurringTotal = all.filter((item) => item.affected.length > 1).length
  const recurring = shown.filter((item) => item.affected.length > 1)
  const oneOff = shown.filter((item) => item.affected.length <= 1)
  const queue = (
    <section className={panel}>
      <h2 className={h2}>Improvement queue</h2>
      <div className="mt-2">
        {data.improvements.length === 0 ? (
          <p className="text-[15px] text-muted">No improvements proposed yet. Open a task to propose one.</p>
        ) : (
          <ImprovementItems items={data.improvements} persona={persona} showTask />
        )}
      </div>
    </section>
  )

  return (
    <Shell
      persona={persona}
      compact
      band={
        <>
          <h1 className={BAND_H1_COMPACT}>Where people get stuck</h1>
          <p className="mt-1.5 max-w-prose text-[15px] text-band-soft">
            Find recurring onboarding friction and improve the experience for future hires.
          </p>
        </>
      }
    >
      {all.length === 0 ? (
        <div className="space-y-5">
          <p className={`${panel} max-w-prose text-[15px]`}>
            Not enough activity to identify recurring problems yet. As employees complete onboarding and request help,
            patterns will appear here.
          </p>
          {queue}
        </div>
      ) : (
        <div className="grid items-start gap-x-6 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="min-w-36 flex-1 sm:max-w-52">
                <label htmlFor="f-dept" className="mb-1 block text-sm font-medium">
                  Department
                </label>
                <select
                  id="f-dept"
                  className={field}
                  value={scope}
                  onChange={(event) => {
                    const next = SCOPES.find((key) => key === event.target.value)
                    setScope(next ?? 'all')
                  }}
                >
                  <option value="all">All</option>
                  {SCOPES.map((key) => (
                    <option key={key} value={key}>
                      {scopeText(key)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-36 flex-1 sm:max-w-52">
                <label htmlFor="f-owner" className="mb-1 block text-sm font-medium">
                  Owner
                </label>
                <select
                  id="f-owner"
                  className={field}
                  value={owner}
                  onChange={(event) => {
                    const next = OWNERS.find((key) => key === event.target.value)
                    setOwner(next ?? 'all')
                  }}
                >
                  <option value="all">All</option>
                  {OWNERS.map((key) => (
                    <option key={key} value={key}>
                      {OWNER_LABEL[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {shown.length === 0 ? (
              <div className={panel}>
                <p className="text-[15px]">No tasks match these filters.</p>
                <button
                  type="button"
                  className={`${secondary} mt-3`}
                  onClick={() => {
                    setScope('all')
                    setOwner('all')
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {recurring.length > 0 && (
                  <section>
                    <h2 className="mb-2.5 text-xl font-semibold">Affecting more than one hire</h2>
                    <ul className="glass divide-y divide-hairline overflow-hidden rounded-card">
                      {recurring.map((insight) => (
                        <InsightRow key={insight.template.id} insight={insight} leader={leader} />
                      ))}
                    </ul>
                  </section>
                )}
                {oneOff.length > 0 && (
                  // One person's delay is not a pattern, so these stay out of the way until asked for.
                  <details open={recurring.length === 0} className="glass group overflow-hidden rounded-card">
                    <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-semibold sm:px-5">
                      <ChevronRight size={18} aria-hidden className="text-muted transition-transform duration-200 group-open:rotate-90" />
                      One hire so far ({oneOff.length})
                    </summary>
                    <ul className="divide-y divide-hairline border-t border-hairline">
                      {oneOff.map((insight) => (
                        <InsightRow key={insight.template.id} insight={insight} leader={leader} />
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <section aria-label="Summary" className={`${panel} space-y-2 text-[15px]`}>
              <p className="text-lg leading-snug font-semibold">
                {plural(recurringTotal, 'task affects', 'tasks affect')} more than one hire.
              </p>
              <p>
                In total, {plural(all.length, 'task shows', 'tasks show')} friction, affecting {affectedIds.size} of{' '}
                {hires} {hires === 1 ? 'hire' : 'hires'}.
              </p>
              <p>
                Where to look first:{' '}
                {shares.map((share) => `${share.label} ${plural(share.tasks, 'task', 'tasks')}`).join(', ')}.
                <span className="text-muted"> Ownership shows where to look, not who is at fault.</span>
              </p>
              <p className="rounded-control bg-soon-tint px-2.5 py-1.5 text-sm text-soon">
                Based on current sample plans for {plural(hires, 'new hire', 'new hires')}. Limited sample: review before
                drawing conclusions.
              </p>
              <details className="group text-[14px]">
                <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 font-medium">
                  <ChevronRight size={16} aria-hidden className="text-muted transition-transform duration-200 group-open:rotate-90" />
                  How these are counted
                </summary>
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  <li>Affected: distinct hires with any of the below, each counted once.</li>
                  <li>Overdue now: the task is past its due date and not finished.</li>
                  <li>Finished late: completed after its due date.</li>
                  <li>Blocking: other open tasks cannot start until this one is done.</li>
                  <li>Help requests: the number of requests, and the number of distinct people asking.</li>
                </ul>
                <p className="mt-2 text-muted">
                  Nothing here is a historical trend, because earlier status changes were not recorded.
                </p>
              </details>
            </section>
            {queue}
          </div>
        </div>
      )}
    </Shell>
  )
}

function hireAnswers(insight: TaskInsight, hire: Hire): string[] {
  const lines: string[] = []
  for (const item of insight.overdueNow)
    if (item.hire.id === hire.id) lines.push(`Overdue by ${plural(item.daysLate, 'business day', 'business days')}`)
  for (const item of insight.completedLate)
    if (item.hire.id === hire.id) lines.push(`Finished ${plural(item.daysLate, 'business day', 'business days')} late`)
  for (const item of insight.blockingNow)
    if (item.hire.id === hire.id) lines.push(`Blocking “${item.task.template.title}”`)
  if (insight.requesters.some((item) => item.id === hire.id)) lines.push('Asked for help')
  return lines
}

function emptyInsight(template: TaskTemplate): TaskInsight {
  return {
    template,
    assigned: [],
    overdueNow: [],
    completedLate: [],
    waitingNow: [],
    blockingNow: [],
    requests: [],
    requesters: [],
    affected: [],
  }
}

function ProposalForm({
  persona,
  insight,
  today,
}: {
  persona: Persona
  insight: TaskInsight
  today: IsoDate
}) {
  const [note, setNote] = useState(suggestionFor(insight))
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault()
        const result = store.apply((data) => proposeImprovement(data, persona, insight.template.id, note, today))
        if (result.ok) {
          setError(null)
          toast('Improvement proposed')
        } else setError(result.reason)
      }}
    >
      <label htmlFor="proposal" className="mb-1 block text-sm font-medium">
        Your proposed improvement
      </label>
      <textarea
        id="proposal"
        rows={4}
        maxLength={MAX_IMPROVEMENT_NOTE}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className={`${field} py-2`}
      />
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-overdue">
          {error}
        </p>
      )}
      <button type="submit" className={`${primary} mt-3`}>
        Propose a plan improvement
      </button>
      <p className="mt-2 text-[13px] text-muted">
        This records a proposal. It doesn’t change anyone’s plan or any legal requirement.
      </p>
    </form>
  )
}

function DetailScreen({ leader, taskId, today }: { leader: Leader; taskId: string; today: IsoDate }) {
  const { data } = useStore()
  const persona: Persona = { kind: 'leader', leader }
  const back = { label: 'Back to Insights', route: listRoute(leader) }
  const template = taskTemplateById(taskId)

  if (!template) {
    return (
      <Shell persona={persona} compact back={back} band={<h1 className={BAND_H1_COMPACT}>We can’t find that task</h1>}>
        <p className="text-[15px]">It may have been removed from every plan.</p>
        <a href={hrefFor(listRoute(leader))} className={`${linkClass} mt-3 inline-flex min-h-11 items-center`}>
          Back to Insights
        </a>
      </Shell>
    )
  }

  const found = taskInsights(data, today).find((item) => item.template.id === taskId)
  const insight = found ?? emptyInsight(template)
  const mine = data.improvements.filter((item) => item.taskId === taskId)

  return (
    <Shell
      persona={persona}
      compact
      back={back}
      band={
        <>
          <h1 className={BAND_H1_COMPACT}>{template.title}</h1>
          <p className="mt-1.5 text-[15px] text-band-soft">
            Owner: {OWNER_LABEL[template.owner]}. Scope: {scopeText(template.scope)}.
          </p>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <section className={panel}>
            <h2 className={h2}>What’s happening</h2>
            {found ? (
              <>
                <p className="mt-2 font-semibold text-accent-strong">{affectedSummary(found)}</p>
                <ul className="mt-1 text-[15px]">
                  {insightFacts(found).map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[15px]">No recorded friction on this task right now.</p>
            )}
          </section>

          {found && (
            <section className={panel}>
              <h2 className={h2}>Who’s affected</h2>
              <ul className="mt-3 space-y-3">
                {found.affected.map((hire) => (
                  <li key={hire.id} className="flex items-start gap-3">
                    <Avatar name={hire.name} size="sm" />
                    <div className="min-w-0">
                      <a
                        href={hrefFor({ screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: template.id })}
                        className={linkClass}
                      >
                        {hire.name}
                      </a>
                      <ul className="text-[14px] text-muted">
                        {hireAnswers(found, hire).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {found && found.requests.length > 0 && (
            <section className={panel}>
              <h2 className={h2}>Help requests</h2>
              <ul className="mt-3 space-y-3">
                {found.requests.map((request) => (
                  <li key={request.id} className="text-[15px]">
                    <p className="break-words">{request.message}</p>
                    <p className="text-[13px] text-muted">
                      {data.hires.find((hire) => hire.id === request.hireId)?.name ?? 'A new hire'}, {formatShort(request.on)},{' '}
                      {request.status === 'open' ? 'Open' : 'Resolved'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {found && found.blockingNow.length > 0 && (
            <section className={panel}>
              <h2 className={h2}>Blocks</h2>
              <ul className="mt-3 space-y-1 text-[15px]">
                {found.blockingNow.map((item) => (
                  <li key={`${item.hire.id}-${item.task.template.id}`} className="break-words">
                    “{item.task.template.title}” is held up for {item.hire.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {found && (
            <section className={panel}>
              <h2 className={h2}>What these records can’t tell you</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
                {evidenceGaps(found).map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </section>
          )}

          <section className={panel}>
            <h2 className={h2}>A possible improvement</h2>
            <p className="mt-2 text-sm font-medium text-waiting">Suggestion, not a proven cause</p>
            <p className="mt-1 text-[15px]">{suggestionFor(insight)}</p>
            <ProposalForm key={taskId} persona={persona} insight={insight} today={today} />
          </section>

          {mine.length > 0 && (
            <section className={panel}>
              <h2 className={h2}>Proposed for this task</h2>
              <div className="mt-3">
                <ImprovementItems items={mine} persona={persona} showTask={false} />
              </div>
            </section>
          )}
        </div>
      </div>
    </Shell>
  )
}

export function InsightsView({ leader, taskId, today }: { leader: Leader; taskId: string | null; today: IsoDate }) {
  return taskId === null ? (
    <ListScreen leader={leader} today={today} />
  ) : (
    <DetailScreen leader={leader} taskId={taskId} today={today} />
  )
}
