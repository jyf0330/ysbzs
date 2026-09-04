# Poison one-second cadence correction

task_id: 2026-09-04_original_pirate_poison_cadence
status: DONE
owner: pirate_top_three_source_audit
merge_owner: codex-root
worktree: /Users/ywh/.codex/worktrees/original-pirate-passive-content/ysbzs

## Goal

Correct Poison pulse interval from 10 to 20 ticks at 50 ms/tick, based on the locked DB tooltip's once-per-second statement. Poison contract v2 -> v3, rules v31 -> v32, source/content/bundle revision v32 -> v33; content35/runtime33/catalog25 shapes unchanged. No other Poison strategy is claimed source-verified.

## related_files / write_scopes

- xlsx/ysbzs_master.xlsx: BZ_GAMEPLAY poison contract/interval and version fields, BZ_SOURCE_SNAPSHOT revision and snapshot_id, BZ_GHOST_SNAPSHOTS content revision.
- data/csv/44_bz_gameplay.csv, 56_bz_source_snapshot.csv, 60_bz_ghost_snapshots.csv: matching generated slices.
- tools/export_original_pirate_content.py: exact Poison contract/interval and rules version.
- tests/original_pirate_content_export.test.cjs, tests/original_pirate_csv_subset.test.cjs: current contract expectations and legacy cadence rejection.
- data/csv/README_csv_source.md, tasks/index.md and this card: cadence-only evidence boundaries.

## exclusive_files

Workbook and original-pirate exporter in this worktree only, assigned by root. Preserve identity member sheet/67 and existing pycache; no old cooldownAura WIP or Godot changes.

## validation

TDD focused cadence expectation; two data suites plus passive regression; source and forged-package legacy cadence rejection; scoped master roundtrip; normal exporter and deterministic temporary candidates; baseline field comparison.

## commit_plan

Worker stopped READY_TO_MERGE. Lead owns scoped integration, archive and commit; this is cadence-only delivery, not original-pirate final acceptance.

## Evidence

- TDD RED: OPC02M failed against the new rules identity before implementation. GREEN: content exporter + CSV subset + passive suites 38/38 PASS, 0 skipped, 253.39 seconds. Four additional vectors reject source/package Poison v2 and legacy 10-tick interval independently.
- Scoped original-pirate workbook check, reference-source workbook check, normal content exporter `--check`: PASS. Full legacy master export was not rerun here; its existing pal_001.action gap is unchanged and no full master PASS is claimed.
- Compared current XLSX to HEAD: only BZ_GAMEPLAY, BZ_SOURCE_SNAPSHOT and BZ_GHOST_SNAPSHOTS changed; all other sheet values/order including the 140-member identity sheet remain unchanged. Three CSV changes are restricted to Poison contract/interval and version identities. Original snapshot_id is now snapshot_original_pirate_bootstrap_v33; 66/67 are untouched.
- Compared old passive candidate to new candidate: all 22 item definitions identical; battleRules differ only in Poison contractId and pulseIntervalTicks. Other strategies remain unverified against original rules.
- Normal candidate export: `/tmp/original-pirate-poison-cadence.5QrMKb/content.json` and `display.json`; independent repeat export JSON identical. Runtime bundle hash `d305f6166094567bd54c5a0242dcfecd1feb6bcc8e236fa577bf7f1d9ac1c67a`.
- `git diff --check` PASS. No Godot writes/runs, staging, archive, commit or push. Existing two pycache files are excluded.
- Reproducible interpreter: `/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`; Node tests used PATH with that Python bin followed by `/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin`, and PYTHONDONTWRITEBYTECODE=1.
- Lead independently reran OPC02M (1/1 PASS) and compared both generated JSON files byte-for-byte with Godot's formal package. Godot cadence diagnostics 11/11, Crit/cleanse interactions 2/2 PASS. Final boundary-batched kernel/Poison Session 2/2 PASS at 3.63/64.83 seconds under original 45/90-second limits. No authority validation or assertions were relaxed. Cleanse timing and final three-build/source/visual acceptance remain open.
- Lead full `npm run check:all`: base 68/68 PASS, unit 171/183 with 12 failures, so later chained checks did not run. Failures include existing element-slot, quality and full master-export paths; this is not an all-green release. Staged semantic comparison confirms only the declared three workbook sheets changed (36/2/20 cells), only cadence/version CSV fields changed, and all 22 item definitions are unchanged. No unrelated failures were edited into this delivery.
