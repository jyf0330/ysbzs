# 2026-06-30_command-console-page

task_id: 2026-06-30_command-console-page
type: ui-tool
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

## Goal

参考外部 `ysbzs_console_command_pack.zip` 的命令表 / debug 面板思路，给当前项目补一个独立命令控制台，用于查看公开命令、当前 `nextActions`、payload、执行结果、命令日志和 ViewModel。

## Scope

- 新增独立 `web/command-console.html` 页面，不嵌入正常玩家页。
- 控制台只通过 `createGameRuntime()` 调 `/api/view` 与 `/api/action`，不直接 import core / adapter。
- 命令表必须以当前仓库 `src/uiAdapterCommands.cjs` 为准；附件只作为参考，不覆盖当前命令。
- 支持搜索、分类、当前可执行动作、payload JSON 编辑、执行结果、导出回放和状态检查。
- 不修改 `web/js/main.js`、`src/uiAdapter.cjs`、`web/js/local-engine.js`、`web/normal-game.*`。

## related_files

- `web/command-console.html`
- `web/command-console.css`
- `web/command-console.js`
- `tests/unit/command_console_page.test.cjs`
- `tasks/doing/2026-06-30_command-console-page.md`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `src/uiAdapterCommands.cjs`
- `src/uiAdapter.cjs`
- `web/js/runtime-client.js`
- `/tmp/ysbzs_console_command_pack/ysbzs_console_command_pack/README_控制台代码在哪里.md`
- `/tmp/ysbzs_console_command_pack/ysbzs_console_command_pack/COMMAND_TABLE.md`
- `/tmp/ysbzs_console_command_pack/ysbzs_console_command_pack/docs/UI_FUNCTION_GAP.md`

## validation

- pass: `node --input-type=module --check < web/command-console.js`
- pass: `node --test tests/unit/command_console_page.test.cjs`
- pass: `git diff --check -- web/command-console.html web/command-console.css web/command-console.js tests/unit/command_console_page.test.cjs tasks/doing/2026-06-30_command-console-page.md`
- pass: `node tests/run_all_tests.cjs` (66/66)
- pass: 4173 real browser flow at `http://127.0.0.1:4173/command-console.html?runtime=http&sessionId=command-console-pass-1782830078000`: opened command console, clicked current action `生成节点候选`, executed public command `GENERATE_NODE_OPTIONS` through the run button, result label became `已执行`, phase became `路线选择`, command table count was 46, current action count was 8, result JSON included `stateHash`, console/page errors 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/command-console-4173-2026-06-30T14-34-40.png`; three-column command table / runner / state inspector is readable, result and event panels are visible, and no obvious overlap or missing state was observed.

## commit_plan

- message: `feat(ui): add command console tool`
- auto_commit: no; shared worktree already contains multiple unrelated dirty READY_TO_MERGE task groups.

## collaboration

- lead_scope: Standalone command console page and focused contract/browser checks.
- specialist_input: 外部 zip 作为 External AI/reference input；只采纳命令表/debug 面板思路，不覆盖当前项目命令实现。
- tester_pass: `TEST_SUBTHREAD_UNAVAILABLE`; equivalent independent browser pass run via Playwright from the terminal, screenshot `/Users/ywh/Documents/ysbzs/output/playwright/command-console-4173-2026-06-30T14-34-40.png`, DOM/status assertions matched, console/page errors 0.
- external_ai_input: `ysbzs_console_command_pack.zip`
- lead_decision: Build a standalone developer tool page instead of restoring console-style controls to the normal player UI, because current normal-game task explicitly removed console buttons from player flow.
