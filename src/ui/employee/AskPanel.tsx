import { useState } from 'react'
import { hrefFor, type Route } from '../../app/route'
import { formatShort, todayIso } from '../../domain/dates'
import { SUGGESTED_QUESTIONS, answerQuestion } from '../../domain/help'
import { firstName, leaderById } from '../../domain/people'
import type { Hire, Persona } from '../../domain/types'
import { useStore } from '../../store/store'
import { HelpDialog } from '../HelpDialog'
import { openTask } from '../TaskRow'

/**
 * Quick answers from the person's own plan. It uses simple matching, not a language model,
 * and the panel says so.
 */
export function AskPanel({ hire, persona }: { hire: Hire; persona: Persona }) {
  const { data } = useStore()
  const [draft, setDraft] = useState('')
  const [asked, setAsked] = useState('')
  const answer = asked ? answerQuestion(asked, hire, data, todayIso()) : null
  const manager = firstName(leaderById(hire.managerId)?.name ?? 'your manager')

  const ask = (question: string) => {
    const text = question.trim()
    if (text) setAsked(text)
  }

  return (
    <section data-tour="ask" aria-labelledby="ask-heading" className="rounded-[12px] bg-surface p-4 shadow-card ring-1 ring-hairline">
      <h2 id="ask-heading" className="text-xl font-semibold">
        Have a question?
      </h2>
      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          ask(draft)
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask about your onboarding
        </label>
        <input
          id="ask-input"
          value={draft}
          maxLength={200}
          autoComplete="off"
          placeholder="Ask about your onboarding"
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-control bg-surface px-3 text-[15px] placeholder:text-muted"
        />
        <button
          type="submit"
          className="min-h-11 cursor-pointer rounded-control border border-control px-3.5 font-medium transition-colors duration-100 hover:bg-canvas"
        >
          Ask
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            aria-pressed={asked === question}
            onClick={() => {
              setDraft('')
              ask(question)
            }}
            className="min-h-9 cursor-pointer rounded-control bg-canvas px-2.5 text-left text-[13px] font-medium transition-colors duration-100 hover:bg-accent-tint aria-pressed:bg-accent-tint aria-pressed:text-accent-strong"
          >
            {question}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {answer && (
          <div className="fade-in mt-3 border-t border-hairline pt-3">
            <h3 className="font-sans text-sm font-semibold">{answer.heading}</h3>
            <ul className="mt-1.5 space-y-1.5 text-sm leading-snug">
              {answer.lines.map((line) => {
                if (!line.taskId) return <li key={line.text}>{line.text}</li>
                const route: Route = { screen: 'home', hireId: hire.id, taskId: line.taskId }
                return (
                  <li key={line.text}>
                    <a
                      href={hrefFor(route)}
                      data-task-link={`ask:${line.taskId}`}
                      onClick={(event) => openTask(event, route)}
                      className="underline decoration-control underline-offset-2 hover:text-accent-strong"
                    >
                      {line.text}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-hairline pt-2">
        <p className="text-[13px] text-muted">Answers come from your plan, not AI.</p>
        <HelpDialog
          hire={hire}
          persona={persona}
          task={null}
          initialMessage={answer && !answer.found ? asked : ''}
          trigger={
            <button
              type="button"
              className="min-h-11 cursor-pointer rounded-control text-sm font-semibold text-accent hover:text-accent-strong"
            >
              Ask {manager}
            </button>
          }
        />
      </div>
    </section>
  )
}

/** The person's own requests, so they can see each one was received and what happened. */
export function YourRequests({ hire }: { hire: Hire }) {
  const { data } = useStore()
  const requests = data.helpRequests.filter((request) => request.hireId === hire.id)
  if (requests.length === 0) return null
  return (
    <section>
      <h2 className="mb-2.5 text-xl font-semibold">Your requests</h2>
      <ul className="divide-y divide-hairline rounded-panel border border-hairline bg-surface">
        {requests.map((request) => (
          <li key={request.id} className="px-4 py-3 text-sm">
            <p className="break-words">{request.message}</p>
            <p className={`mt-1 text-[13px] font-medium ${request.status === 'open' ? 'text-waiting' : 'text-done'}`}>
              {request.status === 'open'
                ? `Sent to ${leaderById(request.toLeaderId)?.name ?? 'your manager'} on ${formatShort(request.on)}. Waiting for a response.`
                : `Resolved by ${request.resolvedBy ?? 'your manager'}.`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
