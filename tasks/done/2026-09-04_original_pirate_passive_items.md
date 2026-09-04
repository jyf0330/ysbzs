# Explicit passive item content contract

task_id: 2026-09-04_original_pirate_passive_items
status: DONE
owner: pirate_top_three_source_audit
worktree: /Users/ywh/.codex/worktrees/original-pirate-passive-content/ysbzs
branch: codex/original-pirate-passive-content
merge_owner: codex-root

## Goal

Explicit cooldown/passive activation mode through workbook, CSV and exported quality profiles. Preserve all 22 existing item numbers/effects; no new original substitute items or source-catalog acceptance claim.

## related_files / write_scopes

- xlsx/ysbzs_master.xlsx: BZ_ITEMS activation_mode, BZ_GAMEPLAY/source/ghost version bindings only; worktree mode.
- data/csv/44_bz_gameplay.csv, 46_bz_items.csv, 56_bz_source_snapshot.csv, 60_bz_ghost_snapshots.csv: generated matching workbook slices.
- tools/export_original_pirate_content.py: explicit activation mode and passive validation, schema version migration.
- tests/original_pirate_content_export.test.cjs, tests/original_pirate_csv_subset.test.cjs and tests/original_pirate_passive_content.test.cjs: data contract fixtures and version expectations.
- data/csv/README_csv_source.md, tasks/index.md and this task: current slice documentation.

## exclusive_files

Workbook and original-pirate exporter in this isolated worktree only. No writes to original-pirate-content worktree or its cooldownAura WIP.

## validation

Scoped workbook export/check, exporter exact validation, Node original-pirate tests, deterministic candidate output; root owns Godot integration and final QA.

### Completed evidence

- Final worker closeout rerun: all three Node suites 38/38 PASS, 0 skipped, 228.31 seconds; normal exporter `--check` and master `--original-pirate-only --check` both PASS. Read-only baseline comparison again confirmed exactly four changed workbook sheets, 82 unchanged item profiles apart from explicit cooldown mode, and version-only changes in 44/56/60. Working diff `--check` PASS; staging/archival/commit remain Lead actions.
- Scoped workbook `--original-pirate-only --check`: PASS, all 23 CSV domains match.
- Three Node suites: 38/38 PASS, including pure Aura, response-only and battle_start passive fixtures; missing/unknown mode, nonblank passive cooldown, ready event, empty shell, ammo, cross-quality mode and incompatible enchantment negatives.
- `export_original_pirate_content.py --check`: PASS; content 35 / runtime 33 / catalogs 25 / rules 31 / revision 32.
- Baseline comparison: all 82 existing quality profiles preserve every prior CSV value, adding only activation_mode=cooldown. Only the four authorized workbook sheets changed. Existing 22 items, 164 effects and 8 Auras retained.
- Candidate files: `/tmp/original-pirate-passive-candidate.BDY01P/content.json`, `/tmp/original-pirate-passive-candidate.BDY01P/display.json`.
- Runtime bundle hash: `0f36f320482688873b4c5c05728a7af1cb6c9e44e5ee09e75bf6056ab11c32e3`.
- `git diff --check`: PASS. No Godot run, commit or push by this worker. No old cooldownAura WIP absorbed.
- This is data contract evidence only, not original-rule content coverage, popularity ranking or player battle acceptance.
- Cross-repo read-only review found passive self_item charge accepted by content but rejected by battle clock validation. Source and package validators now reject passive self_item charge/apply_status/reload; regression includes the actual burn-response/self-charge CSV case and a forged package case. Root owns matching Godot validator change.
- Root reran all three scoped suites: 38/38 PASS. Godot integrated passive focused suite v2: 10/10 PASS (public test Session, JSON save/load, replay, content static mode binding, UI projection).
- Root integration report: latest formal-full-run functional diagnostic PASS in 331.88 seconds, but the original 120-second timeout gate failed. Godot fast v2 is 50/64, not a green full gate. Original-rule acceptance and real-window evidence remain unpassed; neither is closed by this data slice.
- Root executed npm check:all: initial 68/68 passed, unit stage failed 12/183; remaining chained checks were not executed. Clean detached baseline ea2f3030 also failed the identical 12/183, and normalized failing-name diff was empty. Evidence: /tmp/original-pirate-passive-baseline.Rspbv7/unit-baseline.log and unit-passive.log. These are existing pet/preview/workbook-source failures, not silently repaired or represented as a green full gate.

## commit_plan

One atomic passive data commit, no push yet. Lead codex-root reviewed the worker evidence and exporter/test changes and owns exact staging, staged-diff review, archival and commit. Godot integration is committed as 0ee137de with performance and real-window evidence gaps retained. Only this data contract slice is DONE; the overall original-pirate goal and three-build independent battle-log acceptance remain open.
