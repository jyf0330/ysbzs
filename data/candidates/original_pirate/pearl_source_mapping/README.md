# Pearl source mapping candidate

Generated only from the SHA-locked installed `GameData.db` and the isolated
candidate workbook. It locks Pearl's identity, all four tier records, both
base Ability records, the empty base Aura directory and the observed
enchantment directory identity.

This is static source mapping only. It does not establish initial cooldown
progress, same-timestamp ordering, nested `CardFired`/`ItemUsed` dispatch,
Charge-caused Ready re-entry, enchantment execution, a complete Run, or
exact-top-three acceptance. Every execution-timing question remains
fail-closed and `originalRulesAccepted=false`.

Regenerate and verify:

```bash
python3 tools/add_original_pirate_pearl_source_mapping_candidate.py \
  --db "$HOME/Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db"
python3 tools/export_original_pirate_pearl_source_mapping_candidate.py \
  --out-dir data/candidates/original_pirate/pearl_source_mapping
node --test tests/original_pirate_pearl_source_mapping_candidate.test.cjs
```
