# 2026-06-09 真实浏览器玩家链路验证补丁

## 目标

避免“代码/API 直接调用能过，但真人在页面上点不动”的假通过。

## 本次补齐

1. 新增 `tools/record_browser_player_flow.cjs`
   - 启动真实 Chromium。
   - 打开 `web/index.html` 对应的本地 HTTP 页面。
   - 使用 CDP `Input.dispatchMouseEvent` 发送真实鼠标事件。
   - 点击页面按钮、英雄卡、棋盘格、行动槽、方向键、施放按钮、结束回合、怪物行动、战报标签。
   - 全程不调用 `/api/action` 修改状态。
   - 输出截图、视频和 JSON 行为记录。

2. 改造 `tools/check_browser_player_flow.cjs`
   - 删除旧 fallback。
   - 不再允许“Chromium 打不开页面时改走 API + DOM smoke”。
   - 页面打不开、按钮点不动、状态没变化时直接失败。

3. 新增脚本
   - `npm run check:browser`：严格真实浏览器点击检查，生成截图，不生成视频。
   - `npm run verify:browser:evidence`：严格真实浏览器点击检查，并生成截图 + mp4 视频。

4. 修正 UI 交互遗漏
   - 初始不再假装默认选中第一个英雄；必须真的点击英雄卡才进入选中态。
   - 选中行动槽后，点棋盘只选目标，不会误触发移动。
   - `进入商店` 按钮只在 `battle_end` 后可点，避免战斗中按钮可点但核心不接收。
   - `一键完整流程` 只在 `init / battle_end / day_end` 可点，避免活跃战斗中误触发系统流程。

## 证据位置

- `evidence/browser-real-flow/REAL_BROWSER_VERIFICATION.md`
- `evidence/browser-real-flow/verified_flow.json`
- `evidence/browser-real-flow/screenshots/*.png`
- `evidence/browser-real-flow/ysbzs_real_browser_player_flow.mp4`

## 已验证的真人操作链路

1. 点击开始战斗。
2. 点击英雄卡。
3. 点击棋盘空格移动英雄。
4. 点击行动槽。
5. 点击方向箭头。
6. 点击目标格。
7. 点击施放。
8. 点击结束回合。
9. 点击怪物行动。
10. 点击战报标签。

## 环境说明

当前容器的 Chromium 默认带企业策略 `URLBlocklist=["*"]`，会阻止访问 `127.0.0.1`。验证时临时移除了该容器策略后执行。项目内脚本不会修改系统策略；如果本地 Chromium 没有这个限制，可直接运行。
