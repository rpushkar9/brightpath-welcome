# What comes next

These are ideas for after this prototype. None of them is built, except where noted.

## If this used a real AI model

Today, "Have a question?" uses simple rules, and the screen says so. A model would need a secure backend, because a public website cannot hold an API key.

The governing rule is that the AI can explain and draft, but it cannot decide or act.

| Risk | Guardrail |
|---|---|
| Made-up answers | Answer only from the person's plan and approved documents, and cite the source. With no source, say so and offer a person. |
| Seeing someone else's data | The server fetches only what that person may see, before calling the model. The model never decides permissions. |
| Leaked API keys | Keep the key on the backend, with rate limits and a spending cap. |
| Sensitive topics | Pay, visas, I-9, health benefits, and legal questions get no AI answer. They go straight to HR. |
| Private data | Send the minimum, remove personal details, and use a vendor contract that rules out training on the data. |
| Malicious text in documents | Treat documents and messages as data, not instructions. Give the model no tools that change anything. |
| Acting alone | The model cannot complete tasks, send messages, or edit plans. A person confirms each one. |
| Judging people | No AI performance scores or "at risk" predictions. Hire status stays a simple rule that anyone can check. |
| Getting worse unnoticed | Test against a fixed question set, log what people ask, let them flag bad answers, and fall back to the rules if the model fails. |
| False trust | Label it as AI and show its sources. |

## AI features, once that backend exists

1. Plain-English answers from approved documents, with citations. This is the natural upgrade of "Have a question?".
2. A draft plan from a job description, which HR reviews before it goes live. This is Sarah's "eventually" request. MangoApps' public site describes a similar review step for its AI-drafted plans.
3. Grouping similar questions, so HR can see patterns.
4. Draft nudges and 1:1 notes that a manager edits before use.
5. Translated or simplified instructions for new hires.

## Small features, without AI

**Managers**

- "What changed since you last looked", showing completions, new requests, and newly late tasks. This is likely the most valuable manager feature.
- 1:1 prep, with what is finished, what is stuck, and what to ask about.
- A "starting soon" list of what must be ready before someone's first day.

**HR**

- "Where people get stuck", showing which tasks get the most help requests and run late most often.
- Adding or removing a task for one person, without a full template editor.

**New hires**

- A "this week" view, between three tasks and the full plan.
- "Who to ask" and "what done looks like" on each task.
- Key people in one small list: manager, buddy, HR, and IT.
- Add to calendar, using a downloadable `.ics` file.

## What I would ask Sarah

- Which tasks must every department complete?
- Which dates are legally fixed?
- What would make you step in for a new hire?
- Who chases IT today?
- Which questions do new hires ask you most often?
