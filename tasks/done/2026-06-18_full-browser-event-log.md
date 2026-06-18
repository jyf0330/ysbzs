# 2026-06-18_full-browser-event-log

task_id: 2026-06-18_full-browser-event-log
type: UI / event log visibility
status: DONE
done_at: 2026-06-18 16:30:52 +0800

## Goal

修复浏览器事件日志只从后段 step（例如 042）开始显示的问题，让事件 tab 和 ViewModel 事件列表保留完整事件序列，前面的事件也能通过滚动查看。

## Scope

- UI 仍只读 ViewModel，不直接读取或修改核心 state。
- `/api/view` / local engine ViewModel 的 `events` 保留完整事件序列。
- 主战斗页事件 tab 显示完整可滚动事件，而不是只显示最后 22 条。
- 同步 legacy `web/ux-app.js` 和实际入口 `web/js/main.js`。
- 重建 `web/js/local-engine.js`，避免浏览器本地运行时继续使用旧的 30 条事件限制。
- 不修改当前并行元素包任务文件：`src/core/elementPackets.cjs`、`data/csv/21_element_packet_rules.csv`、`tests/run_all_tests.cjs`。

## related_files

- `src/uiAdapter.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/js/local-engine.js`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `output/playwright/full-browser-event-log-clean-bundle-2026-06-18.png`
- `tasks/index.md`
- `tasks/done/2026-06-18_full-browser-event-log.md`

## validation

- RED/GREEN: `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs`
- Browser visible gate: Playwright real browser, save screenshot under `output/playwright/`, assert event log includes early step.
- Project-level: `npm run check:all`

## commit_plan

message: `fix(ui): show full browser event log`

## collaboration

lead_scope: Fix ViewModel event count and browser event tab rendering.
specialist_input: 无
tester_pass: pending
external_ai_input: 无
lead_decision: 保留完整结构化事件在 ViewModel，由滚动容器承担显示，不再在 adapter/UI 层截断。

## verification_results

- RED `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs`: failed as expected; ViewModel returned 30 events while state had 359, and browser code still used `events.slice(-22)`.
- GREEN `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs`: pass, 45/45.
- Browser visible gate: Playwright real browser at `http://127.0.0.1:4191/index.html?sessionId=event_log_full_clean_bundle`; clicked `#full-day-btn`; event tab first line `001 [NODE_OPTIONS] ...`, line count 393, includes later step 042, `scrollTop=0`, console errors 0.
- screenshot: `output/playwright/full-browser-event-log-clean-bundle-2026-06-18.png`
- `npm run check:all`: pass, exit 0; included `node tests/run_all_tests.cjs` 64/64, `test:unit` 62/62, `test:ui` 32/32, `test:full` 9/9, ops 12/12, prediction 4/4, architecture/csv/day7/dom/ui-connected/jsdoc checks pass.

## commit_status

- committed by exact staging plan
- unowned dirty files intentionally left unstaged: `data/csv/21_element_packet_rules.csv`, `src/core/elementPackets.cjs`, `tests/run_all_tests.cjs`, `tasks/done/2026-06-18_remove-element-packet-splitting.md`, paper battle files, and LibreOffice lock file.

## notes

- Parallel dirty task present but not indexed: `tasks/doing/2026-06-18_remove-element-packet-splitting.md`; related files do not overlap this task.
- Unowned dirty files remain out of scope: `data/csv/.~lock.15_summon_trial_questions.csv#`, `docs/PAPER_BATTLE_UI_START_HERE.md`, `tools/check_paper_battle_ui.cjs`, `web/assets/reference_trace_base.jpeg`, `web/paper-battle.css`, `web/paper-battle.html`, `web/paper-battle.js`.
