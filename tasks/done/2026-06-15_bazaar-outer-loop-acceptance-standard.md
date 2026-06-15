# 2026-06-15_bazaar-outer-loop-acceptance-standard

task_id: 2026-06-15_bazaar-outer-loop-acceptance-standard
status: DONE
type: docs-acceptance-standard
created_at: 2026-06-15

## Goal

固化长期目标验收标准：外层对齐《The Bazaar》式 run / 节点 / 商人 / 摊位 / 奖励 / 遭遇系统，内层战斗保留元素背包史棋盘元素战斗，并给后续持续开发提供统一通过/未通过口径。

## Related Files

- `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-15_bazaar-outer-loop-acceptance-standard.md`
- `tasks/done/2026-06-15_bazaar-outer-loop-acceptance-standard.md`

## Validation

- `git diff --check`

## Commit Plan

- `docs: 固化大巴扎外层系统验收标准`

## Evidence Log

- 2026-06-15: 创建任务卡，占用大巴扎外层系统验收标准相关文档文件。
- 2026-06-15: 新增 `docs/BAZAAR_OUTER_LOOP_ACCEPTANCE.md`，将长期目标拆为外层 Run 骨架、商人/摊位/标签池、构筑成长、战斗接入、物体触发、可视化理解六层验收。
- 2026-06-15: 新增 `docs/10_CHANGELOG.md`，记录本次验收标准文档。
- 2026-06-15: `rg -n "TBD|TODO|之后再说|待定|implement later|fill in" ...` 无匹配。
- 2026-06-15: `git diff --check` 通过。
