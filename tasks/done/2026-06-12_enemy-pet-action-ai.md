# 2026-06-12_enemy-pet-action-ai

## task_id

2026-06-12_enemy-pet-action-ai

## 类型

核心规则 + UI 预览

## 目标

把敌方单位统一为敌方宠物行动逻辑：敌方宠物按自身 HP / ATK / AP / 攻击形状 / 行动块行动，每点 AP 可移动 1 格或使用 1 次行动块；敌方回合可连续使用多个行动块，不能穿过单位、核心、元素陷阱或元素格；普通攻击只造成直接伤害，不默认铺元素；ViewModel/UI 在玩家结束回合前预览路径、行动块、攻击范围、命中目标、单次伤害、合计伤害和 KO。

## related_files

- `src/core/battle/planning.cjs`
- `src/core/battle.cjs`
- `src/uiAdapter.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `tests/planning_ai_rules.test.cjs`
- `tests/full_player_operations.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/index.md`
- `tasks/doing/2026-06-12_enemy-pet-action-ai.md`
- `tasks/done/2026-06-12_enemy-pet-action-ai.md`

## 验证命令

- `node --test tests/planning_ai_rules.test.cjs`
- `node --test tests/full_player_operations.test.cjs`
- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- 真实浏览器：`http://127.0.0.1:4174`

## commit_plan

`feat: 重做敌方宠物行动逻辑`

## 约束

- 核心层不得直接操作 DOM。
- UI 只读取 ViewModel，不直接修改核心 state。
- 玩家链路仍通过 `/api/action`、`/api/view`。
- 不恢复旧 UI 文件。

## 进展

- 2026-06-12：开工，任务槽已占用。
- 2026-06-12：敌方行动规划已改为敌方宠物 AP 循环；每点 AP 可移动或使用 1 个行动块，支持同回合连续行动块、移动后继续攻击、阻挡元素/地形格、直接伤害不铺元素。
- 2026-06-12：ViewModel/UI 已补敌方宠物行动块、威胁格、单次伤害、合计伤害和 KO 预览；敌方单位槽位暴露给 UI，名称按宠物名显示。
- 2026-06-12：仓库内未发现 `docs/10_CHANGELOG.md`，本轮不新建 changelog；以本任务卡记录交付变更。

## 验证记录

- `node --test tests/planning_ai_rules.test.cjs`：通过。
- `node --test tests/full_player_operations.test.cjs`：通过。
- `node --test tests/unit/ui_combat_layout_contract.test.cjs`：通过。
- `node --test tests/ui_adapter.test.cjs`：通过。
- `node tests/run_all_tests.cjs`：通过，44/44。
- `npm run check:all`：通过。
- `npm run test:coverage`：通过，103/103；lines 94.79%，branches 67.28%，functions 92.01%。
- 真实浏览器验证：通过；敌方名显示为 `敌方棉悠悠`，敌方槽位数为 3，威胁详情包含 `敌方翠叶鼠 2次行动块`、`第1槽`、`第2槽`、`合计6`；截图 `output/enemy-pet-action-ai-browser.png`。
- `git diff --check`：通过。

## 提交状态

- 已满足自动提交条件，按任务卡 `commit_plan` 随本轮收口提交。
