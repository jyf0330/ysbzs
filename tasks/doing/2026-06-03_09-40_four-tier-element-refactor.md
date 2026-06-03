# 任务：四阶体系 + 元素伤害统一重构 + 表格同步

task_id: 2026-06-03_09-40_four-tier-element-refactor
status: DONE
priority: P0
created_at: 2026-06-03 09:40
updated_at: 2026-06-03 17:00
done_at: 2026-06-03 17:00
commit_id: 9f0ab9c
validation_result: 436/436 通过，无旧口径残留
last_safe_commit: a383124
branch: master

## 目标

1. 英雄同名合成按档位升级改为四阶：青铜 → 白银 → 黄金 → 钻石
2. 元素伤害体系统一重构
3. 表格定义同步更新
4. 正式口径与代码口径一致

## 当前进度

- [x] data.js — 四阶体系数值修改
- [x] elements.js — 元素伤害统一
- [x] battle.js — 战斗逻辑适配四阶
- [x] ui.js — UI 适配
- [x] docs/01_CURRENT_GAME_SPEC.md — 游戏规格更新
- [x] docs/03_CURRENT_NUMBERS.md — 数值同步
- [x] docs/roles/PLANNER_START.md — 策划入口更新
- [x] docs/tables/ — 表格定义同步
- [x] docs/tables/_changes/ — 变更单系统更新
- [x] scripts/sync-tables.js — 同步脚本更新
- [x] docs/tables/_changes/pending/2026-06-03-fix-planner-lv3-to-four-tiers.md — 已删除（已同步）
- [x] 验收 — `node test.js`（✅ 436/436）
- [x] 检查旧口径残留（✅ 无风险）
- [x] 提交（commit: `9f0ab9c`）

## 相关文件 related_files

- battle.js
- data.js
- elements.js
- ui.js
- docs/01_CURRENT_GAME_SPEC.md
- docs/03_CURRENT_NUMBERS.md
- docs/roles/PLANNER_START.md
- docs/tables/README.md
- docs/tables/_changes/README.md
- docs/tables/_changes/SYNC_RULES.md
- docs/tables/_changes/TEMPLATE_change.md
- docs/tables/_changes/pending/2026-06-03-fix-planner-lv3-to-four-tiers.md
- scripts/sync-tables.js
- docs/tables/13_代码现状与正式口径差异表.md
- scripts/run_10day_simulation.js

## 不应修改的文件 excluded_files

- tasks/ 下的其他任务文件
- docs/04_CURRENT_UI_ART_SPEC.md（商店文档任务范围）
- docs/10_CHANGELOG.md（除非验收后记录）
- index.html（视觉任务范围）

## 下一步 resume_next_step

（已完成 — 本任务已 DONE）
- [x] 验收：`node test.js` 436/436 通过
- [x] 提交：`9f0ab9c`
- [x] 更新 `tasks/index.md`

## 验收 validation_needed

- [x] `node test.js` — ✅ 436/436 通过
- [x] `git diff --stat` — ✅ 全部归属本任务
- [x] `git status --short` — ✅ 无遗留脏文件
- [x] 旧口径扫描 — ✅ 无风险残留

## 提交计划 commit_plan

- 一次性提交所有改动的业务代码 + 文档 + 表格
- 不允许混入 tasks/ 下其他任务的文件
- 提交信息格式：`feat(四阶体系): 英雄四阶合成 + 元素伤害统一 + 表格同步`

## 中断记录 interruption_log

（无记录 — 本次为新建任务卡）

## 冲突记录 conflict_log

（无记录）
