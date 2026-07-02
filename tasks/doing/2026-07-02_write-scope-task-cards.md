# 2026-07-02_write-scope-task-cards

task_id: 2026-07-02_write-scope-task-cards
type: workflow rules / multi-agent task system
status: READY_TO_MERGE
owner: Codex
worktree: shared-worktree

## Goal

把任务卡从“同一个文件只能一个 AI 改”优化为“高风险文件独占 + 普通同文件按 `write_scopes` 并行”，并顺手瘦身重复/过期规则：`AGENTS.md` 只保留入口与红线，详细规则回到 `docs/02_CURRENT_WORKFLOW.md` / `tasks/README.md`，桌面记忆包更新到当前 ysbzs 口径。

## Scope

- 更新项目任务规则，新增 `write_scopes` / `shared_file_policy` / `merge_owner` 口径。
- `related_files` 重叠不再默认触发 `FILE_CONFLICT_STOP`；只有 `exclusive_files`、`write_scopes` 重叠、同一语义接口冲突或 dirty/staged 边界不清时才停。
- 保留高风险共享文件独占、UI 可见验收、`web/js/local-engine.js` 刷新、Lead 最终提交等硬门禁。
- 删除或合并重复规则：AGENTS 不再复制自动提交、4173、截图门禁全文；Skill 路由不再要求普通咨询/所有匹配任务都先加载全套 skill。
- 更新 `~/Desktop/AI-Memory-Pack/20-projects.md` 中 ysbzs 的旧 `index.html` / `test.js` / `elementCells` 口径。
- 2026-07-03 用户明确收紧 `git-c`：它必须收口整个工作区，模糊边界只影响记录精度，不允许执行后留下 dirty；完成时应已提交并推送。
- 2026-07-03 用户确认继续做任务卡行为优化：只在要改文件时开卡，开工卡瘦身为写入租约，`tasks/index.md` 改成维护索引而不是普通任务独占文件，READY/BLOCKED 堆积需要优先收口或刷新 index。
- 刷新 `tasks/index.md` 到当前真实 `tasks/doing/` 状态，解除旧 4 条索引误导。
- 同步 `docs/10_CHANGELOG.md` 记录任务系统规则变化；用户已明确要求“做”，本轮不再让旧 replay 卡片的过期 `related_files` 阻止维护索引/CHANGELOG。
- 不修改任何游戏实现、测试实现或数据文件。
- 本轮只更新任务系统/工作流文档，不运行 `git-c` 提交业务改动。

## related_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `tasks/index.md`
- `docs/10_CHANGELOG.md`
- `tasks/doing/2026-07-02_write-scope-task-cards.md`
- `~/Desktop/AI-Memory-Pack/10-workflows.md`
- `~/Desktop/AI-Memory-Pack/20-projects.md`

## write_scopes

- file: `AGENTS.md`
  scope: 任务系统 / 核心纪律中的多 AI 同文件规则描述
  mode: direct
- file: `docs/02_CURRENT_WORKFLOW.md`
  scope: Multi-AI Collaboration / 并行任务模型 / 冲突处理 / git-c 归属规则
  mode: direct
- file: `tasks/README.md`
  scope: 任务卡字段、开工门禁、FILE_CONFLICT_STOP、并行协作规则、git-c 分类
  mode: direct
- file: `tasks/index.md`
  scope: 任务总览与规则摘要；按当前 tasks/doing 真实状态刷新
  mode: direct
- file: `docs/10_CHANGELOG.md`
  scope: 2026-07-03 任务系统工作流条目
  mode: direct
- file: `tasks/doing/2026-07-02_write-scope-task-cards.md`
  scope: 本任务卡全文
  mode: direct
- file: `~/Desktop/AI-Memory-Pack/10-workflows.md`
  scope: task-occupancy / ysbzs 任务卡使用口径
  mode: direct
- file: `~/Desktop/AI-Memory-Pack/20-projects.md`
  scope: ysbzs 项目条目的入口、架构要点、验证命令
  mode: direct

## shared_file_policy

- This workflow migration intentionally updates files that older task cards may list as read-only references or stale workflow exclusives.
- No game implementation file is modified.
- `tasks/index.md` is a maintenance index, not a feature-owned implementation surface. The user explicitly authorized applying the workflow cleanup, so this pass refreshes it despite stale older task cards listing it as exclusive.
- `docs/10_CHANGELOG.md` receives a narrow workflow entry only; no game behavior changelog is added.
- Desktop memory pack ysbzs section is updated because the user explicitly accepted the cleanup recommendation; no secrets or credentials are changed.

## exclusive_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/README.md`
- `docs/10_CHANGELOG.md`

## read_files

- `docs/00_AI_START_HERE.md`
- `tasks/index.md`
- `tasks/doing/*.md`
- `tasks/paused/*.md`
- `/Users/ywh/ai-shared-config/skills/task-occupancy/SKILL.md`
- `/Users/ywh/.codex/skills/ywh/SKILL.md`
- `/Users/ywh/.codex/skills/ywh-game/SKILL.md`
- `/Users/ywh/.codex/skills/superpowers/skills/using-superpowers/SKILL.md`
- `/Users/ywh/.codex/skills/superpowers/skills/verification-before-completion/SKILL.md`

## validation

- pass: `rg -n "index\\.html|test\\.js|elementCells|node test\\.js|must\\s+invoke|related_files.*exclusive_files.*重叠|run validation command  \\(如 node test\\.js\\)" AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md ~/Desktop/AI-Memory-Pack/20-projects.md` returned no matches.
- pass: `git diff --check -- AGENTS.md docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-07-02_write-scope-task-cards.md`
- pass: `cd ~/Desktop/AI-Memory-Pack && git diff --check -- 20-projects.md`
- pass: `bash ~/ai-shared-config/record-skill.sh "using-superpowers, task-occupancy, ywh, ywh-game, verification-before-completion"`
- pass: `zsh -ic 'cd ~/Desktop/AI-Memory-Pack && memcommit "更新 ysbzs 当前项目规则口径" && memsync'` created memory-pack commit `b66370f` and left the pack clean.
- pass: `docs/10_CHANGELOG.md` received a narrow 2026-07-03 workflow entry; old replay task `related_files` no longer blocks changelog/index maintenance after the user's explicit "做".
- pass: updated `git-c` rules so fuzzy boundaries become best-effort commits/cleanup instead of leftover dirty state, and final target is clean worktree + pushed branch.
- pass: `rg -n "Leftovers Group|Blocked Group.*暂停|不得继续自动提交|等待用户拍板|留下 dirty|clean\\+pushed|全工作区|Fuzzy Groups|Cleanup Group|Blocker Group|git status --short --untracked-files=all" docs/02_CURRENT_WORKFLOW.md tasks/README.md ~/Desktop/AI-Memory-Pack/20-projects.md`
- pass: `git diff --check -- docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/doing/2026-07-02_write-scope-task-cards.md`
- pass: `cd ~/Desktop/AI-Memory-Pack && git diff --check -- 20-projects.md`
- pass: `bash ~/ai-shared-config/record-skill.sh "using-superpowers, task-occupancy, ywh, ywh-game, verification-before-completion"`
- pass: `zsh -ic 'cd ~/Desktop/AI-Memory-Pack && memcommit "更新 ysbzs git-c 收口规则" && memsync'` created memory-pack commit `0fbb95b`.
- pass: `rg -n "不创建任务卡|薄任务卡|维护索引|过期写法|READY_TO_MERGE|Fuzzy Groups|Cleanup Group|Blocker Group|git status --short --untracked-files=all" docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/index.md docs/10_CHANGELOG.md tasks/doing/2026-07-02_write-scope-task-cards.md`
- pass: `git diff --check -- docs/02_CURRENT_WORKFLOW.md tasks/README.md tasks/index.md docs/10_CHANGELOG.md tasks/doing/2026-07-02_write-scope-task-cards.md`
- pass: index consistency spot check: actual `tasks/doing` status counts before closing this card were `ACTIVE_IMPL=3`, `READY_TO_MERGE=18`, `BLOCKED=6`, and required entries were present in `tasks/index.md`.
- pass: `git -C ~/Desktop/AI-Memory-Pack diff --check -- 10-workflows.md`
- pass: `zsh -ic 'cd ~/Desktop/AI-Memory-Pack && memcommit "更新 ysbzs 任务卡使用口径" && memsync'` created memory-pack commit `f99ef16`.
- pass: `bash ~/ai-shared-config/record-skill.sh "task-occupancy, ywh, ywh-game, verification-before-completion"`

## commit_plan

- message: `workflow: slim duplicate ai rules`
- auto_commit: no; this workflow cleanup is isolated in the shared dirty worktree, but the repo still contains many unrelated uncommitted task groups. Leave precise staging/commit to `git-c` or Lead grouping.

## collaboration

- lead_scope: Project workflow rule migration, task index refresh, and desktop memory ysbzs section cleanup only.
- specialist_input: 无
- tester_pass: 不适用，纯 workflow 文档变更，无 UI/棋盘/浏览器可见行为改动。
- external_ai_input: 无
- lead_decision: Move conflict detection from coarse file overlap to `exclusive_files` plus `write_scopes`, keep UI/live evidence gates, stop creating cards for read-only turns, make `tasks/index.md` a maintenance index, and remove duplicated/obsolete rule copies that drift from the current ysbzs architecture.
