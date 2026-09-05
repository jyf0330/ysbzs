# Burnacuda source mapping candidate

This isolated candidate is generated from the SHA-locked installed
`GameData.db`. It locks Burnacuda's Small/Bronze identity, all four tier
inheritance steps, the ordered Ability directory `0,1`, the empty Aura
directory, and both `Medium / TTriggerOnCardFired` source actions:

- Ability `0` applies 3 Burn to the opponent.
- Ability `1` Hastes one random adjacent friendly card whose `CooldownMax` is
  greater than zero for 1000 ms (20 project ticks).

The source card records `AmmoMax=1/2/3/4`, but does not establish initial Ammo,
the zero-Ammo cooldown policy, Ammo-spend phase, execution order between the two
same-priority Abilities, original random-target sampling, empty random-target
behavior, Haste reapplication, or complete Burn resolution. Those are critical
battle semantics, so this candidate is not promoted into formal content.

It is not a complete Burnacuda, a natural Run item, a verified exact-top-three
build member, or original-game rules acceptance. `originalRulesAccepted`
remains false; enchantments, economy, acquisition, complete initial state and
complete Run state are excluded.

Regenerate with the bundled Python runtime that supplies `openpyxl`:

```sh
python3 tools/add_original_pirate_burnacuda_source_mapping_candidate.py \
  --db /absolute/path/to/GameData.db
python3 tools/export_original_pirate_burnacuda_source_mapping_candidate.py \
  --out-dir data/candidates/original_pirate/burnacuda_source_mapping
```
