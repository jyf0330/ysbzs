# 路线选择后果预览

## task_id

2026-06-15_route-choice-consequence-preview

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第六层：节点选择界面要清楚区分商人、摊位、奖励、事件、遭遇、Boss，并让玩家在 3 选 1 时直接看到每个选择的倾向、代价和收益。

## 验收映射

- 第六层可视化和玩家理解：节点候选卡展示类型、标签/池子、成本、收益和说明。
- 第三层构筑成长：节点选择的短期收益和长期方向进入结构化 ViewModel，而不是只能从 DOM 文案猜测。

## 外层状态字段

- `state.dayRoute.options[].choicePreview`
- `state.dayRoute.battleOptions[].choicePreview`
- `viewModel.dayRoute.options[].choicePreview`
- `viewModel.dayRoute.battleOptions[].choicePreview`

## 玩家入口

- `/api/action`
- `/api/view`
- 页面按钮：生成节点、生成遭遇、选择节点、选择遭遇

## ViewModel / report 证据

- `viewModel.dayRoute.options[].choicePreview`
- `viewModel.dayRoute.battleOptions[].choicePreview`
- 浏览器节点候选卡 `.choice-preview`

## related_files

- `src/core/dayRoute.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `web/js/main.js`
- `web/ux-app.css`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_route-choice-consequence-preview.md`

## commit_plan

`feat: 显示路线选择后果预览`

## 验证计划

- `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `node --test tests/full_coverage.test.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：通过按钮生成节点/遭遇候选，截图记录节点卡可读后果、DOM/ViewModel/console 证据。

## 可见验收

本任务修改浏览器节点候选卡，必须执行提交前可见验收门禁：独立 tester pass 或子线程真实浏览器操作、保存截图、记录 DOM / ViewModel / console 证据，并由主线程复核截图。

## 进度记录

- 2026-06-15: 创建任务卡，占用路线选择后果预览相关文件。
- 2026-06-15: TDD 红灯：新增 UI07B / UI03C 断言后运行 `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs`，失败于 `choicePreview` 缺失和浏览器未实现 `renderChoicePreview`。
- 2026-06-15: 实现核心候选 `choicePreview`：节点候选包含类型、摘要、成本、收益和标签；遭遇候选包含战斗压力摘要和常规/高压标签。
- 2026-06-15: 浏览器节点/遭遇卡片接入 `.choice-preview` 和 `.choice-meta`，显示后果摘要、成本、收益和标签。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs` 通过，35/35。
- 2026-06-15: 首次截图复核发现遭遇阶段仍显示原始 `battle_choice`，补中文阶段 `遭遇选择` 并加入 UI03C 断言。
- 2026-06-15: 修正后 `node --test tests/ui_adapter.test.cjs tests/unit/ui_module_render_cache.test.cjs` 通过，35/35。
- 2026-06-15: `TEST_SUBTHREAD_UNAVAILABLE`：当前工具未提供可用独立子线程；执行独立 Playwright tester pass 替代。真实浏览器操作：打开 `http://127.0.0.1:4183`，点击“新开一天”，点击“生成节点”，点击节点候选，重复生成/选择节点，再点击“生成遭遇”。截图 `/Users/ywh/Documents/ysbzs/output/playwright/route-choice-consequence-preview-2026-06-15T06-31-34-830Z/node-choice-preview.png` 与 `/Users/ywh/Documents/ysbzs/output/playwright/route-choice-consequence-preview-2026-06-15T06-31-34-830Z/battle-choice-preview.png`；报告 `/Users/ywh/Documents/ysbzs/output/playwright/route-choice-consequence-preview-2026-06-15T06-31-34-830Z/choice-preview-report.json`。
- 2026-06-15: 浏览器 DOM / ViewModel 断言：`phase=遭遇选择`，`progress=遭遇 0 · 3选1`，`nextStep=选择遭遇`，3 张遭遇卡均 `hasPreview=true`、`hasMeta=true`、`overflow=false`；`vmBattleOptions[].choicePreview` 包含 `kindLabel=遭遇`、`costText=消耗战斗机会`、`gainText=胜利获得路线奖励`、`tags=战斗压力/常规战`；节点历史保留 `choicePreview`；`consoleErrors=[]`，`pageErrors=[]`。
- 2026-06-15: 主线程查看截图并复核通过：节点/遭遇卡能显示后果摘要、成本、收益和标签；遭遇阶段顶部中文显示正确，没有明显遮挡、错位、缺失或文本溢出。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，62/62。
- 2026-06-15: `node --test tests/full_coverage.test.cjs` 通过，9/9。
- 2026-06-15: `npm run check:all` 通过，包含 main / unit / ui / full / ops / prediction / architecture / CSV / Day7 browser / no DOM / UI connected / JSDoc。
- 2026-06-15: `npm run test:coverage` 通过，114/114，行覆盖率 92.03%。
- 2026-06-15: `git diff --check` 通过。
