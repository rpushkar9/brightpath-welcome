# Final quality pass plan

Status: approved and built on 2026-11-04. Forest green kept, with no colour change.

Sources are the user's seven-point brief and a read-only Codex review. The lead session checked each claim against the code.

## Changes

| Order | Change | Smallest version | Serves | Estimate |
|---|---|---|---|---|
| 1 | Full plan link disappears when nothing is open | Move the link outside the condition in `NextSteps`, and extend the empty-state test | It works, Detail | 5 min |
| 2 | "Everyone is on track" appears while someone is on Watch | Make the `TeamView` headline aware of Watch, such as "One person to watch." | It works, Detail | 5 min |
| 3 | Form does not explain templates | Add a hint: "Department selects the task template and manager. Job title is descriptive and doesn't change tasks." | Assumptions | 5 min |
| 4 | "You are here" marker moves with completion, not time | Put the marker beside the current phase label. Bars keep showing completion only | Detail, Communication | 5 to 10 min |
| 5 | Self-confirmation is not clear | One line under next steps and one in the drawer beside Mark complete: "Checking this off records your confirmation. It doesn't submit forms or verify work in other systems." | Assumptions, Detail | 10 min |
| 6 | Owner is hidden or wrong for Sarah | IT and HR tasks keep their real owner in `ownerText` and `TaskRow`, instead of "You" or nothing | Detail | 5 to 10 min |
| 7 | "IT is finishing" claims something unknown | Replace it with "Waiting for IT to finish" wording | Detail | 2 min |
| 8 | Downstream impact is invisible to managers | Derive it from `requires` and show it in "Why flagged", such as "Blocks Tomás: Review CRM workflows". Count only tasks already open | Focus, Communication | 15 min |
| 9 | Employee progress mixes in other people's tasks | Text only: "Your tasks: 4 of 12 done. Whole plan: 6 of 18." Both come from `progress()`. No cards | Assumptions, Communication | 15 to 20 min |
| 10 | Managers and HR have no list of their own work | A small "Your next actions" above the roster, from `canAct`. Managers see three and HR sees two per group, then it expands. Sarah sees HR and IT separately. Each row links to the real task drawer | Focus, It works | 25 to 40 min |
| 11 | Secondary screens have tall headers | A compact band on the plan, hire detail and form screens. Remove the phase path from the full plan, which repeats the phases below it. On phones, put "What you can do" before "Why flagged" | Focus, Communication | 15 to 20 min |
| 12 | Verification and docs | Update tests, view desktop and phone screenshots, rerun everything, update README and demo script | All five | 15 to 20 min |

The sum is about 2 hours if every estimate is taken at its slowest and each step is done by hand. At this session's measured pace it should take much less, but that is an expectation, not a promise.

## If time runs short

Cut in this order: 11, the expansion in 10, 8. Items 1 to 7 are small, and fix defects or state assumptions that the rubric scores directly.

Stop building when 30 minutes of the 3-hour limit remain, and use them to rehearse and record.

## Changes to what Codex proposed

- **Confirmation copy appears in two places, not three.** Repeating it in every plan row is noise.
- **No confirmation dialogs or new task states.** Codex agreed on this.

## Colour decision

**Recommendation: keep forest green and do not adopt MangoApps colours.**

- BrightPath is the customer in the scenario, so its product should not wear a different company's brand. It may read as imitating MangoApps' identity, or as confusion about who the customer is.
- MangoApps' orange and yellow are close to the amber and brick used for Watch and overdue, so status would become harder to read.
- The logo and the path marker already use a warm gold, so the theme link already exists.
- Optional: move that one gold token slightly toward mango orange. It is one line, can be reversed, and would need a contrast check.

## Rules unchanged by this pass

No backend, authentication, paid service, AI generation, notifications, new permissions, new task states, charts, or rebrand.
