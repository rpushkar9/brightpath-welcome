import { X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { hrefFor, routeFromHash, type Route } from '../app/route'
import { leaderById } from '../domain/people'
import { DEFAULT_HIRE_ID } from '../domain/seed'
import { stopTour, useTourOpen } from './tourState'

type TourStep = {
  target: string
  title: string
  body: string
  tryIt?: string
}

const SWITCH_VIEW: TourStep = {
  target: 'view-as',
  title: 'See the other views',
  body: 'This is a demo, so you can switch to anyone here. Each person gets their own short tour the first time. You can also replay this one or reset the sample data.',
}

const NEW_HIRE_STEPS: readonly TourStep[] = [
  {
    target: 'journey',
    title: 'See where you are',
    body: 'The marker shows where you are in your first month. The counts show what’s finished.',
  },
  {
    target: 'start-here',
    title: 'Start here',
    body: 'You see three tasks at most, even when your whole plan is longer. The first one explains why it matters and what to do.',
    tryIt: 'After this tour, click Mark complete, then Undo.',
  },
  {
    target: 'waiting',
    title: 'Waiting isn’t late',
    body: 'When a task depends on someone else, this says who. You have nothing to chase, and one click asks the person who can help.',
  },
  {
    target: 'ask',
    title: 'Ask a question',
    body: 'Answers come from your own plan using simple rules, not AI. If there’s no answer, it offers a person instead of guessing.',
    tryIt: 'After this tour, click “What should I do next?”',
  },
  {
    target: 'full-plan',
    title: 'Everything is one click away',
    body: 'Your full plan is here whenever you want it, grouped by phase.',
  },
  SWITCH_VIEW,
]

const MANAGER_STEPS: readonly TourStep[] = [
  {
    target: 'attention',
    title: 'Who needs your help',
    body: 'Each card says who, why, and what to do next. If someone else owns the late work, it says so.',
  },
  {
    target: 'next-actions',
    title: 'What’s yours to do',
    body: 'These are the tasks only you can complete. Each one opens the real task.',
  },
  {
    target: 'help-requests',
    title: 'Questions from new hires',
    body: 'New hires’ requests arrive here. Marking one resolved updates their screen.',
  },
  {
    target: 'roster',
    title: 'Everyone at a glance',
    body: 'People who need help come first. Use these filters to narrow the list, and open anyone’s plan from it.',
  },
  SWITCH_VIEW,
]

const HR_STEPS: readonly TourStep[] = [
  {
    target: 'attention',
    title: 'Who needs your help',
    body: 'You see new hires across every team. Each card says who, why, and what to do next.',
  },
  {
    target: 'next-actions',
    title: 'What’s yours to do',
    body: 'HR tasks and IT tasks stay separate. You stand in for IT in this prototype, and a task shows who it’s blocking.',
  },
  {
    target: 'help-requests',
    title: 'Questions from new hires',
    body: 'IT and HR questions come to you. Marking one resolved updates the new hire’s screen.',
  },
  {
    target: 'new-plan',
    title: 'Start a plan',
    body: 'Choose a department, and the plan comes from company and department tasks.',
  },
  SWITCH_VIEW,
]

/** The tour belongs to the person being viewed, and runs on their main screen. */
function tourFor(hash: string): { steps: readonly TourStep[]; main: Route } {
  const route = routeFromHash(hash)
  if (route.screen === 'home' || route.screen === 'plan') {
    return { steps: NEW_HIRE_STEPS, main: { screen: 'home', hireId: route.hireId, taskId: null } }
  }
  if (route.screen === 'team' || route.screen === 'hire' || route.screen === 'new') {
    const leader = leaderById(route.leaderId)
    if (leader) {
      return {
        steps: leader.kind === 'hr' ? HR_STEPS : MANAGER_STEPS,
        main: { screen: 'team', leaderId: leader.id },
      }
    }
  }
  return { steps: NEW_HIRE_STEPS, main: { screen: 'home', hireId: DEFAULT_HIRE_ID, taskId: null } }
}

type Box = { top: number; left: number; width: number; height: number }

const CARD_WIDTH = 340
const CARD_HEIGHT = 310
const GAP = 14
const PAD = 6

const findTarget = (name: string): HTMLElement | null => {
  const element = document.querySelector<HTMLElement>(`[data-tour="${name}"]`)
  return element && element.getClientRects().length > 0 ? element : null
}

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
  if (innerWidth < 640) return { left: 12, right: 12, bottom: 12 }
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
  return { left, bottom: 24, width }
}

function TourPanel() {
  const [plan] = useState(() => tourFor(window.location.hash))
  const [steps, setSteps] = useState<readonly TourStep[] | null>(null)
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const startHash = useRef(window.location.hash)
  const nextRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = steps?.[index]
  const isLast = steps !== null && index === steps.length - 1

  // Moves to the person's main screen, then keeps only the steps that exist there.
  useEffect(() => {
    const href = hrefFor(plan.main)
    if (window.location.hash !== href) window.location.replace(href)
    let cancelled = false
    const started = Date.now()
    const check = () => {
      if (cancelled) return
      const ready = plan.steps.some((item) => item.target !== SWITCH_VIEW.target && findTarget(item.target))
      if (ready || Date.now() - started > 800) {
        setSteps(plan.steps.filter((item) => findTarget(item.target)))
      } else {
        window.setTimeout(check, 40)
      }
    }
    // Lets a route change render first, so the old page is never measured.
    const timer = window.setTimeout(check, 60)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [plan])

  useEffect(() => {
    if (!step) return
    let target: HTMLElement | null = findTarget(step.target)
    const update = () => {
      target = target?.isConnected ? target : findTarget(step.target)
      setBox(target ? measure(target) : null)
    }
    // On a phone the card covers the lower half, so the target goes to the top.
    target?.scrollIntoView({ block: window.innerWidth < 640 ? 'start' : 'center' })
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
    if (window.location.hash !== startHash.current) window.location.replace(startHash.current || '#/')
    window.setTimeout(() => document.querySelector<HTMLElement>('main')?.focus(), 50)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    // Keeps keyboard focus inside the card while the page behind it is blocked.
    const items = cardRef.current?.querySelectorAll<HTMLElement>('button')
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

  if (!steps || !step) return <div aria-hidden className="fixed inset-0 z-[80]" />

  return (
    <div onKeyDown={onKeyDown}>
      {/* Blocks clicks on the page, so the tour cannot change any data. */}
      <div aria-hidden className="fixed inset-0 z-[80]" />
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
          Step {index + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 pr-8 text-xl leading-tight font-semibold">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-[15px] leading-relaxed">
          {step.body}
        </p>
        {step.tryIt && (
          <p className="mt-2.5 rounded-control bg-accent-tint px-2.5 py-1.5 text-sm text-accent-strong">
            <span className="font-semibold">Try it: </span>
            {step.tryIt}
          </p>
        )}
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
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="min-h-11 cursor-pointer rounded-control border border-control px-4 font-medium hover:bg-canvas"
            >
              Back
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (isLast ? close() : setIndex(index + 1))}
            className="min-h-11 cursor-pointer rounded-control bg-accent px-4 font-semibold text-white hover:bg-accent-strong"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Tour() {
  return useTourOpen() ? <TourPanel /> : null
}
