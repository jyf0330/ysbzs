# 2026-06-09 Round5：单机架构加固

本轮目标：继续在 Round4 可玩 UI/服务器权威地基上，把单机长期维护需要的几个基础补齐。

## 完成项

1. **正式存档层**
   - 新增 `src/storage/saveCodec.cjs`
   - 新增 `src/storage/memoryStorage.cjs`
   - 新增 `src/storage/fileStorage.cjs`
   - `uiAdapter` 暴露 `exportSave(playerId)` / `importSave(saveDoc, playerId)`。
   - `tools/run_ui_server.cjs` 新增 `/api/save`、`/api/load`。
   - 浏览器 UI 新增“保存 / 读取”，当前用 `localStorage('ysbzs.save.slot1')` 保存。

2. **AP 分配变成真实规则**
   - `USE_SLOT` 支持 `ap`。
   - 核心按 `effectiveLayers = baseLayers * apUsed` 结算。
   - 单位每回合记录 `actionApSpent`，`availableAp = ap - actionApSpent`。
   - AP 不足会返回 `USE_SLOT_BLOCKED`，不再只是 UI 预留。

3. **核心 selection 进一步去状态化**
   - `reducer.cjs` 中 `SELECT_UNIT / SELECT_CELL / SELECT_SLOT` 改成 no-op。
   - `battle/position.cjs` 和 `battle/actions.cjs` 不再写 `state.selected.*`。
   - `selected` 仍保留为兼容字段，但不再作为核心真实状态写入源。

4. **事件投影统一入口**
   - 新增 `src/core/eventProjection.cjs`。
   - `buildViewModelForPlayer` 的 `battleTrace` 从 `canonicalEventLog(state)` 生成。
   - 去重逻辑集中到一个地方，减少战报/回放/调试三套事件口径漂移。

5. **机制门禁**
   - 新增 `src/core/mechanicGate.cjs`。
   - `inventoryVM` 和单位 VM 暴露 `mechanicStatus`。
   - 阵容上阵时，遇到 `pending / data_only / unknown` 机制会阻止上阵并给出事件说明，避免“显示了机制但核心没有效果”。

6. **事务回滚外壳**
   - `uiAdapter.run()` 在 mutation command 前生成 rollback save。
   - 如果核心中途抛错，会恢复到命令前状态并返回 rejected result。
   - 这不是完整 immutable reducer，但已经避免“执行一半失败导致状态半污染”。

7. **架构门禁脚本**
   - 新增 `tools/audit_singleplayer_architecture.cjs`。
   - 新增 `npm run check:architecture`。
   - `check:all` 已加入该门禁。

## 新增防回退测试

`tests/unit/singleplayer_round5.test.cjs`

覆盖：

- 存档导出/读取恢复状态和玩家 viewState。
- 存档 checksum 防篡改。
- memory/file storage 往返。
- 核心 SELECT 命令不污染 GameState。
- AP 分配消耗并影响剩余 AP。
- 保存/读取按钮和 API 端点存在。
- 机制门禁能识别 pending/data_only。
- 事件投影能去重并生成文本。

## 仍然保留的设计边界

- 没有做 WebSocket、房间、匹配、断线重连；这属于联机层。
- 核心仍是 mutable core + 事务回滚外壳，不是彻底 immutable reducer。
- `uiAdapter.cjs` 仍然偏大，但已加 size guard（< 820 行）；下一轮如果继续扩 UI，建议拆 `src/ui/*Presenter.cjs`。
- `web/ux-app.js` 仍是单文件前端；Round5 新增了存档按钮但没有拆前端模块。
