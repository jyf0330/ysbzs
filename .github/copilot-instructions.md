# GitHub Copilot Instructions · 元素背包史

Use `docs/00_AI_PROJECT_RULES.md` as the single source of truth for project AI rules.

## Project

- Name: 元素背包史 (ysbzs) — browser-based grid tactics game
- Workflow: `ywh-game`
- Main file: `index.html` (single-file: all CSS/HTML/JS inline — do NOT split)
- Tests: `node test.js` (current baseline: 151 tests — all must pass)

## Mandatory first steps (cannot skip)

1. **Invoke `ywh-game` skill** and read its full workflow before anything else.
2. **Classify the change** using the table in `docs/00_AI_PROJECT_RULES.md`.
   - Small code change ≠ small patch. Any change to combat timing / element rules / turn structure = **large feature**.
3. For **large features**: run the doc gate check. Missing docs → draft them → `BLOCKED_FOR_DOCS`.
4. For **small patches**: implement minimally → verify → sync impacted docs per the sync table.

## After every change

- Run `node test.js` — all tests must pass.
- Sync docs per the mapping table in `docs/00_AI_PROJECT_RULES.md` (do NOT skip this).
- Update `docs/10_CHANGELOG.md`.
- `git add .` → `git commit -m "<type>: <summary>"` → `git push` (after safety check).

## Prohibited

- Do NOT skip ywh-game skill invocation.
- Do NOT skip change classification.
- Do NOT bypass doc gates.
- Do NOT treat "small code diff" as excuse to skip doc sync.
- Do NOT auto-refactor broadly.
- Do NOT split `index.html`.
- Do NOT commit without running tests.
- Do NOT push `.env`, secrets, or `node_modules`.
