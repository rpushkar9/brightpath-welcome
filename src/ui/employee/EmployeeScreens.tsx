import { ArrowLeft, Check, CircleCheck, X } from 'lucide-react'
import type { Route } from '../../app/route'
import { hrefFor } from '../../app/route'
import { businessDaysBetween, formatLong, formatShort } from '../../domain/dates'
import { DEPARTMENT_LABEL, firstName, leaderById } from '../../domain/people'
import { buildPlan, nextSteps, ownProgress, progress, stageOf, timeLeft, timeLeftText } from '../../domain/plan'
import { dismissNudge, ownerName } from '../../domain/rules'
import type { Hire, IsoDate, Persona, PlanTask, Stage } from '../../domain/types'
import { store, useStore } from '../../store/store'
import { PlanPhases } from '../PlanPhases'
import { BAND_H1, BAND_H1_COMPACT, Shell } from '../Shell'
import { NeedHelp } from '../NeedHelp'
import { TaskDrawer } from '../TaskDrawer'
import { TaskRow, openTask } from '../TaskRow'
import { useFinish } from '../actions'
import { CONFIRMATION_NOTE, STATUS_TONE, ScopeTag, statusLabel } from '../status'
import { AskPanel, YourRequests } from './AskPanel'
import { CompactProgress, PhasePath, STAGE_LABEL } from './PhasePath'

function headline(hire: Hire, stage: Stage, isComplete: boolean, today: IsoDate): string {
  const name = firstName(hire.name)
  if (isComplete) return `You’ve finished onboarding, ${name}.`
  switch (stage) {
    case 'before':
      return `${name}, you start on ${formatShort(hire.startDate).replace(',', '')}.`
    case 'first-day':
      return `Welcome to your first day, ${name}.`
    case 'first-week':
    case 'weeks-2-4':
    case 'past':
      return `Day ${businessDaysBetween(hire.startDate, today) + 1}. Here’s your focus, ${name}.`
    default: {
      const exhaustive: never = stage
      return exhaustive
    }
  }
}

/** A short, human line. It never blames anyone for late work. */
function encouragement(plan: PlanTask[], stage: Stage, hire: Hire): string {
  const manager = leaderById(hire.managerId)?.name ?? 'your manager'
  const own = plan.filter((task) => task.template.owner === 'employee')
  if (own.some((task) => task.status.kind === 'overdue')) {
    return 'A few things slipped, which is normal. Start with the first one below.'
  }
  switch (stage) {
    case 'before':
      return 'A few things to finish now, so your first day is easy.'
    case 'first-day':
      return `Take it one step at a time. ${manager} is your manager, and help is one click away.`
    case 'first-week':
      return 'You’re settling in. Here’s what matters most right now.'
    case 'weeks-2-4':
    case 'past':
      return 'You’re past the busiest part. Here’s what’s left.'
    default: {
      const exhaustive: never = stage
      return exhaustive
    }
  }
}

function startText(hire: Hire, today: IsoDate): string {
  if (hire.startDate === today) return 'Started today'
  return `${hire.startDate > today ? 'Starts' : 'Started'} ${formatShort(hire.startDate)}`
}

/** Plain counts: what is theirs, and the whole plan that managers also see. */
const countsText = (plan: PlanTask[]): string => {
  const own = ownProgress(plan)
  const whole = progress(plan)
  return `Your tasks: ${own.done} of ${own.total} done. Whole plan: ${whole.done} of ${whole.total}.`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function FocusStep({
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
  const { finishing, finish } = useFinish(persona, hire.id, task)
  return (
    <li className="grid gap-x-6 gap-y-3 p-4 sm:p-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0">
      <p className="inline-flex rounded-control bg-soon-tint px-2 py-0.5 text-xs font-semibold text-soon">
        Start here
      </p>
      <h3 className="mt-2 text-2xl leading-tight font-semibold break-words">
        {task.template.title}
      </h3>
      <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted">
        {task.template.why}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span
          className={`${STATUS_TONE[task.status.kind]} ${task.status.kind === 'overdue' ? 'font-medium' : ''}`}
        >
          {statusLabel(task.status, hire)}
        </span>
        {task.template.minutes !== null && (
          <span className="text-muted">About {task.template.minutes} min</span>
        )}
        <ScopeTag task={task} />
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={finish}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-4 font-semibold text-white transition-colors duration-100 active:translate-y-px ${finishing ? 'bg-done' : 'bg-accent hover:bg-accent-strong'}`}
        >
          {finishing ? (
            <>
              <Check size={18} strokeWidth={3} aria-hidden className="check-in" />
              Done
            </>
          ) : (
            'Mark complete'
          )}
        </button>
        <a
          href={hrefFor(route)}
          data-task-link={task.template.id}
          onClick={(event) => openTask(event, route)}
          className="inline-flex min-h-11 items-center rounded-control border border-control px-4 font-medium transition-colors duration-100 hover:bg-canvas"
        >
          Task details
        </a>
        <NeedHelp hire={hire} persona={persona} task={task} />
      </div>
      </div>
      <div className="hidden rounded-control bg-canvas p-3.5 md:block">
        <h4 className="font-sans text-[13px] font-semibold text-muted">What to do</h4>
        <ol className="mt-2 space-y-2 text-sm leading-snug">
          {task.template.steps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-accent-strong tabular-nums ring-1 ring-hairline"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </li>
  )
}

function NextSteps({ plan, hire, persona }: { plan: PlanTask[]; hire: Hire; persona: Persona }) {
  const { shown, moreCount } = nextSteps(plan)
  const taskRoute = (taskId: string): Route => ({ screen: 'home', hireId: hire.id, taskId })
  const planRoute: Route = { screen: 'plan', hireId: hire.id, taskId: null }
  const [first, ...rest] = shown
  const planLink = (
    <a
      href={hrefFor(planRoute)}
      className="inline-flex min-h-6 items-center font-semibold text-accent underline underline-offset-2 hover:text-accent-strong"
    >
      See the full plan ({plan.length} tasks)
    </a>
  )

  if (!first) {
    const nextOpening = plan
      .filter((task) => task.template.owner === 'employee' && task.status.kind === 'upcoming')
      .sort((a, b) => a.opensOn.localeCompare(b.opensOn))[0]
    return (
      <>
        <div className="rounded-panel border border-hairline bg-surface px-5 py-6">
          <h3 className="text-[22px] font-semibold">Nothing needs you today</h3>
          <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted">
            {nextOpening
              ? `Your next task, “${nextOpening.template.title}”, opens on ${formatLong(nextOpening.opensOn)}.`
              : 'Anything still open is with someone else, and you’ll see it here when it’s ready for you.'}
          </p>
        </div>
        <p data-tour="full-plan" className="mt-3 text-sm text-muted">{planLink}</p>
      </>
    )
  }

  const estimate = timeLeftText(timeLeft(plan))

  return (
    <>
      {estimate && <p className="-mt-1 mb-2.5 text-sm text-muted">{estimate}</p>}
      <ul
        data-tour="start-here"
        className="divide-y divide-hairline overflow-hidden rounded-[12px] bg-surface shadow-card ring-1 ring-hairline"
      >
        <FocusStep key={first.template.id} task={first} hire={hire} persona={persona} route={taskRoute(first.template.id)} />
        {rest.map((task) => (
          <TaskRow
            key={task.template.id}
            task={task}
            hire={hire}
            persona={persona}
            route={taskRoute(task.template.id)}
          />
        ))}
      </ul>
      <p data-tour="full-plan" className="mt-3 text-sm text-muted">
        {moreCount > 0 && <>{moreCount} more open in your plan. </>}
        {planLink}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">{CONFIRMATION_NOTE}</p>
    </>
  )
}

function SideList({
  items,
}: {
  items: {
    key: string
    primary: string
    secondary: string
    route: Route
    tone: string
    extra?: React.ReactNode
  }[]
}) {
  return (
    <ul className="divide-y divide-hairline rounded-panel border border-hairline bg-surface">
      {items.map((item) => (
        <li key={item.key} className="relative px-4 py-3 transition-colors duration-100 hover:bg-canvas">
          <a
            href={hrefFor(item.route)}
            data-task-link={item.key}
            onClick={(event) => openTask(event, item.route)}
            className="text-sm font-medium break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-control focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent"
          >
            {item.primary}
          </a>
          <p className={`mt-0.5 text-[13px] ${item.tone}`}>{item.secondary}</p>
          {item.extra && <div className="-ml-2 mt-1">{item.extra}</div>}
        </li>
      ))}
    </ul>
  )
}

function Waiting({ plan, hire, persona }: { plan: PlanTask[]; hire: Hire; persona: Persona }) {
  const waiting = plan.filter(
    (task) => task.template.owner === 'employee' && task.status.kind === 'waiting',
  )
  if (waiting.length === 0) return null
  return (
    <div data-tour="waiting">
    <Section title="Waiting on someone else">
      <SideList
        items={waiting.map((task) => ({
          key: task.template.id,
          primary: task.template.title,
          secondary:
            task.status.kind === 'waiting'
              ? `Waiting for ${ownerName(task.status.onOwner, hire)} to finish “${task.status.onTitle}”. Nothing for you to do yet.`
              : '',
          route: { screen: 'home', hireId: hire.id, taskId: task.template.id },
          tone: 'text-muted',
          extra: <NeedHelp hire={hire} persona={persona} task={task} label="Ask for help" />,
        }))}
      />
    </Section>
    </div>
  )
}

function ComingUp({ plan, hire }: { plan: PlanTask[]; hire: Hire }) {
  const upcoming = plan
    .filter((task) => task.template.owner === 'employee' && task.status.kind === 'upcoming')
    .sort((a, b) => a.opensOn.localeCompare(b.opensOn))
    .slice(0, 2)
  const checkIn = plan.find(
    (task) => task.template.id === 'c-30-day' && task.status.kind !== 'completed',
  )
  const items = checkIn ? [...upcoming, checkIn] : upcoming
  if (items.length === 0) return null
  return (
    <Section title="Coming up">
      <SideList
        items={items.map((task) => ({
          key: task.template.id,
          primary: task.template.id === 'c-30-day' ? '30-day check-in' : task.template.title,
          secondary:
            task.template.id === 'c-30-day'
              ? `Milestone, ${formatShort(task.dueOn)}`
              : statusLabel(task.status, hire),
          route: { screen: 'home', hireId: hire.id, taskId: task.template.id },
          tone: 'text-muted',
        }))}
      />
    </Section>
  )
}

function NudgeNote({ hire, plan, persona }: { hire: Hire; plan: PlanTask[]; persona: Persona }) {
  const { data } = useStore()
  const nudge = data.nudges.find((item) => {
    const task = plan.find((planTask) => planTask.template.id === item.taskId)
    return item.hireId === hire.id && !item.dismissed && task?.status.kind !== 'completed'
  })
  const task = nudge && plan.find((item) => item.template.id === nudge.taskId)
  if (!nudge || !task) return null
  const route: Route = { screen: 'home', hireId: hire.id, taskId: task.template.id }
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-panel border border-soon-tint bg-soon-tint px-4 py-3 text-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="leading-relaxed">
          <span className="font-semibold">{firstName(nudge.fromName)} checked in</span> about “
          {task.template.title}”. If something is in your way, let them know.
        </p>
        <div className="mt-1 -ml-2 flex flex-wrap items-center gap-1">
          <a
            href={hrefFor(route)}
            data-task-link={`nudge:${task.template.id}`}
            onClick={(event) => openTask(event, route)}
            className="inline-flex min-h-11 items-center rounded-control px-2 font-semibold text-accent-strong underline underline-offset-2 hover:bg-white/60"
          >
            View task
          </a>
          <NeedHelp hire={hire} persona={persona} task={task} />
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss this note"
        onClick={() => store.update((current) => dismissNudge(current, hire.id))}
        className="-m-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/60"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}

export function EmployeeHome({
  hire,
  persona,
  taskId,
  today,
}: {
  hire: Hire
  persona: Persona
  taskId: string | null
  today: IsoDate
}) {
  const { data } = useStore()
  const plan = buildPlan(hire, data, today)
  const stage = stageOf(hire, today)
  const { done, total } = progress(plan)
  const own = ownProgress(plan)
  const isComplete = done === total

  return (
    <Shell
      persona={persona}
      band={
        <>
          <h1 className={BAND_H1}>{headline(hire, stage, isComplete, today)}</h1>
          {!isComplete && (
            <p className="mt-2.5 hidden max-w-[56ch] text-[17px] leading-snug text-white sm:block">
              {encouragement(plan, stage, hire)}
            </p>
          )}
          <p className="mt-2 text-sm text-band-soft sm:text-[15px]">
            {isComplete ? (
              `All ${total} tasks are done. Your manager can see this too.`
            ) : (
              <>
                {hire.title}, {DEPARTMENT_LABEL[hire.department]}. {startText(hire, today)}.{' '}
                <span className="hidden sm:inline">{countsText(plan)}</span>
              </>
            )}
          </p>
          <div data-tour="journey" className="mt-3 sm:mt-6">
            <CompactProgress
              stageLabel={STAGE_LABEL[stage]}
              countLabel="Your tasks"
              done={own.done}
              total={own.total}
              percent={own.percent}
              note={`Whole plan: ${done} of ${total}`}
            />
            <PhasePath plan={plan} stage={stage} />
          </div>
        </>
      }
    >
      <NudgeNote hire={hire} plan={plan} persona={persona} />
      {isComplete ? (
        <div className="max-w-2xl rounded-panel border border-hairline bg-surface px-5 py-6">
          <CircleCheck size={28} aria-hidden className="text-done" />
          <h2 className="mt-3 text-[22px] font-semibold">There’s nothing left on your plan</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
            You can look back through everything you completed, and undo anything marked by mistake.
          </p>
          <a
            data-tour="full-plan"
            href={hrefFor({ screen: 'plan', hireId: hire.id, taskId: null })}
            className="mt-4 inline-flex min-h-11 items-center rounded-control border border-control px-4 font-medium transition-colors duration-100 hover:bg-canvas"
          >
            See the full plan
          </a>
          <div className="mt-6 space-y-6">
            <AskPanel hire={hire} persona={persona} />
            <YourRequests hire={hire} />
          </div>
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Section title="Your next steps">
            <NextSteps plan={plan} hire={hire} persona={persona} />
          </Section>
          <div className="space-y-7">
            <Waiting plan={plan} hire={hire} persona={persona} />
            <AskPanel hire={hire} persona={persona} />
            <YourRequests hire={hire} />
            <ComingUp plan={plan} hire={hire} />
          </div>
        </div>
      )}
      <TaskDrawer
        taskId={taskId}
        plan={plan}
        hire={hire}
        persona={persona}
        parent={{ screen: 'home', hireId: hire.id, taskId: null }}
      />
    </Shell>
  )
}

export function EmployeePlan({
  hire,
  persona,
  taskId,
  today,
}: {
  hire: Hire
  persona: Persona
  taskId: string | null
  today: IsoDate
}) {
  const { data } = useStore()
  const plan = buildPlan(hire, data, today)
  const stage = stageOf(hire, today)
  const { total } = progress(plan)
  const company = plan.filter((task) => task.template.scope === 'company').length
  const parent: Route = { screen: 'plan', hireId: hire.id, taskId: null }

  return (
    <Shell
      persona={persona}
      compact
      band={
        <>
          <a
            href={hrefFor({ screen: 'home', hireId: hire.id, taskId: null })}
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 text-sm text-band-soft hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden />
            Back to my next steps
          </a>
          <h1 className={BAND_H1_COMPACT}>Your full plan</h1>
          <p className="mt-1.5 text-sm text-band-soft sm:text-[15px]">
            {countsText(plan)} {company} company tasks and {total - company} for your team.
          </p>
        </>
      }
    >
      <PlanPhases
        plan={plan}
        hire={hire}
        persona={persona}
        stage={stage}
        taskRoute={(id) => ({ screen: 'plan', hireId: hire.id, taskId: id })}
      />
      <TaskDrawer taskId={taskId} plan={plan} hire={hire} persona={persona} parent={parent} />
    </Shell>
  )
}

