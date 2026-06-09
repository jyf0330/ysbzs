# PROGRAMMER_START

当前开发只改三层：

1. 核心规则：`src/core/*`
2. UI 门面：`src/uiAdapter.cjs`
3. 新浏览器界面：`web/index.html / web/ux-app.css / web/ux-app.js`

不得恢复旧 UI 文件。前端只走 `/api/view` 与 `/api/action`。

提交前运行：

```bash
npm run check:all
```
