# 2026-06-18_clear-stale-target-on-slot-aim

task_id: 2026-06-18_clear-stale-target-on-slot-aim
type: UI interaction bugfix / combat targeting
status: DONE

## Goal

修复正式界面移动后再选择行动块释放时，旧的移动目标格残留为 `ui.selectedCell`，导致 `USE_SLOT` 把单位脚下格当成目标并提示“没有合法目标格”的问题。

## Scope

- UI 层只修交互意图，不改核心规则。
- 进入行动块瞄准时清空旧格子；只有瞄准模式下新点击的格子才作为释放目标。
- 直接释放行动块时允许核心使用默认方向作用格。
- 补 UI 脚本静态测试/正式界面验证。

## related_files

- `web/js/main.js`
- `tests/unit/architecture_round4.test.cjs`
- `docs/10_CHANGELOG.md`
- `output/playwright/clear-stale-target-on-slot-aim-2026-06-18.png`
- `tasks/index.md`
- `tasks/doing/2026-06-18_clear-stale-target-on-slot-aim.md`

## validation

- `node --test tests/unit/architecture_round4.test.cjs`
- Browser formal UI gate on `http://127.0.0.1:4173/index.html?runtime=local`: no constructed save/no state injection; click through move then select slot then release, assert no `USE_SLOT_BLOCKED` and event shows damage/element.
- `npm run check:all`

## commit_plan

message: `fix(ui): clear stale target when aiming action slots`

## collaboration

lead_scope: Fix stale selectedCell causing no legal target after movement.
specialist_input: 无
tester_pass: completed
external_ai_input: 无
lead_decision: accept

## verification_results

- Diagnosis from current in-app browser: log showed `MOVE_HERO 我方疾风隼移动：R6C3->R6C6` followed by `USE_SLOT_BLOCKED 我方疾风隼 第1槽没有合法目标格。` The UI kept the moved-to cell as `ui.selectedCell`, so release passed the hero's own cell as target.
- RED: `node --test tests/unit/architecture_round4.test.cjs` failed `R408 action-slot aiming clears stale board targets before release`.
- GREEN: `node --test tests/unit/architecture_round4.test.cjs` passed 8/8.
- Browser formal UI gate on fixed port `4173`: reloaded `http://127.0.0.1:4173/index.html?runtime=local`, clicked `新开一天` -> `开始战斗` -> board `R6C3` -> board `R6C6` to move -> 疾风隼 action block -> `释放`.
- Formal UI assertion: no `USE_SLOT_BLOCKED`; event text included `我方疾风隼 施放第1槽：长柄T/风1层/AP1，命中敌方翠叶鼠，敌方翠叶鼠受风伤17，元素增加：R6C7 风+1，R6C8 风+1。`
- Formal UI screenshot: `output/playwright/clear-stale-target-on-slot-aim-2026-06-18.png`
- Console errors: 0 observed in the in-app browser pass.
- Main-thread screenshot review: screenshot is from the formal 4173 interface after the real click flow; board and event area are visible, with no obvious layout regression.
- Full validation: `npm run check:all` passed.

## commit_status

- pending commit
