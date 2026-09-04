# Item source binding data contract

task_id: 2026-09-04_original_pirate_source_binding
status: DONE
owner: pirate_top_three_source_audit
merge_owner: codex-root
worktree: /Users/ywh/.codex/worktrees/original-pirate-passive-content/ysbzs

## Goal

Workbook/CSV source bindings for all 22 existing local-original items. Content36/runtime34, revision34, rules32 unchanged. Identity and declared battle-profile scope only, no review PASS or original-rule acceptance.

## related_files / write_scopes

- xlsx/ysbzs_master.xlsx: new BZ_ITEM_SOURCE_BINDINGS and gameplay/source/ghost revision fields.
- data/csv/44_bz_gameplay.csv, 56_bz_source_snapshot.csv, 60_bz_ghost_snapshots.csv, 68_bz_item_source_bindings.csv.
- tools/export_master_to_csv.py: domain registration; tools/export_original_pirate_content.py and source-binding helper: strict projection, digest and validation.
- tests/original_pirate_content_export.test.cjs, original_pirate_csv_subset.test.cjs, original_pirate_passive_content.test.cjs, csv_source.test.cjs and new source-binding tests: schema/fixture migration and negative vectors.
- data/csv/README_csv_source.md, tasks/index.md and this task: contract/evidence.

## exclusive_files

Workbook and exporters in this worktree assigned by root; no other active owner here. Preserve old __pycache__, 66/67 identity locks and old cooldownAura worktree. No Godot writes/runs.

## Confirmed JSON contract

runtimeBundle.sourceCatalog={schema:ysbzs.original-pirate-source-catalog.v1,snapshots:[snapshotId,originKind,metadata,members,snapshotDigest objects]}. Snapshot digest is SHA256 of UTF8 canonical JSON(snapshot without snapshotDigest), sorted dictionary keys, compact separators, Unicode unescaped; members sorted by sourceType/sourceUuid.

local metadata exact: source_kind,source_revision,captured_on,license_note,catalog_scope,completeness,catalog_status (all string), copied from56 excluding snapshot_id; members empty. external metadata is all66 fields except source_snapshot_id, all string except game_patch blank -> null; members complete140 {sourceType:item,sourceUuid:UUID} from67. Only the locked25079259 external item snapshot is bindable. synthetic_fixture is explicit strict metadata {fixtureId:snapshotId}, members empty, never emitted by production CSV assembler.

items.sourceBinding exact: snapshotId,snapshotDigest,objectId,declaredScopes. Each scope exact quality,enchantmentId,scopeId=battle_profile; sorted by quality enum order/enchantmentId/scopeId. None is literal none, no wildcard expansion. Local/fixture objectId=itemId; external objectId must be a member UUID. Scope coverage is exact for each authored quality none plus applicable enchantment profiles. This states scope, never verified correctness.

## validation

TDD source contract tests, workbook roundtrip, source/member lock tests, existing content and passive suites, deterministic normal candidate generation and cross-runtime hash review by root.

### Final data evidence

- TDD first failed on missing source catalog; final four-suite run (`original_pirate_content_export`, `original_pirate_csv_subset`, `original_pirate_passive_content`, `original_pirate_source_binding`) passed 39/39, 0 skipped, 232.92 seconds.
- Additional re-signed empty external game_patch and all-scopes announcement-snapshot rejection vectors passed in source-binding-only rerun: 1/1, 1.34 seconds. These reach metadata/inventory checks, not mixed-identity or stale-digest rejection.
- CSV02F/CSV02H/CSV08B passed 3/3; master original-pirate-only check passed 24 domains; reference-source-lock-only check and normal content exporter --check passed.
- Commands use PYTHONDONTWRITEBYTECODE=1 and bundled Python/Node bins prepended to PATH: /Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin and /Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin.
- XLSX old sheets compared value-by-value with HEAD: only gameplay version/revision fields, original source snapshot ID/revision and ghost opponent_content_revision changed; new binding sheet appended. All other existing cells, including 66/67 identity locks and item execution profiles, unchanged.
- Formal candidate: /tmp/original-pirate-source-binding.y0LLQ6/content.json and display.json; bundleHash d3327b7f2dbc6676703cfc6c4cabf55308cabdfc7859c262e8457c3cc2d363dd. Local snapshotDigest c8cabd3a222de9f351604d8af0bb8668aff70c02c169e437ffad10eb6ef215ea. 22 local-original items, 230 declarations; no numeric/execution changes.
- External identity-only test candidate: /tmp/original-pirate-source-binding.y0LLQ6/external_identity_only_NOT_ORIGINAL_RULES.json; bundleHash 30d0585edd227302af472311821b88ec43081c598d994570bb7212760a56f9a1. Retains original behavior and only exercises real 140-member identity binding; never original-rule acceptance.
- Root reports cross-language external candidate canonical hash/reordering passed. No Godot run performed by this worker. Root owns final Godot gates; a match-runner 120-second timeout is not a pass.
- Legacy whole-master export not rerun; previously recorded pet pal_001 missing required base stat action remains outside this slice. No all-project-green claim. Popular-three complete builds, original-rule execution and independent battle-log acceptance remain open.
- Preserve the two pre-existing tools/__pycache__ files. No stage/archive/commit/push; Lead performs integration after independent review.

## commit_plan

Worker delivered READY_TO_MERGE; Lead reviewed and archived this single source-binding data slice. Commit identity is the Git commit containing this card. No unrelated WIP is included.

## Lead integration

- Final Godot runner outer schema-type guard received a rejection-only RED/GREEN test (6.72s), independent read-only PASS, and full six-direction rerun134.17s/150s. v8 manifest equals v7; evidence differs only in runner source hash, all six traces identical. Python material CLI and10/10 tests pass; originalRulesAccepted remains false. No data source or executable rule changed in this final fix.
- Godot source-binding v2 focused suite passed10/10, including Session source drift rejection and synthetic six-match runner119.83s under original120s limit. First run had8/10 (fixture migration omission and runner timeout); corrected fixture and serial rerun passed, no gate relaxation.
- Lead npm run check:all completed: base68/68, unit171/183 with12 failures, later chained gates did not execute. Previous Poison task records the same counts; no blanket claim that every failure has been individually rebased. Unrelated element/pet paths were not changed.
- Latest Godot source guards2/2 and strengthened complete six-match runner122.27s/150s passed. The150s limit is an evidence-based whole-process QA budget adjustment, not a performance fix; all matches/replays/negative assertions and maxTicks remain. Synthetic logs passed independent material review, never original-rule acceptance.
- Remaining Godot fast27 is terminal22PASS/5timeouts. Earlier performance-threshold failures and all unattributed timeouts remain explicitly open; no whole-project-green claim.
- Lead saved current9-file unit replay to /tmp/original-pirate-source-binding.y0LLQ6/unit-current-nine.tap:26 tests/14pass/12fail,21356.648ms. Independent comparison with /tmp/original-pirate-passive-baseline.Rspbv7/unit-baseline.log and unit-passive.log confirms all12 have matching early failure signatures (8 assertions,4 pet pal_001 missing required base stat action export errors). This is early ea2f3030 evidence, not an exact a768ba9 parent rerun or full-unit PASS.
- Independent source-feature review found no remaining concrete production contract defect blocking an atomic source-binding commit. DONE refers only to this validated source identity/data slice; broader regression failures, full original content, popular-three matches, independent original-rule review and real-window acceptance are not closed.
