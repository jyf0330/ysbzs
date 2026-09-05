# Dive Weights source mapping candidate

This isolated candidate is generated from the SHA-locked installed
`GameData.db`. The source has no Bronze tier: Dive Weights starts at Silver and
contains Silver, Gold and Diamond only.

The candidate locks the full observed source directories:

- Ability `0`: `Medium / TTriggerOnCardFired`; Haste one random card in
  `SelfHand` with `CooldownMax > 0`. Self is not excluded. The duration is
  1000/2000/3000 ms at Silver/Gold/Diamond.
- Aura `1`: while the left adjacent card is Aquatic, add 1000 ms flat cooldown
  reduction to Dive Weights.
- Aura `2`: the equivalent right-adjacent Aquatic check and reduction.
- Aura `3`: add Dive Weights' current Ammo to its base Multicast.
- All three tiers reference Ability `0`, Auras `1,2,3`, Tooltip IDs `0,1,2`,
  base cooldown 8000 ms, base Multicast 1 and maximum Ammo 4.

The source does not establish initial Ammo, the zero-Ammo cooldown policy,
whether Ammo is sampled before or after spending for dynamic Multicast, how
multicast packets emit `CardFired`, original random-target sampling or empty
targets, dynamic Aura refresh timing, or Haste reapplication. These are
critical battle semantics, so this candidate is not formal executable content.

It does not claim enchantments, economy, acquisition, complete initial/Run
state, exact-top-three verification or original-game acceptance.
`originalRulesAccepted` remains false.
