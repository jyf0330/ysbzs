# 2026-06-12_day1-bazaar-node-flow

task_id: 2026-06-12_day1-bazaar-node-flow
status: DONE
type: core-flow-feature
created_at: 2026-06-12

## Goal

实现 Day1 大巴扎式节点流程：2 个成长节点 3 选 1，中午遭遇 3 选 1，再 2 个成长节点 3 选 1，最后进入晚上固定战并结束 Day1；保留旧商店/奖励/商店事件命令兼容。

## Related Files

- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `src/core/csvData.cjs`
- `src/core/data.cjs`
- `src/core/state.cjs`
- `src/core/reducer.cjs`
- `src/core/shop.cjs`
- `src/core/dayRoute.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `src/uiAdapterCommands.cjs`
- `src/uiAdapter.cjs`
- `tests/run_all_tests.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/full_coverage.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `web/index.html`
- `web/ux-app.js`
- `web/ux-app.css`
- `web/js/main.js`
- `tasks/index.md`
- `tasks/doing/2026-06-12_day1-bazaar-node-flow.md`
- `tasks/done/2026-06-12_day1-bazaar-node-flow.md`

## Validation

- `node tests/run_all_tests.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `npm run check:all`

## Commit Plan

- `feat: 实现第一天大巴扎节点流程`

## Evidence Log

- 2026-06-12: 创建任务卡并占用 Day1 节点流程相关代码、CSV 与测试文件。
- 2026-06-12: TDD 红灯确认：`node tests/run_all_tests.cjs` 因缺少 `data.nodeSchedule` 失败；`node --test tests/ui_adapter.test.cjs` 因缺少公开节点命令失败。
- 2026-06-12: 实现节点排程、节点池、遭遇池、Day1 路线状态与 reducer/uiAdapter/web 入口。
- 2026-06-12: `node tests/run_all_tests.cjs` 通过，46/46。
- 2026-06-12: `node --test tests/ui_adapter.test.cjs` 通过，25/25。
- 2026-06-12: `git diff --check` 通过。
- 2026-06-12: `npm run check:all` 首轮通过；随后浏览器验收发现运行入口 `web/js/main.js` 未同步节点/遭遇按钮，已补齐。
- 2026-06-12: `TEST_SUBTHREAD_UNAVAILABLE`：当前未开启独立测试子线程，主线程使用独立 Chromium/Playwright pass 通过真实玩家入口验证。
- 2026-06-12: 可见验收命令：`PORT=4199 node tools/run_ui_server.cjs` + Codex bundled Playwright 真实点击 `新开一天 -> 生成节点 -> 选节点 -> 生成节点 -> 选节点 -> 生成遭遇 -> 选遭遇`。
- 2026-06-12: 可见验收断言：节点候选 3 个；中午遭遇候选 3 个；选择遭遇后 `phase=battle_end`；`dayRoute.battleIndex=1`；`currentEncounter.phaseLabel=中午战`；console error=0。
- 2026-06-12: 截图证据：`output/playwright/day1-node-options-step1.png`、`output/playwright/day1-midday-battle-options.png`、`output/playwright/day1-midday-battle-picked.png`。
- 2026-06-12: 主线程截图复核：节点 3 选 1、中午遭遇 3 选 1 和战斗结算画面可见；未见明显遮挡、错位、缺失或错误数值。
- 2026-06-12: 最终 `npm run check:all` 通过。
