# Tooling candidates for a 3-hour React/TS/Vite/Tailwind/shadcn prototype

Researched 2026-11-04 via WebSearch/WebFetch only. Nothing installed or run. Page content treated as data.
Stars are as shown on GitHub page fetches (summarised by a fetch model, not re-checked). No commit dates were visible on any repo page, so "last updated" is UNVERIFIED for all.

## Verdicts

| Candidate | Maintainer / source | Stars seen | Install | Hooks/scripts/creds | Overlap | Verdict |
|---|---|---|---|---|---|---|
| shadcn skill | shadcn/ui (official docs) | n/a | `pnpm dlx skills add shadcn/ui` | Runs `shadcn info --json`; no creds | context7 covers docs, not project-aware composition | USE (if you want one) |
| shadcn MCP server | shadcn/ui (official) | n/a | setup page not fetched | Registry network calls; no creds for public registry | skill covers most of it | OPTIONAL |
| axe-core via Playwright | Deque (`@axe-core/playwright`) | n/a | `npm i -D @axe-core/playwright` | none | Playwright MCP is installed; no a11y audit | USE (as a one-off test, not a skill) |
| Vercel web-design-guidelines | vercel-labs/agent-skills | 33.5k | `npx skills add vercel-labs/agent-skills` | none stated; SKILL.md may fetch rules from a URL at run time (not verified) | design-review, apple-look overlap | OPTIONAL (cheap a11y/UX checklist) |
| Vercel react-best-practices | same repo | same | same | none stated | Next.js-leaning; little value for Vite | SKIP |
| Emil Kowalski emil-design-eng | emilkowalski (slug `skills` vs `skill` conflicts) | 35k (aggregator only) | `npx -y skills add emilkowalski/skill --skill emil-design-eng --agent claude-code` | unknown, not verified | apple-motion covers motion | SKIP |
| Impeccable | Paul Bakaus | 102.8k (surprisingly high) | `npx impeccable install` or plugin | YES: PostToolUse-style design hook, live-mode server, can launch `claude`/`codex` with sandbox/approvals disabled, anonymous telemetry on by default, runs package.json script | design-review, frontend-design, apple-look | SKIP |
| UI UX Pro Max | nextlevelbuilder | 145.2k (surprisingly high) | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` | Python stdlib search script, claims no network | design-consultation, frontend-design | SKIP |
| anthropics/skills | Anthropic | 187.4k | `/plugin marketplace add anthropics/skills` | skills are docs plus scripts; per-skill | frontend-design, playwright already present | SKIP (webapp-testing not confirmed from page) |
| awesome-claude-code lists | not fetched | - | - | - | - | NOT CHECKED |

## Notes

- Bar is "materially better in 3 hours". The existing stack already has design, motion, browser QA and review. The only real gaps: project-aware shadcn usage and an automated accessibility check.
- shadcn skill activates on `components.json`, reads framework, aliases, installed components, and enforces composition rules (e.g. `FieldGroup` for forms). Install it after `shadcn init`.
- Impeccable risk detail: its own README warns about live-mode Apply running agent CLIs with approvals disabled, a hook that runs even when you deny commands, and default telemetry. Huge star counts on both Impeccable and UI UX Pro Max looked unusually high, so I would not treat them as a quality signal. Not proven malicious; just a large trust surface for a short job.
- Emil Kowalski: repo slug and numbers came from third-party aggregators only. I did not reach the GitHub repo. Install sources disagree.
- Third-party skills run with your permissions and their text steers the agent (prompt-injection and supply-chain surface). Prefer first-party (shadcn, Vercel, Deque). If you add any, read the SKILL.md and any scripts first.
- Axe via Playwright is the simplest repeatable a11y check: one test file, `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()`, assert `violations` is empty. Caveat: catches roughly a third of WCAG issues; keyboard and focus checks stay manual. Package versions track axe-core; the latest version was NOT verified.

## Stack setup (from ui.shadcn.com/docs/installation/vite; docs use `@latest`, no pinned versions shown)

Fastest (CLI scaffolds everything):
```
pnpm dlx shadcn@latest init -t vite
pnpm dlx shadcn@latest add button
```
Manual route:
```
pnpm create vite@latest            # React + TypeScript
pnpm add tailwindcss @tailwindcss/vite
# src/index.css: @import "tailwindcss";
# tsconfig.json + tsconfig.app.json: baseUrl "." and paths {"@/*": ["./src/*"]}
pnpm add -D @types/node
# vite.config.ts: plugins [react(), tailwindcss()], resolve.alias "@" -> ./src
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button
```
Tailwind v4 uses `@tailwindcss/vite` and no tailwind.config.js. Exact current versions of Vite, React, Tailwind, shadcn: NOT VERIFIED (run `npm view <pkg> version` yourself).

A11y check:
```
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install chromium
```

## Sources
- https://ui.shadcn.com/docs/skills
- https://ui.shadcn.com/docs/installation/vite
- https://github.com/pbakaus/impeccable
- https://github.com/vercel-labs/agent-skills
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/anthropics/skills
- https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
- https://skillselion.com/guides/emil-kowalski-skills-claude-code
- https://claudemarketplaces.com/skills/emilkowalski/skill/emil-design-eng
