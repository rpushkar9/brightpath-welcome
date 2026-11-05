import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { currentHrArea, hrefFor, rememberHrArea, type Route } from '../../app/route'
import { activitySince, markSeen } from '../../domain/activity'
import { latestSeq } from '../../domain/events'
import { affectedSummary, taskInsights } from '../../domain/insights'
import { formatShort } from '../../domain/dates'
import { DEPARTMENT_LABEL, firstName, leaderById, SARAH } from '../../domain/people'
import { buildPlan, hireHealth, progress, stageOf } from '../../domain/plan'
import {
  blockedBy,
  blockedElsewhere,
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
import type { Department, HealthKind, Hire, IsoDate, Leader, Persona, PlanTask } from '../../domain/types'
import { openRequestsFor, resolveHelp } from '../../domain/help'
import { store, useStore } from '../../store/store'
import { PlanPhases } from '../PlanPhases'
import { Avatar, BAND_H1_COMPACT, BackAtEnd, Shell, type BackLink } from '../Shell'
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
      <span className="block h-1.5 w-28 max-w-full rounded-full bg-later-tint sm:mt-1.5" aria-hidden>
        <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </span>
    </>
  )
}

const HEALTH_SEGMENTS: readonly { kind: HealthKind; tone: string }[] = [
  { kind: 'needs-attention', tone: 'bg-[#f0a08c]' },
  { kind: 'watch', tone: 'bg-path-marker' },
  { kind: 'on-track', tone: 'bg-path-fill' },
  { kind: 'complete', tone: 'bg-white/70' },
]

/** How the group is doing, as one bar. Each part also has a written count, so colour is not required. */
function HealthStrip({ rows }: { rows: RosterRow[] }) {
  if (rows.length === 0) return null
  const parts = HEALTH_SEGMENTS.map((segment) => ({
    ...segment,
    count: rows.filter((row) => row.health.kind === segment.kind).length,
  })).filter((segment) => segment.count > 0)
  return (
    <div className="mt-4">
      <div aria-hidden className="flex h-2 gap-1 overflow-hidden rounded-full">
        {parts.map((part) => (
          <span key={part.kind} className={`rounded-full ${part.tone}`} style={{ flexGrow: part.count }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-band-soft">
        {parts.map((part) => (
          <li key={part.kind} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2 rounded-full ${part.tone}`} />
            <span>
              <span className="font-semibold text-white tabular-nums">{part.count}</span> {HEALTH_LABEL[part.kind]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ACTIVITY_LIMIT = 5
const visitStarts = new Map<string, number>()

/**
 * Where this visit began. It lasts for the tab's session, so opening someone and coming back,
 * or refreshing, does not clear what is new. A new session is a new visit.
 */
function visitStart(leaderId: string, seen: number): number {
  const key = `brightpath-welcome:visit:${leaderId}`
  try {
    const stored = window.sessionStorage.getItem(key)
    if (stored !== null) return Number(stored) || 0
    window.sessionStorage.setItem(key, String(seen))
    return seen
  } catch {
    const known = visitStarts.get(leaderId)
    if (known !== undefined) return known
    visitStarts.set(leaderId, seen)
    return seen
  }
}

/** New items since the last visit. They stay listed until the next visit. */
function WhatChanged({ leader }: { leader: Leader }) {
  const { data } = useStore()
  const newest = latestSeq(data)
  const [startOfVisit] = useState(() => visitStart(leader.id, data.seenThrough[leader.id] ?? 0))
  // A demo reset restarts the log, so an older point cannot hide what comes next.
  const baseline = startOfVisit > newest ? 0 : startOfVisit
  useEffect(() => {
    if ((store.getSnapshot().data.seenThrough[leader.id] ?? 0) !== newest) {
      store.update((current) => markSeen(current, leader.id))
    }
  }, [leader.id, newest])
  const all = activitySince(data, leader, baseline)
  const items = all.slice(0, ACTIVITY_LIMIT)
  return (
    <section data-tour="what-changed" className="glass rounded-card p-4">
      <h2 className="text-lg font-semibold">What changed since your last visit</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Nothing new since your last visit.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {items.map(({ event, text }) => (
            <li key={event.seq} className="flex gap-2 break-words">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {text}
            </li>
          ))}
          {all.length > ACTIVITY_LIMIT && (
            <li className="text-[13px] text-muted">And {all.length - ACTIVITY_LIMIT} earlier</li>
          )}
        </ul>
      )}
    </section>
  )
}

/** Work on the team that someone else owns, so it never looks like the manager's job. */
function WithOthers({ persona, leader, today }: { persona: Persona; leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const items = blockedElsewhere(persona, data, today)
  if (items.length === 0) return null
  return (
    <section data-tour="with-others">
      <h2 className="mb-2.5 text-xl font-semibold">With IT or HR</h2>
      <div className="glass rounded-card p-4">
      <p className="text-[13px] text-muted">Not yours to do, but these are holding up your team.</p>
      <ul className="mt-1 divide-y divide-hairline">
        {items.map(({ hire, task, blocks }) => {
          const route: Route = { screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: task.template.id }
          return (
            <li key={`${hire.id}:${task.template.id}`} className="py-2 text-sm">
              <a
                href={hrefFor(route)}
                data-task-link={`others:${hire.id}:${task.template.id}`}
                onClick={(event) => openTask(event, route)}
                className="font-medium break-words underline decoration-control underline-offset-2 hover:text-accent-strong"
              >
                {task.template.title}
              </a>
              <span className="block text-[13px] text-muted">
                {ownerName(task.template.owner, hire)}, for {hire.name}. {statusLabel(task.status, hire)}
              </span>
              <BlocksLine hire={hire} blocks={blocks} />
            </li>
          )
        })}
      </ul>
      </div>
    </section>
  )
}

function InsightsTeaser({ leader, today }: { leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const top = taskInsights(data, today)[0]
  return (
    <section className="glass rounded-card p-4">
      <h2 className="text-lg font-semibold">Where people get stuck</h2>
      {top ? (
        <p className="mt-1 text-sm break-words">
          “{top.template.title}” comes up most often: {affectedSummary(top)}.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Not enough activity to show a pattern yet.</p>
      )}
      <a
        href={hrefFor({ screen: 'insights', leaderId: leader.id, taskId: null })}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent-strong underline underline-offset-2 hover:text-ink sm:min-h-8"
      >
        Open Insights
      </a>
    </section>
  )
}

export function TeamView({ leader, today }: { leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const persona: Persona = { kind: 'leader', leader }
  const visible = data.hires.filter((hire) => canView(persona, hire))
  const rows = rosterOrder(visible, data, today)
  const count = (kind: HealthKind) => rows.filter((row) => row.health.kind === kind).length
  const isHr = leader.kind === 'hr'

  useEffect(() => {
    if (isHr) rememberHrArea('overview')
  }, [isHr])

  return (
    <Shell
      persona={persona}
      compact
      band={
        <>
          <h1 className={BAND_H1_COMPACT}>{headline(rows.length, count('needs-attention'), count('watch'))}</h1>
          <p className="mt-1.5 text-sm text-band-soft sm:text-[15px]">
            {subline(leader, rows, count('needs-attention'), count('watch'))}
          </p>
          <HealthStrip rows={rows} />
        </>
      }
    >
      {rows.length > 0 && (
        <div className="grid items-start gap-x-6 gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <AttentionSection rows={rows} persona={persona} leader={leader} today={today} />
            {/* On phones, requests come before task lists, because someone is waiting on an answer. */}
            <div className="mb-6 empty:hidden lg:hidden">
              <HelpRequests leader={leader} persona={persona} today={today} />
            </div>
            <NextActions persona={persona} leader={leader} today={today} />
          </div>
          <div className="min-w-0 space-y-4">
            <div className="hidden empty:hidden lg:block">
              <HelpRequests leader={leader} persona={persona} today={today} />
            </div>
            {isHr ? (
              <InsightsTeaser leader={leader} today={today} />
            ) : (
              <WithOthers persona={persona} leader={leader} today={today} />
            )}
            <WhatChanged leader={leader} />
          </div>
        </div>
      )}
      {rows.length > 0 && !isHr && (
        <section className="mt-2">
          <h2 className="mb-2.5 text-xl font-semibold">Your new hires</h2>
          <Roster rows={rows} leader={leader} today={today} />
        </section>
      )}
      {rows.length > 0 && isHr && (
        <a
          href={hrefFor({ screen: 'people', leaderId: leader.id })}
          className={`${buttonSecondary} mt-2`}
        >
          See all {rows.length} new hires
        </a>
      )}
    </Shell>
  )
}

export function PeopleView({ leader, today }: { leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const persona: Persona = { kind: 'leader', leader }
  const isHr = leader.kind === 'hr'
  const rows = rosterOrder(
    data.hires.filter((hire) => canView(persona, hire)),
    data,
    today,
  )
  useEffect(() => {
    if (isHr) rememberHrArea('people')
  }, [isHr])
  return (
    <Shell
      persona={persona}
      compact
      band={
        <>
          <h1 className={BAND_H1_COMPACT}>People</h1>
          <p className="mt-1.5 text-sm text-band-soft sm:text-[15px]">
            {rows.length} {rows.length === 1 ? 'new hire' : 'new hires'}, with those who need help first.
          </p>
        </>
      }
    >
      <Roster rows={rows} leader={leader} today={today} />
    </Shell>
  )
}

type SortKey = 'need' | 'name' | 'start' | 'progress'
type DepartmentFilter = 'all' | Department
const isSortKey = (value: string): value is SortKey =>
  value === 'need' || value === 'name' || value === 'start' || value === 'progress'
const isDepartmentFilter = (value: string): value is DepartmentFilter =>
  value === 'all' || value === 'engineering' || value === 'sales'

function sortRows(rows: RosterRow[], key: SortKey): RosterRow[] {
  const copy = [...rows]
  if (key === 'name') return copy.sort((a, b) => a.hire.name.localeCompare(b.hire.name))
  if (key === 'start') return copy.sort((a, b) => b.hire.startDate.localeCompare(a.hire.startDate))
  if (key === 'progress') return copy.sort((a, b) => progress(a.plan).percent - progress(b.plan).percent)
  return copy
}

function Roster({ rows, leader, today }: { rows: RosterRow[]; leader: Leader; today: IsoDate }) {
  const { data } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [department, setDepartment] = useState<DepartmentFilter>('all')
  const [sort, setSort] = useState<SortKey>('need')
  const isHr = leader.kind === 'hr'
  const inDepartment = rows.filter((row) => department === 'all' || row.hire.department === department)
  const count = (kind: HealthKind) => inDepartment.filter((row) => row.health.kind === kind).length
  const shown = sortRows(
    filter === 'all' ? inDepartment : inDepartment.filter((row) => row.health.kind === filter),
    sort,
  )
  const route = (hire: Hire): Route => ({ screen: 'hire', leaderId: leader.id, hireId: hire.id, taskId: null })
  const clear = () => {
    setFilter('all')
    setDepartment('all')
  }
  const selectClass = 'min-h-11 rounded-control border border-control bg-surface px-2 text-sm'

  return (
    <div data-tour="roster">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
        <div
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
              className="min-h-11 shrink-0 cursor-pointer rounded-control border border-hairline bg-white/70 px-3 text-sm font-medium whitespace-nowrap transition-colors duration-100 hover:border-control aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:text-accent-strong"
            >
              {item.label}{' '}
              <span className="tabular-nums">({item.id === 'all' ? inDepartment.length : count(item.id)})</span>
            </button>
          ))}
        </div>
        {isHr && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[13px] text-muted">
              <span className="mb-0.5 block">Department</span>
              <select
                value={department}
                onChange={(event) => {
                  if (isDepartmentFilter(event.target.value)) setDepartment(event.target.value)
                }}
                className={selectClass}
              >
                <option value="all">All</option>
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
              </select>
            </label>
            <label className="text-[13px] text-muted">
              <span className="mb-0.5 block">Sort by</span>
              <select
                value={sort}
                onChange={(event) => {
                  if (isSortKey(event.target.value)) setSort(event.target.value)
                }}
                className={selectClass}
              >
                <option value="need">Who needs help</option>
                <option value="name">Name</option>
                <option value="start">Newest start date</option>
                <option value="progress">Least progress</option>
              </select>
            </label>
            <a
              data-tour="new-plan"
              href={hrefFor({ screen: 'new', leaderId: leader.id })}
              className={`${buttonPrimary} justify-center`}
            >
              Start a new plan
            </a>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="glass rounded-card px-5 py-6">
          <p className="max-w-prose text-[15px] leading-relaxed">
            {filter === 'all'
              ? 'Nobody matches this department right now.'
              : `Nobody is marked “${FILTERS.find((item) => item.id === filter)?.label}” right now.`}
          </p>
          <button type="button" onClick={clear} className={`${buttonSecondary} mt-3`}>
            Show everyone
          </button>
        </div>
      ) : (
        <>
          <div className="glass hidden overflow-hidden rounded-card md:block">
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
                  <tr key={row.hire.id} className="relative align-top transition-colors duration-100 hover:bg-white/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.hire.name} size="sm" />
                        <div className="min-w-0">
                          <a href={hrefFor(route(row.hire))} className={`font-medium break-words ${linkFocus}`}>
                            {row.hire.name}
                          </a>
                          <p className="text-[13px] text-muted">
                            {row.hire.title}
                            {isHr && `, ${DEPARTMENT_LABEL[row.hire.department]}`}
                          </p>
                        </div>
                      </div>
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
                      <p className="mt-1 text-[13px] text-muted">{healthReason(row.health, row.hire)}</p>
                      {hasNudgedToday(data, row.hire.id, today) && (
                        <p className="mt-0.5 text-[13px] font-medium text-accent-strong">Nudged today</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap tabular-nums">{nextDue(row.plan, today)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="glass divide-y divide-hairline overflow-hidden rounded-card md:hidden">
            {shown.map((row) => (
              <li key={row.hire.id} className="relative px-4 py-3">
                <div className="flex items-start gap-3">
                  <Avatar name={row.hire.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <a href={hrefFor(route(row.hire))} className={`font-medium break-words ${linkFocus}`}>
                        {row.hire.name}
                      </a>
                      <HealthChip kind={row.health.kind} />
                    </div>
                    <p className="text-[13px] break-words text-muted">
                      {healthReason(row.health, row.hire)}
                      {hasNudgedToday(data, row.hire.id, today) && '. Nudged today'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-[13px]">
                      <ProgressBar row={row} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
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
      <ul className="glass divide-y divide-hairline overflow-hidden rounded-card">
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
              className="relative px-4 py-2.5 transition-colors duration-100 hover:bg-white/60"
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
          className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent-strong underline underline-offset-2 hover:text-ink sm:min-h-8"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </>
  )
}

// Actions stay short, so the page stays easy to scan.
const MANAGER_LIMIT = 3
const HR_GROUP_LIMIT = 2

function NextActions({
  persona,
  leader,
  today,
}: {
  persona: Persona
  leader: Leader
  today: IsoDate
}) {
  const { data } = useStore()
  const items = leaderActions(persona, data, today)
  const hr = items.filter((item) => item.task.template.owner === 'hr')
  const it = items.filter((item) => item.task.template.owner === 'it')
  // Phones start with this collapsed when it is long, so people and requests come first.
  const [open, setOpen] = useState(() => window.innerWidth >= 640 || items.length <= 2)

  return (
    <section data-tour="next-actions" className="mb-2">
      <h2 className="mb-2.5 text-xl font-semibold">
        Your next actions{' '}
        {items.length > 0 && (
          <span className="text-base font-medium text-muted tabular-nums">({items.length})</span>
        )}
      </h2>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass min-h-13 w-full cursor-pointer rounded-card px-4 py-2.5 text-left text-sm"
        >
          <span className="block font-medium break-words">{items[0]?.task.template.title}</span>
          <span className="font-semibold text-accent">Show all {items.length}</span>
        </button>
      ) : items.length === 0 ? (
        <p className="glass rounded-card p-4 text-[15px] text-muted">Nothing needs you right now.</p>
      ) : leader.kind === 'hr' ? (
        <div className="grid items-start gap-x-4 gap-y-5 md:grid-cols-2">
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
    <li className="glass rounded-card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={hire.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={headingId} className="font-sans text-base font-semibold break-words">
              {hire.name}
            </h3>
            <HealthChip kind={health.kind} />
          </div>
          <p className="hidden text-[13px] break-words text-muted sm:block">{hire.title}</p>
          <p className="mt-1 text-[15px]">{healthReason(health, hire)}</p>
          <BlocksLine hire={hire} blocks={blocks} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:pl-[52px]">
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
      {sentence && <p className="mt-2 text-[13px] text-muted sm:pl-[52px]">{sentence}</p>}
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
    <section data-tour="attention" className="mb-6">
      <h2 className="mb-2.5 text-xl font-semibold">Who needs attention</h2>
      <ul className="grid gap-3">
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
    <section data-tour="help-requests">
      <h2 className="mb-2.5 text-xl font-semibold">
        Help requests <span className="text-base font-medium text-muted tabular-nums">({requests.length})</span>
      </h2>
      <ul className="glass divide-y divide-hairline overflow-hidden rounded-card">
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
              <div className="flex items-center gap-2.5">
                <Avatar name={hire.name} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium break-words">{hire.name}</p>
                  {task && <p className="text-[13px] break-words text-muted">{task.template.title}</p>}
                </div>
              </div>
              <p className="mt-1 text-[15px] break-words">{request.message}</p>
              <p className="text-[13px] text-muted">{formatShort(request.on)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label={`Mark resolved, request from ${hire.name}`}
                  onClick={() => {
                    const result = store.apply((current) => resolveHelp(current, persona, request.id, today))
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
    <section data-tour="hire-why" className="glass rounded-card px-5 py-4">
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
    <section data-tour="hire-actions" className="glass rounded-card px-5 py-4">
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
  const back: BackLink =
    leader.kind !== 'hr'
      ? { label: 'Back to your team', route: { screen: 'team', leaderId: leader.id } }
      : currentHrArea() === 'overview'
        ? { label: 'Back to Overview', route: { screen: 'team', leaderId: leader.id } }
        : currentHrArea() === 'insights'
          ? { label: 'Back to Insights', route: { screen: 'insights', leaderId: leader.id, taskId: null } }
          : { label: 'Back to People', route: { screen: 'people', leaderId: leader.id } }

  return (
    <Shell
      persona={persona}
      compact
      back={back}
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
      <BackAtEnd back={back} />
      <TaskDrawer taskId={taskId} plan={plan} hire={hire} persona={persona} parent={parent} />
    </Shell>
  )
}
