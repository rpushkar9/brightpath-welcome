import * as Dialog from '@radix-ui/react-dialog'
import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Compass,
  House,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { hrefFor, markReturning, navigate, useRoute, type Route } from '../app/route'
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

/** Your own home screen, so the logo never switches you to someone else. */
const homeOf = (persona: Persona | null): Route => {
  if (!persona) return { screen: 'root' }
  return persona.kind === 'employee'
    ? { screen: 'home', hireId: persona.hire.id, taskId: null }
    : { screen: 'team', leaderId: persona.leader.id }
}

function Logo({ persona }: { persona: Persona | null }) {
  return (
    <a href={hrefFor(homeOf(persona))} className="flex shrink-0 items-center gap-2.5 rounded-control whitespace-nowrap">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#12382f" />
        <path d="M8 23c6 0 4-13 16-13" fill="none" stroke="#f2b544" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
        BrightPath <span className="font-normal">Welcome</span>
      </span>
    </a>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-accent-tint font-semibold text-accent-strong ring-1 ring-white ${
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'
      }`}
    >
      {initials}
    </span>
  )
}

type NavItem = { label: string; tour?: string; route: Route; icon: LucideIcon; active: (route: Route) => boolean }

function navItems(persona: Persona | null): NavItem[] {
  if (!persona) return []
  if (persona.kind === 'employee') {
    const hireId = persona.hire.id
    return [
      {
        label: 'Home',
        route: { screen: 'home', hireId, taskId: null },
        icon: House,
        active: (route) => route.screen === 'home',
      },
      {
        label: 'Full plan',
        route: { screen: 'plan', hireId, taskId: null },
        icon: ListChecks,
        active: (route) => route.screen === 'plan',
      },
    ]
  }
  const leaderId = persona.leader.id
  if (persona.leader.kind !== 'hr') {
    return [
      {
        label: 'My team',
        route: { screen: 'team', leaderId },
        icon: Users,
        active: (route) => route.screen === 'team' || route.screen === 'hire',
      },
    ]
  }
  return [
    {
      label: 'Overview',
      route: { screen: 'team', leaderId },
      icon: LayoutDashboard,
      active: (route) => route.screen === 'team',
    },
    {
      label: 'People',
      route: { screen: 'people', leaderId },
      icon: Users,
      active: (route) => route.screen === 'people' || route.screen === 'hire' || route.screen === 'new',
    },
    {
      label: 'Insights',
      tour: 'insights-nav',
      route: { screen: 'insights', leaderId, taskId: null },
      icon: Lightbulb,
      active: (route) => route.screen === 'insights',
    },
  ]
}

/** The same places, as a list on wide screens and as a tab bar on phones. */
function PrimaryNav({ persona, variant }: { persona: Persona | null; variant: 'side' | 'tabs' }) {
  const current = useRoute()
  const items = navItems(persona)
  if (variant === 'tabs') {
    if (items.length < 2) return null
    return (
      <nav
        aria-label="Main"
        className="glass-nav fixed inset-x-0 bottom-0 z-30 flex border-t border-white/70 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgb(18_56_47/0.4)] lg:hidden"
      >
        {items.map((item) => {
          const active = item.active(current)
          return (
            <a
              key={item.label}
              href={hrefFor(item.route)}
              data-tour={item.tour}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-100 ${
                active ? 'text-accent-strong' : 'text-muted'
              }`}
            >
              <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? 'bg-accent-tint' : ''}`}>
                <item.icon size={18} aria-hidden />
              </span>
              {item.label}
            </a>
          )
        })}
      </nav>
    )
  }
  return (
    <nav aria-label="Main" className="mt-7 space-y-1">
      {items.map((item) => {
        const active = item.active(current)
        return (
          <a
            key={item.label}
            href={hrefFor(item.route)}
            data-tour={item.tour}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors duration-100 ${
              active
                ? 'bg-white text-accent-strong shadow-[0_1px_2px_rgb(18_56_47/0.08)]'
                : 'text-ink hover:bg-white/60'
            }`}
          >
            <item.icon size={18} aria-hidden className={active ? 'text-accent' : 'text-muted'} />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

const itemClass =
  'flex min-h-10 cursor-pointer items-center justify-between gap-6 rounded-control px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-canvas'
const groupLabelClass = 'px-2.5 pt-2.5 pb-1 text-xs font-medium text-muted'

function PersonaMenu({ persona, variant }: { persona: Persona | null; variant: 'side' | 'bar' }) {
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
        <Menu.Trigger
          data-tour="view-as"
          className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2 text-left text-sm transition-colors duration-100 ${
            variant === 'side'
              ? 'w-full rounded-[10px] bg-white/70 p-2 hover:bg-white'
              : 'rounded-control bg-white/70 px-2.5 ring-1 ring-hairline hover:bg-white'
          }`}
        >
          {variant === 'side' && currentName && <Avatar name={currentName} size="sm" />}
          <span className="min-w-0 flex-1 truncate">
            {variant === 'side' && currentName && (
              <span className="block text-xs text-muted">View as</span>
            )}
            {variant === 'bar' && currentName && <span className="sr-only">View as </span>}
            <span className="block truncate font-medium">{currentName ?? 'Choose a person'}</span>
          </span>
          <ChevronDown size={16} aria-hidden className="shrink-0 text-muted" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align={variant === 'side' ? 'start' : 'end'}
            side={variant === 'side' ? 'top' : 'bottom'}
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
                <span className="block text-xs text-muted">A short tour of this person’s view</span>
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
      <g fill="none" stroke="#8fd3bf" strokeWidth="1" opacity="0.16">
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

export type BackLink = { label: string; route: Route }

/** Solid white on the dark header, at the left above the title, so it cannot blend in. */
function BackButton({ back }: { back: BackLink }) {
  return (
    <nav aria-label="Go back" className="mb-3">
      <a
        href={hrefFor(back.route)}
        onClick={markReturning}
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-white px-3.5 text-sm font-semibold text-band transition-colors duration-100 hover:bg-band-soft"
      >
        <ArrowLeft size={18} aria-hidden />
        {back.label}
      </a>
    </nav>
  )
}

/** A second way back at the end of a long page. */
export function BackAtEnd({ back }: { back: BackLink }) {
  return (
    <a
      href={hrefFor(back.route)}
      onClick={markReturning}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control border border-control px-3.5 text-sm font-semibold transition-colors duration-100 hover:border-accent hover:bg-accent-tint hover:text-accent-strong"
    >
      <ArrowLeft size={18} aria-hidden />
      {back.label}
    </a>
  )
}

/** The dark header opens every screen with the answer to that person's main question. */
export function Shell({
  persona,
  band,
  compact = false,
  back,
  children,
}: {
  persona: Persona | null
  band: ReactNode
  compact?: boolean
  back?: BackLink
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="glass-nav sticky top-0 hidden h-dvh flex-col border-r border-white/70 p-4 lg:flex">
        <div className="px-1 pt-1">
          <Logo persona={persona} />
        </div>
        <PrimaryNav persona={persona} variant="side" />
        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={startTour}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-muted transition-colors duration-100 hover:bg-white/60 hover:text-ink"
          >
            <Compass size={18} aria-hidden />
            Show me around
          </button>
          <PersonaMenu persona={persona} variant="side" />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 lg:hidden">
          <Logo persona={persona} />
          <PersonaMenu persona={persona} variant="bar" />
        </div>
        <StoreNotice />
        <div className="mx-auto max-w-[1180px] px-4 pt-3 pb-24 lg:px-8 lg:pt-6 lg:pb-12">
          <header
            className={`on-band hero relative overflow-hidden rounded-[20px] text-white ${
              compact ? 'p-4 lg:px-6 lg:py-5' : 'p-5 lg:p-7'
            }`}
          >
            <Contours />
            <div className="relative">
              {back && <BackButton back={back} />}
              {band}
            </div>
          </header>
          <main tabIndex={-1} className="mt-5 focus:outline-none lg:mt-6">
            {children}
          </main>
        </div>
      </div>

      <PrimaryNav persona={persona} variant="tabs" />
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
