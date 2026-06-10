# 2026-06-10_team-placement-preview

## 状态

- task_id: `2026-06-10_team-placement-preview`
- 类型: UI / 棋盘预览逻辑
- 目标: 将棋盘预览从单只宠物预览改为可累计的整队摆位结果预览；当前操作宠物实时高亮，已移动宠物持续保留各自预览结果。
- 状态: done

## related_files

- `src/core/battle/preview.cjs`
- `src/core/battle/position.cjs`
- `src/core/state.cjs`
- `src/uiAdapter.cjs`
- `web/index.html`
- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tests/ui_adapter.test.cjs`
- `evidence/browser-real-flow/screenshots/team-placement-preview.png`
- `tasks/index.md`
- `tasks/doing/2026-06-10_team-placement-preview.md`

## 开工前未归属改动

- `web/ux-app.js` 已有 `unit-token` 移除原生 `title` 的改动，来自已完成任务 `2026-06-10_ui-hide-unit-native-title`。
- `tests/unit/ui_combat_layout_contract.test.cjs` 已有对应合同断言改动，来自已完成任务 `2026-06-10_ui-hide-unit-native-title`。
- 本任务不回滚这些改动；如提交条件不满足，输出 Commit Plan。

## 验证计划

- RED/GREEN: `node --test tests/ui_adapter.test.cjs`
- 项目级: `node tests/run_all_tests.cjs`
- 项目级: `npm run check:all`
- 浏览器链路: 本地服务 + Playwright/浏览器点击检查棋盘预览 DOM、console error 和截图。

## 实施记录

- 核心层新增 `teamPlacementPreview`，由真实 `MOVE_HERO` 在成功移动后记录已移动宠物顺序和当前预览主体。
- `buildPreviewGrid()` 改为累计预览：未移动时默认第一只上阵宠物；移动后按已移动顺序输出多个 actor 的预览，当前 actor 标记 `isActiveActor`，历史 actor 保留。
- ViewModel 增加 `teamPlacementPreview`，棋盘格增加 `previews[]`，同时保留兼容用 `preview`。
- 浏览器入口 `web/js/main.js` 和同步文件 `web/ux-app.js` 渲染当前/历史预览、攻击方向箭头、预计伤害/元素层徽标、误伤警告、移动悬停虚线框。
- `web/index.html` 增加 data favicon，避免真实浏览器验收中出现无关 favicon 404。
- `docs/10_CHANGELOG.md` 当前不存在，本轮未新建 changelog。

## 验证结果

- RED: `node --test tests/ui_adapter.test.cjs` 失败于 `Cannot read properties of undefined (reading 'activeUnitId')`。
- RED: 将测试切换为真实 `selectCell -> moveHero` 路径后，`previewGrid` 被移动格错误过滤为空。
- GREEN: `node --test tests/ui_adapter.test.cjs` 通过，16/16 pass。
- UI 合同: `node --test tests/unit/ui_combat_layout_contract.test.cjs tests/unit/ui_module_render_cache.test.cjs` 通过，9/9 pass。
- 项目级: `node tests/run_all_tests.cjs` 通过，44/44 tests passed。
- 项目级: `npm run check:all` 通过，包含 test/unit/ui/full/ops/prediction、architecture、csv、day7、dom、ui-connected、jsdoc。
- 覆盖率: `npm run test:coverage` 通过，95/95 pass，all files line 94.75%。
- 浏览器真实点击: 当前工作区服务 `http://127.0.0.1:4174`，Chrome/CDP 真实点击 `新开一天 -> 开始战斗 -> 第二只移动 -> 第一只移动`；最终 `movedUnitIds=[hero_pal_005_2, hero_pal_072_1]`，`actorIds` 同时包含两只，`.preview-current=1`，`.preview-past=1`，`.current-preview-unit=1`，`.preview-arrow=2`，`.preview-num=2`，`.friendly-warning=1`，consoleErrors=[]。
- 截图证据: `evidence/browser-real-flow/screenshots/team-placement-preview.png`。

## commit_plan

- message: `feat(ui): accumulate team placement preview`
- status: blocked_by_existing_dirty_worktree
- 原因: 开工前已有 `web/ux-app.js` 和 `tests/unit/ui_combat_layout_contract.test.cjs` 的未归属 title-tooltip 改动；本轮又必须触及 `web/ux-app.js`，无法精确提交当前任务而不混入既有未提交内容。
