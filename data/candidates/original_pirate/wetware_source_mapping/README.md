# Wetware source mapping candidate

This directory is generated only from the SHA-locked `GameData.db` and the
isolated Wetware workbook. It records the complete Silver/Gold/Diamond tier
inheritance, both base Abilities, the empty base Aura directory, and the
task-locked Rank 1/2 Diamond unenchanted appearances.

Ability `1` contains a dynamic `Custom_0` reference, random Weapon targeting and
an until-end-of-combat modifier triggered by a performed-Shield event. Runtime
evaluation, selection, stacking, expiry, reentrancy and event order are not
accepted. This candidate remains isolated with `originalRulesAccepted=false`.

```bash
python3 tools/add_original_pirate_wetware_source_mapping_candidate.py \
  --db "/absolute/path/to/GameData.db"
python3 tools/export_original_pirate_wetware_source_mapping_candidate.py --check
node --test tests/original_pirate_wetware_source_mapping_candidate.test.cjs
```
