import { endOfWeek, formatLong } from './dates'
import { firstName, leaderById, SARAH } from './people'
import { buildPlan, nextSteps, ownProgress, progress } from './plan'
import { ownerName, statusLabel } from './rules'
import type { AppData, HelpRequest, Hire, IsoDate, Leader, Persona, PlanTask, Result } from './types'

export const MAX_HELP_MESSAGE = 500

/** IT and HR questions go to Sarah. Everything else starts with the manager. */
export function helpRecipient(hire: Hire, task: PlanTask | null): Leader {
  const owner = task?.status.kind === 'waiting' ? task.status.onOwner : task?.template.owner
  if (owner === 'it' || owner === 'hr') return SARAH
  return leaderById(hire.managerId) ?? SARAH
}

export function draftHelpMessage(task: PlanTask | null): string {
  if (!task) return ''
  if (task.status.kind === 'waiting') {
    return `I’m waiting on “${task.status.onTitle}” so I can start “${task.template.title}”. Can you check on it?`
  }
  return `I could use some help with “${task.template.title}”.`
}

export const openRequestFor = (
  data: AppData,
  hireId: string,
  taskId: string,
): HelpRequest | undefined =>
  data.helpRequests.find(
    (request) =>
      request.hireId === hireId && request.taskId === taskId && request.status === 'open',
  )

export function requestHelp(
  data: AppData,
  persona: Persona,
  taskId: string | null,
  message: string,
  today: IsoDate,
): Result {
  if (persona.kind !== 'employee') {
    return { ok: false, reason: 'Only the new hire can ask from this screen.' }
  }
  const hire = data.hires.find((item) => item.id === persona.hire.id)
  if (!hire) return { ok: false, reason: 'That person is no longer on the roster.' }

  const text = message.trim()
  if (!text) return { ok: false, reason: 'Write a short message first.' }
  if (text.length > MAX_HELP_MESSAGE) {
    return { ok: false, reason: `Keep the message to ${MAX_HELP_MESSAGE} characters or fewer.` }
  }

  const task = taskId
    ? buildPlan(hire, data, today).find((item) => item.template.id === taskId)
    : null
  if (taskId) {
    if (!task) return { ok: false, reason: 'That task is no longer in this plan.' }
    if (task.status.kind === 'completed') return { ok: false, reason: 'This task is already complete.' }
    if (openRequestFor(data, hire.id, taskId)) {
      return { ok: false, reason: 'You already have an open request about this task.' }
    }
  }

  const count = data.helpRequests.filter((request) => request.hireId === hire.id).length
  const request: HelpRequest = {
    id: `help-${hire.id}-${count + 1}`,
    hireId: hire.id,
    taskId,
    toLeaderId: helpRecipient(hire, task ?? null).id,
    message: text,
    on: today,
    status: 'open',
    resolvedBy: null,
  }
  return { ok: true, data: { ...data, helpRequests: [...data.helpRequests, request] } }
}

export function resolveHelp(data: AppData, persona: Persona, requestId: string): Result {
  const request = data.helpRequests.find((item) => item.id === requestId)
  if (!request) return { ok: false, reason: 'That request no longer exists.' }
  if (persona.kind !== 'leader' || persona.leader.id !== request.toLeaderId) {
    return { ok: false, reason: 'Only the person it was sent to can resolve this request.' }
  }
  if (request.status === 'resolved') return { ok: false, reason: 'This request is already resolved.' }
  return {
    ok: true,
    data: {
      ...data,
      helpRequests: data.helpRequests.map((item) =>
        item.id === requestId ? { ...item, status: 'resolved', resolvedBy: persona.leader.name } : item,
      ),
    },
  }
}

export const openRequestsFor = (data: AppData, leader: Leader): HelpRequest[] =>
  data.helpRequests.filter(
    (request) => request.toLeaderId === leader.id && request.status === 'open',
  )

export type HelpLine = { text: string; taskId: string | null }
export type HelpAnswer = { heading: string; lines: HelpLine[]; found: boolean }

const STOP_WORDS = new Set(
  'a about all am an and any are at be can check complete day do does done due finish first for get has have help hold how i if in is it left m me my need next of on or please review run s set should so start still t task tasks that the there this to up verify week what when where who why will with you your'.split(' '),
)

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word))

// Allows plurals and small endings ("benefit", "benefits"), but "work" must not match "workflows".
const sameWord = (a: string, b: string): boolean =>
  a === b ||
  (Math.min(a.length, b.length) >= 5 &&
    Math.abs(a.length - b.length) <= 3 &&
    (a.startsWith(b) || b.startsWith(a)))

function matchTasks(query: string, plan: PlanTask[]): { tasks: PlanTask[]; score: number } {
  const asked = words(query)
  const scored = plan.map((task) => ({
    task,
    score: asked.filter((word) => words(task.template.title).some((title) => sameWord(word, title))).length,
  }))
  const score = Math.max(0, ...scored.map((item) => item.score))
  if (score === 0) return { tasks: [], score: 0 }
  // On a tie, the person's own tasks come first, because those are what they can act on.
  const tasks = scored
    .filter((item) => item.score === score)
    .map((item) => item.task)
    .sort((a, b) => Number(b.template.owner === 'employee') - Number(a.template.owner === 'employee'))
  return { tasks, score }
}

function ownerSentence(task: PlanTask, hire: Hire): string {
  const { owner } = task.template
  if (owner === 'employee') return 'This one is yours.'
  if (owner === 'it') return `IT owns this. ${SARAH.name} can follow up on it.`
  if (owner === 'hr') return `HR owns this. ${SARAH.name} can help.`
  return `${ownerName(owner, hire)} owns this.`
}

const taskLine = (task: PlanTask, hire: Hire): HelpLine => ({
  text: `“${task.template.title}”: ${statusLabel(task.status, hire)}. ${ownerSentence(task, hire)}`,
  taskId: task.template.id,
})

const line = (task: PlanTask, hire: Hire): HelpLine => ({
  text: `“${task.template.title}”: ${statusLabel(task.status, hire)}.`,
  taskId: task.template.id,
})

const own = (plan: PlanTask[]) => plan.filter((task) => task.template.owner === 'employee')

function answerNext(plan: PlanTask[], hire: Hire): HelpAnswer {
  const { shown } = nextSteps(plan)
  if (shown.length === 0) {
    const next = own(plan)
      .filter((task) => task.status.kind === 'upcoming')
      .sort((a, b) => a.opensOn.localeCompare(b.opensOn))[0]
    return {
      heading: 'Nothing needs you right now',
      lines: next
        ? [{ text: `“${next.template.title}” opens on ${formatLong(next.opensOn)}.`, taskId: next.template.id }]
        : [],
      found: true,
    }
  }
  return { heading: 'Start with these, in this order', lines: shown.map((task) => line(task, hire)), found: true }
}

function answerWaiting(plan: PlanTask[], hire: Hire): HelpAnswer {
  const waiting = own(plan).filter((task) => task.status.kind === 'waiting')
  return {
    heading: waiting.length ? 'You’re waiting on' : 'You’re not waiting on anyone',
    lines: waiting.map((task) => {
      const { status } = task
      if (status.kind !== 'waiting') return { text: '', taskId: task.template.id }
      return {
        text:
          status.onOwner === 'employee'
            ? `“${task.template.title}” opens once you finish “${status.onTitle}”.`
            : `“${task.template.title}” needs ${ownerName(status.onOwner, hire)} to finish “${status.onTitle}” first. There’s nothing for you to do yet.`,
        taskId: task.template.id,
      }
    }),
    found: true,
  }
}

function answerWeek(plan: PlanTask[], hire: Hire, today: IsoDate): HelpAnswer {
  const friday = endOfWeek(today)
  const due = own(plan)
    .filter((task) => task.status.kind !== 'completed' && task.dueOn <= friday)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  return {
    heading: due.length ? 'Your tasks due by Friday' : 'Nothing of yours is due this week',
    lines: due.map((task) => line(task, hire)),
    found: true,
  }
}

function answerLate(plan: PlanTask[], hire: Hire): HelpAnswer {
  const late = own(plan).filter((task) => task.status.kind === 'overdue')
  return {
    heading: late.length ? 'These are past their due date' : 'None of your tasks are late',
    lines: late.map((task) => line(task, hire)),
    found: true,
  }
}

function answerProgress(plan: PlanTask[]): HelpAnswer {
  const mine = ownProgress(plan)
  const whole = progress(plan)
  return {
    heading: 'Where you are',
    lines: [
      { text: `You’ve finished ${mine.done} of your ${mine.total} tasks.`, taskId: null },
      { text: `Across the whole plan, including other people’s tasks, ${whole.done} of ${whole.total} are done.`, taskId: null },
    ],
    found: true,
  }
}

/**
 * Answers from the person's own plan using simple matching. This is not a language model,
 * so it says plainly when it cannot answer rather than guessing.
 */
export function answerQuestion(question: string, hire: Hire, data: AppData, today: IsoDate): HelpAnswer {
  const plan = buildPlan(hire, data, today)
  const query = question.toLowerCase()
  const matched = matchTasks(question, plan)
  const asksWho = /\bwho\b|contact|reach out/.test(query)

  // A named task is the most specific thing someone can ask about, so it comes first.
  if (matched.tasks.length > 0) {
    return {
      heading: asksWho ? 'Who to ask' : 'Here’s what your plan says',
      lines: matched.tasks.slice(0, 3).map((task) => taskLine(task, hire)),
      found: true,
    }
  }
  if (/\bstart date\b|when (do|did|will) i start/.test(query)) {
    const verb = hire.startDate > today ? 'You start on' : 'You started on'
    return {
      heading: 'Your start date',
      lines: [{ text: `${verb} ${formatLong(hire.startDate)}.`, taskId: null }],
      found: true,
    }
  }
  if (/wait|block|stuck|held up|holding/.test(query)) return answerWaiting(plan, hire)
  if (/\bnext\b|\bfirst\b|focus|start|what (should|do) i/.test(query)) return answerNext(plan, hire)
  if (/\blate\b|overdue|behind|missed/.test(query)) return answerLate(plan, hire)
  if (/week|\bdue\b|deadline/.test(query)) return answerWeek(plan, hire, today)
  if (/progress|how am i|how much|\bleft\b|remaining|\bdone\b|finish/.test(query)) return answerProgress(plan)
  if (asksWho) {
    const manager = leaderById(hire.managerId)
    return {
      heading: 'Who to ask',
      lines: [
        { text: `${manager?.name ?? 'Your manager'} is the best first stop for most questions.`, taskId: null },
        { text: `${SARAH.name} in HR can help with paperwork and IT access.`, taskId: null },
      ],
      found: true,
    }
  }
  return {
    heading: 'That isn’t in your onboarding plan',
    lines: [
      { text: `I can only answer from your plan. ${firstName(leaderById(hire.managerId)?.name ?? 'Your manager')} can help with anything else.`, taskId: null },
    ],
    found: false,
  }
}

export const SUGGESTED_QUESTIONS = [
  'What should I do next?',
  'What am I waiting on?',
  'What’s due this week?',
  'Who can help me?',
] as const
