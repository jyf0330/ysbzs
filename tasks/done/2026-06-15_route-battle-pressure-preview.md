# 路线战前压力预览

## task_id

2026-06-15_route-battle-pressure-preview

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第四层和第六层：玩家在进入路线遭遇、固定战或终局 Boss 前，能看到本场战斗的压力、波次规模和奖励预期，而不是只看到“生成遭遇 / 进入固定战”。

## 验收映射

- 第四层战斗接入：预览必须来自当前路线遭遇与真实波次数据，不能另写一套战斗逻辑。
- 第六层可视化和玩家理解：浏览器奖励/路线区域要显示可读的战前压力信息，固定战入口也要带预览。

## 外层状态字段

- `state.dayRoute.battleOptions[].pressurePreview`
- `viewModel.nextActions[].defaultPayload.pressurePreview`
- `viewModel.dayRoute.battleOptions[]`

## 玩家入口

- `/api/action`
- `GENERATE_BATTLE_OPTIONS`
- `RUN_ROUTE_FIXED_BATTLE`
- 浏览器路线/遭遇按钮

## ViewModel / report 证据

- 遭遇 3 选 1 卡片暴露 `pressurePreview`
- 固定战 `nextActions` 暴露 `pressurePreview`
- 浏览器卡片显示压力、敌量、波次、奖励预期

## related_files

- `src/core/dayRoute.cjs`
- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `web/js/main.js`
- `web/ux-app.css`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_route-battle-pressure-preview.md`

## commit_plan

`feat: 显示路线战前压力预览`

## 验证计划

- `node --test tests/ui_adapter.test.cjs`
- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：通过玩家按钮生成遭遇候选并查看压力预览，推进到固定战前确认固定战预览，保存截图、DOM/ViewModel/console 证据。

## 可见验收

本任务修改浏览器可见路线卡片和固定战预览，必须执行提交前可见验收门禁：独立 tester pass 或等价独立测试流程真实浏览器操作、保存截图、记录 DOM / ViewModel / console 证据，并由主线程复核截图。

## 进度记录

- 2026-06-15: 创建任务卡，占用路线战前压力预览相关文件。
- 2026-06-15: TDD 红灯：`node --test tests/ui_adapter.test.cjs` 失败于遭遇候选缺少 `pressurePreview`；`node --test tests/unit/ui_module_render_cache.test.cjs` 失败于浏览器缺少 `renderBattlePressurePreview` 和对应样式。
- 2026-06-15: 实现核心 `buildBattlePressurePreview`，从当前 day/period 波次汇总总威胁、峰值、敌量、主品质和奖励预期；遭遇候选写入 `battleOptions[].pressurePreview`，固定战 `nextActions.defaultPayload` 写入同结构预览。
- 2026-06-15: 浏览器奖励区新增遭遇压力预览与固定战预告，仍只读取 ViewModel / nextActions，不直接修改核心 state。
- 2026-06-15: focused 绿灯：`node --test tests/ui_adapter.test.cjs` 通过，30/30；`node --test tests/unit/ui_module_render_cache.test.cjs` 通过，12/12；`node tools/audit_singleplayer_architecture.cjs` 通过，`src/uiAdapter.cjs` 仍为 815 行。
- 2026-06-15: 全量验证通过：`node tests/run_all_tests.cjs` 62/62；`npm run check:all` 通过；`npm run test:coverage` 121/121；`git diff --check` 通过。
- 2026-06-15: 真实浏览器验收保存到 `output/playwright/route-battle-pressure-preview-2026-06-15T16-45-00/`；截图 `battle-pressure-options.png` / `fixed-battle-pressure-preview.png`，报告 `route-battle-pressure-report.cli.json`。
- 2026-06-15: 浏览器操作步骤：生成/选择清晨节点1 -> 生成/选择清晨节点2 -> 生成中午遭遇候选 -> 选择中午遭遇 -> 领取路线战斗奖励 -> 生成/选择下午节点1 -> 生成/选择下午节点2。断言：遭遇卡片显示威胁/敌量/奖励，固定战前 `RUN_ROUTE_FIXED_BATTLE.defaultPayload.pressurePreview` 存在，固定战预告和按钮显示“进入晚上战”，console/page errors 为空。
- 2026-06-15: 主线程复核截图：遭遇压力预览和固定战预告均位于右侧奖励区，可读无明显遮挡；棋盘数值、顶部状态和主要按钮未被遮挡或错位。
