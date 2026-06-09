# 已归档任务：task-occupancy-skill

task_id: `2026-06-09_task-occupancy-skill`
status: `DONE`
task_type: `工作流规则变更`
started_at: `2026-06-09`
done_at: `2026-06-09`

## 目标

把“准备改代码时先起任务、占用名额；做完归档并按条件提交”的流程做成可触发技能，并接入 ysbzs 工作流路由。

## related_files

- `tasks/README.md`
- `tasks/index.md`
- `tasks/done/2026-06-09_task-occupancy-skill.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `/Users/ywh/ai-shared-config/skills/task-occupancy/SKILL.md`
- `/Users/ywh/.codex/skills/task-occupancy/SKILL.md`
- `/Users/ywh/.agents/skills/task-occupancy/SKILL.md`
- `/Users/ywh/.claude/skills/task-occupancy/SKILL.md`
- `/Users/ywh/Desktop/AI-Memory-Pack/10-workflows.md`

## commit_plan

- message: `workflow: add task occupancy skill`
- staging: 精确暂存 `tasks/`, `docs/02_CURRENT_WORKFLOW.md`；外部 skill/memory 文件按各自目录规则处理。

## 验证结果

- `python3 - <<'PY' ...`: 通过，确认 shared/Codex/agents/Claude 四处 `task-occupancy/SKILL.md` frontmatter 和关键章节存在，`docs/02_CURRENT_WORKFLOW.md` 路由包含 `task-occupancy`，任务入口文件存在。
- `diff -u ...`: 通过，确认 shared skill 与 Codex/agents/Claude 安装副本一致。
- `git status --short --untracked-files=all`: 已检查，当前 ysbzs 工作区存在大量非本任务改动。

## 收尾

- 已创建 `task-occupancy` skill。
- 已接入 ysbzs Skill Routing。
- 已恢复最小 `tasks/` 任务系统入口。
- 因当前工作区已有非本任务改动，本轮不自动提交 ysbzs 仓库。
