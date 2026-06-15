# 定向补货购买进入构筑来源

## task_id

2026-06-15_restock-purchase-build-source

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第三层 / 第四层：玩家购买来自定向补货的商品后，补货来源必须写入背包条目、购买事件、ViewModel 库存和文字报告，让“商店选择影响构筑成长”有可追踪证据，而不是只在未购买 offer 上存在。

## 本任务推进本文哪一层验收

- 第三层：外层节点 / 商店选择进入背包与构筑成长证据链。
- 第四层：商店事件生成的商品购买后能影响后续队伍/战斗准备，并保留来源。
- 第二层：定向补货不止影响商品生成，也能追踪到实际购买结果。

## 外层状态字段

- `state.inventory[].acquiredFrom`
- `SHOP_BUY.inventory.acquiredFrom`
- `viewModel.inventory.items[].acquiredFrom`
- `stateHash(state).inventory[].acquiredFrom`

## 玩家入口

- `APPLY_SHOP_EVENT` 触发定向补货
- `BUY_OFFER` 购买带 `offer.restock` 的商品
- `/api/action`
- `/api/view`
- `/api/report`

## ViewModel / report 证据

- 购买后的 bench 条目包含 `acquiredFrom.type=restock_offer`、`eventId=evt_shop_fire`、`name=火元素补货`、`poolId=elem_火`
- `SHOP_BUY` 事件携带同样来源
- `renderPlayerReport` 或 `renderShopReport` 能看到背包来源

## related_files

- `src/core/shop.cjs`
- `src/core/stateHash.cjs`
- `src/uiAdapter.cjs`
- `src/render/textReport.cjs`
- `tests/ui_adapter.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_restock-purchase-build-source.md`

## unowned_dirty_or_staged_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 当前暂存区已有前序任务文件，包含前序外层 run、战斗报告、商店补货来源、UI 入口、任务卡与 changelog 文件；本任务不吸收这些文件边界。

## commit_plan

`feat: 记录补货购买构筑来源`

## 验证计划

- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- `node tools/audit_singleplayer_architecture.cjs`
- `node tools/check_no_dom.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`

## 可见验收

本任务不修改浏览器 DOM / CSS / 可见文案布局，只改变核心状态、ViewModel 和报告；无需截图门禁。

## 进度记录

- 2026-06-15: 创建任务卡；ACTIVE 原为空；记录已有前序暂存/脏文件，本任务不自动提交。
- 2026-06-15: TDD 红灯：新增 `UI06C 购买定向补货商品会把来源写入背包和购买事件`，初始失败于 `SHOP_BUY.inventory.acquiredFrom` 缺失。
- 2026-06-15: 实现购买来源链路：`addInventory` 写入 `acquiredFrom`，`BUY_OFFER` 事件携带 `inventory/acquiredFrom`，ViewModel 公开事件保留 inventory，state hash 和玩家战报输出背包来源。
- 2026-06-15: 验证通过：
  - `node --test tests/ui_adapter.test.cjs`：32/32 pass。
  - `node tools/audit_singleplayer_architecture.cjs`：pass，`src/uiAdapter.cjs` 818 行。
  - `node tools/check_no_dom.cjs`：pass。
  - `node tests/run_all_tests.cjs`：63/63 pass。
  - `npm run check:all`：pass。
  - `npm run test:coverage`：123/123 pass，总行覆盖率 92.36%。
  - `git diff --check`：pass。
- 2026-06-15: 可见验收复核：本任务不改 DOM/CSS/浏览器可见布局，仅改核心状态、ViewModel 字段和文本报告；无需截图门禁。
- 2026-06-15: 收口限制：仓库已有前序 staged / dirty 文件，本任务只精确暂存 related_files，不自动提交。
