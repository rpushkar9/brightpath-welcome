# BrightPath Welcome implementation plan

> Executed natively in one session, because every task shares the same domain types and store, followed by an independent Codex review.

**Goal:** build the approved workflow as a static, browser-only React app.

**Architecture:** pure domain functions in `src/domain/` take data and `today` as arguments. One small store owns state, localStorage and tab sync. The URL holds the persona and screen, so tabs stay independent. React components only display domain results.

**Tech stack:** Vite, React, TypeScript, Tailwind v4, Radix Dialog and Dropdown Menu, sonner, lucide-react, Vitest, Playwright, axe.

**Spec:** [plan.md](plan.md)

## Global constraints

- No backend, login or paid API.
- Status is shown with colour, icon and text.
- At most three next steps on the home screen.
- No control pretends to do something it does not.
- Text contrast at least 4.5:1, control borders at least 3:1.
- Motion from 100 to 300ms, with a reduced-motion fallback.
- Copy has no exclamation marks and does not blame people.
- `today` is always passed in to domain functions.

## Review focus

Each has a test in the task that owns the code.

1. Dates near midnight or in other time zones must not shift a day (`new Date('YYYY-MM-DD')` parses as UTC).
2. Saved state that is corrupt, older, or refers to unknown people must not crash the app.
3. A stale tab or a double click must not create duplicate or conflicting completions.
4. A new plan close to its start date must not begin with overdue tasks.
5. A link to someone else's task, or a persona that a reset removed, must show a clear message.

## Task 1: Scaffold

**Create:** `package.json`, `index.html`, `vite.config.ts`, TypeScript config, `src/main.tsx`, `src/index.css`, `.gitignore`.

- [ ] Initialise Git and exclude local AI files through `.git/info/exclude`.
- [ ] Install the stack and check TypeScript 7 works with it. Pin what works.
- [ ] `npm run build` passes and the design tokens load.

## Task 2: Domain logic and sample data

**Create:** `src/domain/{types,dates,templates,plan,rules,seed,newHire}.ts` and matching `.test.ts` files.

**Produces:**

```ts
addBusinessDays(date: IsoDate, n: number): IsoDate
businessDaysBetween(from: IsoDate, to: IsoDate): number  // weekdays in (from, to]; negative if to < from
buildPlan(hire: Hire, state: AppData, today: IsoDate): PlanTask[]
nextSteps(plan: PlanTask[]): { shown: PlanTask[]; moreCount: number }
progress(plan: PlanTask[]): { done: number; total: number; percent: number }
hireHealth(plan: PlanTask[]): HireHealth
stageOf(hire: Hire, today: IsoDate): Stage
completeTask / undoTask / sendNudge: (state, ...) => Result<AppData>
validateNewHire(input, state, today): { ok: true; hire: Hire } | { ok: false; errors: FieldErrors }
createSeed(today: IsoDate): AppData
```

Required tests, using fixed dates:

- [ ] Business-day arithmetic across weekends, including negative offsets, and in a non-UTC time zone.
- [ ] Every status in the plan's order. Friday-due is not overdue on Saturday, and is overdue on Monday.
- [ ] One late IT task blocking others counts as one overdue task, owned by IT.
- [ ] Next steps order and the limit of three. Only the employee's own open tasks qualify.
- [ ] Hire health thresholds and sort order. Permissions for each owner and persona.
- [ ] Undo is refused while a completed task depends on it. A second completion changes nothing.
- [ ] Templates are valid: unique IDs, opens on or before due, valid prerequisites.
- [ ] Seed gives each sample person the planned status, including a Saturday seed.
- [ ] New plan validation: blank, overlong, past, weekend, over 180 days, and duplicate after trimming and ignoring case. A plan starting today begins with nothing overdue.

## Task 3: Store and routing

**Create:** `src/store/store.ts`, `src/store/persist.ts`, `src/app/route.ts` and tests.

- [ ] `parseRoute(hash)` handles every screen and treats anything unknown as not found.
- [ ] `loadState` handles missing, corrupt, wrong-version and invalid-reference data, and reports a restore.
- [ ] Blocked storage keeps the app running in memory and reports it.
- [ ] A `storage` event from another tab updates the current one.

Routes: `/me/:hireId`, `/me/:hireId/plan`, each with `/task/:taskId`; `/team/:leaderId`, `/team/:leaderId/hire/:hireId` with `/task/:taskId`; `/team/sarah/new`.

## Task 4: Employee experience

**Create:** `src/ui/` shell, status icon, task row, phase path, home, full plan, task drawer.

- [ ] Home, plan and drawer work with real store actions, with toast undo.
- [ ] Empty, finished and not-found states render.
- [ ] Screenshots reviewed at 1440x900 and 390x844.
- [ ] **Checkpoint: user reviews the real screen.**

## Task 5: Manager and HR

- [ ] Roster table and phone list, filter, summary line, sort.
- [ ] Hire detail with the reason for any flag and permitted actions. Nudge reaches the employee's home.
- [ ] Manager scope enforced from the URL.

## Task 6: New plan form

- [ ] Sarah only. Live task preview changes with department, and errors appear inline.

## Task 7: Verification

- [ ] Playwright covers the full journey, persistence, tab sync, corrupted data and bad links.
- [ ] axe reports no violations on each main screen.
- [ ] Keyboard and reduced-motion checks done in the browser.
- [ ] Codex review, then triage. Results recorded in `ai-review-log.md`.

## Task 8: Delivery

- [ ] Root README, `demo-script.md`, fresh-clone install test.
