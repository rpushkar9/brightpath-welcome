import * as Dialog from '@radix-ui/react-dialog'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { todayIso } from '../domain/dates'
import { MAX_HELP_MESSAGE, draftHelpMessage, helpRecipient, requestHelp } from '../domain/help'
import { firstName } from '../domain/people'
import type { Hire, Persona, PlanTask } from '../domain/types'
import { store } from '../store/store'

function whyThisPerson(task: PlanTask | null, recipientName: string): string {
  if (!task) return `${recipientName} is your best first stop.`
  if (task.status.kind === 'waiting') {
    return `It goes to ${recipientName}, who can follow up on “${task.status.onTitle}”.`
  }
  return `It goes to ${recipientName}, with “${task.template.title}” attached.`
}

function HelpForm({
  hire,
  persona,
  task,
  initialMessage,
  onDone,
}: {
  hire: Hire
  persona: Persona
  task: PlanTask | null
  initialMessage: string
  onDone: () => void
}) {
  const recipient = helpRecipient(hire, task)
  const first = firstName(recipient.name)
  const [message, setMessage] = useState(initialMessage || draftHelpMessage(task))
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const result = store.apply((data) =>
          requestHelp(data, persona, task?.template.id ?? null, message, todayIso()),
        )
        if (!result.ok) {
          setError(result.reason)
          return
        }
        toast(`Request sent to ${first}`)
        onDone()
        // The button that opened this can disappear once a request is open, so keep focus on the page.
        window.setTimeout(() => {
          const target =
            document.querySelector<HTMLElement>('[role="dialog"]') ?? document.querySelector<HTMLElement>('main')
          if (document.activeElement === document.body) target?.focus()
        }, 50)
      }}
    >
      <Dialog.Title className="font-display text-xl font-semibold">Ask {first}</Dialog.Title>
      <Dialog.Description className="mt-1.5 text-[15px] leading-relaxed text-muted">
        {whyThisPerson(task, recipient.name)}
      </Dialog.Description>
      <label htmlFor="help-message" className="mt-4 block text-sm font-semibold">
        Your message
      </label>
      <textarea
        id="help-message"
        rows={4}
        value={message}
        maxLength={MAX_HELP_MESSAGE}
        onChange={(event) => {
          setMessage(event.target.value)
          setError(null)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'help-error' : 'help-note'}
        className={`mt-1.5 w-full rounded-control border bg-surface px-3 py-2 text-[15px] leading-relaxed ${error ? 'border-overdue' : 'border-control'}`}
      />
      {error && (
        <p id="help-error" role="alert" className="mt-1 text-sm font-medium text-overdue">
          {error}
        </p>
      )}
      <p id="help-note" className="mt-2 text-[13px] text-muted">
        This appears in {first}’s workspace. No email is sent in this prototype.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Dialog.Close className="min-h-11 cursor-pointer rounded-control border border-control px-4 font-medium hover:bg-canvas">
          Cancel
        </Dialog.Close>
        <button
          type="submit"
          className="min-h-11 cursor-pointer rounded-control bg-accent px-4 font-semibold text-white hover:bg-accent-strong"
        >
          Send request
        </button>
      </div>
    </form>
  )
}

export function HelpDialog({
  hire,
  persona,
  task,
  initialMessage = '',
  trigger,
}: {
  hire: Hire
  persona: Persona
  task: PlanTask | null
  initialMessage?: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay fixed inset-0 z-[60] bg-ink/30" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[70] max-h-[90dvh] w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel bg-surface p-6 shadow-2xl">
          <HelpForm
            hire={hire}
            persona={persona}
            task={task}
            initialMessage={initialMessage}
            onDone={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
