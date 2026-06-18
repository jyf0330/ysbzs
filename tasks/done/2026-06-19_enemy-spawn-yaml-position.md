# 2026-06-19_enemy-spawn-yaml-position

task_id: 2026-06-19_enemy-spawn-yaml-position
type: combat core / wave spawn rules
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

敌方 Boss 召唤宠物的生成位置改为读取 YAML 规则：优先右上方 3x3 找空闲格；满了扩大到 4x4，再扩大到 5x5。

## Scope

- YAML 记录敌方召唤生成区域规则。
- 核心层读取 YAML 规则进入 `state.data.waveRules`。
- 默认敌方波次生成位置按 YAML 的右上扩圈空闲格规则决定。
- 不改 UI 渲染层；UI 只显示核心状态。
- 补单元测试证明 3x3 满时扩到 4x4 空位。

## related_files

- `src/core/csvData.cjs`
- `src/core/battle.cjs`
- `src/core/state.cjs`
- `tests/unit/wave_rules.test.cjs`
- `tools/build_local_engine_bundle.cjs`
- `web/js/local-engine.js`
- `yaml/wave_rules_20260609.yaml`
- `tasks/index.md`
- `tasks/doing/2026-06-19_enemy-spawn-yaml-position.md`

## exclusive_files

- `src/core/state.cjs`
- `src/core/battle.cjs`
- `web/js/local-engine.js`
- `tasks/index.md`

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`

## validation

- RED/GREEN: `node --test tests/unit/wave_rules.test.cjs`
- Full check: `npm run check:all`

## commit_plan

message: `fix(combat): use yaml enemy spawn positions`

## collaboration

lead_scope: 按用户确认改敌方 Boss 召唤宠物生成位置规则。
specialist_input: 无
tester_pass: Playwright 正式页面点击 `开始战斗`，截图 `output/playwright/enemy-spawn-yaml-position-2026-06-19.png`，断言生成位置 `R1C7` / `R0C6` 位于右上 3x3，console 无错误。
external_ai_input: 无
lead_decision: 读取 YAML 进入核心数据，核心层按 state.data.waveRules 计算空闲生成格。

## verification_results

- RED: `node --test tests/unit/wave_rules.test.cjs` failed before implementation because `state.data.waveRules.enemySpawn` was undefined.
- GREEN: `node --test tests/unit/wave_rules.test.cjs` passed.
- Seeded-random guard: `node --test tests/unit/wave_rules.test.cjs` includes `default enemy spawn randomly chooses an empty top-right 3x3 cell by core seed`, proving same core seed is stable, different seed can pick another empty cell, and Boss-occupied `R0C7` is not selected.
- Unit suite: `npm run test:unit` passed.
- Bundle: `node tools/build_local_engine_bundle.cjs` passed; local engine bundle now includes CSV + YAML data files.
- Local runtime smoke: `npm run check:ui-connected` passed.
- Full check: `npm run check:all` passed after bundle rebuild.
- Browser tester pass: Playwright opened `http://127.0.0.1:4173/index.html?runtime=local`, clicked the formal `开始战斗` button, and observed spawn event positions `R1C7` and `R0C6`, both inside the right-top 3x3.
- Screenshot: `output/playwright/enemy-spawn-yaml-position-2026-06-19.png`.
- Console result: no browser console errors or page errors.
- Main-thread screenshot review: screenshot shows two spawned enemy pets in the right-top 3x3 with no obvious overlap, missing token, or layout break.
- Closeout verification: 2026-06-19 Lead reran `node tools/build_local_engine_bundle.cjs && npm run check:all && npm run test:coverage && node --test tests/browser_detail_selection.test.cjs && git diff --check`; command exited 0.

## commit_status

- blocked: `tasks/doing/2026-06-19_all-out-preview-sandbox.md` is also ACTIVE and declares `web/js/local-engine.js`; the generated bundle may include that task's dirty preview changes, so this task must not auto-commit until Lead splits/regenerates the bundle or coordinates the overlapping generated file.
