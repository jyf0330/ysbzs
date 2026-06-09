# 2026-06-10_ui-hide-all-toasts

## 状态

- status: DONE
- task_id: 2026-06-10_ui-hide-all-toasts
- owner: Codex
- started_at: 2026-06-10
- done_at: 2026-06-10

## 目标

隐藏游戏界面全部 toast 提示，避免玩家操作时右下角反复弹出临时提示。

## 范围

- `web/ux-app.js`
- `web/js/main.js`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-10_ui-hide-all-toasts.md`

## 前置工作区状态

- 开工前已有未提交改动：`web/ux-app.js` 中仅把 `runCommand` 的 SELECT 事件 toast 替换为 `// toast 已关闭`。
- 本轮会在同一文件上继续收束为统一禁用，不回滚前置改动。

## 验证命令

```bash
node --test tests/unit/ui_combat_layout_contract.test.cjs
npm run check:ui-connected
npm run check:all
npm run test:coverage
```

## commit_plan

```text
fix: 隐藏游戏界面 toast
```

## 验证记录

- RED：`node --test tests/unit/ui_combat_layout_contract.test.cjs` 失败，命中 `web/js/main.js toast function should no-op before creating DOM`。
- GREEN：`node --test tests/unit/ui_combat_layout_contract.test.cjs` 通过，6/6。
- `npm run check:ui-connected` 通过：`PASS rebuilt UI shell -> /api -> uiAdapter -> core -> ViewModel/TextReport`。
- 真实浏览器窄验收通过：点击保存、读取后 `#toast-stack .toast` 数量保持 `before=0, afterSave=0, afterLoad=0`；截图 `output/playwright/toast-hidden-check.png`。
- `npm run check:all` 通过，含 `44/44 tests passed`、UI/架构/CSV/Day7 浏览器/DOM/JSDoc 检查。
- `npm run test:coverage` 通过，94/94，overall line coverage 94.70%。
- 额外尝试：`node tools/record_browser_player_flow.cjs --check` 在既有“load button did not restore saved playable state”断言失败；该断言不是本轮 toast 隐藏验收证据。

## 收尾记录

- 任务卡已归档。
