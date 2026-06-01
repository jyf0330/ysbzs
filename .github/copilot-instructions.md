# GitHub Copilot Instructions · 元素背包史

Use `docs/00_AI_PROJECT_RULES.md` as the short entry and `docs/00_AI_WORKFLOW_DETAILS.md` for detailed rules.

- Workflow: `ywh-game`.
- Main file: `index.html`; keep the single-file architecture.
- Test command: `node test.js`; baseline source is `docs/00_CURRENT_CONTEXT.md`.
- Before work: classify the task first, then route to the correct execution chain; read `docs/00_AI_PROJECT_RULES.md` and `docs/00_AI_WORKFLOW_DETAILS.md`, and check `git status --short --untracked-files=all`; if non-`.omx/` changes exist, inspect `git diff --stat` and necessary diff summaries.
- Do not start implementation while `[NEEDS_REVIEW]` or `BLOCKED_FOR_DOCS` decisions are unresolved.
- If the user says "同步 ywh 工作流", sync only workflow structure and AI entry files; do not edit `index.html`, `test.js`, or core game code.
- Use `tasks/doing/当前任务.md` as the task card; read-only review / workflow audit does not create a task card; do not read all `docs/` by default.
- `docs/99_归档/` is historical reference only, not current rules.
- One task may have only one AI editing the same code file.
- Update `docs/10_CHANGELOG.md` after any effective change.
- Default to autonomous execution, but pause and list tradeoffs for destructive operations, unowned core changes, code-doc conflicts, or `[NEEDS_REVIEW]` decisions.
- Archive completed task cards under `tasks/done/`; keep `tasks/doing/当前任务.md` for the active task only.
- Use TDD for code changes: bugfixes, core mechanics, observable UI behavior, refactors, or behavior changes require a failing test or reproduction first, then implementation.
- Subagents may help with parallel review, acceptance, or document analysis, but are not a hard gate; only one AI may edit the same code file in a task.
- Code is the factual baseline; documents are the intent baseline. When in conflict, list differences first before resolving.
- External AI suggestions are not project rules; execute based on actual code, directory structure, task cards, formal docs, and user directives — absorb only what's useful.
