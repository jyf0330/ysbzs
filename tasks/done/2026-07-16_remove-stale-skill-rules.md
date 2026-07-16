# 2026-07-16_remove-stale-skill-rules

task_id: 2026-07-16_remove-stale-skill-rules
type: workflow rules
status: DONE
owner: Codex
done_at: 2026-07-16

## Goal

删除 Skill 系统清空后失效的 UI/UX Skill Routing、Skill Receipt、Missing Skills 和强制调用提示，保留项目任务卡、TDD、真实浏览器验收、bundle 刷新与提交规则。

## related_files

- `AGENTS.md`
- `CLAUDE.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/roles/UI_UX_START.md`
- `tasks/doing/2026-07-16_remove-stale-skill-rules.md`

## write_scopes

- `AGENTS.md`: 仅删除 Skill Routing / Skill Receipt 入口句。
- `CLAUDE.md`: 仅删除 Skill Routing / Skill Receipt 入口句。
- `docs/02_CURRENT_WORKFLOW.md`: 仅删除完整 Skill Routing、收据和缺失 Skill 段落。
- `docs/roles/UI_UX_START.md`: 把 Skill Gate 改成任务卡、TDD 和真实浏览器直接门禁。
- 本任务卡: 记录验证与提交边界。

## exclusive_files

- `AGENTS.md` 的 Skill Routing 入口句
- `CLAUDE.md` 的 Skill Routing 入口句
- `docs/02_CURRENT_WORKFLOW.md` 的 Skill Routing / Missing Skills 章节
- `docs/roles/UI_UX_START.md` 的 Skill Gate 章节

## shared_file_policy

- 旧任务卡对这些文档的独占声明属于既有工作流迁移；用户已明确要求继续本次 Skill 规则清理。
- 不修改任何游戏实现、测试、数据、页面或生成 bundle。
- `tasks/index.md` 当前含其他任务的未提交改动，本任务不吸收也不重写。

## validation

- `git diff --check -- AGENTS.md CLAUDE.md docs/02_CURRENT_WORKFLOW.md docs/roles/UI_UX_START.md tasks/doing/2026-07-16_remove-stale-skill-rules.md`
- `rg -n "Skill Gate|Skill Routing|Skill Receipt|Missing Skills|SKIPPED <skill|UNAVAILABLE <skill|task-occupancy|using-superpowers|trigger planning skills" AGENTS.md CLAUDE.md docs/02_CURRENT_WORKFLOW.md docs/roles/UI_UX_START.md`

## commit_plan

精确提交三份规则文档与本任务卡，不吸收当前工作区的游戏代码、测试、输出或 `tasks/index.md` 改动。

## Result

- PASS: 删除入口、当前工作流和 UI/UX 角色入口中的 Skill 路由、收据、缺失能力与强制调用门禁。
- PASS: 保留任务卡冲突检查、TDD、正式玩家入口、真实浏览器证据、bundle 刷新和自动提交规则。
- PASS: `git diff --check` 通过；目标规则文件中无强制 Skill 路由残留。
- NOTE: `tasks/index.md` 已有其他任务的未提交改动，本任务不吸收或重写该文件。
