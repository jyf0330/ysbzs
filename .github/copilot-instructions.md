# GitHub Copilot Instructions · 元素背包史

Use `docs/00_AI_PROJECT_RULES.md` as the single source of truth for project AI rules.

## Project

- Name: 元素背包史 (ysbzs) — browser-based grid tactics game
- Workflow: `ywh-game`
- Main file: `index.html` (single-file: all CSS/HTML/JS inline — do NOT split)
- Tests: `node test.js` (139 tests must all pass)

## Required behavior

- Read `docs/00_AI_PROJECT_RULES.md` and relevant docs before implementing.
- Follow `ywh-game` workflow. Do not bypass document gates.
- For large features: check the 8 minimum docs first. Missing docs → create drafts → `BLOCKED_FOR_DOCS`.
- For small patches: implement minimally, then sync impacted docs.
- After every change: run `node test.js` and confirm 139/139 pass.
- Sync impacted docs after verification.
- Update `docs/10_CHANGELOG.md` for any file change.
- `git add .` → `git commit -m "<type>: <summary>"` → `git push` (after safety check).

## Prohibited

- Do not bypass doc gates.
- Do not auto-refactor broadly.
- Do not split `index.html`.
- Do not commit without running tests.
- Do not push `.env`, secrets, or `node_modules`.
