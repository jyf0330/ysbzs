---
task_id: 2026-09-05_original_pirate_water_wheel_formal_reference
status: ACTIVE_IMPL
owner: codex-lead
Goal: promote the locked Water Wheel mapping into formal reference-battle-only content without making it player-acquirable
related_files: xlsx/ysbzs_master.xlsx; data/csv/44_bz_gameplay.csv; data/csv/46_bz_items.csv; data/csv/47_bz_item_effects.csv; data/csv/48_bz_item_skills.csv; data/csv/56_bz_source_snapshot.csv; data/csv/60_bz_ghost_snapshots.csv; data/csv/68_bz_item_source_bindings.csv; data/csv/71_bz_hero_skill_source_bindings.csv; data/csv/73_bz_source_effect_mappings.csv; tools/export_master_to_csv.py; tools/export_original_pirate_content.py; tools/add_original_pirate_water_wheel_formal_reference.py; tests/original_pirate_content_export.test.cjs; tests/original_pirate_source_ability_priority.test.cjs; tests/original_pirate_water_wheel_source_mapping_candidate.test.cjs; tests/original_pirate_water_wheel_formal_reference.test.cjs; tasks/index.md; this card
write_scopes: exact workbook/CSV/exporter/schema/test changes required for Water Wheel formal reference_battle_only; tasks/index.md one active row; downstream Godot generated content plus validator/compiler/kernel formal-reference consumers and one dedicated smoke test
exclusive_files: data/csv/73_bz_source_effect_mappings.csv; tools/add_original_pirate_water_wheel_formal_reference.py; tests/original_pirate_water_wheel_formal_reference.test.cjs; this card
validation: deterministic workbook-to-CSV check; strict exporter check; reference-only acquisition rejection tests; locked candidate mapping equality; legacy item compatibility
commit_plan: no commit or push in this delegated slice
---

# Water Wheel formal reference-only promotion

- Bind formal data to source data commit `21d57c2415690992631c6c4e1607e10ddcf06a24` and mapping SHA-256 `d1b8812853d4eb182d781fef683bf8c89a384848196123f2e92560b25727c8de`.
- Expose only `availability=reference_battle_only`; omit economy prices and reject shop, reward, upgrade, enchantment, progression, and new-run acquisition paths.
- Preserve both source abilities and their High/Medium ordering metadata. Repeat Haste remains fail closed because the source does not establish a reapplication rule.
- Every formal-reference Trace and acceptance statement keeps `originalRulesAccepted=false`; same-tick source/legacy ordering is not source-verified and therefore fails closed instead of falling back to numeric priority.
- This is not a claim that Water Wheel is player-acquirable, naturally reachable in a Run, fully reconstructed, or verified to match the original game's complete priority rules.
