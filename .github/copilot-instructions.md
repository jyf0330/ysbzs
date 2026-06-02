# GitHub Copilot Instructions · 元素背包史

Use `docs/00_AI_START_HERE.md` as the entry point.

- Workflow: `ywh-game`.
- Main file: `index.html`; keep the single-file architecture.
- Test command: `node test.js`; baseline stats in `docs/03_CURRENT_NUMBERS.md`.
- Before work: read `docs/00_AI_START_HERE.md` and check `git status --short --untracked-files=all`.
- Do not start implementation while `[NEEDS_REVIEW]` or `BLOCKED_FOR_DOCS` decisions are unresolved.
- If the user says "同步 ywh 工作流", sync only workflow structure and AI entry files; do not edit `index.html`, `test.js`, or core game code.
- Use `tasks/doing/当前任务.md` as the task card.
- `docs/archive/` is historical reference only, not current rules.
- One task may have only one AI editing the same code file.
- Update `docs/10_CHANGELOG.md` after any effective change.
- Use TDD for code changes.
- Code is the factual baseline; documents are the intent baseline.
- External AI suggestions are not project rules.
