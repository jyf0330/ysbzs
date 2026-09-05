# Pistol Sword source mapping candidate

This isolated candidate is derived from the SHA-locked installed
`GameData.db`. Pistol Sword is a Medium Vanessa Weapon with hidden Damage and
Ammo tags. It has Gold and Diamond source tiers only.

- Gold declares 5000 ms cooldown, Multicast 1, AmmoMax 3 and Damage 15.
- Diamond inherits the cooldown, Multicast and AmmoMax, and overrides Damage to
  30.
- Ability `0` is a Medium `CardFired` action that damages the opponent.
- Ability `1` is a Medium `ItemUsed` listener over `SelfHand` cards whose
  `AmmoMax` is greater than zero. `ExcludeSelf=false`, and it damages the
  opponent for the same tier value.
- The base Aura directory is empty. The enchantment directory is identity
  locked but no enchantment behavior is mapped or accepted.

Rank 1 consumes Diamond with literal enchantment `none`. This is candidate
membership context supplied by the build slice, not source-derived popularity
proof and not an executable original-rules claim.

Initial Ammo/cooldown progress, Crit eligibility, empty-Ammo cooldown behavior,
Ammo consumption versus ItemUsed dispatch, self-use reentrancy, CardFired versus
ItemUsed nesting, Multicast dispatch and same-priority ordering remain unknown
and fail closed. `originalRulesAccepted` remains false.
