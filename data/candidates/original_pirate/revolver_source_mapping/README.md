# Revolver source-effect mapping candidate

This isolated candidate maps Revolver Ability 0 and resolved quality attributes
from the locked Bazaar database. Gold resolves to 3000ms cooldown, Multicast 1,
AmmoMax 6, Damage 32, and a Medium `TTriggerOnCardFired` damage action.

It is not a complete Revolver or Run C. Initial Ammo, base Crit chance, damage
Crit eligibility and empty-Ammo cooldown behavior remain unknown. The mapping also does not assert
the ordering between Revolver `CardFired / Medium` and Cannonade
`ItemUsed / Medium`; that cross-event same-tier rule remains fail-closed.
