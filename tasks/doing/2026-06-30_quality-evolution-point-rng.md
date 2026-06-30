# 2026-06-30_quality-evolution-point-rng

task_id: 2026-06-30_quality-evolution-point-rng
type: rules
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

把品质提升成长改成种子确定的随机进化点：进化点类别随机生成，已有类别会提高后续命中概率，形成角色随机成长路线。

## Scope

- 在核心品质成长模块实现 4 类进化点：生命、攻击、防御、元素。
- 青铜到白银累计 2 点，白银到黄金追加 3 点，黄金到钻石追加 4 点，青铜到钻石累计 9 点。
- 每次进化点类型由种子随机生成；已有类别命中概率为 `1 - 0.5 ** 已有不同类别数`。
- 命中已有类别时只在已有类别中随机；出新类别时只在未出现类别中随机。
- 生命进化点随机 +5~10 HP，攻击 +1，防御 +1，元素从角色已有元素槽中选一个 +1 层。
- 保留现有品质升级池 `qualityUpgrade` 作为品质机制效果，不在本任务重做 UI。
- 不修改 workbook、CSV 导出和浏览器 UI；本轮不刷新 `web/js/local-engine.js`。

## related_files

- `src/core/qualityProgression.cjs`
- `tests/unit/quality_progression.test.cjs`
- `tasks/doing/2026-06-30_quality-evolution-point-rng.md`

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
- `src/core/rng.cjs`
- `src/core/unitFactory.cjs`
- `src/core/elements.cjs`
- `tests/unit/quality_progression.test.cjs`

## validation

- RED confirmed: `node --test tests/unit/quality_progression.test.cjs` failed before implementation because `qualityExistingCategoryHitProbability` / `buildQualityEvolutionPoints` were missing and `growthMode: 'evolution_points'` was ignored.
- pass: `node --test tests/unit/quality_progression.test.cjs` (9/9)
- pass: `node --test tests/unit/quality_tiers_factory.test.cjs` (3/3)
- pass: `node tests/run_all_tests.cjs` (64/64)
- pass: `npm run check:architecture`
- pass: `git diff --check -- src/core/qualityProgression.cjs tests/unit/quality_progression.test.cjs tasks/doing/2026-06-30_quality-evolution-point-rng.md`
- note: no `web/js/local-engine.js` rebuild and no 4173 live refresh, because this task does not change browser UI behavior and the new evolution-point path is optional core logic only.

## commit_plan

- message: `feat(core): add seeded quality evolution points`
- auto_commit: blocked by unrelated dirty files and existing READY_TO_MERGE task groups in the shared worktree; output Commit Plan only.

## collaboration

lead_scope: Core quality evolution point generator and focused unit tests.
specialist_input: 无
tester_pass: 无，非 UI/可见改动；以核心单元测试和 run_all 验证为准。
external_ai_input: 无
lead_decision: Added deterministic evolution-point APIs and an optional `growthMode: 'evolution_points'` application path. The default unit factory behavior remains on the current quality table so existing ready-to-merge data/UI tasks are not invalidated; switching the runtime default can be done as a separate task after those task groups are reconciled.
