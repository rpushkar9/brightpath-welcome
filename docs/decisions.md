# Decisions and assumptions

Newest additions go at the bottom of each table. "Ask Sarah" marks what we would check with the customer.

## Product assumptions

| # | Assumption | Why | Ask Sarah |
|---|---|---|---|
| A1 | Emily is an engineer on David's team | The scenario gives no department, and this lets one story cover both | No |
| A2 | Plans have company tasks plus department tasks | Addresses David while keeping shared requirements | Which tasks must every department do? |
| A3 | The home screen shows at most three tasks | Addresses Emily. Three is our judgement, not a sourced rule | Does this match what new hires want? |
| A4 | Tasks open and fall due on fixed business-day offsets from the start date | MangoApps uses day offsets too, and hires start on different dates | Are any dates legally fixed? |
| A5 | A task becomes overdue the next business day after its due date | The whole due date should count, and weekends should not create overdue work | No |
| A6 | Upcoming tasks cannot be completed early | Keeps focus simple, and many tasks only make sense on their day | Should some paperwork be allowed early? |
| A7 | Completion is the person's own confirmation | No integrations in the prototype | What needs real proof? |
| A8 | Each person can undo what they can complete, except where a later task depends on it | Mistakes happen, and dependency order must stay valid | Should HR-verified items lock? |
| A9 | New hires see their own tasks and the whole plan, and managers see the whole plan | A new hire can't finish other people's tasks, but managers need the full picture | Do managers want it split by owner? |
| A10 | Overdue work counts against its owner, and waiting tasks are not overdue | New hires should not be blamed for late IT work | Who chases IT today? |
| A11 | Managers see their team, and HR sees everyone | The least access that meets the request | Should a buddy or IT see plans? |
| A12 | Needs attention means 2+ overdue tasks, or one 3+ business days late | A simple rule that can be explained in a sentence | What would make you step in? |
| A13 | Plans cover about the first 30 days | "First few weeks" in the request | When does onboarding end at BrightPath? |
| A14 | Sarah stands in for IT in the prototype | Avoids building a role that adds no insight | Who owns access requests? |
| A15 | People and task wording are invented and US-based | Mock data is allowed | Which regions do you hire in? |
| A17 | Blocked-task and IT or HR questions go to Sarah, and everything else starts with the manager | The person who can act should hear about it | Who should new hires ask about IT today? |
| A16 | A plan started late moves any passed due dates up to its creation date | A new hire should not begin with overdue tasks | What is your usual lead time before a start date? |

## Deliberate exclusions

See section 4 of [plan.md](plan.md).

## Design and technical decisions

| # | Decision | Alternative rejected | Why |
|---|---|---|---|
| D1 | Task detail in a drawer with its own link | Separate page, modal | Keeps the list visible, and Back works |
| D2 | Complete with one click and offer undo | Confirmation dialog | Fast and reversible |
| D3 | Roster as a table, collapsing to a list on mobile | Cards | Managers compare people on the same attributes |
| D4 | Neutral warm white, Bricolage Grotesque, Instrument Sans | Cream with Fraunces | Avoids a recognisable AI-generated look |
| D5 | Phase path as the signature element | Progress ring, KPI cards | Shows the plan's shape and answers a real question |
| D6 | Plain React store and hash routing | State library, server routing | Less code and no hosting setup |
| D7 | A nudge only goes to the new hire, about their own overdue task, once per day per hire | Nudging IT or managers | The prototype has no IT inbox, and pretending otherwise would be fake behaviour |
| D8 | Each task has at most one prerequisite, in the same plan | Full dependency graph | Covers the real IT-access case with far less logic |
| D9 | Persona and screen live in the URL | Saved persona | Two windows can show Emily and David at once, and links work after refresh |
| D11 | Keep forest green, not MangoApps colours | Full MangoApps palette | BrightPath is the customer, and orange and yellow sit too close to the Watch and overdue colours |
| D12 | "Your next actions" stays short, three for managers and two per group for HR | A full task inbox | The people the headline names must stay near the top of the screen |
| D13 | Questions use simple rules over the real plan, labelled "not AI" | A real AI model | A public static site cannot hold an API key, and a model needs a backend. Rules are reliable and honest for a demo |
| D14 | Help requests stay in the app, and go to whoever can act | Prefilled email | Works end to end with no invented addresses, and managers see it in one place |
| D15 | Help requests have only open and resolved | Threaded replies | A reply needs a real messaging product. Status is enough to show the idea |
| D10 | Radix primitives styled directly | The full shadcn setup | shadcn wraps these same primitives, and we only need a drawer and a menu |

## Approved decisions

- Plan approved on 2026-11-04, including the "start a new plan" form. It is built last and cut first if time runs short.
