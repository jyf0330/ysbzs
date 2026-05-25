# GitHub Copilot Instructions · 元素背包史

Use `docs/00_AI_PROJECT_RULES.md` as the short entry and `docs/00_AI_WORKFLOW_DETAILS.md` for detailed rules.

- Workflow: `ywh-game`.
- Main file: `index.html`; keep the single-file architecture.
- Test command: `node test.js`; current baseline is 199/199.
- Before work: read `docs/00_AI_PROJECT_RULES.md` and `docs/00_AI_WORKFLOW_DETAILS.md`, classify the task, and check `git status --short --untracked-files=all`.
- If the user says "同步 ywh 工作流", sync only workflow structure and AI entry files; do not edit `index.html`, `test.js`, or core game code.
- Use `tasks/doing/当前任务.md` as the task card; do not read all `docs/` by default.
- `docs/99_归档/` is historical reference only, not current rules.
- One task may have only one AI editing the same code file.
- Update `docs/10_CHANGELOG.md` after any effective change.
