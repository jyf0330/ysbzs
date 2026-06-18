# 2026-06-18_formal-ui-evidence-rule

task_id: 2026-06-18_formal-ui-evidence-rule
type: workflow / rule documentation
status: DONE
done_at: 2026-06-18

## Goal

把用户纠正写进项目规则：UI、棋盘、可见反馈类提交前截图证据必须来自正式界面和真实玩家入口，不能用临时构造存档、localStorage/importSave、page.evaluate 改状态、内部函数或调试对象直接制造目标画面来代替验收。

## Scope

- 更新当前工作流与任务系统规则。
- 不改产品代码。
- 不触碰当前工作区已有无关脏文件。

## related_files

- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `tasks/README.md`
- `tasks/index.md`
- `tasks/done/2026-06-18_formal-ui-evidence-rule.md`

## validation

- `rg -n "正式界面|构造存档|importSave|page.evaluate|localStorage" docs/02_CURRENT_WORKFLOW.md docs/00_AI_START_HERE.md tasks/README.md`

## commit_plan

message: `docs(workflow): require formal UI evidence`

## collaboration

lead_scope: Document formal UI evidence rule.
specialist_input: 无
tester_pass: not applicable docs-only
external_ai_input: 无
lead_decision: accept

## verification_results

- `rg -n "正式界面|构造存档|importSave|page.evaluate|localStorage" docs/02_CURRENT_WORKFLOW.md docs/00_AI_START_HERE.md tasks/README.md` passed.
- Docs-only rule change; visible browser gate not applicable.

## commit_status

- ready: `docs(workflow): require formal UI evidence`
