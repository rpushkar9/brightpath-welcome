# Onboarding landscape: competitive note

Date: 2026-11-04. Method: standard web search plus two page fetches of MangoApps. Search summaries were produced by a small model, so quotes are paraphrase-level; re-check any line before quoting it in the submission.
Tags: [doc] = vendor help doc, [claim] = vendor marketing, [3p] = third-party page, [?] = could not verify.

## 1. Comparison table

| Product | New hire view | Assignment and department variation | Manager / HR view | Overdue / at-risk | Idea worth borrowing |
|---|---|---|---|---|---|
| MangoApps Onboarding Hub [claim] | Token-secured preboarding portal before Day 1; dashboard of "personalized onboarding tasks and resources"; mobile; checkpoints | Tasks assigned to new hire, manager, mentor, buddy, HR, IT or admin, with day-offset due dates. Auto-matcher scores templates by role, department, location; "most-specific match wins" | Completion dashboard; "starting soon, first week, first month, needs attention" views | Weekly manager overdue alert (max weekly per plan), Monday digest; doc/form reminders at 7d, 3d, due, daily overdue | Own-role task owners; most-specific template match; "needs attention" bucket |
| BambooHR [doc] | Onboarding tab; pre-start "New Hire Packet" by email; mobile Welcome Checklist | Templates of tasks; assigned to people; no department branching verified [?] | Task lists per hire [partial] | Not verified [?] | Split pre-day-one tasks from in-system tasks |
| Gusto [doc] | Checklist, shown only after offer signed | Customisable templates; department variation [?] | Admin People > Onboarding list of not-yet-active hires; per-hire checklist | No email alert on task completion (a gap to avoid); Pending status until start date | Clear lifecycle states: Pending, Onboarding, Active |
| Kallidus Sapling [doc] | Not verified [?] | Tasks and documents assigned to team members | Dashboard: open tasks, docs, approvals; hire shown while tasks outstanding or start date under 14 days | Open vs Overdue tabs; bulk complete | Overdue tab as a filter, not a separate system |
| HiBob [claim, 3p] | Not verified [?] | Tasks for managers, IT, peers; conditions (e.g. location) add tasks; reusable flows | Manager task lists | Reminders for manager check-ins [claim] | Condition-driven tasks |
| Rippling [claim] | Not verified [?] | Triggers on start date, location, role, department; device shipping by department | Workflow-level alerts | Example alert: onboarding unfinished on start date | Rule: "if not done by start date, alert owner" |
| Workday Onboarding Plans / Journeys [claim] | Preboarding from offer accept; SMS to prehires | Personalised recommendations "by role" [claim] | "Visibility into plans, progress and effectiveness" [claim] | Not verified [?] | Journeys beyond onboarding (reuse same engine) |
| Enboarder [claim, 3p] | Timed, mobile, pre-start and post-start touchpoints | Journeys triggered from HRIS; HR can describe a journey in plain language and an LLM assembles it | Manager Nudges: pre-written messages, one-click send, in Slack/Teams | Milestone prompts to managers | Nudges with the action pre-written; AI draft of a plan |
| Trainual [claim] | Role playbooks of short topics in order | Bulk-assign by role, department, location | Not verified [?] | Not verified [?] | Role path = ordered short steps |

Not covered (nothing sourced): Personio (no Personio docs found), Deel, Lattice, Microsoft Viva/Teams templates.

## 2. Recurring patterns

- Template plus person: a reusable template is instantiated per hire, with due dates as offsets from start date (MangoApps, BambooHR, HiBob, Rippling).
- Every task has an owner who is not the new hire: HR, IT, manager, buddy (MangoApps, HiBob, third-party guides).
- Pre-start vs post-start: a distinct preboarding phase (MangoApps, BambooHR, Workday, Enboarder).
- Variation by attributes (role, department, location), usually via conditions or "most specific template wins".
- Manager and HR get a roster view of hires with filters for open vs overdue (Sapling, MangoApps, Gusto).
- Reminders are rule-based on due date and sent to the owner, often the manager.
- Hires leave the onboarding view once tasks are done or after a window (Sapling 14 days, Gusto Active).
- Public pages say little about how the new hire is told what to do first. Most describe a checklist. This is the gap Emily's story points at.

## 3. Ranked ideas to borrow (3-hour scope)

1. Phase grouping with a single "Focus now" card (Before day one, Day 1, Week 1, Weeks 2-4). Why: addresses Emily directly; collapses the 40-task problem. Size: small, a derived "current phase" plus top 3 tasks, the rest collapsed.
2. Status model with four states: Completed, Outstanding (due now), Upcoming (not yet due), plus Overdue/Blocked as a flag. Why: Sarah's explicit ask; mirrors Sapling's Open/Overdue and Gusto's Pending/Onboarding/Active. Size: small, one derived function on due date and status.
3. Task owner field (new hire, manager, HR, IT, buddy) with due date as day offset from start. Why: MangoApps already models this, and it makes unclear ownership visible. Size: small, two fields.
4. Blocked-by-dependency (e.g. "Laptop login" waits on "IT creates account"): show the new hire "waiting on IT" instead of overdue. Why: dependencies on other people are the commonly cited friction (3p sources, section 4). Size: small, one optional `blockedBy` id.
5. Manager view with "needs attention" bucket, roster by hire with progress and overdue counts. Why: MangoApps names exactly this view; Sapling and Gusto confirm the pattern. Size: small-medium, a table with a filter.
6. Department templates with "most specific match wins" (role > department > default). Why: David's story; MangoApps mechanism. Size: small if only 2-3 hardcoded templates plus common core tasks.
7. Manager nudge with the message pre-written and one click (Enboarder). Why: low-effort demo of the reminder concept. Size: small, a button that "sends" a canned message and logs it.
8. Stretch: "Generate plan" from role/department via a rules function, labelled as the stand-in for AI generation (Enboarder and Workday claim AI/personalisation). Size: medium; only if time remains, and use the same template matcher, not a real LLM call.

## 4. Do NOT borrow

- Heavy workflow builders (Rippling Workflow Studio, HiBob conditions UI): hours of work, invisible in a demo.
- Full e-signature, compliance, I-9/verification flows (MangoApps Onboarding Hub lists them): out of scope and risky to fake.
- Gamification or engagement scoring: no sourced evidence that MangoApps' onboarding uses it (Getting Started article mentions none).
- Gusto-style no-notification-on-complete: leaves managers checking manually.
- Vendor outcome numbers (34% engagement, "under 50 days"): unsourced marketing, do not cite as evidence.
- Hiding the checklist until an external gate (Gusto offer signed): confusing for pre-start visibility.
- Journeys beyond onboarding (promotions, leave): scope creep.

## 5. What MangoApps' positioning implies for us

- Verified: MangoApps sells an employee-experience / intranet platform with an Onboarding Hub app, LMS, and a "Getting Started Mission" widget; the onboarding page says plans combine tasks, documents, forms, training and checkpoints [claim].
- Their own words worth reusing: "Onboarding Journeys & Plans", "Smart Template Matching", "Preboarding", "checkpoints", "needs attention", "starting soon / first week / first month". Using the same nouns shows we read their product.
- They already advertise template matching, manager alerts and AI-drafted plans, so our prototype will not look novel on those. The key-features page says AI can draft a 30/60/90-day plan, which "saves as an inactive template for an admin to review, never as a live plan" (re-checked 2026-11-04). Differentiate on the new hire's focus experience: what comes first, and what is waiting on someone else. Do not present plan generation as a gap in their product.
- Frontline and mobile are in their pitch (login without corporate email); keep the employee view mobile-friendly.
- Dashboard widgets are their idiom: frame the employee view as a widget-sized "Your first weeks" card that could sit on their dashboard.
- Removed claim: an earlier draft cited "11 installs" and inferred a young product. The app page shows no install count and cites rollouts at AutoZone (125,000), PetSmart (50,000+), and A.S. Watson and Raley's (20,000) [claim]. Make no claims about product maturity.
- Views differ by page: "starting soon, first week, first month, needs attention" appears on the key-features page, not on the app page.

## 6. Evidence on what goes wrong

- Overwhelm: BambooHR/TalentLMS survey (May 2025, n=1,156) reports 42% felt overwhelmed by onboarding info [claim, vendor survey]. Adobe survey (n=1,006) reports about 13 documents and 12 hours of material in week one, and says problems are about delivery and organisation, not volume [claim, vendor survey]. BambooHR whitepaper recommends a roadmap rather than cramming day one.
- Duplicate data entry: Adobe: nearly two-thirds asked for the same info more than once [claim].
- Late provisioning of IT access: checklist vendor says delays come from starting provisioning late [3p, vendor blog]. A "one in five poor onboarding, IT friction among top complaints" figure is attributed to BambooHR research but I could not trace the original [?].
- Ownership blur: a third-party checklist template notes nobody is assigned IT/HR/manager tasks [3p].
- Reviews: I found NO G2/Capterra review text about checklist overwhelm. One G2 reviewer (Onboard Software) wants in-app reporting on where delays occur. BambooHR G2 cons are generic (missing features, limited customisation, reporting). Treat review-based evidence as thin.

## 7. Sources

- https://www.mangoapps.com/key-features/onboarding (fetched)
- https://www.mangoapps.com/articles/getting-started-experience (fetched)
- https://www.mangoapps.com/apps/onboarding-hub
- https://www.mangoapps.com/newsroom/mangoapps-introduces-the-latest-revolution-in-employee-onboarding
- https://lms.mangoapps.com
- https://bamboohr.screenstepslive.com/m/53914/l/587621-activating-the-onboarding-or-offboarding-process
- https://bamboohr.com/product-updates/mobile-onboarding-welcome-checklist
- https://support.gusto.com/article/210728175340400/View-and-complete-onboarding-checklists
- https://kallidus.zendesk.com/hc/en-us/articles/360018344838
- https://www.hibob.com/onboarding-software/
- https://www.hibob.com/blog/onboarding-automation-using-task-lists/
- https://rippling.com/workflow
- https://www.rippling.com/blog/automated-onboarding-workflows
- https://workday.com/en-us/products/talent-management/onboarding-plans.html
- https://www.cmu.edu/hr/news/2024/01-31-journey.html
- https://enboarder.com/platform/employee-experience-journey/
- https://trainual.com/onboarding-training
- https://www.g2.com/products/onboard-software-inc-onboard/reviews
- https://www.g2.com/compare/adp-onboarding-vs-bamboohr
- https://www.adobe.com/acrobat/resources/new-hire-onboarding-research.html
- https://hrexecutive.com/?p=165631
- https://www.bamboohr.com/resources/assets/whitepapers/onboarding-mistakes.pdf
- https://www.hrcloud.com/resources/onboarding-checklists-templates/software-access-checklist
