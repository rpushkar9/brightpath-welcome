import { useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import { completeTask, undoTask } from '../domain/rules'
import { todayIso } from '../domain/dates'
import type { Persona, PlanTask } from '../domain/types'
import { store } from '../store/store'

export const UNDO_TOAST_ID = 'undo-completion'

/** Cross-fades a state change where the browser supports it, and applies it directly otherwise. */
export function withTransition(change: () => void): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !document.startViewTransition) {
    change()
    return
  }
  document.startViewTransition(() => flushSync(change))
}

/** The next task moves under the pointer after a completion, so a double click must not reach it. */
export const isRepeatClick = (event: MouseEvent<HTMLElement>): boolean => event.detail > 1

/** How long a finished task shows its check before the list moves on. */
export const FINISH_MS = 320

/** Shows the check first, so the person sees their task finish before the next one arrives. */
export function useFinish(persona: Persona, hireId: string, task: PlanTask) {
  const [finishing, setFinishing] = useState(false)
  const finish = (event: MouseEvent<HTMLElement>) => {
    if (finishing || isRepeatClick(event)) return
    setFinishing(true)
    window.setTimeout(() => {
      setFinishing(false)
      completeAction(persona, hireId, task)
    }, FINISH_MS)
  }
  return { finishing, finish }
}

export function undoAction(persona: Persona, hireId: string, task: PlanTask): void {
  withTransition(() => {
    const result = store.apply((data) =>
      undoTask(data, persona, hireId, task.template.id, todayIso()),
    )
    if (result.ok) toast(`Reopened “${task.template.title}”`)
    else toast.error(result.reason)
  })
}

export function completeAction(persona: Persona, hireId: string, task: PlanTask): void {
  withTransition(() => {
    const result = store.apply((data) =>
      completeTask(data, persona, hireId, task.template.id, todayIso()),
    )
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast(`Marked “${task.template.title}” complete`, {
      id: UNDO_TOAST_ID,
      duration: 6000,
      action: { label: 'Undo', onClick: () => undoAction(persona, hireId, task) },
    })
  })
}
