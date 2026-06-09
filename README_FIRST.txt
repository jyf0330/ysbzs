元素背包史 · 先看这里

这版已经不是单纯 UI 重构包，而是补了“本地预测 + 服务器权威验证”的架构地基。

运行：
1. npm install
2. npm run ui
3. 打开 http://127.0.0.1:4195

验收：
1. npm run check:all
2. npm run test:prediction
3. npm run verify:browser:evidence

关键文件：
- web/index.html / ux-app.css / ux-app.js：新浏览器界面
- src/uiAdapter.cjs：当前 API/UI 统一入口
- src/core/commandEnvelope.cjs：Command 信封、版本、权限、事件归属
- src/core/multiplayerState.cjs：player/team/controller 多人预留状态
- src/core/stateHash.cjs：本地预测和服务器验证对齐用的 hash
- src/adapters/localAdapter.cjs：本地预测入口
- src/adapters/serverAuthorityAdapter.cjs：服务器权威验证入口
- tests/prediction_authority.test.cjs：本地/服务器一致性测试
- docs/architecture/2026-06-09_prediction-server-authority.md：实现说明

当前没有做真正 WebSocket 联机，但以后接合作/PVP 不需要推倒重来。

2026-06-09 优化第 2 轮入口：
- docs/architecture/2026-06-09_optimization-round-2.md
- tests/unit/architecture_optimization.test.cjs
- CHECK_RESULTS_20260609_OPTIMIZATION_ROUND2.txt


Round4：服务器入口已接入 serverAuthorityAdapter(strictVersion)，selected 改为 per-player ViewState，UI 补齐阵容/回放/格详情/商店事件/调试面板/AP/tooltip。详见 docs/architecture/2026-06-09_round4-authority-ui-gaps.md。

[2026-06-09 Round5]
继续单机架构加固：新增保存/读取、AP 真实消耗、事件投影、机制门禁、事务回滚外壳和 check:architecture。
建议验收：npm run check:all && npm run verify:browser:evidence
