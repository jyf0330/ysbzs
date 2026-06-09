# 2026-06-10_ui-hide-unit-native-title

## 状态

- task_id: `2026-06-10_ui-hide-unit-native-title`
- 类型: UI / 棋盘可读性小修
- 目标: 隐藏棋盘单位 token 上浏览器原生 `title` 悬停提示，避免出现“我方火绒狐”这类大白字浮层；完整名称继续由右侧详情面板和格子 `aria-label` 承担。
- 状态: done

## related_files

- `tests/unit/ui_combat_layout_contract.test.cjs`
- `web/js/main.js`
- `web/ux-app.js`
- `tasks/index.md`
- `tasks/done/2026-06-10_ui-hide-unit-native-title.md`

## 现有未归属改动

- 开工前工作区已有 `tasks/index.md`、`tests/unit/ui_combat_layout_contract.test.cjs`、`web/js/main.js`、`web/ux-app.js`、`tasks/done/2026-06-10_ui-hide-all-toasts.md`、多张 `evidence/browser-real-flow/screenshots/*` 变更。
- 本轮不回滚、不吸收截图变更；仅在代码/测试文件中追加与单位原生 `title` 相关的最小改动。

## 实施记录

- 在 `tests/unit/ui_combat_layout_contract.test.cjs` 增加合同断言：棋盘 `.unit-token` 模板不得输出原生 `title`。
- 在 `web/js/main.js` 和 `web/ux-app.js` 的 `unitToken()` 中移除 `title="${...}"`。
- `docs/10_CHANGELOG.md` 当前不存在，本轮未新建 changelog 文件。

## 验证结果

- RED: `node --test tests/unit/ui_combat_layout_contract.test.cjs` 失败于 `web/js/main.js board unit token must not trigger native title hover text`。
- GREEN: `node --test tests/unit/ui_combat_layout_contract.test.cjs` 通过，6/6 pass。
- 项目级: `npm run check:all` 通过，退出码 0。
- 真实 Chrome DOM: 4173 页面渲染后 `.unit-token` 数量 8，`titles: []`。

## commit_plan

- message: `fix(ui): hide native board unit title tooltip`
- status: blocked_by_existing_dirty_worktree
- 原因: 工作区已有暂存和未暂存改动，且本轮触及的 `web/js/main.js`、`web/ux-app.js`、`tests/unit/ui_combat_layout_contract.test.cjs` 已含开工前改动；不自动提交以避免混入非本轮变更。
