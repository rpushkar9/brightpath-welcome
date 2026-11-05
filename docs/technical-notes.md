# Technical notes

This prototype runs entirely in the browser. These notes separate what carries over to a real product from what is only for the demo.

## What carries over

- **Product rules in `src/domain/`.** Task status, progress, hire status, routing of help requests, and insights are pure functions that take data and a date. A server could run the same logic.
- **The concepts.** Task templates with owners and business-day offsets, one prerequisite per task, typed activity events, and improvement proposals.
- **The tests for those rules.**

## What is simulated

- **People and permissions.** The **View as** menu stands in for login. Every permission check runs in the browser, so this prototype is not secure and must not hold real data.
- **Storage.** Data lives in one browser's localStorage. Nothing is shared between browsers or people.
- **Connections.** No email, chat, calendar, HR system, or document storage is connected.
- **Sample data.** People, tasks, and history are invented. The sample includes a few tasks finished late and a few help requests, so the insights have something to show.

## What moves to a server

1. **Sign-in and permissions.** Single sign-on, with every read and write checked on the server. Managers get their own teams, and HR gets its own company.
2. **Customer separation.** Every record belongs to one company, and the server enforces that on every query.
3. **Data.** A database replaces localStorage. Actions become API calls that validate input again, and the last write no longer wins by accident.
4. **Templates.** Versioned plans by role, department, and location. A hire stays on the version they started with unless someone chooses to move them.
5. **Reminders and connections.** Scheduled jobs send reminders with limits, so people are not over-notified.

## How analytics would work with reliable history

Today, insights read current state plus a few recorded dates. They can say a task is overdue now or finished late. They cannot say how long something was blocked, or how quickly a request was answered, because those changes were not recorded for sample data.

The activity log in `src/domain/events.ts` is the start of what would fix that. It records completions, reopened tasks, requests, resolutions, nudges, and new plans as they happen. A real system would:

- write these events on the server, as an append-only record
- also record status changes, such as when a task became overdue or stopped being blocked
- calculate durations and trends only once enough real events exist
- keep showing sample sizes, and hide conclusions below a minimum

## Saved data

`AppData` is at version 2. Saved version 1 data is upgraded when it loads, and its completions, nudges, and requests are kept. The new lists start empty, because that history did not happen. Data that is malformed, or that refers to people or tasks that do not exist, is replaced with sample data, and the screen says so.

## Known limits

- Events use a counter rather than the clock. Two tabs writing in the same instant could lose one change, which a person clicking cannot realistically cause.
- A task becoming overdue is not an event, because nothing is running when the app is closed. "What changed" therefore does not report it. A server job could.
- Question answers use simple pattern matching, so unusual wording may not be understood.
