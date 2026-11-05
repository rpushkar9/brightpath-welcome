import { X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { currentHrArea, hrefFor, rememberHrArea, routeFromHash, useRoute, type Route } from '../app/route'
import { todayIso } from '../domain/dates'
import { taskInsights } from '../domain/insights'
import { leaderById } from '../domain/people'
import { rosterOrder } from '../domain/rules'
import { DEFAULT_HIRE_ID } from '../domain/seed'
import type { AppData, IsoDate, Leader } from '../domain/types'
import { useStore } from '../store/store'
import { setTourOpensOnLoad, stopTour, tourOpensOnLoad, useTourOpen } from './tourState'

type TourStep = {
  target: string
  title: string
  body: string
  /** The page this step is on. Without one, it is on the person's main screen. */
  route?: Route
}

const SWITCH_PEOPLE: TourStep = {
  target: 'view-as',
  title: 'See it as someone else',
  body: 'This is a demo, so you can switch to any new hire, manager, or HR here, and reset the sample data. Show me around replays this tour.',
}

const newHireSteps = (hireId: string): TourStep[] => [
  {
    target: 'hero',
    title: 'A new hire’s home',
    body: 'This is what a new hire sees after signing in. The people and data are samples, and nothing leaves this browser.',
  },
  {
    target: 'journey',
    title: 'See where you are',
    body: 'The marker shows where you are in your first month. The counts show what’s finished.',
  },
  {
    target: 'start-here',
    title: 'Start here',
    body: 'You see three tasks at most, even when your whole plan is longer. The first one is what to do next, and Mark complete moves the next one up.',
  },
  {
    target: 'waiting',
    title: 'Waiting on someone else',
    body: 'A task you can’t start yet names who owns it and what it’s waiting for. It never counts against you, and you can ask for help in one click.',
  },
  {
    target: 'ask',
    title: 'Ask a question',
    body: 'Answers come from your own plan, using simple rules rather than AI. If it can’t answer, you can send your question to a person.',
  },
  {
    target: 'your-people',
    title: 'Who can help',
    body: 'Your manager and HR are always here. A request stays in this app, and you can see what happened to it.',
  },
  {
    target: 'coming-up',
    title: 'What’s coming',
    body: 'Later tasks show when they open, so nothing is a surprise and nothing competes with today.',
  },
  {
    target: 'plan-phases',
    route: { screen: 'plan', hireId, taskId: null },
    title: 'Your whole plan',
    body: 'Every task, grouped by phase, with department tasks labelled. Open one to see why it matters, who owns it, and what to do.',
  },
  SWITCH_PEOPLE,
]

const finishedSteps = (hireId: string): TourStep[] => [
  {
    target: 'ask',
    title: 'Help is still here',
    body: 'Your onboarding is finished. You can still ask about your plan, or ask a person.',
  },
  {
    target: 'resources',
    title: 'Your resources',
    body: 'The sample documents from your plan stay here, so you can come back to them.',
  },
  {
    target: 'plan-phases',
    route: { screen: 'plan', hireId, taskId: null },
    title: 'Your whole plan',
    body: 'Everything you finished, grouped by phase.',
  },
  SWITCH_PEOPLE,
]

const hiresOf = (leader: Leader, data: AppData, today: IsoDate) =>
  rosterOrder(
    leader.kind === 'hr' ? data.hires : data.hires.filter((hire) => hire.managerId === leader.id),
    data,
    today,
  )

const managerSteps = (leader: Leader, data: AppData, today: IsoDate): TourStep[] => {
  const first = hiresOf(leader, data, today)[0]?.hire
  const hireRoute: Route | undefined = first && {
    screen: 'hire',
    leaderId: leader.id,
    hireId: first.id,
    taskId: null,
  }
  return [
    {
      target: 'hero',
      title: 'Your team at a glance',
      body: 'The headline says how many people need you. The bar counts everyone by status, using rules anyone can check.',
    },
    {
      target: 'attention',
      title: 'Who needs your help',
      body: 'Each card says who, why, and what to do next. If IT is the holdup, the app won’t suggest nudging the new hire.',
    },
    {
      target: 'next-actions',
      title: 'What’s yours to do',
      body: 'Only you can complete these tasks. Each one opens the real task.',
    },
    {
      target: 'with-others',
      title: 'What’s with someone else',
      body: 'IT or HR own these, so you can see what’s holding up your team without chasing it.',
    },
    {
      target: 'what-changed',
      title: 'What changed',
      body: 'Completions, requests, and nudges since your last visit, from a real activity log. Your own actions are left out.',
    },
    {
      target: 'side-hires',
      title: 'Jump to anyone',
      body: 'Your new hires stay in reach on every page, with whoever needs you most at the top.',
    },
    {
      target: 'roster',
      title: 'Your whole team',
      body: 'You see your own team only. Filter by status, or open anyone’s plan.',
    },
    ...(hireRoute
      ? [
          {
            target: 'hire-why',
            route: hireRoute,
            title: 'Why someone is flagged',
            body: 'One person’s page lists each late task, how late it is, and whose work it is. Each task opens from here.',
          },
          {
            target: 'hire-actions',
            route: hireRoute,
            title: 'What you can do',
            body: 'A nudge appears in the new hire’s workspace, and no email is sent. The app only offers what would help.',
          },
        ]
      : []),
    SWITCH_PEOPLE,
  ]
}

const hrSteps = (leader: Leader, data: AppData, today: IsoDate): TourStep[] => {
  const leaderId = leader.id
  const people: Route = { screen: 'people', leaderId }
  const insights: Route = { screen: 'insights', leaderId, taskId: null }
  const top = taskInsights(data, today)[0]?.template.id
  return [
    {
      target: 'hero',
      title: 'Onboarding at a glance',
      body: 'The headline says how many people need you. The bar counts every new hire by status, across all teams.',
    },
    {
      target: 'attention',
      title: 'Who needs your help',
      body: 'Each card says who, why, and what to do next. If IT is the holdup, the app won’t suggest nudging the new hire.',
    },
    {
      target: 'help-requests',
      title: 'Questions from new hires',
      body: 'IT and HR questions come to you. Marking one resolved updates the new hire’s screen.',
    },
    {
      target: 'next-actions',
      title: 'What’s yours to do',
      body: 'HR tasks and IT tasks are kept apart, because HR stands in for IT in this prototype.',
    },
    {
      target: 'what-changed',
      title: 'What changed',
      body: 'Completions, requests, and nudges since your last visit, from a real activity log. Your own actions are left out.',
    },
    {
      target: 'side-hires',
      title: 'Jump to anyone',
      body: 'New hires stay in reach on every page, with whoever needs you most at the top.',
    },
    {
      target: 'roster',
      route: people,
      title: 'Everyone in one place',
      body: 'Every new hire, with filters by status and department, and sorting.',
    },
    {
      target: 'new-plan',
      route: people,
      title: 'Start a new plan',
      body: 'Enter a person, a department, and a start date. The plan and its due dates come from the task templates.',
    },
    {
      target: 'insights-list',
      route: insights,
      title: 'Where people get stuck',
      body: 'Fixing one person’s problem doesn’t fix the process. This shows which tasks trip up more than one hire.',
    },
    {
      target: 'insights-summary',
      route: insights,
      title: 'What it can and can’t claim',
      body: 'Each hire counts once per task. The screen shows the sample size, and nothing here is a trend.',
    },
    {
      target: 'insights-queue',
      route: insights,
      title: 'Improvement queue',
      body: 'Proposals wait here as Proposed, Under review, or Addressed, so a good idea doesn’t get lost.',
    },
    ...(top
      ? [
          {
            target: 'insight-suggestion',
            route: { screen: 'insights', leaderId, taskId: top } satisfies Route,
            title: 'Propose a change',
            body: 'Each task has a suggestion from simple rules, labelled as one. A proposal never changes a live plan or a legal requirement.',
          },
        ]
      : []),
    SWITCH_PEOPLE,
  ]
}

type TourPlan = { steps: TourStep[]; finished: TourStep[] | null; main: Route }

const hireTour = (hireId: string): TourPlan => ({
  steps: newHireSteps(hireId),
  finished: finishedSteps(hireId),
  main: { screen: 'home', hireId, taskId: null },
})

/** The tour belongs to the person being viewed, and starts on their main screen. */
function tourFor(hash: string, data: AppData, today: IsoDate): TourPlan {
  const route = routeFromHash(hash)
  if (route.screen === 'home' || route.screen === 'plan') return hireTour(route.hireId)
  if (
    route.screen === 'team' ||
    route.screen === 'people' ||
    route.screen === 'insights' ||
    route.screen === 'hire' ||
    route.screen === 'new'
  ) {
    const leader = leaderById(route.leaderId)
    if (leader) {
      return {
        steps: leader.kind === 'hr' ? hrSteps(leader, data, today) : managerSteps(leader, data, today),
        finished: null,
        main: { screen: 'team', leaderId: leader.id },
      }
    }
  }
  return hireTour(DEFAULT_HIRE_ID)
}

type Box = { top: number; left: number; width: number; height: number }

const CARD_WIDTH = 340
const CARD_HEIGHT = 350
const GAP = 14
const PAD = 6

// Navigation exists twice, for wide screens and phones, so this finds the one on screen.
const findTarget = (name: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find(
    (element) => element.getClientRects().length > 0,
  ) ?? null

const measure = (element: HTMLElement): Box => {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  }
}

/** Below the target, then above, then beside it, so the card does not cover what it describes. */
function cardPosition(box: Box | null): React.CSSProperties {
  const { innerWidth, innerHeight } = window
  if (innerWidth < 640) {
    // The card moves to the top when its target is low, such as the tab bar.
    return box && box.top > innerHeight / 2
      ? { left: 12, right: 12, top: 12 }
      : { left: 12, right: 12, bottom: 12 }
  }
  const width = CARD_WIDTH
  if (!box) return { left: `calc(50% - ${width / 2}px)`, bottom: 24, width }

  const left = Math.max(12, Math.min(box.left, innerWidth - width - 12))
  const below = box.top + box.height + GAP
  if (below + CARD_HEIGHT < innerHeight) return { left, top: below, width }
  if (box.top - GAP - CARD_HEIGHT > 0) return { left, bottom: innerHeight - box.top + GAP, width }

  const top = Math.max(12, Math.min(box.top, innerHeight - CARD_HEIGHT - 12))
  const right = box.left + box.width + GAP
  if (right + width + 12 < innerWidth) return { left: right, top, width }
  const before = box.left - GAP - width
  if (before > 12) return { left: before, top, width }
  // A target this big gets covered somewhere. The right side usually holds counts, not names.
  return { right: 24, bottom: 24, width }
}

function TourPanel() {
  const { data } = useStore()
  const current = useRoute()
  const [plan] = useState(() => tourFor(window.location.hash, data, todayIso()))
  const [steps, setSteps] = useState<TourStep[] | null>(null)
  const [index, setIndex] = useState(0)
  // The step on screen. It changes only once its page and target are ready.
  const [step, setStep] = useState<TourStep | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [autoOpen, setAutoOpen] = useState(tourOpensOnLoad)
  const startHash = useRef(window.location.hash)
  const startArea = useRef(currentHrArea())
  const nextRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const shownIndex = steps && step ? steps.indexOf(step) : 0
  const isLast = steps !== null && shownIndex === steps.length - 1

  // `current` changes in the same render as the page, so the page here is never the old one.
  useEffect(() => {
    const page = steps ? (steps[index]?.route ?? plan.main) : plan.main
    const href = hrefFor(page)
    if (window.location.hash !== href) {
      window.location.replace(href)
      return
    }
    if (!steps) {
      // Someone who has finished has no next step, so a shorter tour applies.
      const isFinished = plan.finished && !findTarget('start-here') && !findTarget('nothing-today')
      const all = isFinished && plan.finished ? plan.finished : plan.steps
      // Later pages are checked on arrival, because they aren't on screen yet.
      setSteps(all.filter((item) => item.route || findTarget(item.target)))
      return
    }
    const wanted = steps[index]
    if (!wanted) return
    if (findTarget(wanted.target)) {
      setStep(wanted)
    } else {
      const rest = steps.filter((item) => item !== wanted)
      setSteps(rest)
      setIndex(Math.min(index, rest.length - 1))
    }
  }, [plan, steps, index, current])

  useEffect(() => {
    if (!step) return
    let target: HTMLElement | null = findTarget(step.target)
    const update = () => {
      target = target?.isConnected ? target : findTarget(step.target)
      setBox(target ? measure(target) : null)
    }
    // The sidebar never scrolls away, so moving the page would only hide things.
    // On a phone the card covers the lower half, so the target goes to the top.
    if (!target?.closest('aside')) {
      target?.scrollIntoView({ block: window.innerWidth < 640 ? 'start' : 'center' })
    }
    update()
    nextRef.current?.focus()

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    // Fonts and new content can shift the page without a resize or scroll event.
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step])

  const close = () => {
    stopTour()
    rememberHrArea(startArea.current)
    if (window.location.hash !== startHash.current) window.location.replace(startHash.current || '#/')
    window.scrollTo(0, 0)
    window.setTimeout(() => document.querySelector<HTMLElement>('main')?.focus(), 50)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    // Keeps keyboard focus inside the card while the page behind it is blocked.
    const items = cardRef.current?.querySelectorAll<HTMLElement>('button, input')
    const first = items?.[0]
    const last = items?.[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  // Escape works wherever focus is, even after clicking the card's text.
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  if (!steps || !step) return <div aria-hidden className="fixed inset-0 z-[80]" />

  return (
    <div onKeyDown={onKeyDown}>
      {/* A click outside closes the tour without reaching the page, so it never gets in the way. */}
      <div aria-hidden onClick={close} className="fixed inset-0 z-[80]" />
      {box ? (
        <div
          aria-hidden
          data-tour-spotlight
          className="pointer-events-none fixed z-[81] rounded-panel ring-2 ring-path-marker transition-all duration-300"
          style={{ ...box, boxShadow: '0 0 0 9999px rgb(28 35 33 / 0.5)' }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[81] bg-ink/50" />
      )}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed z-[82] rounded-[12px] bg-surface p-4 shadow-2xl"
        style={cardPosition(box)}
      >
        <button
          type="button"
          aria-label="Close tour"
          onClick={close}
          className="absolute top-1.5 right-1.5 grid size-11 cursor-pointer place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
        <p className="text-[13px] text-muted tabular-nums" aria-live="polite">
          Step {shownIndex + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 pr-8 text-xl leading-tight font-semibold">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-[15px] leading-relaxed">
          {step.body}
        </p>
        <div className="mt-3.5 flex flex-wrap justify-end gap-2">
          {!isLast && (
            <button
              type="button"
              onClick={close}
              className="mr-auto min-h-11 cursor-pointer rounded-control px-2 text-sm font-medium text-muted hover:text-ink"
            >
              Skip tour
            </button>
          )}
          {shownIndex > 0 && (
            <button
              type="button"
              onClick={() => setIndex(shownIndex - 1)}
              className="min-h-11 cursor-pointer rounded-control border border-control px-4 font-medium hover:bg-canvas"
            >
              Back
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (isLast ? close() : setIndex(shownIndex + 1))}
            className="min-h-11 cursor-pointer rounded-control bg-accent px-4 font-semibold text-white hover:bg-accent-strong"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
        <label className="mt-2 flex min-h-8 cursor-pointer items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={autoOpen}
            onChange={(event) => {
              setAutoOpen(event.target.checked)
              setTourOpensOnLoad(event.target.checked)
            }}
            className="size-4 cursor-pointer accent-accent"
          />
          Open this tour on every reload
        </label>
      </div>
    </div>
  )
}

export function Tour() {
  return useTourOpen() ? <TourPanel /> : null
}
