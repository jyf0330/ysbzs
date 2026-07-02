# 2026-07-02_preview-dead-target-element-spread

task_id: 2026-07-02_preview-dead-target-element-spread
type: bugfix
status: BLOCKED
owner: Codex
branch: shared-worktree

## Goal

修正棋盘预览数据口径：预览只表达敌我宠物将受到多少伤害，不预览未来铺元素；格子已有元素仍由当前 `cell.elements` 正常显示。

## Scope

- 修正核心预览投影：`buildPreviewGrid()` 只为命中仍存活单位的格子返回预览记录。
- 预览记录只保留单位受伤字段；不再输出 `generatedElements` / `projectedElements` / `projectedElementsBeforeSettle` 作为未来元素预览。
- 敌方宠物和我方宠物被命中都要有受伤预览；空格不再产生铺元素预览。
- 不改 UI 布局，不改战斗真实结算。
- 不刷新 `web/js/local-engine.js`，除非生成 bundle租约被清理；当前只验证源码与 4173 `runtime=http` 路径。

## related_files

- `src/core/battle/preview.cjs`
- `web/js/main.js`
- `tests/ui_adapter.test.cjs`
- `tests/unit/preview_dead_target_element_spread.test.cjs`
- `tasks/doing/2026-07-02_preview-dead-target-element-spread.md`

## exclusive_files

- `web/js/main.js`

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/PROGRAMMER_START.md`
- `docs/roles/UI_UX_START.md`
- `tasks/index.md`
- `tasks/README.md`
- `tasks/doing/*.md`
- `src/core/battle/preview.cjs`
- `tests/ui_adapter.test.cjs`
- `web/js/main.js`

## validation

- RED confirmed: `node --test tests/unit/preview_dead_target_element_spread.test.cjs` failed before implementation because later same-cell previews still had `hitEnemy=true` after the target was projected dead.
- pass: `node --test tests/unit/preview_dead_target_element_spread.test.cjs`
- pass: `node --test --test-name-pattern 'UI17|UI20|UI21|UI22' tests/ui_adapter.test.cjs`
- pass: `npm run test:unit` (147/147)
- pass: `npm run check:jsdoc`
- pass: `git diff --check -- src/core/battle/preview.cjs tests/unit/preview_dead_target_element_spread.test.cjs tasks/doing/2026-07-02_preview-dead-target-element-spread.md`
- RED confirmed for new damage-only preview contract: `node --test tests/unit/preview_dead_target_element_spread.test.cjs --test-reporter=spec` failed because old preview still emitted empty-cell element previews and did not report friendly-unit injury.
- pass: `node --test tests/unit/preview_dead_target_element_spread.test.cjs --test-reporter=spec`
- pass: `node --test --test-name-pattern 'UI16|UI17|UI17B|UI20|UI21|UI22|UI23|UI24' tests/ui_adapter.test.cjs --test-reporter=spec`
- pass: `node --test tests/unit/preview_dead_target_element_spread.test.cjs tests/ui_adapter.test.cjs --test-reporter=spec` (50/50)
- pass: `node --input-type=module --check < web/js/main.js`
- pass: `git diff --check -- src/core/battle/preview.cjs web/js/main.js tests/unit/preview_dead_target_element_spread.test.cjs tests/ui_adapter.test.cjs tasks/doing/2026-07-02_preview-dead-target-element-spread.md`
- blocked: `node tests/run_all_tests.cjs` still fails at existing unrelated `tests/run_all_tests.cjs:464` legacy pet merge assertion `upgraded.level === 2`; this file is owned by `2026-07-02_party-wipe-hero-hp` and the mismatch is already recorded by `2026-07-02_pet-merge-quality-upgrade`.
- pass: 4173 formal page through real buttons on `http://127.0.0.1:4173/?runtime=http&sessionId=preview-element-spread-visible-1783003178194`: clicked `#prep-open-btn`, `#prep-ready-btn`, then clicked the naturally available empty preview cell R7 C4. DOM detail text showed `空格` and three entries `铺风3`; board badge text was `风9`; console/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/preview-element-spread-visible-4173.png`; selected empty cell, preview badge, and detail panel are visible with no obvious overlap/missing state.
- superseded evidence: `preview-element-spread-visible-4173.png` is from the old element-preview contract and should no longer be used as passing evidence.
- pass: restarted `tools/run_ui_server.cjs` on 4173 and verified the formal page at `http://127.0.0.1:4173/?runtime=http&sessionId=damage-only-preview-clean-1783005578134`; clicked `#prep-open-btn`, `#prep-ready-btn`, `#auto-position-btn`. DOM `.preview-num` text was only `伤20`, no `火/水/风/土/铺/undefined`; ViewModel `previewGrid=2`, `damagePreviews=2`, `elementFieldCount=0`, `enemyDamageCount=2`; console/page errors = 0.
- screenshot reviewed by Lead: `/Users/ywh/Documents/ysbzs/output/playwright/damage-only-preview-clean-1783005578134.png`; board preview badge shows damage-only text with no future element preview and no obvious overlap/missing state.
- blocked: `LIVE_4173_NOT_REFRESHED`; `web/js/local-engine.js` is occupied by multiple existing unarchived task cards, and rebuilding it now would absorb unrelated dirty core/UI work into the generated bundle.

## commit_plan

- message: `fix(combat): preview dead target as element spread`
- auto_commit: no; worktree has multiple active dirty task groups and `web/js/local-engine.js` ownership is unresolved.

## collaboration

- lead_scope: Core preview projection and focused regression test.
- specialist_input: 无
- tester_pass: 4173 `runtime=http` browser pass through official prep buttons; screenshot `/Users/ywh/Documents/ysbzs/output/playwright/preview-element-spread-visible-4173.png`; DOM detail showed empty-cell element spread; console/page errors 0. Default local bundle not refreshed; see `LIVE_4173_NOT_REFRESHED`.
- external_ai_input: 无
- lead_decision: Replace the old element-preview contract with damage-only preview data. `buildPreviewGrid()` now emits records only for living units that would take damage, includes enemy and friendly hits, skips empty cells, and omits future element fields. Existing cell elements remain available through `cell.elements`; browser wording now renders any positive predicted damage as `伤X` instead of falling back to `铺元素`.
