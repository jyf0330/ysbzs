# 2026-07-02_pet-merge-quality-upgrade

task_id: 2026-07-02_pet-merge-quality-upgrade
type: bugfix
status: ACTIVE_IMPL
owner: Codex
branch: shared-worktree

## Goal

同名宠物合成不再产生不存在的 Lv2/Lv3 概念，改为推进品质：青铜 -> 白银 -> 黄金 -> 钻石，并同步库存和上阵单位。

## Scope

- 修正商店购买同名、复制商人、升阶机会的核心合成结果。
- 库存 ViewModel 和文字报告不再展示 Lv 等级。
- 增加独立单元测试覆盖同名合成升白银、商店升阶机会升白银。
- 不改当前被其他任务占用的 `tests/run_all_tests.cjs`。
- 不刷新 `web/js/local-engine.js`，因为该生成 bundle 被多个旧 ACTIVE 任务占用；本轮只做源码和核心单测验证。

## related_files

- `src/core/shop.cjs`
- `src/core/inventoryRules.cjs`
- `src/core/state.cjs`
- `src/uiAdapterInventoryVM.cjs`
- `src/render/textReport.cjs`
- `tests/unit/pet_merge_quality_upgrade.test.cjs`
- `tasks/doing/2026-07-02_pet-merge-quality-upgrade.md`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/core/shop.cjs`
- `src/core/inventoryRules.cjs`
- `src/core/unitFactory.cjs`
- `src/core/qualityProgression.cjs`

## validation

- pass: `node --check src/core/state.cjs && node --check src/core/shop.cjs && node --check src/core/inventoryRules.cjs && node --test tests/unit/pet_merge_quality_upgrade.test.cjs`
- pass: `node --test tests/unit/quality_tiers_factory.test.cjs tests/unit/quality_progression.test.cjs tests/ui_adapter.test.cjs`
- pass: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`
- pass: `git diff --check -- src/core/shop.cjs src/core/inventoryRules.cjs src/core/state.cjs src/uiAdapterInventoryVM.cjs src/render/textReport.cjs tests/unit/pet_merge_quality_upgrade.test.cjs tasks/doing/2026-07-02_pet-merge-quality-upgrade.md`
- blocked: `node tests/run_all_tests.cjs` still fails at `tests/run_all_tests.cjs:464` because that occupied file still asserts the removed legacy behavior `upgraded.level === 2`. The file is already dirty and owned by `2026-07-02_party-wipe-hero-hp`, so this task does not edit it.
- not run: 4173 live browser/bundle validation. `web/js/main.js` and `web/js/local-engine.js` are occupied/dirty through existing ACTIVE UI tasks; record `LIVE_4173_NOT_REFRESHED`.

## commit_plan

- message: `fix(shop): merge duplicate pets by quality`
- auto_commit: no; worktree already has unrelated dirty files and `tests/run_all_tests.cjs` is owned by another ACTIVE task.

## collaboration

- lead_scope: Core shop/inventory quality upgrade semantics only.
- specialist_input: 无
- tester_pass: 无，核心规则改动；live 4173 bundle refresh blocked by existing shared bundle leases.
- external_ai_input: 无
- lead_decision: Replace legacy inventory level progression with explicit quality progression and stop exposing Lv text from inventory surfaces.
