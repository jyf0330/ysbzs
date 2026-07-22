task_id: 2026-07-03_autoplay-live-report
type: data-tooling
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

Goal:
- 生成“自动机器人真实跑完整局”产生的策划可读实况文本，而不是只基于 seed 静态预览。
- 工具必须通过 `createYSBZSUIAdapter().run('RUN_FULL_RUN')` 真实执行自动流程，再从事件流、dayRouteRuns、终局状态和文本战报导出 Markdown。

Scope:
- 新增离线导出工具，默认使用可跑满 Day1-Day10 的机器人验收配置。
- 输出 Markdown 实况战报到 `outputs/autoplay-live-report-20260703/`。
- 增加单元测试覆盖：工具确实执行 `RUN_FULL_RUN`、报告包含 10 天、终局、事件文本和配置说明。
- 不修改核心规则、不修改 UI、不刷新 `web/js/local-engine.js`。

related_files:
- `tools/build_autoplay_live_report.cjs`
- `tests/unit/autoplay_live_report.test.cjs`
- `outputs/autoplay-live-report-20260703/autoplay_live_report.md`
- `outputs/autoplay-live-report-20260703/autoplay_live_report.json`
- `tasks/doing/2026-07-03_autoplay-live-report.md`

exclusive_files:
- 无

read_files:
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/uiAdapter.cjs`
- `src/uiAdapterFlowCommands.cjs`
- `src/scenarios/fullDay.cjs`
- `src/render/textReport.cjs`
- `tests/ui_adapter.test.cjs`

validation:
- pass: `node --check tools/build_autoplay_live_report.cjs`
- pass: `node --test tests/unit/autoplay_live_report.test.cjs` (3/3)
- pass: `node tools/build_autoplay_live_report.cjs`; generated `outputs/autoplay-live-report-20260703/autoplay_live_report.md` and `.json`, result `day=10`, `phase=day_end`, `events=480`, terminal `第十天终局Boss defeat LOSE/D`.
- pass: report segmentation check: Day1 events are #1-#118, Day2 events are #119-#158, Day10 events are #441-#480; Day1 does not contain 第2天 text and Day10 contains `RUN_TERMINAL`.
- pass: `node --test tests/ui_adapter.test.cjs --test-name-pattern "RUN_FULL_RUN|UI07G"` (48/48; runner executes the full file in this environment)
- pass: `git diff --check -- tools/build_autoplay_live_report.cjs tests/unit/autoplay_live_report.test.cjs tasks/doing/2026-07-03_autoplay-live-report.md outputs/autoplay-live-report-20260703/autoplay_live_report.md outputs/autoplay-live-report-20260703/autoplay_live_report.json`
- not required: 4173/browser validation; this task only adds offline report generation from existing adapter command output and does not alter browser runtime/UI behavior.

commit_plan:
- message: `tools: export autoplay live report`
- auto_commit: no; shared worktree has unrelated dirty task groups.
