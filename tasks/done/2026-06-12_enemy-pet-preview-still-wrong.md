# 2026-06-12_enemy-pet-preview-still-wrong

task_id: 2026-06-12_enemy-pet-preview-still-wrong
status: DONE
type: bugfix/ui-preview
done_at: 2026-06-12

## Goal

修复真实页面里敌方宠物伤害预览仍显示旧式单格威胁、没有按敌方宠物 AP 连续行动块累计显示的问题。

## Related Files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tests/run_all_tests.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-12_enemy-pet-preview-still-wrong.md`

## Validation

- `node --test tests/ui_adapter.test.cjs`
- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node tests/run_all_tests.cjs`
- real browser player-flow verification with screenshot in `output/playwright/`

## Commit Plan

- `fix: 修正敌方宠物累计伤害预览`

## Evidence Log

- 2026-06-12: 用户截图显示真实页面仍为旧式 `危1/危3` 威胁展示，右侧详情仍是普通单位详情，未展示敌方宠物 AP 连续行动块合计伤害。
- 2026-06-12: 定位到 `127.0.0.1:4173` 仍运行 2026-06-10 00:23 启动的旧 Node UI 服务，旧 API 进程没有加载最新 `teamRiskGrid` 逻辑；已重启同端口服务。
- 2026-06-12: 重启后 `/api/view` 已返回 `teamRiskGrid`，但独立子线程 Galileo 真实浏览器验收失败：点击带风险的我方单位后右侧 `#detail-summary` 仍为 `疾风隼`，只在普通单位详情下方附加 `⚠ 敌方翠叶鼠 2次行动块...合计6`，缺少明确 `受击预警` 面板。
- 2026-06-12: 修复 `web/js/main.js` 与 `web/ux-app.js`：通用棋盘详情分支中，如果当前格单位是我方且存在 `teamRisk`，优先渲染 `renderTeamRiskPanel(teamRisk)` 并返回。
- 2026-06-12: 主线程真实浏览器验收：打开 `http://127.0.0.1:4173/?sessionId=click-warning-fixed-main`，点击 `#new-game-btn`、`#etb`、点击最高风险单位格 `r=5 c=2`。截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-pet-preview-click-warning-fixed-main.png`。证据：`#detail-summary = 我方疾风隼 受击预警`；详情包含 `敌方翠叶鼠 2次行动块：第1槽 我方疾风隼 伤3 / 第2槽 我方疾风隼 伤3；合计6`；棋盘格包含 `受6`；console error 0；按钮重叠 0。
- 2026-06-12: 独立测试子线程 Pasteur 真实浏览器验收 PASS。截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-pet-preview-click-warning-fixed-subagent.png`。证据：`#detail-summary = 我方疾风隼 受击预警`；`teamRiskGrid[0].damage=6`、`threatCount=2`、两次伤害 `3/3`；console error 0；截图无明显遮挡。

## Validation Result

- PASS: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- PASS: `node --test tests/ui_adapter.test.cjs`
- PASS: `node tests/run_all_tests.cjs` (`44/44 tests passed`)
- PASS: `git diff --check`
