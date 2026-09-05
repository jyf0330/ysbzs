---
task_id: 2026-09-05_original_pirate_burnacuda_source_mapping_candidate
status: READY_TO_MERGE
owner: water_wheel_formal_promotion
Goal: lock Burnacuda's complete source card directory and inherited quality attributes as an isolated fail-closed mapping candidate
related_files: tools/export_original_pirate_burnacuda_source_mapping_candidate.py; tools/add_original_pirate_burnacuda_source_mapping_candidate.py; xlsx/candidates/original_pirate_burnacuda_source_mapping.xlsx; data/candidates/original_pirate/burnacuda_source_mapping/*; tests/original_pirate_burnacuda_source_mapping_candidate.test.cjs; tasks/index.md; this card
write_scopes: new isolated Burnacuda candidate files only; tasks/index.md one active row
exclusive_files: tools/export_original_pirate_burnacuda_source_mapping_candidate.py; tools/add_original_pirate_burnacuda_source_mapping_candidate.py; xlsx/candidates/original_pirate_burnacuda_source_mapping.xlsx; data/candidates/original_pirate/burnacuda_source_mapping/*; tests/original_pirate_burnacuda_source_mapping_candidate.test.cjs; this card
shared_file_policy: no formal master, formal CSV, content exporter, or existing candidate is modified; Water Wheel formal lease remains untouched
validation: locked DB SHA and exact Burnacuda identity/tier/Ability/Aura verification; deterministic workbook-to-CSV; mapping/provenance positive and mutation rejection tests; formal exporter byte-for-byte unchanged
commit_plan: no commit or push in this delegated slice
---

# Burnacuda source mapping candidate

The locked source exposes two same-priority on-use abilities and four inherited
quality profiles, but it does not establish initial Ammo, empty-Ammo cooldown
behavior, same-priority cross-Ability execution order, original RNG selection,
or Haste reapplication. The deliverable therefore remains an isolated source
mapping candidate and keeps `originalRulesAccepted=false`.

## Verified source projection

- DB SHA-256: `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`.
- Identity: UUID `8f18974c-eef9-4e82-a2d2-7f4e7c67daf8`, Small,
  Bronze, Vanessa, `Aquatic/Friend`, hidden `Burn/Ammo/Haste`.
- All tiers declare Ability IDs `0,1`, no Aura IDs and Tooltip IDs `0,1`.
- Bronze declares cooldown 3000 ms, multicast 1, maximum Ammo 1, Burn 3,
  Haste 1000 ms and one Haste target. Silver/Gold/Diamond inherit those fields
  and override maximum Ammo to 2/3/4.
- Ability 0: `Medium / TTriggerOnCardFired`, apply Burn to the opponent.
- Ability 1: `Medium / TTriggerOnCardFired`, Haste one random card from
  `SelfNeighbors` with `CooldownMax > 0`.

## Validation

- Actual locked DB verification and idempotent workbook/CSV regeneration: PASS.
- Candidate mapping SHA-256:
  `fb92888d06ca60607b8f7f4644fc2a02123b354095787f8db50e90ed13fab577`.
- Candidate plus five neighboring source-mapping tests: 6/6 PASS.
- `export_master_to_csv.py --check --original-pirate-only`: PASS.
- `export_original_pirate_content.py --check`: PASS, formal package remains
  v39 with 23 items and does not contain Burnacuda.
- `git diff --check`: PASS.
