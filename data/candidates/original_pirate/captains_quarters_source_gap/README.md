# Captain's Quarters source gap

Two independently hashed v5 databases are internally incomplete for executable mapping: every
Silver/Gold/Diamond tier references Abilities `0,1,2,3`, while the card's
Ability directory contains only `0,1,2`. This artifact records that dangling
reference and forbids formal promotion. It does not invent Ability `3` or treat
the three known abilities as a complete item.

A fixed GitHub commit contains an older v2 Ability `3` that buffed one random
Weapon. It is historical predecessor evidence, not a repair: v5 moved an
all-Weapons damage action into Ability `2`, and the two v5 caches even disagree
on that ability's priority (`Low` versus `High`). Cross-version copying would
therefore manufacture a rule and an unverified same-timestamp order.
