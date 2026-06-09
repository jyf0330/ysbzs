# 已废弃：2026-06-07 原 UI 外壳接入方案

本方案已经被 2026-06-09 UI 界面层完全重构替代。

旧方案保留原项目前端外壳，并通过兼容脚本把旧按钮桥接到 `/api/action`。该方案的问题是：

- 前端仍有旧渲染、旧状态、旧按钮命名残留。
- 美术/UI 继续面对旧结构，难以按新交互规范重做。
- 容易误以为浏览器仍有第二套战斗状态。

当前新方案：

- 删除旧前端交互文件。
- 新建 `web/index.html`、`web/ux-app.css`、`web/ux-app.js`。
- 前端只通过 `/api/view`、`/api/action`、`/api/report` 访问核心。

新方案说明见：`docs/architecture/2026-06-09_ui-layer-rebuild.md`。
