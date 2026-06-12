# 2026-06-12_enemy-pet-visible-damage-preview

## task_id

2026-06-12_enemy-pet-visible-damage-preview

## 类型

UI 预览修复 + 浏览器验收

## 目标

修复敌方宠物 AP=3 原地连续行动块时，玩家结束回合前可见伤害预览没有明确显示三次行动块、每次伤害、合计伤害和 KO 的问题。验收必须由子线程在真实浏览器里操作页面并截图审核。

## related_files

- `src/uiAdapter.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `output/playwright/enemy-pet-visible-damage-preview-main.png`
- `output/playwright/enemy-pet-visible-damage-preview-review.png`
- `tasks/index.md`
- `tasks/doing/2026-06-12_enemy-pet-visible-damage-preview.md`
- `tasks/done/2026-06-12_enemy-pet-visible-damage-preview.md`

## 验证命令

- `node --test tests/ui_adapter.test.cjs`
- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node tests/run_all_tests.cjs`
- `git diff --check`
- 子线程真实浏览器操作与截图审核

## commit_plan

`fix: 显示敌方宠物连续行动块伤害预览`

## 约束

- 不改敌方宠物行动结算规则，除非证据显示核心计划错误。
- UI 只读取 ViewModel，不直接修改核心 state。
- 截图必须证明 AP=3 原地三行动块场景，而不是默认局面中移动后剩余 2 次攻击的 `受6`。

## 进展

- 2026-06-12：开工；已确认上一次截图只证明默认局面出现 `受6/危6`，没有证明“原地 AP=3 三行动块”的可见预览。
- 2026-06-12：新增受击风险详情展示：无选中格时默认展示最高风险我方单位的 `受击预警`；点击高风险我方单位时仍优先展示敌方三行动块、每次伤害、合计伤害和 KO。
- 2026-06-12：棋盘受击角标从 `受21` 补为 `受21 KO`，与右侧详情的 KO 结论一致。
- 2026-06-12：右侧详情区域改为 flex 剩余空间内滚动，避免被 `结束回合 / 怪物行动 / 我方全部出击` 按钮遮挡。

## 验证记录

- RED：`node --test tests/unit/ui_combat_layout_contract.test.cjs` 失败于缺少 `teamRiskDetailText` / `受击预警` 合同。
- GREEN：`node --test tests/unit/ui_combat_layout_contract.test.cjs` 通过，6/6。
- `node --test tests/ui_adapter.test.cjs`：通过，22/22。
- `node tests/run_all_tests.cjs`：通过，44/44。
- `git diff --check`：通过。
- 主线程真实浏览器验证：加载 `output/playwright/enemy-pet-ap3-preview-save.json` 到 `http://127.0.0.1:4176`；不点击格子时右侧显示 `我方预览靶宠 受击预警`、`敌方三连猫 3次行动块`、`第1槽/第2槽/第3槽`、`合计21 KO`；点击 `R6C4 data-r=5 data-c=3` 后仍显示同样受击预警；棋盘目标格显示 `受21 KO` 和 `危21`；详情区与按钮区 `overlap=false`；截图 `output/playwright/enemy-pet-visible-damage-preview-main.png`。
- 子线程审核 1：`Jason` 初次审核通过但主线程复核截图发现右侧详情被按钮遮挡，未采纳为最终通过。
- 子线程审核 2：`Sartre` 明确指出点击 `R6C4` 后详情切回单位详情且存在遮挡风险，结论不通过。
- 子线程审核 3：`Peirce` 最终复审通过；真实浏览器点击 `R6C4 data-r=5 data-c=3` 后右侧仍包含 `受击预警`、`敌方三连猫 3次行动块`、`第1槽/第2槽/第3槽`、`伤7`、`合计21 KO`；棋盘显示 `受21 KO`、`危21`；遮挡 `overlapCount = 0`；console error 0；截图 `output/playwright/enemy-pet-visible-damage-preview-review.png`。

## 提交状态

- 已满足自动提交条件，按任务卡 `commit_plan` 随本轮收口提交。
