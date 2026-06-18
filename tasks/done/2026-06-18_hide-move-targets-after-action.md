# 2026-06-18_hide-move-targets-after-action

task_id: 2026-06-18_hide-move-targets-after-action
type: UI interaction clarity / combat movement
status: DONE

## Goal

修复我方单位释放行动块后仍在正式界面显示可移动格、提示“点空格移动”的误导。核心规则中 `hasAttacked` 会锁定位置，UI 应同步显示为已行动/位置锁定。

## Scope

- 不改核心规则。
- UI `legalMoveTargets` 对 `hasAttacked` 单位返回空集合。
- 操作模式/提示文案显示位置锁定。
- 点击空格时给出已行动锁定反馈，而不是看起来像可以移动。

## related_files

- `web/js/main.js`
- `tests/unit/ui_module_render_cache.test.cjs`
- `docs/10_CHANGELOG.md`
- `output/playwright/hide-move-targets-after-action-2026-06-18.png`
- `tasks/index.md`
- `tasks/doing/2026-06-18_hide-move-targets-after-action.md`

## validation

- RED/GREEN: `node --test tests/unit/ui_module_render_cache.test.cjs`
- Formal UI gate on `http://127.0.0.1:4173/index.html?runtime=local`: release action, verify no move-target cells for acted unit and hint says locked.
- `npm run check:all`

## commit_plan

message: `fix(ui): hide move targets after unit action`

## collaboration

lead_scope: Align UI movement affordance with core attack-lock movement rule.
specialist_input: 无
tester_pass: completed
external_ai_input: 无
lead_decision: accept

## verification_results

- Diagnosis: current formal UI was still in `player_turn`; `怪物行动` was disabled until ending player turn. The selected 疾风隼 had already released an action slot, so core `moveHero` would block movement via attack-lock, but UI still showed move targets and movement hint.
- RED: `node --test tests/unit/ui_module_render_cache.test.cjs` failed `UI05B acted heroes do not keep move-target affordances`.
- GREEN: `node --test tests/unit/ui_module_render_cache.test.cjs` passed 14/14.
- Formal UI gate on fixed port `4173`: reloaded `http://127.0.0.1:4173/index.html?runtime=local`, clicked `新开一天` -> `开始战斗` -> `R6C3` -> `R6C6` -> 疾风隼 action block -> `释放`.
- Formal UI assertion: after release, hint was `疾风隼 本回合已行动，位置锁定；可选择其他英雄或点行动槽继续。`; operation rail mode was `锁定`; `#board .move-target` count was 0.
- Formal UI screenshot: `output/playwright/hide-move-targets-after-action-2026-06-18.png`
- Main-thread screenshot review: screenshot shows formal 4173 interface after the real click flow, mode is locked and board no longer shows movement highlights for the acted unit.
- Full validation: `npm run check:all` passed.

## commit_status

- pending commit
