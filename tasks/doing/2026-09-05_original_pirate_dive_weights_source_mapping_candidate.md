---
task_id: 2026-09-05_original_pirate_dive_weights_source_mapping_candidate
status: READY_TO_MERGE
owner: water_wheel_formal_promotion
Goal: lock Dive Weights source identity, three quality inheritance profiles, Ability and Aura directories as an isolated fail-closed mapping candidate
related_files: tools/export_original_pirate_dive_weights_source_mapping_candidate.py; tools/add_original_pirate_dive_weights_source_mapping_candidate.py; xlsx/candidates/original_pirate_dive_weights_source_mapping.xlsx; data/candidates/original_pirate/dive_weights_source_mapping/*; tests/original_pirate_dive_weights_source_mapping_candidate.test.cjs; tasks/index.md; this card
write_scopes: new isolated Dive Weights candidate files only; tasks/index.md one active row
exclusive_files: tools/export_original_pirate_dive_weights_source_mapping_candidate.py; tools/add_original_pirate_dive_weights_source_mapping_candidate.py; xlsx/candidates/original_pirate_dive_weights_source_mapping.xlsx; data/candidates/original_pirate/dive_weights_source_mapping/*; tests/original_pirate_dive_weights_source_mapping_candidate.test.cjs; this card
shared_file_policy: no formal master, formal CSV, content exporter, or existing candidate is modified
validation: locked DB SHA and exact Dive Weights identity/tier/Ability/Aura verification; deterministic workbook-to-CSV; mapping/provenance positive and mutation rejection tests; formal exporter byte-for-byte unchanged
commit_plan: no commit or push in this delegated slice
---

# Dive Weights source mapping candidate

The locked source contains only Silver, Gold and Diamond tiers. It exposes one
active Ability and three Auras, including dynamic `Multicast += current Ammo`.
Initial Ammo, Ammo/multicast snapshot and spending order, original random-target
sampling, empty-target behavior and Haste reapplication are not source-closed.
The deliverable therefore remains isolated and keeps
`originalRulesAccepted=false`.

## Verified source projection

- DB SHA-256: `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`.
- Identity: UUID `ce6769db-f9a6-44a8-b915-afec472a2ea3`, Small,
  Silver, Vanessa, `Aquatic/Tool/Apparel`, hidden `Haste/Ammo`.
- Source tiers are exactly Silver/Gold/Diamond; there is no Bronze tier.
- All tiers reference Ability `0`, Auras `1,2,3` and Tooltips `0,1,2`.
- Silver declares cooldown 8000 ms, multicast 1, maximum Ammo 4, Haste target
  1, Haste 1000 ms and Custom_0 1000 ms. Gold/Diamond inherit these fields and
  override Haste to 2000/3000 ms.
- Ability `0`: `Medium / TTriggerOnCardFired`, Haste one random `SelfHand`
  active-clock card; self is not excluded.
- Auras `1/2`: left/right adjacent Aquatic prerequisite adds 1000 ms
  `FlatCooldownReduction`. Aura `3`: adds current Ammo to Multicast.

## Validation

- Actual locked DB verification and idempotent workbook/three-CSV regeneration: PASS.
- Candidate mapping SHA-256:
  `de767b5a8319620fdbe740752358a3eb167ef3af49b80682500f0559b2c998fd`.
- Candidate plus six neighboring source-mapping tests: 7/7 PASS.
- `export_master_to_csv.py --check --original-pirate-only`: PASS.
- `export_original_pirate_content.py --check`: PASS, formal package remains
  v39 with 23 items and does not contain Dive Weights.
- `git diff --check`: PASS.
