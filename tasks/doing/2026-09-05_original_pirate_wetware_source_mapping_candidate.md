---
task_id: 2026-09-05_original_pirate_wetware_source_mapping_candidate
status: READY_TO_MERGE
owner: water_wheel_formal_promotion
Goal: lock Wetware identity, three-tier inheritance, Ability 0/1 and empty Aura directory as an isolated fail-closed mapping candidate
related_files: tools/export_original_pirate_wetware_source_mapping_candidate.py; tools/add_original_pirate_wetware_source_mapping_candidate.py; xlsx/candidates/original_pirate_wetware_source_mapping.xlsx; data/candidates/original_pirate/wetware_source_mapping/*; tests/original_pirate_wetware_source_mapping_candidate.test.cjs; this card
write_scopes: new isolated Wetware candidate files only
exclusive_files: tools/export_original_pirate_wetware_source_mapping_candidate.py; tools/add_original_pirate_wetware_source_mapping_candidate.py; xlsx/candidates/original_pirate_wetware_source_mapping.xlsx; data/candidates/original_pirate/wetware_source_mapping/*; tests/original_pirate_wetware_source_mapping_candidate.test.cjs; this card
shared_file_policy: no tasks/index, formal master, formal CSV, formal exporter, or other candidate is modified
validation: locked DB verifier; deterministic workbook-to-CSV; checked JSON equality; independent formal package SHA and exclusion assertions
commit_plan: no commit or push in this delegated slice
---

# Wetware source mapping candidate

This slice records static source structure only. Wetware's second Ability reads
`Custom_0` dynamically, selects a random Weapon and applies an until-end-of-combat
Damage modification after a performed-Shield event. Those runtime semantics and
their event ordering remain unverified, so `originalRulesAccepted=false`.

## Locked scope

- UUID `dd913d79-7509-4c8a-b68a-5bf364dc521e`; Vanessa Medium item, starting at Silver.
- Silver/Gold/Diamond inheritance; Shield 20/40/80 and `Custom_0` 15/25/35.
- Complete base Ability directory `0,1` and empty base Aura directory.
- Task-locked reference appearances: Rank 1 and Rank 2 are both Diamond and unenchanted (`None`).
- Enchantment directory/execution, dynamic evaluation, random targeting, event timing,
  reentrancy, stacking and expiry remain excluded.

## Validation

- Actual locked DB verification and isolated workbook/four-CSV/JSON generation: PASS.
- Checked-in JSON artifacts equal the deterministic builder output: PASS.
- Dedicated positive, mutation-rejection and formal-isolation test: 1/1 PASS.
- Formal master CSV and original-pirate package checks: PASS; canonical package
  remains `8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366`
  with 23 items and excludes Wetware from runtime content.
- `git diff --check`: PASS. No commit or push was performed.
