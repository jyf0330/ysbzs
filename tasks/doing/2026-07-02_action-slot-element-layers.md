# 2026-07-02_action-slot-element-layers

task_id: 2026-07-02_action-slot-element-layers
type: bugfix
status: BLOCKED
owner: Codex
branch: shared-worktree

## Goal

修正行动槽铺元素层数：普通宠物每个行动槽只铺 `基础层数`，三槽全打同一格应累计 3 层，不应因为形状默认结算次数变成 9 层。

## Scope

- 修正核心行动槽层数计算，不把 `settleCount` 乘进实际铺元素层数。
- 保留 `settleCount` 作为形状/表现字段，不作为普通元素层数乘数。
- 修正行动预览/存档口径：`pal_002` 打 `pal_002` 的即时伤害不提前混入回合末元素统一结算；存档不保存棋盘 `preview/threat` 派生字段。
- 增加独立单元测试覆盖普通三槽同格累计 3 层、捣蛋猫对捣蛋猫预览伤害、存档派生字段清理。
- 不改当前被其他任务占用的 `tests/run_all_tests.cjs`。
- 按用户最新规则，源码影响浏览器行为时必须刷新 `web/js/local-engine.js`；生成 bundle 卷入当前 dirty core/UI 源码是合理的真实快照，不再因生成文件租约跳过 build。

## related_files

- `src/core/battle/actions.cjs`
- `src/core/battle/preview.cjs`
- `src/storage/saveCodec.cjs`
- `tests/unit/action_slot_element_layers.test.cjs`
- `web/js/local-engine.js`
- `AGENTS.md`
- `docs/00_AI_START_HERE.md`
- `tasks/README.md`
- `tasks/doing/2026-07-02_action-slot-element-layers.md`

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
- `src/core/battle/actions.cjs`
- `src/core/battle/preview.cjs`
- `src/storage/saveCodec.cjs`
- `src/core/battle/shapeCatalog.cjs`
- `src/core/unitFactory.cjs`
- `src/core/state.cjs`

## validation

- RED confirmed: `node --test tests/unit/action_slot_element_layers.test.cjs` failed before implementation because ordinary slots reported `[3, 3, 3]` instead of `[1, 1, 1]`.
- RED follow-up: same test failed after adding save/damage assertions because `pal_002 -> pal_002` preview reported `[4, 4, 10]` and save persisted board `preview/threat` derived fields.
- pass: `node --test tests/unit/action_slot_element_layers.test.cjs`
- pass: `node --test --test-name-pattern 'UI17|UI17B' tests/ui_adapter.test.cjs`
- pass: direct runtime probe after three `USE_SLOT` calls on `pal_002`; target cell elements were `{ 火:0, 水:0, 风:3, 土:0 }`.
- pass: direct preview/save probe for `pal_002 -> pal_002`; preview damage became `[4, 4, 4]`, predicted HP became `[21, 17, 13]`, and exported save had `0` cells carrying `preview/previews/threat`.
- pass: `node --test --test-name-pattern 'R501|R502' tests/unit/singleplayer_round5.test.cjs`
- pass: `node --test tests/unit/normal_game_three_scenes.test.cjs` as part of combined save/normal run.
- pass: `git diff --check -- src/core/battle/actions.cjs src/core/battle/preview.cjs src/storage/saveCodec.cjs tests/unit/action_slot_element_layers.test.cjs tasks/doing/2026-07-02_action-slot-element-layers.md`
- pass: `node tools/build_local_engine_bundle.cjs`; rebuilt `web/js/local-engine.js` as current dirty-worktree source snapshot per updated project rule.
- pass: bundle probe confirms `web/js/local-engine.js` no longer contains `layers: baseLayers * settleCount`, does contain `layers: baseLayers`, and contains `if (element !== '火') return null`.
- pass after bundle refresh: `node --test tests/unit/action_slot_element_layers.test.cjs`
- pass after bundle refresh: `node --test --test-name-pattern 'UI17|UI17B' tests/ui_adapter.test.cjs`
- blocked: `node --test tests/unit/singleplayer_round5.test.cjs tests/unit/normal_game_three_scenes.test.cjs` has 12/13 pass but `R504` fails at its existing setup helper with `preview must have at least one legal cell`; focused save codec cases `R501|R502` and all normal-game tests pass.
- blocked: `node tests/run_all_tests.cjs` still fails at existing unrelated `tests/run_all_tests.cjs:464` legacy pet merge assertion `undefined == 2`; this file is already dirty and owned by other ACTIVE work.
- diagnosis before rebuild: current source probe for `enemy pal_002 -> hero pal_002` reports total risk `12` with slot hits `4/4/4`, but `web/js/local-engine.js` still contained stale `layers: baseLayers * settleCount` and lacked the fire-only settlement preview guard; default `runtime=local` page could still show old inflated values such as `伤26`.

## commit_plan

- message: `fix(combat): keep action element layers at base value`
- auto_commit: no; shared worktree has multiple unrelated dirty ACTIVE task groups. Per updated project rule, generated bundle refresh is still mandatory and may include current dirty core/UI source snapshot.

## collaboration

- lead_scope: Core action-slot element layer semantics only.
- specialist_input: 无
- tester_pass: 无，核心规则改动；本轮先刷新 local bundle，4173 正式浏览器截图仍需后续 tester pass。
- external_ai_input: 无
- lead_decision: 普通铺元素层数以 `baseLayers` 为准；品质效果和水汽催化等特殊效果仍通过既有质量/元素修饰链处理。
