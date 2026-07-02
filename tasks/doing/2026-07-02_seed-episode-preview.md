task_id: 2026-07-02_seed-episode-preview
type: data-tooling
status: READY_TO_MERGE
owner: Codex
branch: shared-worktree

Goal:
- 生成 3 个 seed 的整集预览表，让策划能提前看本集路线对手、节点候选、商店/奖励可获得宠物。
- 预览表只作为测试、平衡和策划快照，不作为正式 runtime 存储真相。

Scope:
- 新增离线导出工具，读取当前 `loadGameData()` 正规数据路径。
- 将预览表与当前核心 runtime 对齐：路线/遭遇候选沿用核心当前前 N 规则，商店/奖励/波次使用与核心一致的 seed 上下文。
- 输出 JSON/CSV/Markdown 表到 `outputs/seed-episode-preview-20260702/`。
- 改核心路线进入商店/奖励时的 seed context，以及商店/奖励 RNG key；不刷新 `web/js/local-engine.js`。
- `src/core/dayRoute.cjs` 和 `src/core/shop.cjs` 与其他 ACTIVE 任务存在文件租约重叠；用户在确认差异后明确要求继续做。本任务不自动提交，等待后续 git-c/Lead 统一收口。
- 不更新 `tasks/index.md`，因为当前被旧 replay 任务独占且目录状态已经由多个 ACTIVE 任务管理。

related_files:
- `tools/build_seed_episode_preview.cjs`
- `tests/unit/seed_episode_preview.test.cjs`
- `src/core/dayRoute.cjs`
- `src/core/shop.cjs`
- `outputs/seed-episode-preview-20260702/seed_episode_preview.json`
- `outputs/seed-episode-preview-20260702/seed_episode_steps.csv`
- `outputs/seed-episode-preview-20260702/seed_episode_pet_sources.csv`
- `outputs/seed-episode-preview-20260702/seed_episode_battle_enemies.csv`
- `outputs/seed-episode-preview-20260702/README.md`
- `tasks/doing/2026-07-02_seed-episode-preview.md`

exclusive_files:
- 无

read_files:
- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/core/csvData.cjs`
- `src/core/rng.cjs`
- `data/csv/24_node_schedule.csv`
- `data/csv/25_node_pool.csv`
- `data/csv/26_encounter_pool.csv`
- `data/csv/03_monster_waves.csv`
- `data/csv/06_shop_rewards.csv`

validation:
- pass: `node --check src/core/shop.cjs && node --check src/core/dayRoute.cjs && node --check tools/build_seed_episode_preview.cjs`
- pass: `node --test tests/unit/seed_episode_preview.test.cjs` (7/7; includes actual adapter route/shop/reward parity checks)
- pass: `node tools/build_seed_episode_preview.cjs`; generated 3 seeds with `steps=420`, `petSources=1629`, `battles=1635`.
- pass: output files exist under `outputs/seed-episode-preview-20260702/`: `seed_episode_preview.json`, `seed_episode_steps.csv`, `seed_episode_pet_sources.csv`, `seed_episode_battle_enemies.csv`, `README.md`.
- pass: sampled first rows show node 3选1 candidates, shop/reward pet sources, and fixed battle enemy rows with seed-derived qualities.
- pass: `node --test tests/unit/daily_flow_battle_first_route.test.cjs` (13/13)
- pass: `node --test tests/unit/normal_game_three_scenes.test.cjs` (6/6)
- pass: `node --test tests/ui_adapter.test.cjs --test-name-pattern "商店|奖励|route|节点|UI05|UI06"` (48/48)
- pass: `git diff --check -- src/core/dayRoute.cjs src/core/shop.cjs tools/build_seed_episode_preview.cjs tests/unit/seed_episode_preview.test.cjs tasks/doing/2026-07-02_seed-episode-preview.md outputs/seed-episode-preview-20260702/README.md outputs/seed-episode-preview-20260702/seed_episode_preview.json outputs/seed-episode-preview-20260702/seed_episode_steps.csv outputs/seed-episode-preview-20260702/seed_episode_pet_sources.csv outputs/seed-episode-preview-20260702/seed_episode_battle_enemies.csv`
- blocked: `LIVE_4173_NOT_REFRESHED`; this pass changes browser-reachable core behavior but does not rebuild `web/js/local-engine.js` because that generated file is already occupied by multiple unarchived task cards.

commit_plan:
- message: `data: export seed episode preview tables`
- auto_commit: no; shared worktree has multiple unrelated dirty ACTIVE task groups, explicit file overlap on `src/core/dayRoute.cjs` / `src/core/shop.cjs`, and `tasks/index.md` is occupied.

collaboration:
- lead_scope: Seed preview export plus shared core RNG context for route shop/reward sources.
- specialist_input: 无
- tester_pass: 无，本轮不做 UI/浏览器截图；核心行为用 adapter/core 单测对齐，4173 bundle 记录 `LIVE_4173_NOT_REFRESHED`。
- external_ai_input: 无
- lead_decision: Promote the preview from approximate weighted snapshot to a core-aligned planning table. Route choices keep current core candidate rule; route shop/reward sources and battle waves must match actual adapter output for the same seed.
