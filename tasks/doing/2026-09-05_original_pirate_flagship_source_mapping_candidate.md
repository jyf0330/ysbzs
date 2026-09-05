---
task_id: 2026-09-05_original_pirate_flagship_source_mapping_candidate
status: READY_TO_MERGE
owner: water_wheel_formal_promotion
Goal: lock Flagship tiers, Ability 0, Auras 1..5 and Shielded e1/e2 as an isolated fail-closed source candidate
related_files: tools/export_original_pirate_flagship_source_mapping_candidate.py; tools/add_original_pirate_flagship_source_mapping_candidate.py; xlsx/candidates/original_pirate_flagship_source_mapping.xlsx; data/candidates/original_pirate/flagship_source_mapping/*; tests/original_pirate_flagship_source_mapping_candidate.test.cjs; this card
write_scopes: new isolated Flagship candidate files only
exclusive_files: tools/export_original_pirate_flagship_source_mapping_candidate.py; tools/add_original_pirate_flagship_source_mapping_candidate.py; xlsx/candidates/original_pirate_flagship_source_mapping.xlsx; data/candidates/original_pirate/flagship_source_mapping/*; tests/original_pirate_flagship_source_mapping_candidate.test.cjs; this card
shared_file_policy: no tasks/index, formal master/CSV/exporter, or other candidate is modified
validation: locked DB; deterministic workbook/CSV; strict duplicate-key artifact validation; persisted JSON equality; independent formal SHA
commit_plan: no commit or push in this delegated slice
---

# Flagship source mapping candidate

Static source structure only; `originalRulesAccepted=false`. Rank 3 Diamond
Shielded is task membership context, not popularity or complete-build proof.

Aura 1 counts Property and is `HandOnly`; Auras 2..5 count Tool, Friend,
AmmoMax-positive and Relic respectively and are `HandAndStash`. All use SelfHand
with `ExcludeSelf=false`. Dynamic activation, stacking, refresh and stash-to-board
contribution remain unknown. Multicast event packaging/order, Shielded e1 versus
base Damage same-Medium order and null ReferenceValue binding are also fail closed.

## Validation

- Actual locked DB verifier and isolated workbook/CSV/JSON generation: PASS.
- Recursive duplicate-key decoder rejects escaped duplicate keys at the artifact
  boundary; recursive type-and-value equality also rejects `false/0`: PASS.
- Persisted mapping/provenance equal deterministic builder output: PASS.
- Dedicated source, mutation and formal-isolation test: 1/1 PASS.
- Formal master and original-pirate package checks: PASS; canonical package remains
  `8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366`
  with 23 items and excludes Flagship from runtime content.
- Candidate mapping SHA-256:
  `b10ecf5910b240ac4cfd06322bd806af164252542ca50e13fc16f90bbc0e5a29`.
- No commit or push was performed.
