# 棋盘单位数字优先显示

task_id: 2026-06-11_board-unit-numeric-badges
type: ui
status: DONE

## Goal

把棋盘单位显示改成数字优先：每个单位在棋盘格内常驻显示生命和攻击数字，避免脚底长文本/血条挤占信息；同时移除当前 UI 中的误伤显示残留。

## Related Files

- web/js/main.js
- web/ux-app.js
- web/ux-app.css
- tests/unit/ui_combat_layout_contract.test.cjs
- tasks/index.md
- tasks/done/2026-06-11_board-unit-numeric-badges.md

## Unowned Dirty Files

- docs/02_CURRENT_WORKFLOW.md
- tasks/index.md 中已有 DONE 任务登记改动
- tasks/done/2026-06-11_workflow-consult-skill-routing.md
- tasks/done/2026-06-11_singleplayer-runtime-mode.md
- tests/unit/singleplayer_runtime.test.cjs
- tools/check_ui_connected.cjs
- web/js/runtime-client.js
- web/js/main.js 中存在不属于本任务的 runtime-client 相关改动

## Validation Commands

- node tests/unit/ui_combat_layout_contract.test.cjs
- npm run check:all

## Commit Plan

commit_message: fix: 优化棋盘单位数字显示
stage_only:
- web/js/main.js
- web/ux-app.js
- web/ux-app.css
- tests/unit/ui_combat_layout_contract.test.cjs
- tasks/index.md
- tasks/done/2026-06-11_board-unit-numeric-badges.md

## Evidence

- RED: `node tests/unit/ui_combat_layout_contract.test.cjs` 先失败，缺少 `unit-stat-badge unit-stat-hp`。
- GREEN: `node tests/unit/ui_combat_layout_contract.test.cjs` 通过，6/6 pass。
- `npm run check:all` 通过。
- 浏览器检查 `http://127.0.0.1:4173`：棋盘单位 8 个，HP 角标 8 个，攻击角标 8 个，缺失角标单位 0 个，`.friendly-warning` 0 个，console error 0。
- `git diff --check` 通过。
- Commit: ready。runtime-client 任务已先拆分提交，本任务剩余改动可按 `fix: 优化棋盘单位数字显示` 单独提交。
