# Development environment

Audited 2026-11-04. Nothing was installed, and no global settings or other projects were changed.

## Ready to use

| Need | Tool | Checked |
|---|---|---|
| Runtime | Node 24.10, npm 11.8, pnpm 11.1, bun 1.4 | Version commands ran |
| Git and GitHub | git 2.48, gh 2.87 | `gh` is logged in |
| Independent review | Codex CLI 0.154 | `codex login status` reports logged in |
| Browser testing | Playwright MCP, Chromium, WebKit and Firefox builds | Browser folders exist; not yet run |
| Second browser check | gstack `browse`, Chrome DevTools MCP | Binary exists; not yet run |

## Planned use

| Phase | Tool | Why this one |
|---|---|---|
| Planning | `superpowers:brainstorming`, then `superpowers:writing-plans` | Plan first, approval before code |
| Design | `frontend-design`, `apple-motion` | Deliberate visual direction and motion |
| Build | Direct implementation, with tests first for date and status logic | A small app does not need many agents editing it |
| TypeScript | `pstack-typescript-best-practices`, TypeScript LSP | Status logic suits discriminated unions and exhaustive checks |
| Verification | Playwright MCP, `superpowers:verification-before-completion` | Claims need evidence from the running app |
| Design QA | gstack `design-review` | Finds spacing, hierarchy and AI-looking patterns on the real UI |
| Code review | Codex | A read from outside this session |
| Writing | `pstack-technical-writing`, `pstack-unslop` | README and demo script must read naturally |

## Deliberately skipped

| Tool | Why |
|---|---|
| `autoplan`, `plan-ceo-review` and similar pipelines | Too expensive for a 3-hour limit; the plan is short enough to review directly |
| `design-shotgun` | Generates many variants; two written directions cost much less |
| CodeRabbit | Overlaps with Codex; one independent review is enough |
| Serena | Built for tracing symbols in large codebases; this repo starts empty |
| AWS, Supabase, Terraform, Next.js and Microsoft Learn tools | Not relevant: no backend or deployment infrastructure |
| Atlassian MCP | No Jira or Confluence in this workflow |

## Online candidates and other projects

- **Add if useful:** the official shadcn skill, after `shadcn init`, and `@axe-core/playwright` as a test dependency.
- **Skip:** Impeccable (hooks, a live mode that can run agent CLIs with approvals off, default telemetry), UI UX Pro Max, Emil Kowalski's skill and `anthropics/skills`. Each overlaps with what is installed or adds trust risk with little gain. Details are in [research/tooling-candidates.md](research/tooling-candidates.md).
- **Other local projects:** one unrelated project has design audit skills. We reuse two ideas only: check each reference for one assigned principle rather than cloning it, and treat the phone layout as its own design rather than a squeezed desktop. No content from that project is used.

## Conflicts and overhead

- **Commit attribution:** global `CLAUDE.md` says never to add Claude attribution lines, and it overrides the session default. Commits will carry none, and we will ask before committing.
- **Hooks:** the global Stop, Notification and PermissionRequest hooks only send notifications and log a timeline. None of them block work.
- **Plugin versions:** several superpowers and security-guidance versions are cached, but only one of each should be active. We have not seen duplicate hook behaviour.
- **Ponytail mode:** it is on, and it fits the code. It must not cut accessibility, requested states or design polish, and its own rules protect the first two.
- **Superpowers brainstorming:** its question-led opening does not fit, because the brief already answers those questions. We keep its rule that nothing gets built before the plan is approved.

- **Codex stop gate:** the plugin's default is off, and we have not enabled it.
