# 2026-06-18_action-log-damage-element-summary

task_id: 2026-06-18_action-log-damage-element-summary
type: UI / event log readability bugfix
status: DONE
done_at: 2026-06-18

## Goal

修复行动槽摘要里“怪物受伤”和“元素增加”缺失的问题：本次行动如果实际造成怪物伤害，默认日志要写；如果元素先增加后又因火爆/成型被清掉，也要写本次增加，减少仍默认不写。

## Scope

- 核心仍只产出结构化事件，不操作 DOM。
- UI 继续只读 ViewModel 事件文本。
- `PLAYER_SELECT_SLOT` 摘要从本次结算事件流提取 `DAMAGE` 和 `APPLY_ELEMENT_CELL`，不只看最终棋盘差值。
- 重建 `web/js/local-engine.js`，保证浏览器本地 runtime 使用新核心。

## related_files

- `src/core/battle/actions.cjs`
- `src/core/battle/eventSummary.cjs`
- `web/js/local-engine.js`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`
- `output/playwright/action-log-damage-element-summary-2026-06-18.png`
- `tasks/index.md`
- `tasks/done/2026-06-18_action-log-damage-element-summary.md`

## validation

- `node --test tests/ui_adapter.test.cjs`
- Browser visible gate: Playwright real browser player action path, save screenshot under `output/playwright/`, assert hit-monster action log contains monster damage and element increase.
- `npm run check:all`

## commit_plan

message: `fix(ui): include damage and element gains in action logs`

## collaboration

lead_scope: Fix compact action log summaries for actual damage and transient element increases.
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；主线程执行独立 Playwright 浏览器验收，前置通过本地存档载入构造场景，实际验证动作走页面点击行动槽、点击目标格、点击释放。
external_ai_input: 无
lead_decision: accept

## verification_results

- `node --test tests/ui_adapter.test.cjs` passed；覆盖 `PLAYER_SELECT_SLOT` 同时输出 `damageSummary` 和 `elementIncreases`。
- Playwright real browser visible gate passed；截图：`output/playwright/action-log-damage-element-summary-2026-06-18.png`。
- 浏览器操作链路：打开 `index.html?runtime=local`，写入并点击读取本地存档，点击 `#slot-list [data-slot="0"]`，点击目标格 `R6C5`，点击释放。
- 关键浏览器断言：`PLAYER_SELECT_SLOT` 文本包含 `受火伤6` 与 `元素增加：R6C5 火+1`；`damageSummary` 包含怪物受火伤 6；`elementIncreases` 为 `R6C5 火+1`。
- console error：0。
- `npm run check:jsdoc` passed after JSDoc type annotation fix。
- `npm run check:all` passed。

## commit_status

- ready: `fix(ui): include damage and element gains in action logs`
