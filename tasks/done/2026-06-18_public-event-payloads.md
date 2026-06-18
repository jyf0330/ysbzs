# 2026-06-18_public-event-payloads

task_id: 2026-06-18_public-event-payloads
type: bugfix / public event projection
status: DONE
done_at: 2026-06-18 16:19:30 +0800
commit_id: this commit

## Goal

修复公开事件输出被白名单投影裁字段的问题，让 `/api/action` 返回事件和 ViewModel `events` 保留核心结构化 payload，同时保持 UI 只读 ViewModel、核心层不操作 DOM。

## Scope

- 只修公开 UI adapter 事件投影，不改核心规则结算。
- 保留事件里的结构化字段，例如 `restock`、`effect`、`damage`、`targetId`、`hpFrom/hpTo` 等。
- 不吸收未归属的 paper-battle 未跟踪文件。

## related_files

- `src/uiAdapter.cjs`
- `tests/ui_adapter.test.cjs`
- `tasks/index.md`
- `tasks/doing/2026-06-18_public-event-payloads.md`
- `docs/10_CHANGELOG.md`

## validation

- `node --test tests/ui_adapter.test.cjs`
- `npm run check:all`

## commit_plan

message: `fix(ui): preserve public event payloads`

## collaboration

lead_scope: Fix public event projection and add regression coverage for preserved payloads.
specialist_input: 无
tester_pass: 无，非 UI 布局/可见交互改动；玩家链路通过 adapter 公开命令测试覆盖。
external_ai_input: 无
lead_decision: 公开事件输出应 clone 完整事件并补默认 text，而不是维护易漏字段白名单。

## verification_results

- RED `node --test tests/ui_adapter.test.cjs`: failed as expected before implementation because public `SHOP_TARGETED_RESTOCK` event omitted `restock`.
- GREEN `node --test tests/ui_adapter.test.cjs`: pass, 32/32.
- `npm run check:all`: pass; includes `run_all_tests` 63/63, unit 61/61, UI 32/32, full 9/9, ops 12/12, prediction 4/4, architecture audit, CSV validation, Day7 Chromium browser check, DOM ban, UI-connected check, and JSDoc check.

## commit_status

- ready for exact-stage auto commit: current task files only.

## notes

- Unowned dirty files at start: `data/csv/.~lock.15_summon_trial_questions.csv#`, `docs/PAPER_BATTLE_UI_START_HERE.md`, `tools/check_paper_battle_ui.cjs`, `web/assets/reference_trace_base.jpeg`, `web/paper-battle.css`, `web/paper-battle.html`, `web/paper-battle.js`.
