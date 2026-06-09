# 2026-06-09_ui-combat-layout-publication-split

## 状态

ACTIVE

## 类型

UI/UX 文档拆分 + 第一版界面 P0 实施

## 目标

把用户提供的“棋盘战斗界面策划设计稿”拆成可执行文档和任务分级，并开始落地第一版 P0：左侧承载上阵宠物与行动块，右侧承载详情，棋盘不承载详情，备战作为阶段覆盖层，商店/奖励不在战斗界面常驻。

## 用户确认口径

- 行动块在左侧宠物卡下方常驻。
- 备战界面范围大，是为了让玩家明确当前不是开战状态。
- 自动流程拆成独立任务，不塞进本轮 P0。
- 棋盘里不能做详情，详情进入右侧。
- 验收拆级，P0/P1/P2 分开。

## related_files

- `tasks/doing/当前任务.md`
- `tasks/index.md`
- `docs/UI_COMBAT_LAYOUT_PUBLICATION_SPEC.md`
- `docs/UI_COMBAT_LAYOUT_TASKS.md`
- `docs/UX_INTERACTION_DESIGN_OPTIMIZED.md`
- `web/index.html`
- `web/ux-app.js`
- `web/ux-app.css`
- `web/js/main.js`
- `tools/record_browser_player_flow.cjs`
- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*.png`

## 不归属本任务的既有脏文件

- `.gitignore`
- `CSV_START_HERE.md`
- `data/csv/README_csv_source.md`
- `docs/00_AI_START_HERE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/PLANNER_START.md`
- `package.json`
- `source/game-data-source/tables/00_linked_data_master_01_09_wave_rules_delivery_20260609.xlsx`
- `tests/csv_source.test.cjs`
- `xlsx/ysbzs_v1_linked_data_tables.xlsx`
- `tasks/README.md`
- `tasks/done/2026-06-09_task-occupancy-skill.md`
- `tools/build_human_master.py`
- `tools/build_readable_workbook.py`
- `tools/export_master_to_csv.py`
- `xlsx/ysbzs_master.xlsx`

## 验证命令

- `node --test tests/ui_adapter.test.cjs`
- `npm run check:ui-connected`
- 浏览器真实打开 `npm run ui` 服务，截图检查主界面信息层级和 console error。

## commit_plan

提交信息：`ui: split combat layout spec and land left action blocks`

## 进度

- [x] 拆出版式/交互/任务边界文档。
- [x] 更新现有 UX 文档里的三栏职责，避免旧“右侧行动槽”口径继续误导。
- [x] 实施 P0 界面：左侧宠物 + 12 行动块，右侧详情，棋盘不做详情。
- [x] 验证 UI adapter、connected check、浏览器截图。

## 验证记录

- `node --input-type=module --check < web/js/main.js && node --check web/ux-app.js && node --check tools/record_browser_player_flow.cjs`：通过。
- `node --test tests/ui_adapter.test.cjs`：15/15 通过。
- `npm run check:ui-connected`：通过。
- `npm run check:browser`：通过，真实 Chrome/CDP 点击链路生成 18 张截图，证据目录 `evidence/browser-real-flow/`。
- `npm run check:all`：通过。
- `npm run test:coverage`：88/88 通过，all files line coverage 94.52%。

## 完成说明

- 新增 `docs/UI_COMBAT_LAYOUT_PUBLICATION_SPEC.md` 作为出版规格，明确左侧行动块、右侧详情、棋盘无详情、备战阶段覆盖层、自动流程拆任务。
- 新增 `docs/UI_COMBAT_LAYOUT_TASKS.md` 拆分 P0/P1/P2/P3。
- 更新 `docs/UX_INTERACTION_DESIGN_OPTIMIZED.md`，替换旧“右侧行动槽”口径。
- 更新真实入口 `web/js/main.js` 和备用壳 `web/ux-app.js`，把行动块渲染到左侧宠物卡下方，右侧详情承载宠物/行动块/棋盘格信息。
- 更新 `web/index.html` / `web/ux-app.css`，让右侧回合控制重新进入可见区域，底部日志改为纸张风格。
- 更新 `tools/record_browser_player_flow.cjs` 的真实浏览器选择器，跟随左侧行动块新结构。
