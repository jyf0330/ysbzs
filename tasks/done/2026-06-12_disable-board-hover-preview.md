# 2026-06-12_disable-board-hover-preview

task_id: 2026-06-12_disable-board-hover-preview
status: DONE
type: ui-interaction-bugfix
created_at: 2026-06-12
completed_at: 2026-06-12

## Goal

关闭棋盘悬停预览，避免鼠标 hover 改变棋盘显示和干扰点击移动；保留点击选中、点击空格移动、行动槽瞄准等玩家入口。

## Related Files

- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tests/unit/ui_module_render_cache.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-12_disable-board-hover-preview.md`

## Validation

- `node --test tests/unit/ui_module_render_cache.test.cjs`
- `node tests/run_all_tests.cjs`
- real browser click verification with screenshot in `output/playwright/`

## Commit Plan

- `fix: 关闭棋盘悬停预览`

## Evidence Log

- 2026-06-12: TDD 红灯确认旧逻辑存在：`node --test tests/unit/ui_module_render_cache.test.cjs` 新增 UI06 后失败，失败点为 `$('board').addEventListener('mouseover'...)` 仍会更新 hover 预览。
- 2026-06-12: 移除棋盘 hover 状态、hoverRisk 沙盒渲染、`mouseover` / `mouseleave` 监听、棋盘格 hover CSS；保留点击选中与点击移动。
- 2026-06-12: 针对性验证通过：`node --test tests/unit/ui_module_render_cache.test.cjs`（6/6）。
- 2026-06-12: 全量核心验证通过：`node tests/run_all_tests.cjs`（44/44）。
- 2026-06-12: 主线程真实浏览器验证通过，实际加载的新 JS/CSS 中 `hasBoardMouseover=false`、`hasBoardMouseleave=false`、`hasHoverRisk=false`、`hasCellHoverCss=false`，hover R6C0 前后 DOM / computed style 完全一致；随后点击 R6C0 仍发出 `MOVE_HERO` 到 `{r:6,c:0}`，console/page error 为空。证据目录：`output/playwright/disable-hover-audit-2026-06-12T12-21-19-568Z/`。
- 2026-06-12: 独立 QA 子线程 Hooke 真实浏览器复核通过：hover R6C0 前后 `boardDomChanged=false`、`changedCellCount=0`、目标格 hash 不变；点击后捕获 `MOVE_HERO hero_pal_072_1 -> {r:6,c:0}`；console/page error 为空。证据目录：`output/playwright/qa-disable-hover-rerun-2026-06-12T12-21-28-879Z/`。
- 2026-06-12: `git diff --check` 通过。
- 2026-06-12: `npm run check:all` 未通过，失败在既有基线门禁 `uiAdapter remains under round5 size guard`；`src/uiAdapter.cjs` 当前与 HEAD 均为 873 行，本轮未修改该文件。
