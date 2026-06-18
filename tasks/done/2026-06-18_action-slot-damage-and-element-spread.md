# 2026-06-18_action-slot-damage-and-element-spread

task_id: 2026-06-18_action-slot-damage-and-element-spread
type: core gameplay / visible combat behavior bugfix
status: DONE

## Goal

修复行动块命中敌人时只叠目标元素、不造成普通行动伤害且不铺完整作用格元素的问题。用户明确要求：`R6C3 -> R6C6` 这类释放操作，伤害要打出去，风元素也要铺上。

## Scope

- 核心层只改战斗规则结算和结构化事件，不操作 DOM。
- UI 仍只读 ViewModel/事件日志。
- 命中敌人时，行动块仍应对命中目标造成行动伤害。
- 命中敌人时，作用格内元素仍应按行动形状铺出去，不因存在目标而跳过空格/作用格铺元素。
- 重建 `web/js/local-engine.js`。

## related_files

- `src/core/battle/actions.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/local-engine.js`
- `docs/10_CHANGELOG.md`
- `output/playwright/action-slot-damage-and-element-spread-2026-06-18.png`
- `tasks/index.md`
- `tasks/doing/2026-06-18_action-slot-damage-and-element-spread.md`

## validation

- RED/GREEN: `node --test tests/ui_adapter.test.cjs`
- Browser formal UI gate: no constructed save/no state injection; use official page clicks from `R6C3` to `R6C6`, assert event log shows target damage and wind element spread.
- `npm run check:all`

## commit_plan

message: `fix(combat): damage targets while spreading action elements`

## collaboration

lead_scope: Fix action-slot target damage and element spread behavior.
specialist_input: 无
tester_pass: completed
external_ai_input: 无
lead_decision: accept

## verification_results

- RED before fix: `node --test tests/ui_adapter.test.cjs` failed UI25/UI27, showing the old behavior only logged fire explosion damage and left the wind target HP unchanged.
- GREEN after fix: `node --test tests/ui_adapter.test.cjs` passed 36/36.
- Formal UI gate: opened `http://127.0.0.1:4196/index.html?runtime=local`; clicked `新开一天` -> `开始战斗` -> board `R6C3` -> 疾风隼 action block -> board `R6C6` -> `释放`.
- Formal UI assertion: event text was `我方疾风隼 施放第1槽：长柄T/风1层/AP1，命中敌方翠叶鼠，敌方翠叶鼠受风伤17，元素增加：R6C4 风+1，R6C5 风+1，R6C6 风+1，R6C7 风+1。`
- Formal UI screenshot: `output/playwright/action-slot-damage-and-element-spread-2026-06-18.png`
- Formal UI console errors: 0.
- Main-thread screenshot review: screenshot shows row 6 wind elements on the action path and event 012 includes wind damage plus `R6C4`-`R6C7` wind increases; no obvious overlap or missing log evidence.
- Full validation: `npm run check:all` passed.

## commit_status

- pending commit
