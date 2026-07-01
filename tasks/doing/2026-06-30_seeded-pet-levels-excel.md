# 2026-06-30_seeded-pet-levels-excel

task_id: 2026-06-30_seeded-pet-levels-excel
type: data-artifact
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

按游戏开局 seed 预生成全部宠物在所有品质级别下的确定性成长数据，并导出给策划可读的 Excel。

## Scope

- 使用当前 `data/csv/01_pets.csv` 宠物基础数据。
- 复用 `src/core/qualityProgression.cjs` 的种子确定进化点规则。
- 默认 game seed 使用当前核心默认值 `ysbzs-local`；每个宠物每个品质派生 seed 为 `ysbzs-local:<petId>:<quality>`。
- 覆盖青铜、白银、黄金、钻石四个品质级别。
- 只生成 Excel 交付物，不修改运行时默认成长模式、不改 CSV/workbook 源数据、不刷新浏览器 bundle。

## related_files

- `tasks/doing/2026-06-30_seeded-pet-levels-excel.md`
- `outputs/seeded-pet-levels-20260630/ysbzs_seeded_pet_levels.xlsx`
- `outputs/seeded-pet-levels-20260630/ysbzs_seeded_pet_levels_start_silver.xlsx`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PLANNER_START.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `src/core/qualityProgression.cjs`
- `src/core/rng.cjs`
- `src/core/unitFactory.cjs`
- `data/csv/01_pets.csv`

## validation

- pass: generated `/Users/ywh/Documents/ysbzs/outputs/seeded-pet-levels-20260630/ysbzs_seeded_pet_levels.xlsx`.
- pass: workbook uses game seed `ysbzs-local` and per-row derived seed `ysbzs-local:<petId>:<quality>`.
- pass: exported 127 pets x 4 quality levels = 508 rows in `全品质快照`.
- pass: exported 2032 rows in `进化点明细`, matching 127 pets x (0 + 2 + 5 + 9) quality evolution points.
- pass: formula/error scan matched 0 entries for `#REF!|#DIV/0!|#VALUE!|#NAME?|#N/A`.
- pass: rendered and reviewed previews for `配置说明`, `全品质快照`, `进化点明细`, `宠物基础`, and `规则表`; sheets are non-blank and first-screen content is readable.
- pass follow-up: generated `/Users/ywh/Documents/ysbzs/outputs/seeded-pet-levels-20260630/ysbzs_seeded_pet_levels_start_silver.xlsx` for start quality `白银`.
- pass follow-up: start-silver workbook exports only `白银 / 黄金 / 钻石`, with 127 pets x 3 quality levels = 381 rows in `品质快照`.
- pass follow-up: start-silver workbook keeps 2032 evolution point detail rows for existing 白银 points plus later 黄金/钻石 cumulative points.
- pass follow-up: direct xlsx internal text scan found 0 `青铜` hits.
- pass follow-up: rendered and reviewed `start_silver_配置说明.png` and `start_silver_品质快照.png`; first visible rows start at 白银 and do not show lower-quality rows.

## commit_plan

- message: `data: export seeded pet level workbook`
- auto_commit: no; user requested an Excel artifact, not a code/runtime commit.

## collaboration

- lead_scope: Generate deterministic spreadsheet artifact only.
- specialist_input: 无
- tester_pass: 无，非 UI/可见运行时改动；以工作簿内容检查和渲染检查为准。
- external_ai_input: 无
- lead_decision: Delivered deterministic export artifacts only. The first workbook keeps all four qualities; the follow-up start-silver workbook filters out all rows below 白银 and removes lower-quality wording from the workbook. Neither export changes current runtime defaults, CSV source data, or browser bundle.
