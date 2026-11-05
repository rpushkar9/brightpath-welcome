# BrightPath Welcome: product and build plan

Status: approved 2026-11-04, including the new plan form.

## 1. The product in one paragraph

BrightPath Welcome gives each new hire one place to see what to focus on next, while the full plan stays one click away. Each plan combines company tasks with department tasks. Managers and HR use the same data to see who is on track and who needs help.

**Primary user:** the new hire in their first weeks.
**Secondary users:** the hiring manager (their own team) and HR (everyone).
**Why this first:** Sarah's stated goal is making onboarding easier "especially" for new employees, and missed steps are the core problem.

## 2. How the disagreement is resolved

David and Emily are not really in conflict. David's point is about **which tasks exist**, and Emily's is about **how many are shown at once**.

| Layer | Serves | What happens |
|---|---|---|
| Plan | David | Each plan is company tasks plus department tasks. Every task is labelled, so it is clear why it is there |
| Focus | Emily | The home screen shows at most three tasks. The full plan is one click away and only the current phase starts open |

## 3. The one workflow

1. Emily, an engineer on day one, opens the app and sees a greeting, where they are in the plan, and three next steps.
2. They open a task, read what it involves, and mark it complete. Progress updates straight away, and they can undo.
3. They open the full plan and see what is done, waiting on someone else, upcoming and overdue.
4. Marcus, in Sales, sees a visibly different plan.
5. David opens the team view. Emily's progress already matches, and a second window updates live.
6. Someone needing attention sorts to the top, with the reason written out. David opens their plan and sends a nudge.
7. Sarah sees everyone across departments and marks the IT access task done. Emily's blocked task becomes available.
8. **If approved:** Sarah starts a plan for a new hire. Choosing a department changes the task preview, and bad input is rejected.

**New plan form rules, if approved.** Only Sarah can use it. Fields are full name, job title, department, and start date; the manager follows from the department. Name and title are required after trimming, up to 80 characters. The start date must be today or later, within 180 days, and a weekday. The same name and start date cannot be used twice. The new hire appears on the roster with no completed tasks and becomes selectable in the persona switcher. Dates in the past are rejected, because backdating raises questions for Sarah.

## 4. Scope

### Build

- **Employee home:** greeting, start date, stage, progress, phase path, up to three next steps, what is waiting on others, what is coming up.
- **Full plan:** grouped by phase. The current phase and any phase with overdue work start open, and fully finished phases start collapsed.
- **Task detail:** what to do, why it matters, owner, due date and label. Complete and undo. A drawer on desktop, full screen on mobile, with its own link.
- **Manager and HR view:** one sentence of summary, a roster sorted by need, progress, overdue counts, status with a written reason, and a filter.
- **Employee detail for managers:** the same plan rows, the reason for any flag, and a nudge.
- **Persona switcher and demo reset**, kept visible but out of the way.
- **Local persistence and live sync between tabs.**

### Not building (and why)

| Excluded | Why |
|---|---|
| Real login and permissions | The assignment allows a role switcher, and security work would not show in a demo |
| Template editor or rule engine | Sarah said "eventually". Plans are data, so a builder can come later |
| AI plan generation | MangoApps already advertises this. An LLM call adds risk without proving the core flow |
| Real document upload, e-signature, I-9 | Faking compliance is risky. Tasks describe the step and record the person's confirmation |
| Real email, Slack or calendar | No backend. A nudge appears only inside the app, and the UI says so |
| Charts, analytics, gamification | They answer no question in the brief |
| Native mobile | A responsive web app covers the need |

## 5. Rules

These are the product's actual definitions. Tests cover them, and the UI uses them everywhere.

### Dates

- Each task has `opensDay` and `dueDay`, in **business days** relative to the start date, where 0 is the first day and negative numbers fall before it.
- Start dates and due dates never land on a weekend. Dates are local calendar dates with no time component.
- "Today" is the real clock. Domain functions take it as an argument, so tests can fix it.
- Sample start dates are worked out from the most recent business day when the data is seeded. If seeded on a weekend, Emily's first day is the previous Friday, so they show as First week.
- Saved dates stay fixed until reset, so time passes realistically and the demo can drift. Reset refreshes it, and the reset menu shows the seed date.
- **Phases and stages** use the same business-day ranges: Before day one (below 0), First day (0), First week (1 to 4), Weeks 2–4 (5 to 21). Beyond 21, the stage is Past day 30.

### Task status

Exactly one status applies, checked in this order:

| Order | Status | Rule | Treatment |
|---|---|---|---|
| 1 | Completed | Has a completion record | Filled check, date done |
| 2 | Upcoming | Today is before `opensDay` | Dashed circle, read-only, "Opens Mon, Nov 9" |
| 3 | Waiting | A prerequisite is not complete | Hourglass, "Waiting on IT", read-only |
| 4 | Overdue | Today is after `dueDay` | Brick colour and clock icon, "Was due Tue", calm wording |
| 5 | Outstanding | Otherwise | Empty circle, "Due Thu" or "Due today" |

- A task becomes overdue on the **next business day** after its due date. A Friday task is not overdue until Monday, and lateness is counted in business days.
- A waiting task is never overdue. Only the task actually holding things up counts, and it counts once, against its own owner. One late IT task blocking three others is one overdue task, owned by IT, so a new hire is not blamed.
- A task has at most one prerequisite, in the same plan. Sample data must open the prerequisite no later than the dependent task and make it due earlier. A test checks this for every template.
- Sample dependencies: "Set up your laptop" needs IT's "Prepare laptop". Engineering's "Run the local setup" needs IT's "Grant repository access". Sales's "CRM walkthrough" needs IT's "Create CRM account".
- Status is colour plus icon plus text, never colour alone.

### Your next steps

- Include tasks the employee owns that are Overdue or Outstanding.
- Sort by oldest overdue first, then soonest due, then plan order. Show three.
- If more exist, show "2 more open in your plan". If none, show "Nothing needs you today" with the next opening date.

### Progress

- Completed tasks divided by all tasks in the plan, **including those owned by others**, shown as "6 of 17 done".
- Every view uses one function, so numbers cannot disagree.
- New hires also see their own share, shown as "Your tasks: 4 of 12 done. Whole plan: 6 of 18." A task owned by someone else moves only the whole plan.

### Who can do what

| Task owner | Who can complete and undo it |
|---|---|
| New hire | That new hire |
| Manager | That hire's manager |
| HR | Sarah |
| IT | Sarah, standing in because the prototype has no IT role |

- Sarah cannot complete tasks owned by the new hire or the manager. Everyone else's tasks are read-only in each view.
- Managers see only their own team. Sarah sees everyone. Anything else shows a clear "not on your team" or "not found" state.
- A task with a completed task depending on it cannot be undone. The UI names the dependent task to undo first.
- Marking complete is the person's own confirmation. Nothing verifies the real-world step, and the home screen and task drawer say so.

### Your next actions

- Managers and HR see the open tasks they can complete, most overdue first, each linking to the real task.
- Sarah sees HR tasks and IT tasks apart, because Sarah only stands in for IT.
- A task shows what it blocks, naming whose task that is. Only tasks already open count.

### Questions and help

- "Have a question?" answers from the person's own plan using simple matching. It says it is not AI, and says so when a question is not covered.
- A help request goes to Sarah for IT or HR work, and otherwise to the manager. It has a prepared, editable message, and only one can be open per task.
- Only the recipient can mark it resolved, and the new hire sees that status. No email is sent.

### Tour

- Each person's tour opens once, the first time they reach their main screen in this browser, and shows only what is on that screen.
- It waits if someone arrives through a link to a task, and it does not open on a bad link.
- Skipping counts as seen. **Show me around** replays it. Resetting demo data does not bring it back.

### Hire status

| Status | Rule |
|---|---|
| Complete | Every task is done |
| Needs attention | Two or more overdue tasks, or any task 3 or more business days overdue |
| Watch | One task overdue by fewer than 3 business days |
| On track | Nothing overdue |

- The written reason always appears beside the status, including the owner: "2 overdue: 1 Marcus, 1 IT".
- **Stage** is separate: Preboarding, First day, First week, Weeks 2–4, Past day 30. A person can be in any stage with any status.
- The roster sorts by Needs attention, Watch, On track, then Complete. Within each group, the most overdue comes first.

### Phase path

- The marker shows the current phase by date. The bars show only completed tasks, so finishing a task never moves the marker.

### Nudge

- A manager or Sarah can send the new hire a fixed message about one of **the new hire's own** overdue tasks. It appears on the employee's home until dismissed or until that task is finished, since a reminder about finished work is noise.
- Each hire can be nudged once per day. The roster then shows "Nudged today". The UI states that no email is sent.
- There is no nudge for overdue IT, HR or manager tasks. The detail view shows who owns them, and Sarah or the manager can complete their own from there.

## 6. Sample data

| Person | Team | Role in the demo |
|---|---|---|
| Emily Carter | Engineering, David | First day (offset 0). Three focus tasks, one blocked on IT |
| Priya Nair | Engineering, David | Week 3 (offset 11), needs attention with two tasks that slipped, so David's view has someone to help |
| Jordan Lee | Engineering, David | Starts in 5 business days, preboarding |
| Marcus Webb | Sales, Renee | Week 2 (offset 7), needs attention with overdue tasks |
| Aisha Rahman | Sales, Renee | Started 25 business days ago, so every task has opened and all are done |
| Tomás Rivera | Sales, Renee | First week (offset 2), one small overdue item (Watch) |

**Our guess:** the scenario never gives Emily a department. We place them on David's team so one story covers both people.

Managers are David Park (Engineering) and Renee Walsh (Sales), plus Sarah Mitchell (HR). The scenario gives first names only, so surnames and every other person are invented.

Plans run 18 tasks: 11 company tasks plus 7 for the department. Tasks span the four phases and four owner types. Exact wording is written during the build and must sound like a real company.

**Honest behaviour rule:** references to handbooks or systems are labelled as sample content. No link or button pretends to go somewhere it does not.

## 7. Edge cases we will test

| Case | Expected result |
|---|---|
| Everything done | A quiet finished state, not an empty list |
| Nothing open today | "Nothing needs you today" and the next opening date |
| Filter with no matches | Explains the empty filter and offers to clear it |
| Task or hire link that does not exist | Clear message and a way back |
| Link to someone outside your team | "Not on your team" |
| Corrupted saved data | Restores sample data and says so, no crash |
| localStorage blocked or full | App works for the session and warns that changes will not be saved |
| Two tabs open | Changes in one appear in the other |
| Undo a task something depends on | Blocked, with the reason |
| Double-clicking complete | One completion, no flicker |
| Refresh after changes | State preserved |
| Long names, 360px width | No horizontal scrolling or broken layout |
| Weekend date | Friday tasks not overdue until Monday, and seeding works on a Saturday. Tests use fixed dates |
| Reduced motion | Animations are replaced, state changes stay visible |

## 8. Design direction

**Decision (our call):** adapted from direction A in `research/design-references.md`.

- **Palette:** neutral warm white `#F7F6F3`, white surfaces, ink `#1C2321`, muted `#59635F`, pine accent `#1F6F5C`, brick for overdue. All text pairs recomputed at 4.5:1 or better, and control borders at 3:1 or better.
- **Type:** Bricolage Grotesque for the greeting and headings, Instrument Sans for the interface. If Instrument Sans lacks tabular numerals, Inter replaces it.
- **Why not the recommended Fraunces and cream:** that pairing has become a recognisable AI-generated look.
- **Signature element:** one thin phase path (Before day one, First day, First week, Weeks 2–4) with a "you are here" marker. It shows progress and the plan's shape without a chart.
- **Layout:** lists and tables rather than card grids, borders rather than shadows, radius 6 and 10.
- **Phone home screen:** a one-line greeting, then one compact line for stage and progress in place of the full phase path, then next steps. Waiting and coming-up items sit below them. It is designed for phones, not squeezed from desktop.
- **Motion:** CSS only, 100 to 300ms, using the spec in the design note. No confetti or bounce. Under reduced motion, it becomes a short fade.
- **Copy:** plain and calm, with no exclamation marks and no blame.

## 9. Technical approach

| Choice | Why |
|---|---|
| Vite, React, TypeScript | Assignment allows any stack, and this is fast and simple to run |
| Tailwind v4, copied shadcn/ui parts | Accessible drawer and menu primitives, kept to what we use |
| Hash-based routing | Links work on any static host with no server configuration |
| One small store with `useSyncExternalStore` | Handles localStorage and tab sync without a state library |
| `src/domain/` of pure functions | Status, progress and selection can be tested without a browser |
| Vitest, Playwright, axe | Logic tests, a real browser journey, an automated accessibility check |

Version check at setup: confirm TypeScript 7 works with the toolchain, and pin whichever version does. The shadcn skill is optional; we add it only if it clearly saves time.

## 10. Build order and time budget

| Step | Target | Done when |
|---|---|---|
| 1. Git, scaffold, design tokens | 10 min | App runs and builds |
| 2. Domain logic, sample data, tests first | 20 min | Rules in section 5 pass |
| 3. Employee home, drawer, full plan | 40 min | Steps 1 to 4 of the workflow work |
| **Checkpoint** | | You review the real screen |
| 4. Manager and HR views, nudge | 25 min | Steps 5 to 7 work |
| 5. Start a new plan (if approved) | 15 min | Step 8 works |
| 6. Browser QA, accessibility, mobile, fixes | 20 min | Section 7 checked |
| 7. Codex review and fixes | 10 min | Findings triaged |
| 8. README and demo script | 10 min | Fresh-clone install tested |

Total is about 2 hours 30 minutes, leaving 30 minutes spare. If time runs short, cut in this order: new plan form, nudge, tab sync, plan motion.

## 11. Acceptance criteria

| # | Criterion | How it gets checked |
|---|---|---|
| 1 | A new hire can see their priorities within seconds | All three tasks visible without scrolling at 1440x900 and 390x844 |
| 2 | Engineering and Sales see different tasks | Automated test and visual check |
| 3 | Completing a task updates progress immediately | Browser test |
| 4 | The manager view shows the same completion state | Browser test across personas and tabs |
| 5 | A manager can spot someone needing attention | Top roster row, written reason |
| 6 | Upcoming and overdue are distinguishable | Icon, colour and wording, checked in screenshots |
| 7 | Refresh keeps saved progress | Browser test |
| 8 | Empty, complete and invalid states are handled | Section 7 cases |
| 9 | Desktop and mobile remain usable | 1440px and 360px screenshots, no sideways scrolling |
| 10 | No critical errors in the main journey | Console clean during the browser test |

## 12. Rubric map

| Rubric | How we show it |
|---|---|
| Focus | One workflow, a clear exclusions table |
| Assumptions | `decisions.md`, and the David and Emily framing in the demo |
| It works | Tested journey and believable, uneven data |
| Attention to detail | Section 7 tests and `ai-review-log.md` |
| Communication | Demo opens by explaining the problem to someone who has not read it |
