# BrightPath Welcome: design reference note

Date: 2026-11-04. Tags: **[S]** = sourced from a page I fetched (URL in section 6). **[J]** = my design judgement or prior knowledge, not verified this session. Contrast ratios were computed by me (WCAG relative-luminance formula, script run locally), not taken from a source.

## 1. Reference table

| Product | Learn | Avoid | Basis |
|---|---|---|---|
| Linear | Colour themes built from base, accent and contrast variables in LCH, so equal lightness looks equal; Inter plus Inter Display for headings; reduced visual noise; neutral look with limited accent. [S] | Its keyboard-first density. A nervous new hire needs more air. [J] | Linear blog |
| Things 3 | Today and Upcoming lists, checklists inside a to-do, headings to group. Today holds only what you chose for now. [S] | Its personal-planning model: BrightPath's plan is assigned by HR, not self-curated. [J] | Cultured Code features |
| Duolingo | A single "clear path to follow" because users were unsure they were doing it "correctly". Replaced crowns with distance along the path. [S] | Caution: gamified streaks, mascots and guilt nudges. Do not copy for adults on day one. Streak pressure is my judgement. [J] | Duolingo blog |
| Stripe Dashboard | Colour system with predictable contrast between scale steps (5 steps apart is enough for small text, 4 for icons); darkening colours to pass made them "muddy", so tint backgrounds instead. [S] | Dense data-first screens. [J] | Stripe blog |
| Vercel (Geist) | Colour scale roles: 100-300 backgrounds, 400-600 borders, 700-800 solid fills, 900-1000 text. Copy the role-based token structure. [S] | Monochrome austerity; too cold for this brief. [J] | Geist colors |
| Asana My Tasks | Not verified: help page returned no body. From memory it groups tasks by due window. [J] | Treating it as evidence. | none |
| Notion, Attio, Height, Superhuman, Raycast, Mercury, Ramp, Rippling, Apple Reminders | Not fetched or fetch failed (Superhuman 404). Treat as inspiration to look at in a browser, not as sourced claims. Suggested focus (J): Attio for calm table density; Mercury and Ramp for restrained fintech palettes; Rippling for HR-admin roster patterns; Apple Reminders for single-tap complete. | Copying any layout or branding. | none |
| Apple HIG | Pair colour with text or icon, 44pt touch targets, honour Reduce Motion. Page text did not load; these points came from my own knowledge. [J] | n/a | HIG (unverified) |

Principles only; no product branding is to be reproduced.

## 2. Pattern recommendations per surface

**Employee home** (question: what next, how am I doing)
- Top: greeting by name and one plain sentence of progress ("4 of 18 done, on track"). One thin progress bar, labelled with a number. No ring chart, no KPI trio. [J]
- "Up next": three tasks as a list (not cards): checkbox, title, due hint, estimated minutes. One is marked "Start here". [J]
- Rule: two disclosure levels only. NN/g says keep to two levels, show a few important options first, and make the path to the rest obvious with a clear label. [S] So a single "See the full plan (18)" text button; no nested expanders.
- Overdue items surface into "Up next" first, worded gently ("Was due Tue"), never red banners. [J]
- Below the three: a one-line "Coming up" teaser (next week's theme), not tasks. [J]

**Full plan**
- Opens in place (expand) or as a route `/plan`, grouped by week or phase headings (Things-style headings [S]). Collapse completed group by default; show count.
- Rows are identical in structure to "Up next" rows so state means the same thing everywhere.
- Upcoming items are visible but muted and not completable until unlocked (or completable early, your call; decide before building). [J]
- Do not default-expand more than the current phase. Day one must never render 40 rows. [J]

**Task detail**
- Right-side drawer on desktop (list stays visible; NN/g: nonmodal suits tasks where users switch between dialog and main content, and modals interrupt and hide context [S]). Full-screen sheet on mobile. Deep-linkable URL so Back closes it (NN/g: in overlays Back should behave like Close [S]).
- Content: title, status chip, due, why it matters (one sentence), steps checklist, a link or resource, primary "Mark complete". When done, the button becomes "Undo".
- Complete is one click, no confirm dialog. Show a toast "Marked complete. Undo" (NN/g: users need undo; contextual snackbars vanish and are easy to miss [S], so also keep Undo in the drawer persistently). Optimistic update; roll back with an inline error if the save fails. [J]

**Manager roster** (question: who is going well, who needs help)
- A table, not cards: managers compare many people on the same attributes. NN/g: tables suit comparing items across the same attributes; keep headers and row-label column locked on mobile [S, partly inferred by the source's author]. Columns: name and role, start date / day N, progress (number plus thin bar), status chip, last activity, next due.
- Default sort: needs-attention first, then by progress. A one-line summary above ("3 need a nudge") replaces KPI cards. [J]
- Status is "On track / Behind / Overdue / Not started" derived from rules, with the reason in text ("2 overdue"). Avoid a numeric score. [J]
- Row click opens employee detail. Whole row is the target.

**Employee detail (manager view)**
- Same plan list as the employee sees, read-only, plus a short "Why flagged" line and a "Nudge" action (prefilled message). Show completed dates. No surveillance metrics (login counts, time on task). [J]

**Empty / complete / error**
- Empty: say what belongs here and the next action (NN/g: avoid blank containers, explain, link to key task [S]). Do not show "nothing here" while loading; use skeleton rows.
- Complete: warm, quiet finish ("You're all set for week 1. Your manager has been told."). One subtle check animation, no confetti. [J]
- Error: inline, plain language, retry button, keep the user's change visible. Never lose a completed state silently.

**Mobile**
- Home is single column; the three tasks stay. Plan is a pushed page. Task detail is full-screen.
- Roster collapses to a stacked list: name, status chip, progress number, next due. Drop columns rather than scroll sideways (NN/g: use small screens to cut weak attributes; avoid forced rotation; if scrolling, show a cut-off column [S]).
- Targets: WCAG 2.2 AA minimum 24x24 CSS px [S]; aim for 44px on mobile (HIG figure, unverified) [J].

## 3. Visual directions

Status is never colour-only: each state has an icon shape plus a text label (WCAG 1.4.1 [S]). Icon or chip borders and control outlines need 3:1 (WCAG 1.4.11 [S]). Statuses: completed = filled check circle; outstanding = empty circle; upcoming = dashed circle, muted; overdue = circle with clock or "!" glyph, tinted chip.

### A. "Warm paper" (recommended)
- Type: **Fraunces** (headings and greeting only, 600, optical size on) + **Inter** (UI, tabular numerals for progress). Both free on Google Fonts under open licence (my knowledge, not verified). Reason: serif greeting adds human warmth; Inter keeps the table crisp. Self-host or use `font-display: swap`.
- Tokens and measured contrast (WCAG ratios):

| Token | Hex | Check |
|---|---|---|
| bg | #FAF7F2 | ink on bg 13.81 |
| surface | #FFFFFF | ink on surface 14.76 |
| ink | #1F2933 | |
| muted text | #5B6670 | 5.49 on bg, 5.87 on surface |
| control border | #847C6C | 3.87 on bg, 4.13 on surface (passes 3:1) |
| hairline divider | #D9D2C5 | 1.41 on bg; decorative only, not for controls |
| accent (teal-green) | #1F6F5C | 6.02 on white; white text on accent 6.02 |
| accent tint | #E3F1EC | accent on tint 5.18 |
| completed | #276B45 on #E4F2E8 | 5.55 (6.41 on white) |
| overdue | #B4432B on #FBEAE5 | 4.76 (5.56 on white) |
| due soon | #8A5A00 on #FBF0D6 | 5.23 (5.93 on white) |
| upcoming | #5B6670 on #EEF0F2 | 5.14 |

- Note: first-draft completed green #2F7D4F measured 4.36 on its tint and failed 4.5; replaced by #276B45.
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48. Radius: 6 (controls, chips), 10 (drawer, panels); avoid pill-everything. Elevation: borders over shadows; one soft shadow only on the drawer. [J]

### B. "Quiet utility"
- Type: **Geist** + **Geist Mono** for dates and counts (availability on Google Fonts not verified; fall back to Inter). Cooler and more product-like.
- Tokens: bg #F6F7F9, surface #FFFFFF, ink #111827 (17.74 on white), muted #566074 (6.32), control border #8A93A3 (3.10 on white; 2.89 on bg, so use only on white), accent blue #2456C8 (6.48), completed #1D7A4A on #E3F3EA (4.64), overdue #B3261E on #FCE9E7 (5.59), due soon #8A5300 on #FBF0D9 (5.60). Radius 4 and 8; spacing same scale.
- Risk: blue accent on cool grey is the default SaaS look. Closer to the AI-slop zone and less warm. [J]

**Recommendation: A.** The brief asks for warmth for a nervous user; a warm off-white, one green-teal accent and a small serif moment differentiate it from the blue/grey default. Teal-green also doubles as "progress", so completed state reads as the brand colour. Overdue is brick, not alarm red, to stay calm. Both palettes avoid purple.

## 4. Motion spec

Sourced numbers (NN/g [S]): simple feedback ~100ms; substantial changes 200-300ms; most animation within 100-400ms; avoid above 500ms; ease-out for entering, ease-in for exiting, avoid linear; the more often seen, the shorter and subtler; enter slightly longer than exit. Reduced motion: MDN says remove, reduce or replace motion; swapping scaling for an opacity fade is its example [S].

| Interaction | Duration | Easing (my choices) |
|---|---|---|
| Checkbox fill and check draw | 120ms | ease-out `cubic-bezier(0.2,0,0,1)` |
| Row completes: strikethrough fade, then row settles into "done" | 200ms | same |
| Progress bar width change | 300ms | ease-out |
| Drawer open / close | 260ms / 200ms | ease-out / ease-in (translateX 24px + fade) |
| Plan expand (height) | 240ms | ease-out; collapse 180ms |
| Toast in / out | 200 / 150ms, stays 6s, pauses on hover and focus | ease-out / ease-in |
| Hover, focus colour | 100ms | linear is acceptable for colour only |

- Reduced motion: under `prefers-reduced-motion: reduce`, drop translate and height animation to a 100ms opacity fade; keep the progress number changing and a static check (state change must still be visible). [J]
- Never animate on page load beyond a single 200ms fade of the list. No bouncing, no confetti, no looping.
- Move focus to the drawer on open and back to the row on close.

## 5. AI-slop tells to avoid
- Gradient hero or gradient text; purple-to-blue anything; glassmorphism blobs.
- Three identical KPI cards at the top; big number plus tiny caption plus up-arrow percentage.
- Oversized rounded cards (20px+ radius) nested inside cards, shadows on everything.
- Donut or radial progress used as decoration; charts with no decision attached.
- Emoji as icons, rocket and sparkle copy, "Welcome aboard!" exclamation marks, "supercharge".
- Generic Inter-only, grey-on-grey low contrast text; uniformly 14px everything with no hierarchy.
- Fake avatars with random pastel rings; fake data that is all round numbers.
- Placeholder "Lorem" or perfect 100% completion data. Seed realistic, uneven data (one overdue, one not started).
- Skeleton shimmers on everything; spinners where optimistic UI would do.
- Confirmation modal on every complete or undo.
- Colour-only status dots.

## 6. Sources (fetched)
- https://www.nngroup.com/articles/progressive-disclosure/
- https://www.nngroup.com/articles/user-control-and-freedom/
- https://www.nngroup.com/articles/empty-state-interface-design/
- https://www.nngroup.com/articles/modal-nonmodal-dialog/
- https://www.nngroup.com/articles/animation-duration/
- https://www.nngroup.com/articles/mobile-tables/
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://www.culturedcode.com/things/features/
- https://blog.duolingo.com/new-duolingo-home-screen-design/
- https://stripe.com/blog/accessible-color-systems
- https://vercel.com/geist/colors

Fetched but unusable: m3.material.io snackbar (outline only), Apple HIG accessibility (title only), Asana My Tasks (nav only), Superhuman (404).

## 7. Open questions
- Can upcoming tasks be completed early?
- Who defines "behind"? Needs a rule (e.g. any overdue, or under X% of expected by day N).
