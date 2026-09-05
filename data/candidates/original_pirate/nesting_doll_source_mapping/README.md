# Nesting Doll source mapping candidate

This isolated candidate is generated only after verifying the SHA-locked
installed `GameData.db`. It locks the three base tiers, Abilities `0/1`, Auras
`2/3/4/9`, and the Fiery overlay Ability `e1` plus Aura `e2`.

Silver/Gold/Diamond shield for 5/10/15 times current Ammo. The item permanently
gains one maximum Ammo at each day start. Fiery applies Burn equal to 10% of the
item's computed Shield amount with the source declaring rounded multiplication.

The database does not prove initial Ammo, the relative timing of Ammo spending
and Shield sampling, the runtime binding of null `ReferenceValue`, accumulated
day history, zero-Ammo clocks, or the order of base Shield and Fiery Burn when
both Medium listeners share one CardFired event. Burn rounding/application also
needs original execution evidence. Therefore this is not formal executable
content and `originalRulesAccepted` remains false.
