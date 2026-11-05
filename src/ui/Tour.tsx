import { X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { hrefFor, type Route } from '../app/route'
import { stopTour, useTourOpen } from './tourState'

type TourStep = {
  route: Route
  /** The first of these found on screen gets the spotlight. */
  targets: readonly string[]
  title: string
  body: string
  tryIt?: string
}

const EMILY: Route = { screen: 'home', hireId: 'emily-carter', taskId: null }

const STEPS: readonly TourStep[] = [
  {
    route: EMILY,
    targets: ['journey'],
    title: 'See where you are',
    body: 'This is Emily, a new hire on day one. The marker shows where Emily is in time, and the counts show what’s finished.',
  },
  {
    route: EMILY,
    targets: ['start-here'],
    title: 'Three tasks, not 18',
    body: 'Emily’s plan has 18 tasks, but this screen shows three at most. The first one explains why it matters and what to do.',
    tryIt: 'After the tour, click Mark complete, then Undo.',
  },
  {
    route: EMILY,
    targets: ['waiting', 'start-here'],
    title: 'Waiting isn’t late',
    body: 'When a task depends on someone else, the app says who. One click prepares a request to the person who can act.',
  },
  {
    route: EMILY,
    targets: ['ask'],
    title: 'Ask a question',
    body: 'Answers come from Emily’s real plan using simple rules, not AI. If there’s no answer, it offers a person instead of guessing.',
    tryIt: 'Ask “Who can help me with repository access?”',
  },
  {
    route: { screen: 'team', leaderId: 'david' },
    targets: ['attention', 'next-actions'],
    title: 'What a manager sees',
    body: 'David gets who needs help, why, and what to do next, using the same data Emily sees.',
  },
  {
    route: { screen: 'team', leaderId: 'sarah' },
    targets: ['help-requests', 'next-actions'],
    title: 'Requests reach the right person',
    body: 'Sarah in HR sees everyone. Help requests arrive here, and resolving one updates the new hire’s screen.',
  },
  {
    route: { screen: 'team', leaderId: 'sarah' },
    targets: ['view-as'],
    title: 'See it from any side',
    body: 'Switch people here, or reset the sample data at any time. This tour didn’t change anything.',
  },
]

type Box = { top: number; left: number; width: number; height: number }

const CARD_WIDTH = 340
const CARD_HEIGHT = 310
const GAP = 14
const PAD = 6

function findTarget(step: TourStep, allowFallback: boolean): HTMLElement | null {
  // The page changes a moment after the route does, so first wait for the preferred target.
  const names = allowFallback ? step.targets : step.targets.slice(0, 1)
  for (const name of names) {
    const element = document.querySelector<HTMLElement>(`[data-tour="${name}"]`)
    if (element && element.getClientRects().length > 0) return element
  }
  return null
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
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const startHash = useRef(window.location.hash)
  const nextRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = STEPS[index] ?? STEPS[0]
  const isLast = index === STEPS.length - 1

  useEffect(() => {
    if (!step) return
    let cancelled = false
    let target: HTMLElement | null = null
    const href = hrefFor(step.route)
    // Replaces history, so Back leaves the page instead of stepping through the tour.
    const needsRoute = window.location.hash !== href
    if (needsRoute) window.location.replace(href)

    const update = () => {
      if (target) setBox(measure(target))
    }
    const started = Date.now()
    const locate = () => {
      if (cancelled) return
      target = findTarget(step, Date.now() - started > 400)
      if (target) {
        // On a phone the card covers the lower half, so the target goes to the top.
        target.scrollIntoView({ block: window.innerWidth < 640 ? 'start' : 'center' })
        update()
        nextRef.current?.focus()
      } else if (Date.now() - started < 800) {
        window.setTimeout(locate, 40)
      } else {
        // The target is not on screen, such as a request already resolved. Show the card alone.
        setBox(null)
        nextRef.current?.focus()
      }
    }
    // Lets a route change render first, so the old page is never measured.
    const first = window.setTimeout(locate, needsRoute ? 60 : 0)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    // Fonts and new content can shift the page without a resize or scroll event.
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    return () => {
      cancelled = true
      window.clearTimeout(first)
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

  if (!step) return null

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
          Step {index + 1} of {STEPS.length}
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
