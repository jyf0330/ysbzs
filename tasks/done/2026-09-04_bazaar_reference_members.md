# Bazaar build-bound item identity members

task_id: 2026-09-04_bazaar_reference_members
status: DONE
owner: pirate_top_three_source_audit
merge_owner: codex-root
worktree: /Users/ywh/.codex/worktrees/original-pirate-passive-content/ysbzs

## Goal

Add the complete 140-item UUID membership relation for the existing locked Vanessa build through XLSX -> CSV. Reference-only identity evidence; executable mapping coverage remains zero. No rule payload, source text, art, review/PASS fields or execution bindings.

## related_files / write_scopes

- xlsx/ysbzs_master.xlsx: new BAZAAR_REFERENCE_MEMBERS sheet only.
- data/csv/67_bazaar_reference_members.csv: three-column generated membership relation.
- tools/export_master_to_csv.py: member schema, validation and normal/reference-scoped export wiring.
- tests/bazaar_reference_members.test.cjs: narrow identity membership tests.
- tests/csv_source.test.cjs: CSV08B visible-sheet list adds the new identity domain only.
- data/csv/README_csv_source.md, tasks/index.md and this card: this slice documentation.

## exclusive_files

Workbook and master exporter in this isolated worktree; assigned exclusively by root. Preserve old cooldownAura worktree and existing pycache. No Godot writes or runs.

## validation

TDD member negative vectors, raw DB SHA and complete ID-set hash, XLSX/CSV roundtrip, normal/reference-scoped generation determinism, existing source-lock tests and original-pirate export check.

## commit_plan

Lead reviewed the complete code/test diff and owns exact staging, archival, commit and push for this identity-only slice. Original-rule execution and three-build battle-log acceptance remain open.

## Evidence

- Root independent rerun: membership 1/1 PASS (7.02 seconds), existing source tests 3/3 PASS. Initial default-python invocation stopped before assertions with missing openpyxl; rerun used existing `/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin` prepended to PATH and bundled Node, with no installation or test changes.
- TDD RED: new narrow test failed with `member validation missing` before implementation.
- Read-only SQLite extraction selected Type Item, Heroes Vanessa, SpawningEligibility Always. Raw DB SHA `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9` and 140 unique sorted UUID set SHA `b18e167f48956a4ef63dcb4a2ba265c05cc7c6aac87739a737c45acea35af7bd` matched existing locks before workbook authoring. No raw payload was printed or saved.
- Narrow membership test PASS: missing/extra/duplicate/invalid UUID, wrong type/snapshot, replaced UUID, forged source lock, both workbook entry-point negatives, read-only validator and reordered workbook deterministic output.
- Existing CSV02F/CSV02H/CSV08B source checks PASS 3/3; only the required new-sheet name changed in CSV08B.
- Reference-scoped master check, original-pirate-scoped master check and original-pirate content exporter check PASS. The 22-item executable package remains v35/revision32; this slice adds zero executable mappings and no acceptance status.
- Normal full master `--check` still FAILS at the existing `pet pal_001 missing required base stat action`. Source membership validation runs before that failure, including forged-vector rejection. No pet values or assertions were changed; no full-export PASS is claimed.
- Baseline workbook comparison: all pre-existing sheets retain identical values and order; only BAZAAR_REFERENCE_MEMBERS was appended. Existing 34/56/66 source CSV files remain unchanged.
- `git diff --check` PASS. Validator does not mutate caller input; only generated output projections sort a new list.
- Worker performed no Godot run, staging, archival, commit or push. Root owns final Git closeout. Existing original-pirate pycache and root-test-generated master-exporter pycache are excluded from the commit.
