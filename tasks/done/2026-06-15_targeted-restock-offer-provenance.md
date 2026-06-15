# 定向补货商品来源追踪

## task_id

2026-06-15_targeted-restock-offer-provenance

## 目标

推进 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md` 第二层 / 第四层 / 第六层：定向补货不只记录为一次刷新事件，还要让补货生成的商品携带来源事件、补货池、标签和 `restockId`，并能在 ViewModel、文字报告和浏览器商店卡片中被玩家看见。

## 本任务推进本文哪一层验收

- 第二层：定向补货作为商店状态和商品来源存在，不只是日志文字。
- 第四层：商店事件生成的商品选择能留下结构化证据，后续购买可追踪到具体补货来源。
- 第六层：玩家能在商店界面看出哪些商品来自火/水/风/土等定向补货。

## 外层状态字段

- `state.shop.refreshState.targetedRestocks[]`
- `state.shop.offers[].restock`
- `viewModel.shop.offers[].restock`
- `stateHash(state).shop.offers[].restock`

## 玩家入口

- `APPLY_SHOP_EVENT` 触发 `evt_shop_fire` 等定向补货事件
- `/api/action`
- `/api/view`
- 浏览器商店事件按钮 `.shop-event-card button[data-shop-event]`

## ViewModel / report 证据

- `viewModel.shop.offers[]` 中定向补货商品带 `restock.eventId`、`restock.name`、`restock.poolId`、`restock.tags`、`restock.restockId`
- `renderShopReport` / `renderPlayerReport` 的商店剩余商品能显示补货来源
- 浏览器 `.offer-card` 展示 `补货：<事件名>` 或等价来源文本

## related_files

- `src/core/shop.cjs`
- `src/core/stateHash.cjs`
- `src/uiAdapter.cjs`
- `src/render/textReport.cjs`
- `web/js/main.js`
- `web/ux-app.css`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-15_targeted-restock-offer-provenance.md`

## unowned_dirty_or_staged_files

- `.gitignore`
- `pipeline/output.md`
- `pipeline/prompt.md`
- `pipeline/run.sh`
- `pipeline/state.json`
- `state.json.tmp`
- 当前暂存区已有前序任务文件，包含但不限于：`src/core/battle/resolution.cjs`、`src/core/battleEventProtocol.cjs`、`src/core/dayRoute.cjs`、`src/core/explainTrace.cjs`、`src/render/textReport.cjs`、`src/scenarios/fullDay.cjs`、`src/uiAdapter.cjs`、`src/uiAdapterCommands.cjs`、`src/uiAdapterFlowCommands.cjs`、`tests/run_all_tests.cjs`、`tests/ui_adapter.test.cjs`、`tests/unit/ui_combat_layout_contract.test.cjs`、`tests/unit/ui_module_render_cache.test.cjs`、`web/index.html`、`web/js/main.js`、`web/ux-app.css`、`web/ux-app.js`、多个 `tasks/done/*` 和 `docs/10_CHANGELOG.md`。

## commit_plan

`feat: 标记定向补货商品来源`

## 验证计划

- `command -v npx >/dev/null 2>&1`
- `node --test tests/ui_adapter.test.cjs`
- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- `npm run check:all`
- `npm run test:coverage`
- `git diff --check`
- 真实浏览器 Playwright 验收：进入商店，触发火元素补货，截图记录商品卡来源、DOM/ViewModel/console 证据。

## 可见验收

本任务修改浏览器商店商品卡片，必须执行提交前可见验收门禁。当前无子线程工具时，记录 `TEST_SUBTHREAD_UNAVAILABLE`，由本线程执行独立 tester pass。

## 进度记录

- 2026-06-15: 创建任务卡；ACTIVE 原为空；记录已有前序暂存/脏文件，本任务不纳入自动提交。
- 2026-06-15: TDD 红灯：`node --test tests/ui_adapter.test.cjs` 失败于 `ViewModel offers should keep restock provenance`，实际 0 个商品带 `restock`；`node --test tests/unit/ui_module_render_cache.test.cjs` 失败于商品卡缺少 `offer-source` 来源行。
- 2026-06-15: 实现 `offer.restock`：定向补货事件生成商品时写入 `restockId`、`eventId`、事件名、来源、补货池、标签和状态；`stateHash`、ViewModel、文字报告和浏览器商品卡同步读取。
- 2026-06-15: `node --test tests/unit/ui_module_render_cache.test.cjs` 通过，12/12。
- 2026-06-15: `node --test tests/ui_adapter.test.cjs` 通过，31/31。
- 2026-06-15: `node tests/run_all_tests.cjs` 通过，63/63。
- 2026-06-15: `node tools/audit_singleplayer_architecture.cjs` 通过，`src/uiAdapter.cjs` 为 818 行，仍在 round5 size guard 内。
- 2026-06-15: `node tools/check_no_dom.cjs` 通过，核心层无 DOM/UI 调用。
- 2026-06-15: `npm run check:all` 通过；包含 run_all、unit 56/56、ui 31/31、full 9/9、ops 12/12、prediction 4/4、architecture、csv、day7 browser、no-DOM、UI connected、checkJs。
- 2026-06-15: `npm run test:coverage` 通过，122/122；all files line coverage 92.34%。
- 2026-06-15: `git diff --check` 通过。
- 2026-06-15: TEST_SUBTHREAD_UNAVAILABLE：当前工具未暴露独立测试子线程；本线程执行等价独立 tester pass。
- 2026-06-15: 真实浏览器验收通过，证据目录：`output/playwright/targeted-restock-offer-provenance-2026-06-15T09-37-02-829Z/`。
- 2026-06-15: 真实玩家入口：打开 `/`，通过公开 `runCommand('NEW_GAME')` 和 `runCommand('GENERATE_NODE_OPTIONS',{count:6})` 重置并生成节点；真实点击 `[data-node-option$="node_shop_fire"]` 进入火系补货商人；真实点击 `[data-shop-event="evt_shop_fire"]` 触发火元素补货。
- 2026-06-15: 浏览器证据截图：`01_node_options.png`、`02_fire_stall_before_event.png`、`03_after_fire_restock.png`、`04_offer_sources_visible.png`；结构化证据：`evidence.json`。
- 2026-06-15: 浏览器断言：phase=`shop`，摊位=`火系补货商人`，`refreshState.targetedRestocks[]` 包含 `evt_shop_fire` 且 status=`applied`，3 个商品带 `restock.eventId=evt_shop_fire` / `restock.name=火元素补货`，DOM `.offer-source` 显示 `补货：火元素补货 / elem_火`，`/api/report?mode=shop` 包含补货来源，console/page error 数量为 0。
- 2026-06-15: 主线程截图复核：`04_offer_sources_visible.png` 右侧商品卡可见 3 个补货来源行，未见明显遮挡、错位、缺失或错误数值。
- 2026-06-15: 自动提交检查未满足：当前暂存区存在前序任务文件和 pipeline/state 文件，不全部归属本任务；本任务只精确暂存，提交需后续按 Commit Plan 或 `git-c` 统一处理。
