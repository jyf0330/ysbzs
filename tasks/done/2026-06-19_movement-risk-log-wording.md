# 2026-06-19_movement-risk-log-wording

task_id: 2026-06-19_movement-risk-log-wording
type: combat log wording / UI readability
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

修正移动事件日志里 `预计受伤 0->1` 的歧义：移动后的风险变化不是立即受伤，HP 风险应直接写成预计 HP 损失，护盾风险写成护盾消耗。

## Scope

- 调整核心事件摘要文案。
- 同步本地纯浏览器运行包 `web/js/local-engine.js`，保证 `runtime=local` 页面立即生效。
- 保持核心层无 DOM，UI 继续只读取事件 text。
- 不触碰 `docs/10_CHANGELOG.md`、`tasks/index.md`。

## related_files

- `src/core/battle/eventSummary.cjs`
- `tests/unit/event_summary.test.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/local-engine.js`
- `tasks/doing/2026-06-19_movement-risk-log-wording.md`
- `output/playwright/movement-risk-log-wording-2026-06-19.png`
- `output/playwright/movement-risk-log-wording-local-2026-06-19.png`
- `output/playwright/movement-risk-log-wording-local-visible-2026-06-19.png`

## exclusive_files

- `src/core/battle/eventSummary.cjs`
- `web/js/local-engine.js`

## read_files

- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/README.md`
- `tasks/doing/2026-06-19_all-out-preview-sandbox.md`
- `tasks/doing/2026-06-19_enemy-spawn-yaml-position.md`
- `tasks/doing/2026-06-19_move-board-overlays-left-up.md`
- `tasks/doing/2026-06-19_parallel-ai-file-lock-workflow.md`
- `tasks/doing/2026-06-19_pet-detail-selection-refresh.md`

## validation

- RED/GREEN: `node --test tests/unit/event_summary.test.cjs`
- Focused adapter: `node --test tests/ui_adapter.test.cjs`
- Bundle: `node tools/build_local_engine_bundle.cjs`
- Focused regression: `node --test tests/unit/*.test.cjs`
- Formal UI gate: real browser local runtime screenshot under `output/playwright/`.

## commit_plan

message: `fix(ui): clarify movement risk log wording`

## collaboration

lead_scope: 最小修改移动事件摘要，把护盾消耗与 HP 受伤分开。
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；主线程独立 Playwright tester pass 使用正式页面 HTTP runtime 和真实棋盘点击，截图 `output/playwright/movement-risk-log-wording-2026-06-19.png`。
external_ai_input: 无
lead_decision: 用户截图证明 HTTP runtime 验收不足；本轮同步更新 local runtime bundle，并把 HP 风险文案从“预计受伤”改为“预计HP损失”，护盾-only 风险写成“预计护盾消耗”。

## verification_results

- `node --test tests/unit/event_summary.test.cjs` passed：覆盖 HP 损失、护盾-only、缺少拆分字段 fallback。
- `node tools/build_local_engine_bundle.cjs` passed：本地运行包已包含 `预计HP损失` / `预计护盾消耗` 新文案；检查结果 `hasHp=true`, `hasShield=true`, `hasOldExact=false`。
- `node --test tests/ui_adapter.test.cjs` passed：39/39，UI24 已同步断言 `预计HP损失 0->7`。
- `node --test tests/unit/*.test.cjs` after final local-runtime correction failed 1 unrelated layout contract in `tests/unit/ui_combat_layout_contract.test.cjs` against current dirty `web/ux-app.css` (`event log should align to the center board column`); this task did not edit `web/ux-app.css`.
- Formal browser gate passed：Playwright 打开正式 `index.html?runtime=http`，点击 `开始战斗`，按真实棋盘入口执行 `R6C2->R1C4` 和 `R6C3->R2C5`。
- Browser assertions：事件 006 显示 `预计受伤 0->1（HP损失）`，不再是无解释的 `预计受伤 0->1。`；console errors `[]`。
- Screenshot: `output/playwright/movement-risk-log-wording-2026-06-19.png`。
- Main-thread screenshot review: 底部事件日志清楚显示 `预计受伤 0->3（HP损失）` 和 `预计受伤 0->1（HP损失）`，右侧受击预警同步显示 HP 10->9；未见明显遮挡、错位或缺失。
- Local-runtime browser gate passed：Playwright 打开正式 `index.html?runtime=local`，点击 `开始战斗`，按真实棋盘入口执行 `R6C3->R2C5->R2C6->R2C5`。
- Local-runtime browser assertions：事件 005-007 显示 `预计HP损失 0->7`、`预计HP损失 7->8`、`预计HP损失 8->7`，不再出现 `预计受伤 \d+->\d+`；console errors `[]`。
- Local-runtime screenshot: `output/playwright/movement-risk-log-wording-local-2026-06-19.png`。
- Visible local-runtime screenshot after scrolling log: `output/playwright/movement-risk-log-wording-local-visible-2026-06-19.png`，主线程复核可见事件 006/007 为 `预计HP损失 7->8` / `预计HP损失 8->7`。
- `npm run check:all` passed before the final local-runtime wording correction; not rerun after final correction because `node --test tests/unit/*.test.cjs` is currently blocked by unrelated dirty CSS layout contract failure above.
- Closeout verification: 2026-06-19 Lead reran `node tools/build_local_engine_bundle.cjs && npm run check:all && npm run test:coverage && node --test tests/browser_detail_selection.test.cjs && git diff --check`; command exited 0.

## followup_2026-06-19_risk_nine_fix

- 用户继续反馈 `7/8` 仍不对，预期这些移动落点应按 3 攻 3 槽主威胁显示 9 点。
- Root cause：`buildTeamRiskGrid` 只按真实敌方回合意图折算风险；敌人先移动 1 AP 后只剩 2 槽攻击，再叠加棉悠悠 1/2 点杂伤，于是显示 7/8。真实 `runMonsterTurn` 的“敌方移动消耗 AP”规则保留不变，但 UI 受击预警需要避免低估可到达的满槽主威胁。
- Fix：`src/core/battle/planning.cjs` 为 UI 风险预警增加 `projected_full_slot_threat` 下限；当可到达敌人的满行动槽主威胁高于实际 AP 折算杂伤时，用主威胁覆盖 `teamRiskGrid`。固定复现中 R2C5/R2C6 均为 9。
- Fix：`src/core/battle/eventSummary.cjs` 在移动前后非零风险相同的时候输出绝对值，例如 `预计HP损失 9`，不再隐藏等值风险。
- Tests：新增 `tests/ui_adapter.test.cjs` UI22B，固定构造疾风隼、捣蛋猫、棉悠悠局面，断言 R2C5/R2C6 都是 `damage=9` / `hpDamage=9` / 3 槽主威胁。
- Tests：新增 `tests/unit/event_summary.test.cjs` 等值非零 HP 风险断言。
- Bundle：`node tools/build_local_engine_bundle.cjs` passed，`web/js/local-engine.js` 已同步。
- Focused verification：`node --test tests/unit/event_summary.test.cjs tests/ui_adapter.test.cjs` passed 44/44。
- Unit regression：`node --test tests/unit/*.test.cjs` passed 71/71。
- Full regression：`npm run check:all` passed。
- Browser gate：Playwright 打开正式 `index.html?runtime=local`，真实点击 `开始战斗`、点击疾风隼、点击棋盘 R2C5；ViewModel 断言 `risk.damage=9`、`risk.hpDamage=9`、三段威胁为 `3,3,3`；DOM 断言棋盘显示 `受9`；事件日志显示 `预计HP损失 0->9`；console errors `[]`。
- Screenshots：`output/playwright/movement-risk-nine-local-2026-06-19.png`（右侧受击预警 9）、`output/playwright/movement-risk-nine-local-log-2026-06-19.png`（底部事件日志 0->9）。
- Main-thread screenshot review：右侧详情为 `预计伤害 9 / HP 10→1 / 存活`，详情文本列出敌方翠叶鼠 3 次行动块每槽 3 点，棋盘格显示 `受9`，底部事件日志显示 `预计HP损失 0->9`；未见明显遮挡、错位或旧 7/8 数值。

## commit_status

- blocked for auto-commit: shared worktree already contains unrelated dirty / READY_TO_MERGE task files; this task must be collected by a later precise commit or `git-c`.
