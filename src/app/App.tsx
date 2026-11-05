import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { Toaster, toast } from 'sonner'
import { parseIsoDate, todayIso } from '../domain/dates'
import { firstName, leaderById } from '../domain/people'
import { canView } from '../domain/rules'
import { DEFAULT_HIRE_ID } from '../domain/seed'
import type { Persona } from '../domain/types'
import { useStore } from '../store/store'
import { UNDO_TOAST_ID } from '../ui/actions'
import { MessageScreen } from '../ui/Shell'
import { Tour } from '../ui/Tour'
import { claimAutoOpen, startTour } from '../ui/tourState'
import { EmployeeHome, EmployeePlan } from '../ui/employee/EmployeeScreens'
import { InsightsView } from '../ui/team/Insights'
import { HireDetail, NewHireForm, PeopleView, TeamView } from '../ui/team/TeamScreens'
import { hrefFor, pageKeyOf, takeOverlayTrigger, takeReturning, useRoute, type Route } from './route'

const DEFAULT_ROUTE: Route = { screen: 'home', hireId: DEFAULT_HIRE_ID, taskId: null }

const subscribeToClock = (listener: () => void) => {
  const timer = window.setInterval(listener, 60_000)
  document.addEventListener('visibilitychange', listener)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', listener)
  }
}

/** Keeps a screen left open overnight on the right date. */
function useToday() {
  const value = useSyncExternalStore(subscribeToClock, () => todayIso().toString())
  return parseIsoDate(value) ?? todayIso()
}

const viewerOf = (route: Route): string | null => {
  if (route.screen === 'home' || route.screen === 'plan') return route.hireId
  if (
    route.screen === 'team' ||
    route.screen === 'people' ||
    route.screen === 'insights' ||
    route.screen === 'hire' ||
    route.screen === 'new'
  ) {
    return route.leaderId
  }
  return null
}

function Screen() {
  const route = useRoute()
  const { data } = useStore()
  const today = useToday()
  const viewer = viewerOf(route)

  // A new page opens at the top. Going back returns to where you were in the list.
  const pageKey = pageKeyOf(route)
  const scrollByPage = useRef(new Map<string, number>())
  const currentPage = useRef(pageKey)
  useLayoutEffect(() => {
    currentPage.current = pageKey
    window.scrollTo(0, takeReturning() ? (scrollByPage.current.get(pageKey) ?? 0) : 0)
  }, [pageKey])
  useEffect(() => {
    const remember = () => scrollByPage.current.set(currentPage.current, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [])

  // Closing a drawer can change screens, so focus returns here rather than in the drawer.
  const hasOverlay = 'taskId' in route && route.taskId !== null
  useEffect(() => {
    if (hasOverlay) return
    const trigger = takeOverlayTrigger()
    if (!trigger) return
    // Runs after the unmounting drawer restores focus on its own next tick.
    window.setTimeout(() => {
      const link = document.querySelector<HTMLElement>(`[data-task-link="${CSS.escape(trigger)}"]`)
      ;(link ?? document.querySelector<HTMLElement>('main'))?.focus()
    })
  }, [hasOverlay])

  // After each page load, a person's tour opens by itself the first time they are viewed.
  // An open task or a bad link is left alone, and the tour waits until that closes.
  const personExists =
    route.screen === 'home' || route.screen === 'plan'
      ? data.hires.some((hire) => hire.id === route.hireId)
      : (route.screen === 'team' ||
          route.screen === 'people' ||
          route.screen === 'insights' ||
          route.screen === 'hire') &&
        leaderById(route.leaderId) !== undefined &&
        (route.screen !== 'hire' || data.hires.some((hire) => hire.id === route.hireId))
  useEffect(() => {
    if (viewer && !hasOverlay && personExists && claimAutoOpen(viewer)) startTour()
  }, [viewer, hasOverlay, personExists])

  // An Undo offer belongs to the person who acted, so it must not follow a switch to someone else.
  useEffect(() => {
    toast.dismiss(UNDO_TOAST_ID)
  }, [viewer])

  useEffect(() => {
    if (route.screen === 'root') window.location.replace(hrefFor(DEFAULT_ROUTE))
  }, [route.screen])

  switch (route.screen) {
    case 'root':
      return null
    case 'home':
    case 'plan': {
      const hire = data.hires.find((item) => item.id === route.hireId)
      if (!hire) {
        return (
          <MessageScreen
            persona={null}
            title="We can’t find that person"
            body="They may have been removed when the demo data was reset, or the link may be out of date."
            action={DEFAULT_ROUTE}
          />
        )
      }
      const persona: Persona = { kind: 'employee', hire }
      const Component = route.screen === 'home' ? EmployeeHome : EmployeePlan
      return <Component hire={hire} persona={persona} taskId={route.taskId} today={today} />
    }
    case 'team':
    case 'people':
    case 'insights':
    case 'new':
    case 'hire': {
      const leader = leaderById(route.leaderId)
      if (!leader) {
        return (
          <MessageScreen
            persona={null}
            title="We can’t find that manager"
            body="The link may be out of date. Choose someone from the View as menu, or go back to the demo’s starting point."
            action={DEFAULT_ROUTE}
          />
        )
      }
      const persona: Persona = { kind: 'leader', leader }
      const home: Route = { screen: 'team', leaderId: leader.id }

      if (route.screen === 'team') return <TeamView leader={leader} today={today} />
      if (route.screen === 'people') return <PeopleView leader={leader} today={today} />

      if (route.screen === 'insights') {
        if (leader.kind !== 'hr') {
          return (
            <MessageScreen
              persona={persona}
              title="Insights are for HR"
              body="Managers can see their own new hires. HR sees patterns across every team."
              action={home}
            />
          )
        }
        return <InsightsView leader={leader} taskId={route.taskId} today={today} />
      }

      if (route.screen === 'new') {
        if (leader.kind !== 'hr') {
          return (
            <MessageScreen
              persona={persona}
              title="Only HR can start a plan"
              body={`${firstName(leader.name)}, ask HR to start a plan for anyone joining your team.`}
              action={home}
            />
          )
        }
        return <NewHireForm leader={leader} today={today} />
      }

      const hire = data.hires.find((item) => item.id === route.hireId)
      if (!hire || !canView(persona, hire)) {
        return (
          <MessageScreen
            persona={persona}
            title={hire ? 'This person isn’t on your team' : 'We can’t find that person'}
            body={
              hire
                ? 'Managers can see their own new hires. HR can see everyone.'
                : 'They may have been removed when the demo data was reset, or the link may be out of date.'
            }
            action={home}
          />
        )
      }
      return <HireDetail leader={leader} hire={hire} taskId={route.taskId} today={today} />
    }
    case 'not-found':
      return (
        <MessageScreen
          persona={null}
          title="We can’t find that page"
          body="The link may be out of date. Your progress is safe."
          action={DEFAULT_ROUTE}
        />
      )
    default: {
      const exhaustive: never = route
      return exhaustive
    }
  }
}

export function App() {
  return (
    <>
      <Screen />
      <Tour />
      <Toaster
        position="bottom-center"
        mobileOffset={{ bottom: 80 }}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            borderRadius: 'var(--radius-control)',
            background: 'var(--color-ink)',
            color: '#ffffff',
            border: 'none',
          },
          actionButtonStyle: {
            background: 'transparent',
            color: 'var(--color-path-marker)',
            fontWeight: 600,
          },
        }}
      />
    </>
  )
}
