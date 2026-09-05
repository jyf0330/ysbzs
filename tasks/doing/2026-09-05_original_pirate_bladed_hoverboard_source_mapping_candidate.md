---
task_id: 2026-09-05_original_pirate_bladed_hoverboard_source_mapping_candidate
status: READY_TO_MERGE
owner: original_priority_trace_audit
Goal: lock Bladed Hoverboard base tiers and Toxic overlay as an isolated fail-closed source mapping for the requested Rank 2 Gold Toxic profile
related_files:
  - xlsx/candidates/original_pirate_bladed_hoverboard_source_mapping.xlsx
  - data/candidates/original_pirate/bladed_hoverboard_source_mapping/README.md
  - data/candidates/original_pirate/bladed_hoverboard_source_mapping/source_profiles.csv
  - data/candidates/original_pirate/bladed_hoverboard_source_mapping/source-effect-mapping.json
  - data/candidates/original_pirate/bladed_hoverboard_source_mapping/provenance.json
  - tools/add_original_pirate_bladed_hoverboard_source_mapping_candidate.py
  - tools/export_original_pirate_bladed_hoverboard_source_mapping_candidate.py
  - tests/original_pirate_bladed_hoverboard_source_mapping_candidate.test.cjs
  - tasks/doing/2026-09-05_original_pirate_bladed_hoverboard_source_mapping_candidate.md
write_scopes: direct; only the new files listed above
exclusive_files: none
validation: locked DB verifier; candidate check; targeted Node test; independent formal exporter SHA
commit_plan: no commit or push in this delegated slice
---

# Bladed Hoverboard source mapping candidate

This candidate records the requested Rank 2 Gold Toxic profile without claiming
that popularity rank as source data. It does not infer original runtime priority,
same-tier order, nested timing or RNG behavior, and cannot enter formal content.

## Validation

- Locked installed DB SHA plus identity/tier/ability/base-Aura/Toxic subtree hashes: PASS.
- Workbook -> CSV -> rebuilt mapping/provenance equality, forged acceptance rejection,
  and recursive escaped/nested duplicate-key rejection: PASS.
- Artifact equality is recursive and type-strict; dictionary-key order, list order,
  `false -> 0`, `1 -> true`, and `2 -> 2.0` substitutions are rejected: PASS.
- `node --test tests/original_pirate_bladed_hoverboard_source_mapping_candidate.test.cjs`: PASS (1/1, bundled Python PATH).
- `python3 tools/export_original_pirate_bladed_hoverboard_source_mapping_candidate.py --check`: PASS.
- `python3 tools/export_original_pirate_content.py --check`: PASS; the test independently locks the formal SHA and excludes the candidate from formal items and runtime source-effect mappings.
- Commit/push: intentionally not performed by delegated instruction.
