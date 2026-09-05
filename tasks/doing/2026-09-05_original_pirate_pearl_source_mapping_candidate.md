---
task_id: 2026-09-05_original_pirate_pearl_source_mapping_candidate
status: READY_TO_MERGE
owner: exact_top3_github_dataset
Goal: lock Pearl source identity, four-tier inheritance, both Ability entries and the empty base Aura directory as an isolated fail-closed mapping candidate
related_files: tools/export_original_pirate_pearl_source_mapping_candidate.py; tools/add_original_pirate_pearl_source_mapping_candidate.py; xlsx/candidates/original_pirate_pearl_source_mapping.xlsx; data/candidates/original_pirate/pearl_source_mapping/*; tests/original_pirate_pearl_source_mapping_candidate.test.cjs; this card
write_scopes: new isolated Pearl candidate files only; tasks/index.md explicitly excluded
exclusive_files: tools/export_original_pirate_pearl_source_mapping_candidate.py; tools/add_original_pirate_pearl_source_mapping_candidate.py; xlsx/candidates/original_pirate_pearl_source_mapping.xlsx; data/candidates/original_pirate/pearl_source_mapping/*; tests/original_pirate_pearl_source_mapping_candidate.test.cjs; this card
shared_file_policy: no formal master, formal CSV, content exporter, task index, or existing candidate is modified
validation: locked DB SHA and exact Pearl card/tier/Ability/Aura verification; deterministic workbook-to-CSV; mapping/provenance positive and mutation rejection tests; formal exporters unchanged
commit_plan: no commit or push in this delegated slice
---

# Pearl source mapping candidate

This task creates an isolated source projection only. It must remain
`originalRulesAccepted=false`; unknown initial cooldown progress, same-timestamp
ordering, nested event dispatch, enchantment execution and complete Run state are
fail-closed exclusions.

## Verified source projection

- Locked DB SHA-256: `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`.
- Pearl UUID `1312cf29-3dbb-446f-88b2-0d4999e68d78`; Vanessa, Small,
  Bronze, `Aquatic`, hidden `Shield`.
- The complete canonical card and its Tier, Ability, empty base Aura, and
  enchantment directories are independently SHA-locked. The enchantment directory
  is recorded only as excluded source identity, not executable behavior.
- Bronze declares 5000 ms cooldown, Multicast 1, Shield 10 and self-Charge
  1000 ms. Silver/Gold/Diamond inherit those fields and override Shield to
  20/40/80.
- Ability `0` is Low `CardFired` self-player Shield. Ability `1` is Low
  `ItemUsed`, observing another Aquatic card in `SelfHand`, then charging Pearl.
- Candidate mapping SHA-256:
  `0125a723133f49003f943b30a272d6946b80c590afecfad986a5d8a5bc8c982a`.

## Validation

- Actual locked DB verification and two consecutive idempotent workbook/CSV
  regeneration passes: PASS.
- Pearl candidate positive and mutation rejection test: 1/1 PASS. The test
  calls `add.verify_source` against the installed locked DB (overrideable with
  `THE_BAZAAR_GAMEDATA_DB`), compares both checked-in JSON artifacts exactly to
  `build_artifacts`, and locks the formal package SHA in an independent test
  constant rather than trusting only the exporter module constant.
- Pearl plus six neighboring source-mapping tests: 7/7 PASS.
- `export_master_to_csv.py --check --original-pirate-only`: PASS.
- `export_original_pirate_content.py --check`: PASS; formal v39 remains at
  23 items and excludes Pearl.
- Formal canonical package SHA-256 remains
  `8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366`.
- `tasks/index.md`, formal master/CSV/exporter and all existing candidates remain
  untouched. No commit or push was performed.
