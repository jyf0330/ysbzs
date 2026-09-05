---
task_id: 2026-09-05_original_pirate_revolver_source_mapping_candidate
status: doing
owner: codex
scope: source-locked Revolver Ability 0 mapping candidate
related_files: tools/export_original_pirate_revolver_source_mapping_candidate.py; tools/add_original_pirate_revolver_source_mapping_candidate.py; xlsx/candidates/original_pirate_revolver_source_mapping.xlsx; data/candidates/original_pirate/revolver_source_mapping/*; tests/original_pirate_revolver_source_mapping_candidate.test.cjs; tasks/index.md; this card
---

# Revolver source mapping candidate

- Lock DB SHA, UUID, identity, tier inheritance, Ability 0 and six-tier priority.
- Keep initial Ammo, base Crit, damage Crit eligibility and empty-Ammo cooldown unknown.
- Do not infer CardFired versus ItemUsed phase ordering or same-tier tie-break.
- Do not alter formal `data/csv` or generated gameplay content.

Acceptance remains `source_effect_mapping_only_not_complete_item`.

## Validation

- Locked DB verification and workbook/CSV idempotence: PASS.
- Revolver plus Rifle, Powder Horn and Run C listener source candidates: 4/4 PASS.
- Formal master exporter check: PASS, runtime bundle hash unchanged.
- Canonical Revolver mapping SHA-256:
  `11d3907417d99552492519c4c3aed5f8c98673953af5da8b6b8fb151cb7c7f37`.
