---
task_id: 2026-09-05_original_pirate_diving_helmet_source_mapping_candidate
status: READY_TO_MERGE
owner: water_wheel_formal_promotion
Goal: lock Diving Helmet source identity, Gold/Diamond inheritance, Ability 0 and Aura 2 as an isolated fail-closed mapping candidate
related_files: tools/export_original_pirate_diving_helmet_source_mapping_candidate.py; tools/add_original_pirate_diving_helmet_source_mapping_candidate.py; xlsx/candidates/original_pirate_diving_helmet_source_mapping.xlsx; data/candidates/original_pirate/diving_helmet_source_mapping/*; tests/original_pirate_diving_helmet_source_mapping_candidate.test.cjs; this card
write_scopes: new isolated Diving Helmet candidate files only
exclusive_files: tools/export_original_pirate_diving_helmet_source_mapping_candidate.py; tools/add_original_pirate_diving_helmet_source_mapping_candidate.py; xlsx/candidates/original_pirate_diving_helmet_source_mapping.xlsx; data/candidates/original_pirate/diving_helmet_source_mapping/*; tests/original_pirate_diving_helmet_source_mapping_candidate.test.cjs; this card
shared_file_policy: no tasks/index, formal master, formal CSV, formal exporter, or other item candidate is modified
validation: locked DB SHA and exact Diving Helmet identity/tier/Ability/Aura verification; deterministic workbook-to-CSV; mapping/provenance positive and mutation rejection tests; formal exporter byte-for-byte unchanged
commit_plan: no commit or push in this delegated slice
---

# Diving Helmet source mapping candidate

Diving Helmet is a passive listener item with no source cooldown attributes.
Its combat-only Aura dynamically adds `Aquatic` to adjacent items, while its
Medium listener shields after any friendly Aquatic item use. Dynamic tag Aura
refresh/removal and listener sampling order are not source-closed, so this
deliverable remains isolated and keeps `originalRulesAccepted=false`.

## Verified source projection

- DB SHA-256: `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`.
- Identity: UUID `fb6e6b16-d6d0-4493-ac3f-46c26afe6c51`, Medium,
  Gold, Vanessa, `Aquatic/Tool/Apparel`, hidden `Shield`.
- Source tiers are exactly Gold and Diamond; both reference Ability `0`, Aura
  `2` and Tooltip IDs `0,1`, with ShieldApplyAmount 50/100.
- Ability `0`: `Medium / TTriggerOnItemUsed`; a friendly `SelfHand` Aquatic
  item use shields the owner. The source subject selector does not exclude self.
- Aura `2`: `HandAndStash / CombatOnly`; add `Aquatic` to both adjacent cards.

## Validation

- Actual locked DB verification and idempotent workbook/three-CSV regeneration: PASS.
- The dedicated test calls `add.verify_source` against the installed locked DB
  (overrideable with `THE_BAZAAR_GAMEDATA_DB`), requires both checked-in JSON
  artifacts to equal `build_artifacts`, and locks the formal package SHA in an
  independent test literal rather than trusting only the exporter constant.
- Candidate mapping SHA-256:
  `5d3c6a6464afc328c588cce7202278f9157a2183b9059758452a5945b9fcdba1`.
- Candidate plus seven neighboring source-mapping tests: 8/8 PASS.
- `export_master_to_csv.py --check --original-pirate-only`: PASS.
- `export_original_pirate_content.py --check`: PASS, formal package remains
  v39 with 23 items and does not contain Diving Helmet.
- `git diff --check`: PASS.
