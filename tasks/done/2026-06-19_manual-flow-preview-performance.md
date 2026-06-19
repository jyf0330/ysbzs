# 2026-06-19_manual-flow-preview-performance

task_id: 2026-06-19_manual-flow-preview-performance
type: performance / combat preview
status: DONE
owner: Codex
worktree: shared-worktree

## Goal

优化 `PREVIEW_MANUAL_FLOW` 导致的游戏卡顿：完整事务预演不能每次 UI 操作都阻塞交互，也不能为 64 个格子逐个 dispatch `GET_CELL_DETAIL` 重算派生棋盘。同时修复该性能优化引入的详情回归：宠物移动后右侧详细信息必须跟随新位置刷新，预演详情和受击风险不能把之前的完整详情优化版覆盖掉。

## Scope

- `PREVIEW_MANUAL_FLOW` projected `cellDetails` 从 projected ViewModel 一次性派生，避免 64 次 read-only dispatch。
- UI 层刷新 `manualFlowPreview` 增加 stateHash/phase/round 缓存和 pending 去重。
- UI 命令完成后不再 `await refreshManualFlowPreview()` 阻塞交互；预演异步回填，过期结果丢弃。
- 本地 runtime 的预演计算延迟到下一帧后执行，避免在同一个点击任务里同步启动完整事务。
- 保持 projected risk/detail 显示语义不变，投影详情保留 ViewModel unit 的品质、定位、元素、行动块等展示字段。
- 当前点击格详情优先当前 `GET_CELL_DETAIL`，避免被未来预演格子的单位覆盖。
- 我方宠物有受击风险时仍显示完整宠物详情，风险作为紧凑 `⚠ ... 合计` 行嵌入，不再替换成 warning-only 面板。
- 同步 `web/js/local-engine.js`。

## related_files

- `src/uiAdapterManualFlowPreview.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/local-engine.js`
- `tests/unit/manual_flow_undo_contract.test.cjs`
- `tests/browser_detail_selection.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/done/2026-06-19_manual-flow-preview-performance.md`
- `output/playwright/manual-flow-detail-move-rich-2026-06-19.png`
- `tasks/index.md`

## exclusive_files

- `src/uiAdapterManualFlowPreview.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/local-engine.js`
- `tests/unit/manual_flow_undo_contract.test.cjs`
- `tests/browser_detail_selection.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`

## read_files

- `tasks/done/2026-06-19_move-risk-sandbox-formal-move.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/UI_UX_START.md`

## validation

- RED/GREEN: `node --test tests/unit/manual_flow_undo_contract.test.cjs`
- RED/GREEN: `node --test tests/ui_adapter.test.cjs`
- RED: `node --test tests/ui_adapter.test.cjs` caught projected cell detail losing `quality` (`undefined !== '青铜'`).
- RED: `node --test tests/browser_detail_selection.test.cjs` caught enemy clicked detail being overwritten by projected future unit, and moving 融焰娘 to a risky new cell showing `我方融焰娘 受击预警` instead of rich unit detail.
- GREEN: `node --test tests/browser_detail_selection.test.cjs` PASS.
- Related: `node --test tests/unit/manual_flow_undo_contract.test.cjs tests/unit/ui_module_render_cache.test.cjs tests/unit/ui_combat_layout_contract.test.cjs` PASS
- Build: `node tools/build_local_engine_bundle.cjs` PASS
- Full check: `npm run check:all` PASS
- Coverage check: `npm run test:coverage` PASS (154 tests, coverage report generated).
- Whitespace check: `git diff --check` PASS.
- Core perf sample after removing per-cell dispatch: Day7 player_turn preview avg about 868ms; round_end avg about 909ms. Baseline before change was about 1776ms / 2053ms.
- Visible gate: Playwright formal local-runtime flow on `http://127.0.0.1:4185/?runtime=local`: clicked `#day7-btn`, clicked a real board risk cell, clicked `#etb`.
- Browser evidence: `output/playwright/manual-flow-preview-performance-2026-06-19.png`
- Browser assertions: no console errors; selected risk detail rendered `我方火绒狐受击预警...合计-18`; final VM `phase=round_end`, `busy=false`, preview commands `START_NEXT_ROUND > END_PLAYER_TURN`.
- Detail regression visible gate: formal browser flow with `runtime=local`, clicked `#day7-btn`, clicked 融焰娘 on the board, clicked empty legal target R4C2 (0-based `r=3,c=1`) to move.
- Detail browser evidence: `output/playwright/manual-flow-detail-move-rich-2026-06-19.png`
- Detail browser assertions: no console errors; `#detail-summary` is `融焰娘`; `window.__YSBZS__.cellDetail()` is `r=3,c=1` for 融焰娘; moved ViewModel position is `r=3,c=1`; detail text includes `技能`、`当前状态`、`单位元素层`、`脚下元素层`、`合计-`; manual flow preview cell detail still has rich unit fields.
- Tester pass: `TEST_SUBTHREAD_UNAVAILABLE`; main thread ran independent Playwright pass and reviewed screenshot. Screenshot is a formal UI/player flow, no save injection or internal state mutation.

## commit_plan

message: `perf(combat): avoid blocking manual flow preview refresh`

## collaboration

lead_scope: 优化完整事务预演的计算和 UI 刷新策略，降低点击后的主线程阻塞；并修复详情刷新/详情优化版回归。
tester_pass: PASS via Playwright formal player flow.
lead_decision: DONE；两张截图效果正确，无明显遮挡/错位/缺失，console 无新增 error。移动后详情标题为融焰娘，完整宠物详情可见，风险摘要保留为嵌入式紧凑行。
commit_status: Ready for precise task commit.
