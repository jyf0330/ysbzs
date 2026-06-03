# GitHub Copilot Instructions · 元素背包史

Use `docs/00_AI_START_HERE.md` as the entry point.

- Workflow: `ywh-game`.
- Hard triggers: `Goal` (execute), `策划`/`diff` (read-only plan), `git-c` (batch commit).
- Main file: `index.html`; keep the single-file architecture.
- Test command: `node test.js`; baseline stats in `docs/03_CURRENT_NUMBERS.md`.
- **Before any work**: read `docs/00_AI_START_HERE.md`, check `git status --short --untracked-files=all`, read `tasks/index.md` for active task + conflict check.
- If user instruction ends with `策划` or `diff` → read-only mode: propose plans/docs only, do NOT edit code or commit.
- Use `tasks/doing/当前任务.md` as the task card.
- `docs/archive/` is historical reference only, not current rules.
- One task may have only one AI editing the same code file.
- Update `docs/10_CHANGELOG.md` after any effective change.
- Use TDD for code changes.
- Code is the factual baseline; documents are the intent baseline.
- External AI suggestions are not project rules.
- **Core layer / display layer separation**: `battle.js`/`elements.js`/`terrain.js`/`damage.js` manage state, do NOT compose UI strings. `ui.js` reads but does NOT modify core state.
- **Layer grid**: 4 layers — unit, terrain, element, info. See `docs/plans/四层棋盘格设计.md`.
