# 2026-06-18_remove-element-packet-splitting

task_id: 2026-06-18_remove-element-packet-splitting
type: core rules / element packets
status: done

## Goal

删除元素包可以被打散/拆分的逻辑。元素包转换时保持 packet 原子性，不再把一个多层元素包拆成两个不同元素的包。

## Scope

- 修改核心元素包转换逻辑。
- 更新元素包规则 CSV，不再声明 `packet_split_allowed`。
- 补核心回归测试，覆盖部分转换不能拆包。
- 不修改当前并行任务 `2026-06-18_public-event-payloads` 的实现文件。

## related_files

- `src/core/elementPackets.cjs`
- `data/csv/21_element_packet_rules.csv`
- `tests/run_all_tests.cjs`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/done/2026-06-18_remove-element-packet-splitting.md`

## parallel_task_note

- User explicitly allowed editing different locations while `2026-06-18_public-event-payloads` was ACTIVE.
- `tasks/index.md` was already owned/modified by `2026-06-18_public-event-payloads`; this task did not edit it.
- Unowned dirty files remained out of scope: `data/csv/.~lock.15_summon_trial_questions.csv#`, `docs/PAPER_BATTLE_UI_START_HERE.md`, `tools/check_paper_battle_ui.cjs`, `web/assets/reference_trace_base.jpeg`, `web/paper-battle.css`, `web/paper-battle.html`, `web/paper-battle.js`.

## validation

- RED: `node tests/run_all_tests.cjs` failed at `element packet conversion does not split oversized packets`; current code converted 1 layer from a 2-layer wind packet.
- GREEN: `node tests/run_all_tests.cjs` passed, 64/64 tests passed.
- Project-level: `npm run check:all` passed.

## implementation

- Removed the partial packet clone branch from `convertElementPackets`.
- If a conversion amount cannot cover the whole matching packet, the packet is skipped instead of being split.
- Removed `packet_split_allowed` from `data/csv/21_element_packet_rules.csv`.

## commit_plan

message: `fix(core): make element packets atomic during conversion`

## collaboration

lead_scope: Remove element packet splitting from core conversion behavior and tests.
specialist_input: 无
tester_pass: 无，核心规则改动，无 UI / 棋盘可见布局改动。
external_ai_input: 无
lead_decision: Partial conversion must skip an oversized packet instead of cloning a converted fragment.

## commit_status

- pending commit via git-c
- previous_blocker_resolved: 并行任务已完成；本次仅精确暂存本任务文件，paper-battle 相关未归属可见 UI 文件继续留在工作区。
