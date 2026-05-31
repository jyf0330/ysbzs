# 当前任务：Debug 面板 v3 重构

## 任务类型

中等改动（VM 数据层 + Debug 渲染层重构）

## 允许读取

- `index.html:2542-2708`（`buildPreviewGrid`）
- `index.html:2985-3330`（`buildDebugPanelVM` + `renderDebugPanel`）
- `index.html:2454-2482`（`computeMonsterActionPreview`）
- `test.js` Debug 面板测试组（行 3210-3254）
- `docs/plans/2026-05-30_debug-panel-v3-refactor.md`
- `docs/00_CURRENT_CONTEXT.md`

## 允许修改

- `index.html`：`buildPreviewGrid` / `buildDebugPanelVM` / `renderDebugPanel`
- `test.js`：新增 DEBUG6~DEBUG15
- `docs/10_CHANGELOG.md`
- `docs/00_CURRENT_CONTEXT.md`（测试数量）

## 禁止

- 改游戏核心逻辑（`useSlot`、`settleExplosions`、`doExplode`、`simMonAct`）
- 改棋盘渲染（`renderBoard`、`buildBoardVM`）
- 改右侧面板（`renderTurn`、`renderCellDetail`）
- 改 CSS

## TDD 清单

- [ ] RED-1: 步骤 1 `buildPreviewGrid` 扩展字段 → 旧测试可能受影响
- [ ] GREEN-1: 步骤 3 `buildDebugPanelVM` 完成，Debug 组测试通过
- [ ] 步骤 4: `renderDebugPanel` 树形渲染
- [ ] RED-2: 新增 DEBUG6~15 首次跑
- [ ] GREEN-2: DEBUG6~15 全部通过
- [ ] FINAL: 全量测试 + replay + smoke

## 验收方式

- `node test.js` 新增测试全部通过
- `node replay.js recordings/day1_fire_sample.json` 无异常
- 手动浏览器：切换到 Debug 模式，点击各类型格子，面板格式符合 v3
