# Diving Helmet source mapping candidate

This isolated candidate is generated from the SHA-locked installed
`GameData.db`. Diving Helmet is Medium, starts at Gold, and has only Gold and
Diamond source tiers. Neither tier declares a cooldown or Ammo attribute.

The candidate locks the full observed source directories:

- Ability `0`: `Medium / TTriggerOnItemUsed`; when a friendly card in
  `SelfHand` with the `Aquatic` tag is used, shield the owner for 50/100 at
  Gold/Diamond. The source selector does not exclude self.
- Aura `2`: while active in hand or stash and in combat, add `Aquatic` to both
  positional neighbors; the origin is excluded.
- Both tiers reference Ability `0`, Aura `2` and Tooltip IDs `0,1`.

The source does not establish dynamic tag-Aura application/removal timing,
overlapping Aura reference counting, whether an item-use event samples tags
before or after same-tick changes, adjacency movement snapshots, disabled /
destroyed / transformed Aura lifecycle, cross-item Medium ordering, or complete
shield resolution order. These are critical battle semantics, so this mapping
is not formal executable content.

It does not claim enchantments, economy, acquisition, complete initial/Run
state, exact-top-three verification or original-game acceptance.
`originalRulesAccepted` remains false.
