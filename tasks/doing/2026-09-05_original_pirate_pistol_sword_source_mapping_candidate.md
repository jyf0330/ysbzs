---
task_id: 2026-09-05_original_pirate_pistol_sword_source_mapping_candidate
status: READY_TO_MERGE
owner: exact_top3_github_dataset
Goal: lock Pistol Sword source identity, Gold/Diamond inheritance, both Ability entries and empty base Aura directory as an isolated fail-closed mapping candidate
related_files: tools/export_original_pirate_pistol_sword_source_mapping_candidate.py; tools/add_original_pirate_pistol_sword_source_mapping_candidate.py; xlsx/candidates/original_pirate_pistol_sword_source_mapping.xlsx; data/candidates/original_pirate/pistol_sword_source_mapping/*; tests/original_pirate_pistol_sword_source_mapping_candidate.test.cjs; this card
write_scopes: new isolated Pistol Sword candidate files only; tasks/index.md explicitly excluded
exclusive_files: tools/export_original_pirate_pistol_sword_source_mapping_candidate.py; tools/add_original_pirate_pistol_sword_source_mapping_candidate.py; xlsx/candidates/original_pirate_pistol_sword_source_mapping.xlsx; data/candidates/original_pirate/pistol_sword_source_mapping/*; tests/original_pirate_pistol_sword_source_mapping_candidate.test.cjs; this card
shared_file_policy: no formal master, formal CSV, content exporter, task index, or existing candidate is modified
validation: actual locked DB verifier; deterministic workbook-to-CSV; checked-in mapping/provenance exact equality; independent formal package SHA; mutation rejection
commit_plan: no commit or push in this delegated slice
---

# Pistol Sword source mapping candidate

This is an isolated source projection only. Rank 1 selects Diamond with literal
enchantment `none`; that membership fact is not promoted into a popularity,
complete-build, or executable original-rules claim.

## Verified source projection

- Locked DB SHA-256: `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`.
- UUID `65527be1-b100-4a4c-98d1-4f8975368b5b`; Vanessa, Medium, Gold,
  `Weapon`, hidden `Damage/Ammo`.
- Full canonical card, Tier, Ability, empty base Aura and enchantment directories
  are SHA-locked. Enchantment execution is excluded.
- Gold declares CooldownMax 5000, Multicast 1, AmmoMax 3, DamageAmount 15;
  Diamond inherits the first three and overrides DamageAmount to 30.
- Ability `0`: Medium `CardFired`, damage opponent. Ability `1`: Medium
  `ItemUsed`, observes any `SelfHand` card with AmmoMax greater than zero,
  includes self, and damages the opponent.
- All unresolved initialization, Ammo consumption, Crit, event nesting,
  reentrancy, Multicast and same-priority ordering semantics fail closed.

## Validation

- Two consecutive source verification/workbook/CSV/artifact generations: PASS;
  mapping SHA-256 is
  `2adc381455c147424277641a04842fecb78a0f5048772ec390958f84d3dc1229`.
- Actual source DB verification is called by the dedicated test; path is
  overrideable with `THE_BAZAAR_GAMEDATA_DB`.
- Checked-in mapping/provenance must equal `build_artifacts` exactly.
- Formal package SHA is independently locked in the test and Pistol Sword must
  remain absent from formal items/source mappings.
- Dedicated test: 1/1 PASS.
- All isolated source-mapping candidate tests: 12/12 PASS.
- `export_master_to_csv.py --check --original-pirate-only`: PASS.
- `export_original_pirate_content.py --check`: PASS; formal v39 remains at 23
  items with canonical SHA-256
  `8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366`.
- No formal file, other candidate, or `tasks/index.md` is modified.
