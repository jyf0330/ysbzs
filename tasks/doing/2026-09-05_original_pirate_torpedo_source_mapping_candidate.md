---
task_id: 2026-09-05_original_pirate_torpedo_source_mapping_candidate
status: READY_TO_MERGE
owner: water_wheel_formal_promotion
Goal: lock Torpedo tiers, three base Abilities, empty Aura directory and Radiant overlay as an isolated fail-closed source candidate
related_files: tools/export_original_pirate_torpedo_source_mapping_candidate.py; tools/add_original_pirate_torpedo_source_mapping_candidate.py; xlsx/candidates/original_pirate_torpedo_source_mapping.xlsx; data/candidates/original_pirate/torpedo_source_mapping/*; tests/original_pirate_torpedo_source_mapping_candidate.test.cjs; this card
write_scopes: new isolated Torpedo candidate files only
exclusive_files: tools/export_original_pirate_torpedo_source_mapping_candidate.py; tools/add_original_pirate_torpedo_source_mapping_candidate.py; xlsx/candidates/original_pirate_torpedo_source_mapping.xlsx; data/candidates/original_pirate/torpedo_source_mapping/*; tests/original_pirate_torpedo_source_mapping_candidate.test.cjs; this card
shared_file_policy: no tasks/index, formal master/CSV/exporter, or other candidate is modified
validation: actual locked DB verifier; deterministic workbook/CSV; checked JSON equality; independent formal SHA and runtime exclusion
commit_plan: no commit or push in this delegated slice
---

# Torpedo source mapping candidate

Static source structure only; `originalRulesAccepted=false`. Rank 3 is recorded
as Diamond Radiant task context, not popularity or complete-build proof.

Ability 1 observes another Aquatic OR AmmoMax-positive item. Ability 2 requires
Large AND that same OR group. Both are Medium and both source Actions add
`Custom_0` to Torpedo Damage until combat ends; simultaneous stacking, nested
events and evaluation timing remain unknown. The source description for Ability
2 says Reload, conflicting with its structured Action, so execution is fail closed.

Base DamageAmount remains 100 at every quality; `Custom_0` is separately
40/80/160. Radiant's Slow/Freeze reduction and Destroy immunity are source-locked,
but their runtime behavior is not accepted.

## Validation

- Actual locked DB verifier and idempotent workbook/CSV/JSON generation: PASS.
- Checked-in mapping/provenance equal deterministic builder output: PASS.
- Recursive duplicate-key artifact decoder rejects escaped top-level
  `originalRulesAccepted` and nested conflict `resolution` / `structuredActionObserved`: PASS.
- Recursive type-and-value equality rejects JSON equivalence confusions
  `false/0`, `1/true` and `2/2.0`: PASS.
- Dedicated source, mutation and formal-isolation test: 1/1 PASS.
- Formal master CSV and original-pirate package checks: PASS; canonical package
  remains `8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366`
  with 23 items and excludes Torpedo from runtime content.
- Candidate mapping SHA-256:
  `f5c534f3dbd7d76ee6eee5d6256e29ade53f43b3ccf46994ae13ab826017a2ed`.
- No commit or push was performed.
