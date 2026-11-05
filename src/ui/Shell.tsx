import * as Dialog from '@radix-ui/react-dialog'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Compass, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { hrefFor, navigate, type Route } from '../app/route'
import { formatShort } from '../domain/dates'
import { LEADERS } from '../domain/people'
import type { Persona } from '../domain/types'
import { store, useStore } from '../store/store'
import { startTour } from './tourState'

export const BAND_H1 =
  'font-display text-[clamp(1.875rem,1.4rem+2vw,3rem)] leading-[1.08] font-semibold break-words'

/** For secondary screens, where the next action matters more than the header. */
export const BAND_H1_COMPACT =
  'font-display text-[clamp(1.625rem,1.3rem+1.2vw,2.25rem)] leading-[1.1] font-semibold break-words'

function Logo() {
  return (
    <a href={hrefFor({ screen: 'root' })} className="flex shrink-0 items-center gap-2.5 rounded-control whitespace-nowrap">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#f2b544" />
        <path
          d="M8 23c6 0 4-13 16-13"
          fill="none"
          stroke="#12382f"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-[17px] font-semibold tracking-tight text-white">
        BrightPath <span className="font-normal">Welcome</span>
      </span>
    </a>
  )
}

const itemClass =
  'flex min-h-10 cursor-pointer items-center justify-between gap-6 rounded-control px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-canvas'
const groupLabelClass = 'px-2.5 pt-2.5 pb-1 text-xs font-medium text-muted'

function PersonaMenu({ persona }: { persona: Persona | null }) {
  const { data } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)

  const go = (route: Route) => navigate(route)
  const currentId = persona?.kind === 'employee' ? persona.hire.id : persona?.leader.id
  const currentName = persona?.kind === 'employee' ? persona.hire.name : persona?.leader.name

  const row = (id: string, name: string, detail: string, route: Route) => (
    <Menu.Item key={id} className={itemClass} onSelect={() => go(route)}>
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
      {currentId === id && <Check size={16} aria-label="Current" className="shrink-0 text-accent" />}
    </Menu.Item>
  )

  return (
    <>
      <Menu.Root>
        <Menu.Trigger data-tour="view-as" className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-control border border-band-line px-2.5 text-sm text-white transition-colors duration-100 hover:bg-white/10">
          <span className="truncate">
            {currentName && <span className="hidden text-band-soft sm:inline">View as </span>}
            <span className="font-medium">{currentName ?? 'Choose a person'}</span>
          </span>
          <ChevronDown size={16} aria-hidden className="shrink-0" />
          <span className="sr-only sm:hidden">, change who you are viewing as</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={6}
            collisionPadding={8}
            className="menu-panel z-50 max-h-[80dvh] w-72 max-w-[calc(100vw-16px)] overflow-y-auto rounded-panel border border-hairline bg-surface p-1.5 text-ink shadow-xl"
          >
            <Menu.Group>
              <Menu.Label className={groupLabelClass}>New hires</Menu.Label>
              {data.hires.map((hire) =>
                row(hire.id, hire.name, hire.title, {
                  screen: 'home',
                  hireId: hire.id,
                  taskId: null,
                }),
              )}
            </Menu.Group>
            <Menu.Separator className="my-1.5 h-px bg-hairline" />
            <Menu.Group>
              <Menu.Label className={groupLabelClass}>Managers and HR</Menu.Label>
              {LEADERS.map((leader) =>
                row(leader.id, leader.name, leader.title, {
                  screen: 'team',
                  leaderId: leader.id,
                }),
              )}
            </Menu.Group>
            <Menu.Separator className="my-1.5 h-px bg-hairline" />
            <Menu.Item className={itemClass} onSelect={() => startTour()}>
              <span className="min-w-0">
                <span className="block font-medium">Show me around</span>
                <span className="block text-xs text-muted">A quick tour of the whole story</span>
              </span>
              <Compass size={16} aria-hidden className="shrink-0 text-muted" />
            </Menu.Item>
            <Menu.Item className={itemClass} onSelect={() => setConfirmReset(true)}>
              <span className="min-w-0">
                <span className="block font-medium">Reset demo data</span>
                <span className="block text-xs text-muted">
                  Sample data from {formatShort(data.seededOn)}
                </span>
              </span>
              <RotateCcw size={16} aria-hidden className="shrink-0 text-muted" />
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root open={confirmReset} onOpenChange={setConfirmReset}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-ink/30" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-panel bg-surface p-6 shadow-2xl">
            <Dialog.Title className="font-display text-xl font-semibold">Reset demo data?</Dialog.Title>
            <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-muted">
              This removes every change and added new hire, and restores the sample data with fresh
              dates.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close className="min-h-11 cursor-pointer rounded-control border border-control px-4 font-medium hover:bg-canvas">
                Cancel
              </Dialog.Close>
              <button
                type="button"
                className="min-h-11 cursor-pointer rounded-control bg-accent px-4 font-semibold text-white hover:bg-accent-strong"
                onClick={() => {
                  store.reset()
                  setConfirmReset(false)
                  navigate({ screen: 'root' })
                  toast('Demo data reset')
                }}
              >
                Reset data
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function StoreNotice() {
  const { notice } = useStore()
  if (notice === 'none') return null
  return (
    <div role="status" className="border-b border-hairline bg-soon-tint px-4 py-2.5 text-sm text-soon">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:px-4">
        {notice === 'restored' ? (
          <>
            <span>Saved progress could not be read, so the sample data was restored.</span>
            <button
              type="button"
              onClick={() => store.dismissNotice()}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </>
        ) : (
          <span>
            This browser is blocking saved data. You can keep going, but changes will be lost when
            you close the tab.
          </span>
        )}
      </div>
    </div>
  )
}

/** Faint trail-map contour lines, the one decorative element, tied to the path idea. */
function Contours() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 320"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[640px] max-w-full"
    >
      <g fill="none" stroke="#3a5f55" strokeWidth="1" opacity="0.55">
        <path d="M640 26C560 12 500 40 452 78s-92 44-142 32-92 8-126 52" />
        <path d="M640 62c-66-12-122 12-164 46s-84 38-130 28-82 8-112 44" />
        <path d="M640 98c-56-8-104 12-140 40s-74 32-114 24-72 8-98 38" />
        <path d="M640 134c-46-6-86 10-116 34s-62 26-96 20-60 6-84 32" />
        <path d="M640 170c-38-4-70 8-94 28s-50 22-78 16-48 6-68 26" />
        <path d="M640 206c-30-2-54 6-74 22s-38 18-60 14-36 4-52 20" />
        <path d="M640 242c-22-2-40 4-54 16s-28 14-44 10-26 4-38 16" />
        <path d="M640 278c-14 0-26 2-36 10s-18 10-30 8-18 2-26 12" />
      </g>
    </svg>
  )
}

/** The dark band opens every screen with the answer to that person's main question. */
export function Shell({
  persona,
  band,
  compact = false,
  children,
}: {
  persona: Persona | null
  band: ReactNode
  compact?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh">
      <StoreNotice />
      <header className="on-band relative overflow-hidden bg-band text-white">
        <Contours />
        <div className="relative mx-auto max-w-[1120px] px-4 sm:px-8">
          <div className="flex items-center justify-between gap-3 py-3">
            <Logo />
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={startTour}
                className="hidden min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-control px-2.5 text-sm font-medium text-white transition-colors duration-100 hover:bg-white/10 lg:inline-flex"
              >
                <Compass size={16} aria-hidden />
                Show me around
              </button>
              <PersonaMenu persona={persona} />
            </div>
          </div>
          <div className={compact ? 'pb-4 sm:pb-5' : 'pt-3 pb-5 sm:pt-7 sm:pb-7'}>{band}</div>
        </div>
      </header>
      <main tabIndex={-1} className="mx-auto max-w-[1120px] px-4 py-5 focus:outline-none sm:px-8 sm:py-8">{children}</main>
    </div>
  )
}

export function MessageScreen({
  persona,
  title,
  body,
  action,
}: {
  persona: Persona | null
  title: string
  body: string
  action: Route
}) {
  return (
    <Shell
      persona={persona}
      band={
        <h1 className={BAND_H1}>{title}</h1>
      }
    >
      <p className="max-w-prose text-[15px] leading-relaxed">{body}</p>
      <a
        href={hrefFor(action)}
        className="mt-4 inline-flex min-h-11 items-center rounded-control bg-accent px-4 font-semibold text-white hover:bg-accent-strong"
      >
        Go to my workspace
      </a>
    </Shell>
  )
}
