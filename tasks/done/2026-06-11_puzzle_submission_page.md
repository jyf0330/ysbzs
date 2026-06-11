# 2026-06-11_puzzle_submission_page

## 基本信息

- task_id: `2026-06-11_puzzle_submission_page`
- 类型: UI 页面 / 投稿工具实现 / 静态前端
- 目标: 把玩家谜题投稿工具做成可打开的新页面，支持简单表单、8x8 棋盘摆放、AI 整理辅助、导出投稿文本/JSON/检查报告。

## related_files

- `tasks/doing/当前任务.md`
- `tasks/index.md`
- `tasks/done/2026-06-11_puzzle_submission_tool_spec.md`
- `web/index.html`
- `web/puzzle-submission.html`
- `web/puzzle-submission.css`
- `web/js/puzzle-submission.js`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_design.md`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_fields.csv`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_fields.xlsx`
- `web/external-data/puzzle-submission-tool/puzzle_submission_tool_schema.yaml`
- `tools/check_puzzle_submission_page.cjs`
- `output/playwright/puzzle-submission.png`

## 边界

- 不修改 `src/core/*`、`src/adapters/*`、`data/csv/*`、`xlsx/ysbzs_master.xlsx`。
- 投稿页面只维护编辑草稿并生成导出数据，不直接修改核心 `state`。
- 可玩性验证先做静态校验；无解/多解/普通攻击可过等高级检查标记为“需要后续接模拟器”。

## 验证命令

```bash
node tools/check_puzzle_submission_page.cjs
node tests/run_all_tests.cjs
git diff --check
```

## commit_plan

- message: `feat: add puzzle submission editor page`
- auto_commit: `if_all_project_conditions_pass`

## 执行记录

- 2026-06-11: 创建任务卡，占用投稿工具页面和规格包文件。
- 2026-06-11: 新增 `web/puzzle-submission.html`、`web/puzzle-submission.css`、`web/js/puzzle-submission.js`，实现基础信息、宠物选择、8x8 棋盘摆放、敌人列表、胜利条件、标准解法、投稿版/JSON/检查报告导出。
- 2026-06-11: 在 `web/index.html` 顶栏加入投稿页面入口。
- 2026-06-11: 新增 `tools/check_puzzle_submission_page.cjs`，检查页面锚点、导出逻辑、主页面入口和不触碰核心/API 的边界。

## 验证结果

- `node tools/check_puzzle_submission_page.cjs`：通过。
- `node tests/run_all_tests.cjs`：通过，44/44 tests passed。
- `node tools/check_ui_connected.cjs`：通过。
- Playwright 真实浏览器：通过，桌面页面 64 格棋盘、火元素摆放写入 JSON、检查报告生成、console error 为空。
- Playwright 移动宽度：通过，390px 宽度下 `scrollWidth=390`，无横向溢出，console error 为空。
- 截图证据：`output/playwright/puzzle-submission.png`。
- `git diff --check`：通过。
- `npm run check:all`：通过。
- `npm run test:coverage`：通过，98 tests passed。

## 提交状态

- 自动提交条件满足：任务卡已记录，测试通过，暂存文件均属当前任务，无 ACTIVE/PAUSED 冲突。
