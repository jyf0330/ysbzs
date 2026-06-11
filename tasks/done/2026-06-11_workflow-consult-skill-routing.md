# 已归档任务：workflow-consult-skill-routing

task_id: `2026-06-11_workflow-consult-skill-routing`
status: `DONE`
task_type: `工作流规则变更`
started_at: `2026-06-11`
done_at: `2026-06-11`

## 目标

优化 `docs/02_CURRENT_WORKFLOW.md` 的 skill 路由，让“咨询 / 评估 / 选型 / 是否值得做”默认走轻量加载，不再一上来拉满实现级 skill。

## related_files

- `docs/02_CURRENT_WORKFLOW.md`
- `tasks/index.md`
- `tasks/done/2026-06-11_workflow-consult-skill-routing.md`

## commit_plan

- message: `workflow: lighten consult skill routing`
- staging: 精确暂存 `docs/02_CURRENT_WORKFLOW.md`, `tasks/index.md`, `tasks/done/2026-06-11_workflow-consult-skill-routing.md`

## 验证结果

- `rg -n "Consultation|要不要做|值不值得做|Skill Load Discipline|required now|deferred|Superpowers skill" docs/02_CURRENT_WORKFLOW.md`：通过，确认咨询态路由、加载纪律和 Codex nested-path 说明已写入。
- `git diff --check`：通过，无空白错误或补丁格式问题。
- `git status --short --untracked-files=all`：通过，仅剩本任务 3 个文件变更。

## 文档同步

- 已更新 `docs/02_CURRENT_WORKFLOW.md`。
- 仓库内未发现 `docs/10_CHANGELOG.md`，本轮未做 changelog 同步，也未伪造该步骤。

## 收尾

- 已把“咨询态”和“执行态” skill 加载时机拆开。
- 已补充 Superpowers skill 在 Codex 下的 nested 路径检查说明。
- 本轮未提交；如需提交，按上方 `commit_plan` 精确暂存即可。
