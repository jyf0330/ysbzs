# 2026-06-11_preview-damage-sandbox

## 状态

- task_id: `2026-06-11_preview-damage-sandbox`
- 类型: Bugfix / 棋盘预览伤害
- 目标: 修复棋盘预览把 `slot.layers` 当预计伤害的问题，让预览伤害至少按真实元素叠层、3层成型、Σ(1..N)、护盾/HP 前后值计算，并保留整队累计预览。
- 状态: doing

## related_files

- `src/core/battle/preview.cjs`
- `src/core/battle.cjs`
- `tests/ui_adapter.test.cjs`
- `tasks/index.md`
- `tasks/doing/2026-06-11_preview-damage-sandbox.md`
- `tasks/done/2026-06-11_preview-damage-sandbox.md`

## 开工前工作区

- `git status --short --untracked-files=all` 无输出。
- `tasks/doing/` 为空；`tasks/index.md` 显示 ACTIVE 无。

## 验证计划

- RED/GREEN: `node --test tests/ui_adapter.test.cjs`
- 项目级: `npm run check:all`

## 实施记录

- 新增 UI17 回归测试：敌方格已有火2层、火宠本次命中铺火1层，预览必须显示结算前火3、结算后火0、Σ(1..3)=6，并拆出盾伤害2与HP伤害4。
- `buildPreviewGrid()` 不再把 `slot.layers` 直接当 `predictedDamage`。
- 预览层维护沙盒投影：每个影响格累积 `projectedElements`，每个单位累积 projected HP/盾/存活状态。
- 命中单位且元素达到3层时，按 `fireDamage(layers)` 计算 Σ 伤害，再按目标防御/护盾/HP 估算 `predictedDamage`、`predictedShieldDamage`、`predictedHpDamage`、HP/盾前后值和击杀标记。
- `projectedElementsBeforeSettle` 表示结算前层数，`projectedElements` 表示本次预览结算后的层数。
- 本轮未修改浏览器 UI 文件；现有 UI 继续读取 `predictedDamage`。

## 验证结果

- RED: `node --test tests/ui_adapter.test.cjs` 失败于 UI17，`predictedDamage` 实际为1，预期6。
- GREEN: `node --test tests/ui_adapter.test.cjs` 通过，17/17 pass。
- 项目级: `npm run check:all` 通过，包含 47 个 npm test 子测试、UI17、architecture、csv、day7、dom、ui-connected、jsdoc。
- 覆盖率: `npm run test:coverage` 通过，99/99 pass，all files line 94.87%。
- 验证后工作区出现非本任务 puzzle submission 相关未提交改动；本轮不回滚、不暂存。

## commit_plan

- message: `fix(core): align preview damage with element settlement`
- status: ready
