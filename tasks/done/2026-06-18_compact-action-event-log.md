# 2026-06-18_compact-action-event-log

task_id: 2026-06-18_compact-action-event-log
type: UI / event log readability
status: DONE
done_at: 2026-06-18 22:46:00 +0800

## Goal

收敛行动槽和方向切换的默认事件日志：只展示位移/来源到目标、预计伤害变化、敌方伤害、元素增加；减少、空状态、无威胁、整格明细默认不写。

## Scope

- 核心仍只产出结构化事件，不操作 DOM。
- UI 继续只读 ViewModel 事件文本。
- 默认事件文本不再列出每个影响格的完整 HP、火0/水0/风0、无威胁等噪音。
- 保留结构化字段，便于 debug/replay 继续追溯。

## related_files

- `src/core/battle/actions.cjs`
- `src/core/battle/position.cjs`
- `src/core/battle/eventSummary.cjs`
- `src/core/battle.cjs`
- `web/js/local-engine.js`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`
- `output/playwright/compact-action-event-log-2026-06-18.png`
- `tasks/index.md`
- `tasks/done/2026-06-18_compact-action-event-log.md`

## validation

- `node --test tests/ui_adapter.test.cjs`
- Browser visible gate: Playwright real browser player action path, save screenshot under `output/playwright/`, assert event log has compact action text and no long cell dump.
- `npm run check:all`

## commit_plan

message: `fix(ui): compact action event logs`

## collaboration

lead_scope: Compact action/direction event text while preserving structured event payloads.
specialist_input: 无
tester_pass: TEST_SUBTHREAD_UNAVAILABLE；独立 Playwright tester pass 已用真实浏览器点击开始战斗、棋盘英雄、空格移动、行动槽、方向、目标格和释放，截图 `output/playwright/compact-action-event-log-2026-06-18.png`，console errors 0。
external_ai_input: 无
lead_decision: 保留结构化事件字段，默认 `text` 改为玩家摘要：移动写位移/预计受伤变化，方向写预览格数/命中对象，施放写命中/受伤/元素增加；减少和旧整格明细不进默认日志。

## verification_results

- `node --test tests/ui_adapter.test.cjs`: pass, 35/35.
- `npm run check:jsdoc`: pass.
- Browser visible gate: pass at `http://127.0.0.1:4192/index.html?sessionId=compact_action_event_log_bottom_*`; real clicks: `#etb` -> hero cell -> empty board cell -> slot 0 -> direction right -> preview target cell -> release.
- Browser assertions: event tab has compact `MOVE_HERO`, `SET_ACTION_DIRECTION`, `PLAYER_SELECT_SLOT`; no `本次影响` / `影响N格：` / `火0/水0/风0` / `无威胁` / `第N行第N列` old dump text; console errors 0.
- screenshot: `output/playwright/compact-action-event-log-2026-06-18.png`
- Main thread screenshot review: visible event log shows compact movement, direction preview, selected target, and action-slot element increase summary; no obvious overlap, missing text, or old noisy cell dump.
- `npm run check:all`: pass; included `run_all_tests` 64/64, unit 62/62, UI 35/35, full 9/9, ops 12/12, prediction 4/4, architecture, CSV, Day7 Chromium browser, DOM ban, UI-connected, and JSDoc checks.

## commit_status

- ready for exact-stage auto commit.
