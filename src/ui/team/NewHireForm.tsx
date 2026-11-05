import { ArrowLeft } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { hrefFor, navigate } from '../../app/route'
import { DEPARTMENT_LABEL } from '../../domain/people'
import { addHire, validateNewHire, type NewHireErrors } from '../../domain/newHire'
import { templatesFor } from '../../domain/plan'
import type { Department, IsoDate, Leader, Persona } from '../../domain/types'
import { store } from '../../store/store'
import { BAND_H1_COMPACT, Shell } from '../Shell'

const DEPARTMENTS: readonly Department[] = ['engineering', 'sales']

const inputClass =
  'mt-1.5 min-h-11 w-full rounded-control border bg-surface px-3 text-[15px] aria-[invalid=true]:border-overdue border-control'

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error: string | undefined
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-overdue">
          {error}
        </p>
      )}
    </div>
  )
}

const describedBy = (id: string, error: string | undefined, hint = false): string | undefined => {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  return ids || undefined
}

function Preview({ department }: { department: Department | null }) {
  if (!department) {
    return (
      <p className="text-[15px] leading-relaxed text-muted">
        Choose a department and the plan appears here. Company tasks are the same for everyone, so
        only the department tasks are listed.
      </p>
    )
  }
  const templates = templatesFor(department)
  const own = templates.filter((task) => task.scope !== 'company')
  const label = DEPARTMENT_LABEL[department]
  return (
    <>
      <p className="text-[15px] font-semibold">
        {templates.length} tasks: {templates.length - own.length} company and {own.length} {label}
      </p>
      <p className="mt-1 text-[13px] text-muted">The {label} tasks added to the company plan:</p>
      <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
        {own.map((task) => (
          <li key={task.id} className="py-2 text-sm break-words">
            {task.title}
          </li>
        ))}
      </ul>
    </>
  )
}

export function NewHireForm({ leader, today }: { leader: Leader; today: IsoDate }) {
  const persona: Persona = { kind: 'leader', leader }
  const teamRoute = { screen: 'team', leaderId: leader.id } as const
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState<Department | null>(null)
  const [startDate, setStartDate] = useState('')
  const [errors, setErrors] = useState<NewHireErrors>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const deptRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Checks the newest saved data, so another tab cannot have already added this person.
    const result = validateNewHire(
      { name, title, department: department ?? '', startDate },
      store.latest(),
      today,
    )
    if (!result.ok) {
      setErrors(result.errors)
      const { errors: e } = result
      const target = e.name
        ? nameRef
        : e.title
          ? titleRef
          : e.department
            ? deptRef
            : e.startDate
              ? dateRef
              : null
      target?.current?.focus()
      return
    }
    store.update((current) => addHire(current, result.hire))
    toast(`Plan started for ${result.hire.name}`)
    navigate({ screen: 'hire', leaderId: leader.id, hireId: result.hire.id, taskId: null })
  }

  return (
    <Shell
      persona={persona}
      compact
      band={
        <>
          <a
            href={hrefFor(teamRoute)}
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 text-sm text-band-soft hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden />
            Back to your team
          </a>
          <h1 className={BAND_H1_COMPACT}>Start a new plan</h1>
          <p className="mt-1.5 text-sm text-band-soft sm:text-[15px]">
            Enter a few details and the plan is ready to use.
          </p>
        </>
      }
    >
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <form noValidate onSubmit={submit} className="max-w-xl space-y-5">
          <Field id="name" label="Full name" error={errors.name}>
            <input
              ref={nameRef}
              id="name"
              value={name}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy('name', errors.name)}
              className={inputClass}
            />
          </Field>
          <Field id="title" label="Job title" error={errors.title}>
            <input
              ref={titleRef}
              id="title"
              value={title}
              autoComplete="off"
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describedBy('title', errors.title)}
              className={inputClass}
            />
          </Field>
          <fieldset
            role="radiogroup"
            aria-invalid={errors.department ? true : undefined}
            aria-describedby={describedBy('department', errors.department, true)}
          >
            <legend className="text-sm font-semibold">Department</legend>
            <p id="department-hint" className="text-[13px] text-muted">
              Department selects the task template and manager. Job title is descriptive and doesn’t
              change tasks.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DEPARTMENTS.map((option, index) => (
                <label
                  key={option}
                  className="flex min-h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-control border border-control bg-surface px-3 text-[15px] has-[:checked]:border-accent has-[:checked]:bg-accent-tint"
                >
                  <input
                    ref={index === 0 ? deptRef : undefined}
                    type="radio"
                    name="department"
                    value={option}
                    checked={department === option}
                    onChange={() => setDepartment(option)}
                    className="size-4 accent-accent"
                  />
                  {DEPARTMENT_LABEL[option]}
                </label>
              ))}
            </div>
            {errors.department && (
              <p id="department-error" className="mt-1 text-sm font-medium text-overdue">
                {errors.department}
              </p>
            )}
          </fieldset>
          <Field
            id="startDate"
            label="Start date"
            error={errors.startDate}
            hint="A weekday from today up to 180 days ahead."
          >
            <input
              ref={dateRef}
              id="startDate"
              type="date"
              value={startDate}
              min={today}
              onChange={(event) => setStartDate(event.target.value)}
              aria-invalid={errors.startDate ? true : undefined}
              aria-describedby={describedBy('startDate', errors.startDate, true)}
              className={`${inputClass} sm:max-w-60`}
            />
          </Field>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="min-h-11 cursor-pointer rounded-control bg-accent px-4 font-semibold text-white transition-colors duration-100 hover:bg-accent-strong"
            >
              Start plan
            </button>
            <a
              href={hrefFor(teamRoute)}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-control px-4 font-medium transition-colors duration-100 hover:bg-canvas"
            >
              Cancel
            </a>
          </div>
        </form>

        <section
          aria-labelledby="preview-heading"
          aria-live="polite"
          className="self-start rounded-panel border border-hairline bg-surface px-5 py-4"
        >
          <h2 id="preview-heading" className="mb-2 text-lg font-semibold">
            Plan preview
          </h2>
          <Preview department={department} />
        </section>
      </div>
    </Shell>
  )
}
