task_id: 2026-07-03_seeded-route-options
type: rules
status: DONE
owner: Codex
branch: shared-worktree

## Goal

让路线节点 3 选 1 和遭遇 3 选 1 真正接入同局 seed：同 seed + 同玩家选择稳定复现，不同 seed 能产生不同候选。

## Scope

- 将 `src/core/dayRoute.cjs` 中节点/遭遇候选从固定前 N 改为 seed 派生的加权不放回抽样。
- 保持候选生成、选择、商店/奖励 seed context 和 replay 命令流仍走公开 adapter/core 命令。
- 同步 seed episode preview 工具与核心候选算法，避免策划预览表继续假定固定前 N。
- 不改 UI 布局；如触达浏览器 runtime，记录 bundle 刷新边界。

## related_files

- `src/core/dayRoute.cjs`
- `tools/build_seed_episode_preview.cjs`
- `tests/unit/seeded_route_options.test.cjs`
- `tests/unit/seed_episode_preview.test.cjs`
- `tests/unit/daily_flow_battle_first_route.test.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/run_all_tests.cjs`
- `web/js/local-engine.js`
- `outputs/seed-episode-preview-20260702/README.md`
- `outputs/seed-episode-preview-20260702/seed_episode_preview.json`
- `outputs/seed-episode-preview-20260702/seed_episode_steps.csv`
- `outputs/seed-episode-preview-20260702/seed_episode_pet_sources.csv`
- `tasks/index.md`
- `tasks/doing/2026-07-03_seeded-route-options.md`

## write_scopes

- file: `src/core/dayRoute.cjs`
  scope: route option candidate sampling helpers plus `generateNodeOptions` / `generateBattleOptions` candidate selection only
  mode: direct
- file: `tools/build_seed_episode_preview.cjs`
  scope: route/encounter option sampling parity and algorithm text only
  mode: direct
- file: `tests/unit/seeded_route_options.test.cjs`
  scope: new focused seeded route option contract tests
  mode: direct
- file: `tests/unit/seed_episode_preview.test.cjs`
  scope: preview parity expectations if needed
  mode: direct
- file: `tests/unit/daily_flow_battle_first_route.test.cjs`
  scope: route shop tests updated to use seed-aware shop assumptions only
  mode: direct
- file: `tests/ui_adapter.test.cjs`
  scope: UI07B route preview assertion updated to find the seeded free-refresh choice by id
  mode: direct
- file: `tests/run_all_tests.cjs`
  scope: route shop return test opens full candidate pool instead of assuming default seed top-3 contains shop
  mode: direct
- file: `web/js/local-engine.js`
  scope: generated bundle rebuilt from current worktree source snapshot after core route behavior changed
  mode: direct
- file: `outputs/seed-episode-preview-20260702/*`
  scope: regenerated seed episode preview artifacts for seeded route/encounter candidate sampling
  mode: direct
- file: `tasks/index.md`
  scope: READY_TO_MERGE index entry for this task
  mode: direct
- file: `tasks/doing/2026-07-03_seeded-route-options.md`
  scope: this task card validation and overlap notes
  mode: direct

## exclusive_files

- `src/core/dayRoute.cjs`

## shared_file_policy

- `2026-07-02_seed-episode-preview` is READY_TO_MERGE and explicitly preserved the old top-N route candidate assumption; this task supersedes that assumption per the user's latest seed requirement.
- `2026-07-02_party-wipe-hero-hp` is BLOCKED and lists `src/core/dayRoute.cjs` for route outcome/loss handling; this task only touches route option sampling helpers and does not edit outcome/failure functions.
- Existing unrelated dirty/untracked files include `src/uiAdapterManualFlowPreview.cjs`, `tasks/doing/2026-06-30_normal-game-three-scenes.md`, `tasks/doing/2026-07-03_manual-flow-injury-diff-source.md`, `tests/unit/manual_flow_injury_diff_source.test.cjs`, `tests/unit/normal_game_three_scenes.test.cjs`, and `web/normal-game.js`; this task does not own or revert those files.

## validation

- RED confirmed: `node --test tests/unit/seeded_route_options.test.cjs` failed because different seeds still returned the same fixed top-3 node and encounter options.
- pass: `node --test tests/unit/seeded_route_options.test.cjs`.
- pass: `node --check src/core/dayRoute.cjs && node --check tools/build_seed_episode_preview.cjs`.
- pass: `node --test tests/unit/seed_episode_preview.test.cjs`.
- pass: `node --test tests/unit/daily_flow_battle_first_route.test.cjs`.
- pass: `node --test tests/unit/normal_game_three_scenes.test.cjs`.
- pass: `node --test tests/ui_adapter.test.cjs --test-name-pattern "商店|奖励|route|节点|UI05|UI06|UI07"`.
- pass: `node tools/build_seed_episode_preview.cjs`; regenerated `outputs/seed-episode-preview-20260702`, now `petSources=1203`.
- pass: `node tools/build_local_engine_bundle.cjs`; rebuilt `web/js/local-engine.js` from the current worktree source snapshot.
- pass: `node --check web/js/local-engine.js`.
- pass: `git diff --check -- src/core/dayRoute.cjs tools/build_seed_episode_preview.cjs tests/unit/seeded_route_options.test.cjs tests/unit/seed_episode_preview.test.cjs tests/unit/daily_flow_battle_first_route.test.cjs tests/ui_adapter.test.cjs tasks/doing/2026-07-03_seeded-route-options.md outputs/seed-episode-preview-20260702/README.md outputs/seed-episode-preview-20260702/seed_episode_preview.json outputs/seed-episode-preview-20260702/seed_episode_steps.csv outputs/seed-episode-preview-20260702/seed_episode_pet_sources.csv web/js/local-engine.js`.
- pass: 4173 real browser check on bundled local runtime, opened normal-game, clicked `菜单`, set seed, clicked `重开本局`; `route-seed-a` visible choices differed from `route-seed-b`, console/page errors = 0.
- screenshots: `/Users/ywh/Documents/ysbzs/output/playwright/seeded-route-options-a.png`, `/Users/ywh/Documents/ysbzs/output/playwright/seeded-route-options-b.png`.
- pass: `npm run check:all`.

## commit_plan

- message: `feat(route): seed node and encounter choices`
- auto_commit: no; shared worktree has existing unrelated dirty files and overlapping READY/BLOCKED task-card history.

## collaboration

- lead_scope: Core route candidate sampling, seed preview parity, focused tests, generated browser bundle, and visible browser verification.
- specialist_input: 无
- tester_pass: local Playwright pass through real normal-game controls using the bundled local runtime; screenshots saved under `output/playwright/`.
- external_ai_input: 无
- lead_decision: Route node and future encounter 3-choice candidates should be weighted sampled without replacement from a deterministic seed key; shop/reward/wave RNG contexts remain separate and unchanged.
