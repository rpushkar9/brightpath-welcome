import { addBusinessDays, latestBusinessDay } from './dates'
import { leaderById, managerIdFor } from './people'
import { completionKey, templatesFor } from './plan'
import type { AppData, Completion, Department, HelpRequest, Hire, IsoDate, TaskTemplate } from './types'

type SeedPerson = {
  id: string
  name: string
  title: string
  department: Department
  /** Business days since the start date. Negative means they have not started. */
  dayOffset: number
  isDone: (task: TaskTemplate) => boolean
  /** Sample history: tasks finished this many business days after they were due. */
  finishedLate?: Readonly<Record<string, number>>
}

const dueBy = (day: number, except: readonly string[] = []) => (task: TaskTemplate) =>
  task.dueDay <= day && !except.includes(task.id)

const only = (...ids: string[]) => (task: TaskTemplate) => ids.includes(task.id)

const PEOPLE: readonly SeedPerson[] = [
  {
    id: 'emily-carter',
    name: 'Emily Carter',
    title: 'Software Engineer',
    department: 'engineering',
    dayOffset: 0,
    isDone: only('c-profile', 'c-paperwork', 'c-i9', 'c-laptop-prep', 'e-buddy', 'e-access-request'),
  },
  {
    id: 'priya-nair',
    name: 'Priya Nair',
    title: 'Senior Software Engineer',
    department: 'engineering',
    dayOffset: 11,
    isDone: dueBy(11, ['c-benefits', 'e-first-pr']),
    finishedLate: { 'e-repo-grant': 2 },
  },
  {
    id: 'jordan-lee',
    name: 'Jordan Lee',
    title: 'Site Reliability Engineer',
    department: 'engineering',
    dayOffset: -5,
    isDone: only('c-profile'),
  },
  {
    id: 'marcus-webb',
    name: 'Marcus Webb',
    title: 'Account Executive',
    department: 'sales',
    dayOffset: 7,
    isDone: dueBy(4, ['s-product']),
    finishedLate: { 's-crm-account': 1 },
  },
  {
    id: 'aisha-rahman',
    name: 'Aisha Rahman',
    title: 'Sales Development Rep',
    department: 'sales',
    dayOffset: 25,
    isDone: () => true,
    finishedLate: { 's-crm-account': 3, 's-crm': 1 },
  },
  {
    id: 'tomas-rivera',
    name: 'Tomás Rivera',
    title: 'Account Executive',
    department: 'sales',
    dayOffset: 2,
    isDone: only('c-profile', 'c-paperwork', 'c-i9', 'c-laptop-prep', 'c-laptop-setup', 'c-welcome'),
  },
]

function completerName(task: TaskTemplate, hire: Hire): string {
  switch (task.owner) {
    case 'employee':
      return hire.name
    case 'manager':
      return leaderById(hire.managerId)?.name ?? 'Manager'
    case 'hr':
      return 'Sarah Mitchell'
    case 'it':
      return 'IT'
    default: {
      const exhaustive: never = task.owner
      return exhaustive
    }
  }
}

export function createSeed(today: IsoDate): AppData {
  const seededOn = latestBusinessDay(today)
  const completions: Record<string, Completion> = {}

  const hires = PEOPLE.map((person): Hire => {
    const hire: Hire = {
      id: person.id,
      name: person.name,
      title: person.title,
      department: person.department,
      managerId: managerIdFor(person.department),
      startDate: addBusinessDays(seededOn, -person.dayOffset),
      planCreatedOn: null,
    }

    templatesFor(person.department).forEach((task, index) => {
      if (!person.isDone(task)) return
      // Alternating on-time and one-day-early keeps sample history from looking machine-made.
      const lateBy = person.finishedLate?.[task.id]
      const onDue = addBusinessDays(hire.startDate, lateBy ? task.dueDay + lateBy : task.dueDay - (index % 2))
      const opens = addBusinessDays(hire.startDate, task.opensDay)
      const notBeforeOpen = onDue < opens ? opens : onDue
      const on = notBeforeOpen > seededOn ? seededOn : notBeforeOpen
      completions[completionKey(hire.id, task.id)] = { on, byName: completerName(task, hire) }
    })

    return hire
  })

  const startOf = (id: string): IsoDate =>
    hires.find((hire) => hire.id === id)?.startDate ?? seededOn
  const helpRequests: HelpRequest[] = [
    {
      id: 'help-priya-nair-1',
      hireId: 'priya-nair',
      taskId: 'e-local-setup',
      toLeaderId: 'sarah',
      message: 'I’m waiting on “Grant repository access” so I can start “Run the local setup”. Can you check on it?',
      on: addBusinessDays(startOf('priya-nair'), 2),
      status: 'resolved',
      resolvedBy: 'Sarah Mitchell',
    },
    {
      id: 'help-marcus-webb-1',
      hireId: 'marcus-webb',
      taskId: 's-crm',
      toLeaderId: 'sarah',
      message: 'I can’t find where to log a practice lead in the CRM. Who can show me?',
      on: addBusinessDays(startOf('marcus-webb'), 3),
      status: 'resolved',
      resolvedBy: 'Sarah Mitchell',
    },
    {
      id: 'help-tomas-rivera-1',
      hireId: 'tomas-rivera',
      taskId: 's-crm',
      toLeaderId: 'sarah',
      message:
        'I’m waiting on “Create CRM account” so I can start “Review CRM workflows”. Can you check on it?',
      on: seededOn,
      status: 'open',
      resolvedBy: null,
    },
  ]

  // The activity log starts empty, because sample history did not happen while anyone watched.
  return {
    version: 2,
    seededOn,
    hires,
    completions,
    nudges: [],
    helpRequests,
    events: [],
    seenThrough: {},
    improvements: [],
  }
}

export const DEFAULT_HIRE_ID = 'emily-carter'
