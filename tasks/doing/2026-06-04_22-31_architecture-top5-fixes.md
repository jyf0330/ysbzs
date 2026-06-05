# 任务：架构风险前 5 项最小修复

task_id: 2026-06-04_22-31_architecture-top5-fixes
status: READY_TO_VALIDATE
priority: P0
created_at: 2026-06-04 22:31
updated_at: 2026-06-04 22:52

## 目标

在不做大重构的前提下，落地上一轮二次证据审计里最该先修的 5 个阻塞项：

1. dispatch 化长尾玩家入口，清掉 `ui.js` 对核心状态的直接写入
2. 给关键战斗/商店行为补统一结构化日志出口，减少只写 DOM 日志的路径
3. 增加 legacy fallback strict mode，避免旧 `UNIT_DEFS / SHOP_POOLS / SD / legacy_data` 静默误入正式流程
4. 清理 8×8 棋盘仍残留的 `12/13` 边界判断
5. 补真实入口回归测试，至少覆盖入口 → 状态 → `G.actionLog` / 结构化日志 → 渲染桩变化

## 相关文件 related_files

- battle.js
- dispatch.js
- docs/10_CHANGELOG.md
- externalDataAdapter.js
- ui.js
- test.js
- gpt_test.js
- tasks/doing/2026-06-04_16-51_shop-ui-density-pass.md
- tasks/doing/2026-06-04_22-31_architecture-top5-fixes.md
- tasks/doing/当前任务.md
- tasks/index.md

## 不应修改的文件 excluded_files

- docs/archive/
- docs/04_CURRENT_UI_ART_SPEC.md
- tasks/paused/2026-06-02_08-20_shop-ui-doc.md
- index.html
- preview.js
- shop.js
- game.js

## 下一步 resume_next_step

当前业务修复已完成；如需提交，先决定是否顺手单独修 `e2e/smoke.js` 的旧 selector 口径。

## 验收 validation_needed

- [x] `dispatchGameAction` 覆盖 tooltip 选择、背包使用、商店消耗品购买等长尾玩家入口
- [x] `ui.js` 不再直接写 `G.explPos / G.gold / G.backpack / hero.hp`
- [x] 怪物攻击/移动、召唤物行动、关键玩家入口至少有结构化日志落点
- [x] legacy fallback strict mode 可开关，正式路径误命中会被记录或拦截
- [x] `battle.js` 不再使用 8×8 之外的 `12/13` 边界
- [x] `node test.js` 通过
- [x] `node gpt_test.js` 通过
- [x] `node playable_day1.js` 通过
- [x] `node playable_run.js` 通过
- [ ] `node e2e/smoke.js` 通过（当前失败点是旧 smoke 仍等待 `#board .cell` 可见）

## 提交计划 commit_plan

- 提交信息格式：`fix(architecture): land top-5 risk guards`

## 中断记录 interruption_log

2026-06-04 22:31：接管上一轮架构二次证据审计的 5 项最高优先修复，先校准旧任务卡状态，再开始实现。
2026-06-04 22:52：核心修复和主要回归已通过；`e2e/smoke.js` 暂因旧 selector `#board .cell` 等待超时，未纳入本轮代码修复范围。

## 冲突记录 conflict_log

2026-06-04 22:31：原 `shop-ui-density-pass` 任务卡仍写 `READY_TO_VALIDATE` 且占用 `ui.js / test.js`，但已有 `done_at` 与 `commit_id`，已先校准为 `DONE` 后再开本任务，避免触发 FILE_CONFLICT_STOP。
