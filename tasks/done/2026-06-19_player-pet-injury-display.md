# 2026-06-19_player-pet-injury-display

task_id: 2026-06-19_player-pet-injury-display
type: bugfix-ui
status: DONE
owner: Codex
branch: shared-worktree

## Goal

修复我方宠物受伤信息没有显示的问题，保持核心层无 DOM，UI 只展示 ViewModel / 日志格式化结果。

## Scope

- 先复现并定位受伤信息在核心事件、ViewModel、DOM/CSS 哪一层丢失。
- 按根因修复显示或数据传递问题。
- 用测试覆盖我方宠物受伤信息可见输出。
- 如果涉及可见 UI，完成真实浏览器 tester pass，保存截图、DOM/ViewModel/console 证据。

## related_files

- tasks/done/2026-06-19_player-pet-injury-display.md
- tasks/index.md
- docs/10_CHANGELOG.md
- web/ux-app.css
- web/js/main.js
- web/js/local-engine.js
- src/core/battle.cjs
- tests/planning_ai_rules.test.cjs
- tests/browser_detail_selection.test.cjs
- tests/ui_adapter.test.cjs
- tests/unit/event_summary.test.cjs
- output/playwright/

## exclusive_files

- web/ux-app.css
- web/js/main.js
- web/js/local-engine.js
- src/core/battle.cjs
- tests/ui_adapter.test.cjs

## read_files

- docs/02_CURRENT_WORKFLOW.md
- docs/00_AI_START_HERE.md
- docs/roles/UI_UX_START.md
- docs/roles/PROGRAMMER_START.md
- tasks/README.md
- /Users/ywh/.codex/skills/game-ui-frontend/SKILL.md
- /Users/ywh/.codex/skills/frontend-skill/SKILL.md
- /Users/ywh/.codex/skills/ywh-web-game/SKILL.md
- /Users/ywh/.codex/skills/playwright/SKILL.md
- /Users/ywh/.agents/skills/systematic-debugging/SKILL.md
- /Users/ywh/.agents/skills/test-driven-development/SKILL.md

## validation

- RED: `node --test tests/planning_ai_rules.test.cjs` failed because `ENEMY_PET_ACTION.damageSummary` was undefined.
- GREEN: `node --test tests/planning_ai_rules.test.cjs` passed after enemy action events received player-pet injury summary text.
- Related checks passed: `node --test tests/ui_adapter.test.cjs`, `node --test tests/unit/event_summary.test.cjs`, `node --test tests/unit/battle_module_split.test.cjs`.
- Final: `npm run check:all` passed.
- Generated browser bundle refreshed: `node tools/build_local_engine_bundle.cjs`.
- Visible gate: `TEST_SUBTHREAD_UNAVAILABLE` because discovered sub-agent tooling cannot be spawned unless explicitly requested by the user. Independent tester pass used the real browser and formal buttons only: open `index.html?runtime=local&injuryDisplayTest=1`, click `第7天火核心试炼`, click `结算并执行敌方宠物行动`, click `进入下一回合（Boss召唤）`, click `结算并执行敌方宠物行动`.
- Browser evidence: screenshot `output/playwright/player-pet-injury-display-2026-06-19.png`; ViewModel event `ENEMY_PET_ACTION` has `damageSummary: ["我方火绒狐受伤18"]`; visible log includes `057 [ENEMY_PET_ACTION] ... 我方火绒狐受伤18`; console/page errors `[]`.
- Main screenshot review: screenshot shows the injury summary line in the bottom event log and the right detail panel keeps the incoming-damage warning readable, with no obvious overlap or missing text.

## commit_plan

fix(ui): show player pet injury information

## collaboration

- lead_scope: diagnose and fix player pet injury display in current shared worktree.
- specialist_input: none.
- tester_pass: TEST_SUBTHREAD_UNAVAILABLE; independent browser tester pass passed with screenshot `output/playwright/player-pet-injury-display-2026-06-19.png`.
- external_ai_input: none.
- lead_decision: fix the event summary layer by attaching actual `DAMAGE` event summaries to `ENEMY_PET_ACTION`, rather than adding duplicate UI-side parsing.

## notes

- Pre-existing untracked `.playwright-cli/page-*.yml` files were present before this task and are not owned by this task.
