# 2026-06-12_enemy-pet-damage-preview

## task_id

2026-06-12_enemy-pet-damage-preview

## 类型

UI 预览修复

## 目标

修复敌方宠物 AP 行动循环已经进入核心 intent/threat，但玩家结束回合前基础伤害预览未同步显示的问题。ViewModel 应在没有移动/摆位操作时也暴露会被敌方宠物命中的我方单位、累计伤害和 KO 状态。

## related_files

- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `tasks/index.md`
- `tasks/doing/2026-06-12_enemy-pet-damage-preview.md`
- `tasks/done/2026-06-12_enemy-pet-damage-preview.md`

## 验证命令

- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- `git diff --check`

## commit_plan

`fix: 同步敌方宠物累计伤害预览`

## 约束

- UI 只读取 ViewModel，不直接读取或修改核心 state。
- 不改敌方宠物行动核心结算，只修正预览暴露范围。

## 进展

- 2026-06-12：开工，已确认核心 `intent/threatGrid/teamRiskGrid` 能累计 AP 伤害，漏点在 `uiAdapter` 默认只在 `movedUnitIds.length` 时暴露 `teamRiskGrid`。
- 2026-06-12：已补 `UI22` 回归测试，覆盖未移动前 ViewModel 暴露敌方宠物 AP 累计伤害。
- 2026-06-12：`uiAdapter` 已改为无 `movedUnitIds` 时生成全队风险预览，有摆位预览时保留原有 movedUnitIds 范围。

## 验证记录

- RED：`node --test tests/ui_adapter.test.cjs` 失败于 `UI22 未移动前伤害预览直接显示敌方宠物 AP 累计伤害`，原因是 `teamRiskGrid` 为空。
- GREEN：`node --test tests/ui_adapter.test.cjs` 通过，22/22。
- `node tests/run_all_tests.cjs`：通过，44/44。
- `git diff --check`：通过。
- 浏览器验证：`http://127.0.0.1:4175` 通过 `/api/action` 进入 `player_turn` 后刷新页面，DOM 出现 `.team-risk-num` 文本 `受6`，`.threat-num` 包含 `危6`；console error 0。

## 提交状态

- 已满足自动提交条件，按任务卡 `commit_plan` 随本轮收口提交。
