# Rifle source-effect mapping candidate

This directory is an isolated `BZ_ITEM_EFFECTS`-shaped projection for the locked
Rifle source object. It records only the two source Ability identities,
priorities, mapped trigger/target/operation, and the four verified tier values.

It is not a complete item, is not consumed by the production CSV exporter, and
must not be passed as an `ysbzs.original-pirate-content.v1` package. Initial Ammo,
base Crit chance, enchantments, economy, acquisition and full Run state remain
unverified and are intentionally absent.

Regenerate with:

```bash
python3 tools/add_original_pirate_rifle_source_mapping_candidate.py \
  --db /absolute/path/to/GameData.db
```
