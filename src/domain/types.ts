export type IsoDate = string & { readonly __brand: 'IsoDate' }

export type Department = 'engineering' | 'sales'
export type TaskOwner = 'employee' | 'manager' | 'hr' | 'it'
export type TaskScope = 'company' | Department
export type PhaseId = 'before' | 'first-day' | 'first-week' | 'weeks-2-4'
export type Stage = PhaseId | 'past'

export type TaskTemplate = {
  id: string
  title: string
  summary: string
  why: string
  steps: readonly string[]
  /** A named document or system. Sample content: nothing is linked in the prototype. */
  reference: string | null
  minutes: number | null
  owner: TaskOwner
  scope: TaskScope
  /** Business days from the start date. 0 is the first day; negative is before it. */
  opensDay: number
  dueDay: number
  requires: string | null
}

export type Leader =
  | { kind: 'manager'; id: string; name: string; title: string; department: Department }
  | { kind: 'hr'; id: string; name: string; title: string }

export type Hire = {
  id: string
  name: string
  title: string
  department: Department
  managerId: string
  startDate: IsoDate
  /** Set when a plan is started by HR. Due dates before it move up to it. */
  planCreatedOn: IsoDate | null
}

export type Completion = { on: IsoDate; byName: string }

export type Nudge = {
  hireId: string
  taskId: string
  fromName: string
  on: IsoDate
  dismissed: boolean
}

export type AppData = {
  version: 1
  seededOn: IsoDate
  hires: Hire[]
  /** Keyed by `completionKey(hireId, taskId)`. */
  completions: Record<string, Completion>
  nudges: Nudge[]
}

export type Persona = { kind: 'employee'; hire: Hire } | { kind: 'leader'; leader: Leader }

export type TaskStatus =
  | { kind: 'completed'; on: IsoDate; byName: string }
  | { kind: 'upcoming'; opensOn: IsoDate }
  | { kind: 'waiting'; onTitle: string; onOwner: TaskOwner }
  | { kind: 'overdue'; dueOn: IsoDate; daysLate: number }
  | { kind: 'outstanding'; dueOn: IsoDate; dueToday: boolean }

export type PlanTask = {
  template: TaskTemplate
  status: TaskStatus
  opensOn: IsoDate
  dueOn: IsoDate
  order: number
}

export type HealthKind = 'complete' | 'needs-attention' | 'watch' | 'on-track'

export type HireHealth = {
  kind: HealthKind
  overdue: PlanTask[]
  maxDaysLate: number
  total: number
}

export type Result = { ok: true; data: AppData } | { ok: false; reason: string }
