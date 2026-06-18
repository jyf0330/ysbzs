# 2026-06-19_all-out-preview-sandbox

task_id: 2026-06-19_all-out-preview-sandbox
type: combat core / board preview / UI data
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

把棋盘预览语义收束为“按当前/预览占位模拟我方全部出击后得到的格子数据”，避免无移动时只看第一只宠物、移动后只看 movedUnitIds 的局部预览。

## Scope

- 预览主体默认覆盖所有存活我方宠物。
- 选中或刚移动宠物只影响 active/focus 标记，不把预览范围缩窄到单只宠物。
- 候选落点沙盒使用同一套整队预览输出。
- UI 只读取核心 ViewModel 字段，不在 DOM 层计算规则。
- 不修改当前另一个 ACTIVE 任务独占的 `src/core/battle.cjs` 与 `tasks/index.md`。

## related_files

- `src/core/battle/preview.cjs`
- `src/core/battle/planning.cjs`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/local-engine.js`
- `docs/10_CHANGELOG.md`
- `tasks/doing/2026-06-19_all-out-preview-sandbox.md`
- `output/playwright/all-out-preview-sandbox-2026-06-19.png`
- `output/playwright/preview-no-friendly-damage-2026-06-19.png`

## exclusive_files

- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/README.md`
- `tasks/doing/2026-06-19_enemy-spawn-yaml-position.md`
- `tasks/done/2026-06-19_battle-resolution-preview.md`

## validation

- RED/GREEN: `node --test tests/ui_adapter.test.cjs`
- Bundle: `node tools/build_local_engine_bundle.cjs`
- Full check: `npm run check:all`
- Formal UI gate: real browser flow on local runtime, screenshot under `output/playwright/`.

## commit_plan

message: `fix(combat): preview all-out team resolution`

## collaboration

lead_scope: 在不碰另一个 ACTIVE 任务独占文件的前提下，把预览范围改为全队全部出击语义。
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；当前未启用独立子线程工具，本轮用主线程独立 Playwright tester pass 走正式浏览器入口并保存截图。
external_ai_input: 无
lead_decision: 采用最小核心改法：`previewGrid` 默认覆盖全队，active 只表示焦点；候选落点的沙盒后果改为循环执行全部可用我方行动槽，敌方风险在施放前按占位独立计算。

## verification_results

- RED: `node --test tests/ui_adapter.test.cjs` 失败于 UI16，现有 `previewGrid` 未移动时只包含第一只英雄。
- GREEN: `node --test tests/ui_adapter.test.cjs` 通过 38/38。
- BUG RED: 用户截图反馈棋盘 `伤/受` 数据不对后，复现发现 `previewGrid` 会把我方行动命中友方单位并计入伤害；新增 UI16B 先失败，错误为友方伤害目标 6 条。
- BUG GREEN: `src/core/battle/preview.cjs` 改为只有敌方单位才进入伤害目标；友方占位格不再设置 `targetId` / `hitAlly` / `friendlyFire`，`node --test tests/ui_adapter.test.cjs` 通过 39/39。
- BUG DIAG: 辅助复现脚本确认 `ally preview target count 0`，当前火核心场景不再产生友方伤害预览。
- BUG Bundle: `node tools/build_local_engine_bundle.cjs` 通过，生成 `web/js/local-engine.js`。
- BUG Full check: `npm run check:all` 通过。
- BUG Formal UI gate: `http://127.0.0.1:4176/index.html?runtime=http&codexPreviewFriendlyFix=20260619`，真实浏览器点击 `第7天火核心试炼`；DOM/VM 断言 `phase=player_turn`、`previewCount=27`、`allyHitCount=0`、英雄格无 `伤` 开头的 preview badge、console error 为 `[]`。
- BUG Screenshot: `output/playwright/preview-no-friendly-damage-2026-06-19.png`
- BUG Main-thread screenshot review: 画面显示火核心试炼棋盘，疾风隼/冲浪鸭所在友方格只显示 `火3` 作用格提示，不再显示对友方的 `伤` 数值；未见明显遮挡、错位、缺失或错误数值。
- Bundle: `node tools/build_local_engine_bundle.cjs` 通过，生成 `web/js/local-engine.js`。
- Full check: `npm run check:all` 通过。
- Formal UI gate: `http://127.0.0.1:4174/index.html?runtime=http&codexAllOutPreview=20260619c`，真实浏览器点击 `新开一天`，进入战斗页后点击融焰娘 `R6C1 -> R0C1`。
- Browser assertions: 初始和移动后 `previewGrid` actor 都覆盖 4 只我方宠物；`teamPlacementPreview.activeUnitId=hero_pal_072_1`；`movedUnitIds` 记录融焰娘；敌方风险为 3 点 HP 伤害；我方预计输出总伤害为 10；console error 为 `[]`。
- Screenshot: `output/playwright/all-out-preview-sandbox-2026-06-19.png`
- Main-thread screenshot review: 画面显示融焰娘左上风险位、右侧受击预警 `预计伤害 3 / HP 20->17`，棋盘仍显示我方行动伤害预览；未见明显遮挡、错位、缺失或错误数值。
- Closeout verification: 2026-06-19 Lead reran `node tools/build_local_engine_bundle.cjs && npm run check:all && npm run test:coverage && node --test tests/browser_detail_selection.test.cjs && git diff --check`; command exited 0.

## commit_status

- blocked for auto-commit: 工作区存在另一个 ACTIVE 任务及未归属/并行 dirty 文件，且本任务未更新被占用的 `tasks/index.md`；需走精确 Commit Plan 或后续 `git-c` 收口。
