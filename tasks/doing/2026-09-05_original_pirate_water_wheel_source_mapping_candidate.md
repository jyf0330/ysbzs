---
task_id: 2026-09-05_original_pirate_water_wheel_source_mapping_candidate
status: READY_TO_MERGE
owner: codex-lead
Goal: lock Water Wheel tier inheritance, both source abilities, targets, and priorities without changing formal content
related_files: tools/export_original_pirate_water_wheel_source_mapping_candidate.py; tools/add_original_pirate_water_wheel_source_mapping_candidate.py; xlsx/candidates/original_pirate_water_wheel_source_mapping.xlsx; data/candidates/original_pirate/water_wheel_source_mapping/*; tests/original_pirate_water_wheel_source_mapping_candidate.test.cjs; tasks/index.md; this card
write_scopes: direct, new Water Wheel candidate files only; tasks/index.md one new row
exclusive_files: tools/export_original_pirate_water_wheel_source_mapping_candidate.py; tools/add_original_pirate_water_wheel_source_mapping_candidate.py; xlsx/candidates/original_pirate_water_wheel_source_mapping.xlsx; data/candidates/original_pirate/water_wheel_source_mapping/*; tests/original_pirate_water_wheel_source_mapping_candidate.test.cjs
validation: locked DB verification; workbook/CSV idempotence; candidate unit test; formal exporter hash unchanged
commit_plan: one atomic data(original-pirate) commit after Lead validation
---

# Water Wheel source mapping candidate

- Lock the installed source DB SHA, Water Wheel identity, Silver-to-Diamond tier inheritance, both Ability structures, target filters, and High/Medium priorities.
- Preserve the distinction between `TTriggerOnCardFired` and `TTriggerOnItemUsed`.
- Do not infer Haste refresh/extension semantics, simultaneous-ready tie-breaking, enchantment behavior, or a complete Run state.
- Do not alter formal `data/csv` or generated gameplay content.

Acceptance remains `source_effect_mapping_only_not_complete_item`.

## Validation

- Installed `GameData.db` SHA and exact source identity/tier inheritance/Ability structures: PASS.
- Workbook to CSV deterministic generation and isolated JSON mapping: PASS.
- `tests/original_pirate_water_wheel_source_mapping_candidate.test.cjs`: 1/1 PASS.
- Formal exporter `--check`: PASS; runtime bundle hash remains `53b65f2034c8fa1b3a4e67361ec2be06f0d7cc5ab2631af089b6d0a3f462bd04`.
- Canonical mapping SHA-256: `d1b8812853d4eb182d781fef683bf8c89a384848196123f2e92560b25727c8de`.
