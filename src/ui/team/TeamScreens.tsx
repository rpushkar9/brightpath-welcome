import { useState } from 'react'
import { toast } from 'sonner'
import { hrefFor, type Route } from '../../app/route'
import { formatShort } from '../../domain/dates'
import { DEPARTMENT_LABEL, firstName, leaderById, SARAH } from '../../domain/people'
import { buildPlan, hireHealth, progress, stageOf } from '../../domain/plan'
import {
  blockedBy,
  canAct,
  canView,
  hasNudgedToday,
  healthReason,
  leaderActions,
  nudgeTarget,
  ownerName,
  rosterOrder,
  sendNudge,
  type LeaderAction,
  type RosterRow,
} from '../../domain/rules'
import type { HealthKind, Hire, IsoDate, Leader, Persona, PlanTask } from '../../domain/types'
import { openRequestsFor, resolveHelp } from '../../domain/help'
import { store, useStore } from '../../store/store'
import { PlanPhases } from '../PlanPhases'
import { BAND_H1, BAND_H1_COMPACT, Shell } from '../Shell'
import { TaskDrawer } from '../TaskDrawer'
import { openTask } from '../TaskRow'
import { HealthChip, HEALTH_LABEL, statusLabel } from '../status'
import { CompactProgress, PhasePath, STAGE_LABEL } from '../employee/PhasePath'

export { NewHireForm } from './NewHireForm'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const spell = (n: number): string => WORDS[n] ?? String(n)
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

const linkFocus =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-control focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"

const buttonPrimary =
  'inline-flex min-h-11 cursor-pointer items-center rounded-control bg-accent px-4 font-semibold text-white transition-colors duration-100 hover:bg-accent-strong'
const buttonSecondary =
  'inline-flex min-h-11 cursor-pointer items-center rounded-control border border-control px-4 font-medium transition-colors duration-100 hover:bg-canvas'

type Filter = 'all' | HealthKind
const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-attention', label: HEALTH_LABEL['needs-attention'] },
  { id: 'watch', label: HEALTH_LABEL.watch },
  { id: 'on-track', label: HEALTH_LABEL['on-track'] },
  { id: 'complete', label: HEALTH_LABEL.complete },
]

function headline(count: number, attention: number, watch: number): string {
  if (count === 0) return 'No new hires right now.'
  if (attention === 0 && watch > 0) {
    return `${cap(spell(watch))} ${watch === 1 ? 'person' : 'people'} to watch.`
  }
  if (attention === 0) return 'Everyone is on track.'
  return `${cap(spell(attention))} ${attention === 1 ? 'person needs' : 'people need'} your help.`
}

function subline(leader: Leader, rows: RosterRow[], attention: number, watch: number): string {
  const count = rows.length
  const noun = count === 1 ? 'new hire' : 'new hires'
  let text: string
  if (leader.kind === 'hr') {
    const depts = [...new Set(rows.map((row) => DEPARTMENT_LABEL[row.hire.department]))].sort()
    text = `${count} ${noun}${depts.length > 0 ? ` across ${depts.join(' and ')}` : ''}.`
  } else {
    text = `${DEPARTMENT_LABEL[leader.department]} team, ${count} ${noun}.`
  }
  if (attention > 0 && watch > 0) text += ` ${cap(spell(watch))} more to watch.`
  return text
}

const stageText = (hire: Hire, today: IsoDate): string =>
  `${hire.startDate > today ? 'Starts' : 'Started'} ${formatShort(hire.startDate)}`

/** The next date still ahead. Late work is already covered by the Status column. */
function nextDue(plan: PlanTask[], today: IsoDate): string {
  const ahead = plan
    .filter((task) => task.status.kind !== 'completed' && task.dueOn >= today)
    .map((task) => task.dueOn)
  const first = ahead.sort()[0]
  return first ? formatShort(first) : 'None'
}

function ProgressBar({ row }: { row: RosterRow }) {
  const { done, total, percent } = progress(row.plan)
  return (
    <>
      <span className="tabular-nums">
        {done} of {total}
      </span>
      <span className="block h-1 w-28 max-w-full rounded-full bg-later-tint sm:mt-1.5" aria-hidden>
        <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </span>
    </>
  )
}

export function TeamView({ leader, today }: { leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const persona: Persona = { kind: 'leader', leader }
  const [filter, setFilter] = useState<Filter>('all')
  const visible = data.hires.filter((hire) => canView(persona, hire))
  const rows = rosterOrder(visible, data, today)
  const count = (kind: HealthKind) => rows.filter((row) => row.health.kind === kind).length
  const shown = filter === 'all' ? rows : rows.filter((row) => row.health.kind === filter)
  const isHr = leader.kind === 'hr'
  const flaggedCount = count('needs-attention') + count('watch')
  const hasHelp = openRequestsFor(data, leader).length > 0
  const sideBySide = flaggedCount === 1 && !hasHelp
  const route = (hire: Hire): Route => ({
    screen: 'hire',
    leaderId: leader.id,
    hireId: hire.id,
    taskId: null,
  })

  return (
    <Shell
      persona={persona}
      band={
        <>
          <h1 className={BAND_H1}>{headline(rows.length, count('needs-attention'), count('watch'))}</h1>
          <p className="mt-2 text-[15px] text-band-soft">
            {subline(leader, rows, count('needs-attention'), count('watch'))}
          </p>
        </>
      }
    >
      {rows.length > 0 && (
        // One flagged person sits beside the actions, so neither panel leaves a gap.
        <div className={sideBySide ? 'grid items-start gap-x-6 lg:grid-cols-2' : ''}>
          <AttentionSection rows={rows} persona={persona} leader={leader} today={today} />
          <div className={hasHelp ? 'grid items-start gap-x-6 lg:grid-cols-2' : ''}>
            <NextActions persona={persona} leader={leader} today={today} narrow={hasHelp || sideBySide} />
            {hasHelp && <HelpRequests leader={leader} persona={persona} today={today} />}
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <>
          <h2 className="mb-2.5 text-xl font-semibold">{isHr ? 'All new hires' : 'Your new hires'}</h2>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div
              data-tour="roster"
              role="group"
              aria-label="Filter the roster"
              className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className="min-h-11 shrink-0 cursor-pointer rounded-control border border-hairline bg-surface px-3 text-sm font-medium whitespace-nowrap transition-colors duration-100 hover:border-control aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:text-accent-strong"
                >
                  {item.label}{' '}
                  <span className="tabular-nums">
                    ({item.id === 'all' ? rows.length : count(item.id)})
                  </span>
                </button>
              ))}
            </div>
            {isHr && (
              <a
                data-tour="new-plan"
                href={hrefFor({ screen: 'new', leaderId: leader.id })}
                className={`${buttonPrimary} justify-center`}
              >
                Start a new plan
              </a>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="rounded-panel border border-hairline bg-surface px-5 py-6">
              <p className="max-w-prose text-[15px] leading-relaxed">
                Nobody is marked “{FILTERS.find((item) => item.id === filter)?.label}” right now.
              </p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`${buttonSecondary} mt-3`}
              >
                Show everyone
              </button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-panel border border-hairline bg-surface sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-hairline text-[13px] text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-medium">Person</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Stage</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Progress</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-5 py-2.5 font-medium">Next due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {shown.map((row) => (
                      <tr key={row.hire.id} className="relative align-top hover:bg-canvas">
                        <td className="px-5 py-3.5">
                          <a
                            href={hrefFor(route(row.hire))}
                            className={`font-medium break-words ${linkFocus}`}
                          >
                            {row.hire.name}
                          </a>
                          <p className="text-[13px] text-muted">
                            {row.hire.title}
                            {isHr && `, ${DEPARTMENT_LABEL[row.hire.department]}`}
                          </p>
                        </td>
                        <td className="px-3 py-3.5">
                          {STAGE_LABEL[stageOf(row.hire, today)]}
                          <p className="text-[13px] text-muted">{stageText(row.hire, today)}</p>
                        </td>
                        <td className="px-3 py-3.5">
                          <ProgressBar row={row} />
                        </td>
                        <td className="px-3 py-3.5">
                          <HealthChip kind={row.health.kind} />
                          <p className="mt-1 text-[13px] text-muted">
                            {healthReason(row.health, row.hire)}
                          </p>
                          {hasNudgedToday(data, row.hire.id, today) && (
                            <p className="mt-0.5 text-[13px] font-medium text-accent-strong">
                              Nudged today
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap tabular-nums">
                          {nextDue(row.plan, today)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-hairline overflow-hidden rounded-panel border border-hairline bg-surface sm:hidden">
                {shown.map((row) => (
                  <li key={row.hire.id} className="relative px-4 py-3.5 hover:bg-canvas">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={hrefFor(route(row.hire))}
                          className={`font-medium break-words ${linkFocus}`}
                        >
                          {row.hire.name}
                        </a>
                        <p className="text-[13px] break-words text-muted">
                          {row.hire.title}
                          {isHr && `, ${DEPARTMENT_LABEL[row.hire.department]}`}
                        </p>
                      </div>
                      <HealthChip kind={row.health.kind} />
                    </div>
                    <p className="mt-1.5 text-[13px] text-muted">
                      {healthReason(row.health, row.hire)}
                    </p>
                    {hasNudgedToday(data, row.hire.id, today) && (
                      <p className="mt-0.5 text-[13px] font-medium text-accent-strong">
                        Nudged today
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-sm">
                      <ProgressBar row={row} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Shell>
  )
}

function ActionList({
  items,
  leader,
  limit,
}: {
  items: LeaderAction[]
  leader: Leader
  limit: number
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, limit)
  return (
    <>
      <ul className="divide-y divide-hairline overflow-hidden rounded-panel border border-hairline bg-surface">
        {shown.map(({ hire, task, blocks }) => {
          const route: Route = {
            screen: 'hire',
            leaderId: leader.id,
            hireId: hire.id,
            taskId: task.template.id,
          }
          return (
            <li
              key={`${hire.id}:${task.template.id}`}
              className="relative px-4 py-2.5 transition-colors duration-100 hover:bg-canvas"
            >
              <a
                href={hrefFor(route)}
                data-task-link={`${hire.id}:${task.template.id}`}
                onClick={(event) => openTask(event, route)}
                className={`text-sm font-medium break-words ${linkFocus}`}
              >
                {task.template.title}
              </a>
              <span className="block text-[13px]">
                <span className="break-words text-muted">{hire.name}. </span>
                <span className={task.status.kind === 'overdue' ? 'font-medium text-overdue' : 'text-muted'}>
                  {statusLabel(task.status, hire)}
                </span>
              </span>
              <BlocksLine hire={hire} blocks={blocks} />
            </li>
          )
        })}
      </ul>
      {items.length > limit && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent underline underline-offset-2 hover:text-accent-strong sm:min-h-8"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </>
  )
}

// Actions stay short, so the people the headline names remain near the top of the screen.
const MANAGER_LIMIT = 3
const HR_GROUP_LIMIT = 2

function NextActions({
  persona,
  leader,
  today,
  narrow,
}: {
  persona: Persona
  leader: Leader
  today: IsoDate
  narrow: boolean
}) {
  const { data } = useStore()
  const items = leaderActions(persona, data, today)
  const hr = items.filter((item) => item.task.template.owner === 'hr')
  const it = items.filter((item) => item.task.template.owner === 'it')

  return (
    <section data-tour="next-actions" className="mb-7">
      <h2 className="mb-2.5 text-xl font-semibold">Your next actions</h2>
      {items.length === 0 ? (
        <p className="text-[15px] text-muted">Nothing needs you right now.</p>
      ) : leader.kind === 'hr' ? (
        <div className={`grid items-start gap-x-6 gap-y-5 ${narrow ? '' : 'md:grid-cols-2'}`}>
          <div>
            <h3 className="mb-1.5 font-sans text-sm font-semibold">HR tasks</h3>
            {hr.length > 0 ? (
              <ActionList items={hr} leader={leader} limit={HR_GROUP_LIMIT} />
            ) : (
              <p className="text-sm text-muted">No HR tasks are open.</p>
            )}
          </div>
          <div>
            <h3 className="mb-1.5 font-sans text-sm font-semibold">IT tasks, while HR stands in for IT</h3>
            {it.length > 0 ? (
              <ActionList items={it} leader={leader} limit={HR_GROUP_LIMIT} />
            ) : (
              <p className="text-sm text-muted">No IT tasks are open.</p>
            )}
          </div>
        </div>
      ) : (
        <ActionList items={items} leader={leader} limit={MANAGER_LIMIT} />
      )}
    </section>
  )
}

function AttentionCard({
  row,
  persona,
  leader,
  today,
}: {
  row: RosterRow
  persona: Persona
  leader: Leader
  today: IsoDate
}) {
  const { data } = useStore()
  const { hire, plan, health } = row
  const name = firstName(hire.name)
  const headingId = `attention-${hire.id}`
  const target = nudgeTarget(persona, hire, data, today)
  const nudged = hasNudgedToday(data, hire.id, today)
  const blocks = health.overdue.flatMap((task) => blockedBy(plan, task.template.id))
  const mine = health.overdue.find((task) => canAct(persona, hire, task.template.owner))
  const other = health.overdue.find((task) => task.template.owner !== 'employee')
  const open = (task: PlanTask): Route => ({
    screen: 'hire',
    leaderId: leader.id,
    hireId: hire.id,
    taskId: task.template.id,
  })
  let sentence = ''
  const ownLate = health.overdue.some((task) => task.template.owner === 'employee')
  if (!target && !mine && other && !ownLate) {
    const who = other.template.owner === 'manager' ? ownerName('manager', hire) : firstName(SARAH.name)
    sentence = `Waiting on ${ownerName(other.template.owner, hire)}. ${who} can clear this.`
  } else if (!target && !mine && !nudged) {
    sentence = 'Nothing is late yet. No action needed.'
  }

  return (
    <li className="rounded-panel border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(18,56,47,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-sans text-base font-semibold break-words">
            {hire.name}
          </h3>
          <p className="text-[13px] break-words text-muted">{hire.title}</p>
        </div>
        <HealthChip kind={health.kind} />
      </div>
      <p className="mt-2 text-[15px]">{healthReason(health, hire)}</p>
      <BlocksLine hire={hire} blocks={blocks} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {target ? (
          <button
            type="button"
            onClick={() => {
              const result = store.apply((current) => sendNudge(current, persona, hire.id, today))
              if (result.ok) toast(`Nudge sent to ${name}. It appears in their workspace. No email is sent.`)
              else toast.error(result.reason)
            }}
            className={buttonPrimary}
          >
            Nudge {name}
          </button>
        ) : mine ? (
          <a
            href={hrefFor(open(mine))}
            onClick={(event) => openTask(event, open(mine))}
            className={`${buttonPrimary} break-words`}
          >
            Open task
          </a>
        ) : null}
        {nudged && !target && <span className="text-[15px] font-medium text-accent-strong">Nudged today</span>}
        <a
          href={hrefFor({ screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: null })}
          aria-describedby={headingId}
          className={buttonSecondary}
        >
          Open plan
        </a>
      </div>
      {sentence && <p className="mt-2 text-[13px] text-muted">{sentence}</p>}
    </li>
  )
}

function AttentionSection({
  rows,
  persona,
  leader,
  today,
}: {
  rows: RosterRow[]
  persona: Persona
  leader: Leader
  today: IsoDate
}) {
  const flagged = rows.filter((row) => row.health.kind === 'needs-attention' || row.health.kind === 'watch')
  if (flagged.length === 0) return null
  return (
    <section data-tour="attention" className="mb-7">
      <h2 className="mb-2.5 text-xl font-semibold">Who needs attention</h2>
      <ul className={`grid gap-3 ${flagged.length === 3 ? 'lg:grid-cols-3' : flagged.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {flagged.map((row) => (
          <AttentionCard key={row.hire.id} row={row} persona={persona} leader={leader} today={today} />
        ))}
      </ul>
    </section>
  )
}

function HelpRequests({
  leader,
  persona,
  today,
}: {
  leader: Leader
  persona: Persona
  today: IsoDate
}) {
  const { data } = useStore()
  const requests = openRequestsFor(data, leader)
  if (requests.length === 0) return null
  return (
    <section data-tour="help-requests" className="mb-7">
      <h2 className="mb-2.5 text-xl font-semibold">Help requests</h2>
      <ul className="divide-y divide-hairline overflow-hidden rounded-panel border border-hairline bg-surface">
        {requests.map((request) => {
          const hire = data.hires.find((item) => item.id === request.hireId)
          if (!hire) return null
          const task = request.taskId
            ? buildPlan(hire, data, today).find((item) => item.template.id === request.taskId)
            : undefined
          const route: Route = {
            screen: 'hire',
            leaderId: leader.id,
            hireId: hire.id,
            taskId: task ? task.template.id : null,
          }
          return (
            <li key={request.id} className="px-4 py-3">
              <p className="font-medium break-words">{hire.name}</p>
              {task && <p className="text-[13px] break-words text-muted">{task.template.title}</p>}
              <p className="mt-1 text-[15px] break-words">{request.message}</p>
              <p className="text-[13px] text-muted">{formatShort(request.on)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label={`Mark resolved, request from ${hire.name}`}
                  onClick={() => {
                    const result = store.apply((current) => resolveHelp(current, persona, request.id))
                    if (result.ok) toast('Marked resolved')
                    else toast.error(result.reason)
                  }}
                  className={buttonPrimary}
                >
                  Mark resolved
                </button>
                {task && (
                  <a
                    href={hrefFor(route)}
                    onClick={(event) => openTask(event, route)}
                    className={buttonSecondary}
                  >
                    Open task
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[13px] text-muted">Requests stay in this app. No email is sent.</p>
    </section>
  )
}

const lateText = (days: number): string =>
  `${days} business ${days === 1 ? 'day' : 'days'} late`

function BlocksLine({ hire, blocks }: { hire: Hire; blocks: PlanTask[] }) {
  return blocks.map((task) => (
    <span key={task.template.id} className="block text-[13px] font-medium text-waiting">
      Blocks {ownerName(task.template.owner, hire)}: {task.template.title}
    </span>
  ))
}

function WhyFlagged({
  hire,
  health,
  plan,
  taskRoute,
}: {
  hire: Hire
  health: RosterRow['health']
  plan: PlanTask[]
  taskRoute: (taskId: string) => Route
}) {
  return (
    <section className="rounded-panel border border-hairline bg-surface px-5 py-4">
      <h2 className="text-lg font-semibold">Why flagged</h2>
      <p className="mt-1 text-[15px]">{healthReason(health, hire)}</p>
      <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
        {health.overdue.map((task) => (
          <li key={task.template.id} className="py-2 text-sm">
            <a
              href={hrefFor(taskRoute(task.template.id))}
              data-task-link={`why:${task.template.id}`}
              onClick={(event) => openTask(event, taskRoute(task.template.id))}
              className="font-medium break-words underline decoration-control underline-offset-2 hover:text-accent-strong"
            >
              {task.template.title}
            </a>
            <span className="block text-[13px] text-muted">
              {task.status.kind === 'overdue' ? lateText(task.status.daysLate) : ''}. Owner:{' '}
              {ownerName(task.template.owner, hire)}
            </span>
            <BlocksLine hire={hire} blocks={blockedBy(plan, task.template.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function NudgePanel({
  persona,
  hire,
  plan,
  today,
}: {
  persona: Persona
  hire: Hire
  plan: PlanTask[]
  today: IsoDate
}) {
  const { data } = useStore()
  const target = nudgeTarget(persona, hire, data, today)
  const name = firstName(hire.name)
  const others = plan.filter(
    (task) => task.status.kind === 'overdue' && task.template.owner !== 'employee',
  )
  const nudged = hasNudgedToday(data, hire.id, today)
  const nudgedTaskId = data.nudges.find((item) => item.hireId === hire.id && item.on === today)?.taskId
  const nudgedAbout = plan.find((task) => task.template.id === nudgedTaskId)?.template.title

  if (!target && !nudged && others.length === 0) return null

  return (
    <section className="rounded-panel border border-hairline bg-surface px-5 py-4">
      <h2 className="text-lg font-semibold">What you can do</h2>
      {target && (
        <>
          <button
            type="button"
            onClick={() => {
              const result = store.apply((current) => sendNudge(current, persona, hire.id, today))
              if (result.ok) toast(`Nudge sent to ${name}. It appears in their workspace. No email is sent.`)
              else toast.error(result.reason)
            }}
            className={`${buttonPrimary} mt-2`}
          >
            Nudge {name}
          </button>
          <p className="mt-2 max-w-prose text-[13px] text-muted">
            About “{target.template.title}”. This appears in their workspace. No email is sent in
            this prototype.
          </p>
        </>
      )}
      {nudged && (
        <p className="mt-1 text-[15px] font-medium text-accent-strong">
          Nudged today
          {nudgedAbout && ` about “${nudgedAbout}”`}
        </p>
      )}
      {others.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {others.map((task) => (
            <li key={task.template.id}>
              {task.template.owner === 'manager' && persona.kind === 'leader' && persona.leader.id === hire.managerId
                ? `“${task.template.title}” is yours. Mark it complete in the plan below.`
                : `“${task.template.title}” is with ${ownerName(task.template.owner, hire)}, so a nudge to ${name} would not help. ${
                    canAct(persona, hire, task.template.owner)
                      ? 'You can mark it complete in the plan below.'
                      : `Only ${ownerName(task.template.owner, hire)} can mark it complete.`
                  }`}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function HireDetail({
  leader,
  hire,
  taskId,
  today,
}: {
  leader: Leader
  hire: Hire
  taskId: string | null
  today: IsoDate
}) {
  const { data } = useStore()
  const persona: Persona = { kind: 'leader', leader }
  const plan = buildPlan(hire, data, today)
  const health = hireHealth(plan)
  const stage = stageOf(hire, today)
  const { done, total, percent } = progress(plan)
  const company = plan.filter((task) => task.template.scope === 'company').length
  const dept = DEPARTMENT_LABEL[hire.department]
  const manager = leaderById(hire.managerId)
  const flagged = health.kind === 'needs-attention' || health.kind === 'watch'
  const parent: Route = { screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: null }

  return (
    <Shell
      persona={persona}
      compact
      back={{
        label: leader.kind === 'hr' ? 'Back to all new hires' : 'Back to your team',
        route: { screen: 'team', leaderId: leader.id },
        current: hire.name,
      }}
      band={
        <>
          <h1 className={BAND_H1_COMPACT}>{hire.name}</h1>
          <p className="mt-1.5 text-sm text-band-soft sm:text-[15px]">
            {hire.title} in {dept}.{manager ? ` Reports to ${manager.name}.` : ''}{' '}
            {stageText(hire, today)}.
          </p>
          <div className="mt-3 sm:mt-4">
            <CompactProgress
              stageLabel={STAGE_LABEL[stage]}
              done={done}
              total={total}
              percent={percent}
            />
            <PhasePath plan={plan} stage={stage} currentLabel="Now" />
          </div>
        </>
      }
    >
      <div className="mb-6 grid items-start gap-4 lg:grid-cols-2">
        {/* The action comes first on phones. On wide screens the reason sits on the left. */}
        <div className="lg:order-last">
          <NudgePanel persona={persona} hire={hire} plan={plan} today={today} />
        </div>
        {flagged && (
          <WhyFlagged
            hire={hire}
            health={health}
            plan={plan}
            taskRoute={(id) => ({ screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: id })}
          />
        )}
      </div>
      <p className="mb-3 text-[15px]">
        {done} of {total} done. This plan has {company} company tasks and {total - company} {dept}{' '}
        tasks.
      </p>
      <PlanPhases
        plan={plan}
        hire={hire}
        persona={persona}
        stage={stage}
        currentLabel="Now"
        taskRoute={(id) => ({ screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: id })}
      />
      <TaskDrawer taskId={taskId} plan={plan} hire={hire} persona={persona} parent={parent} />
    </Shell>
  )
}
