# Captain's Quarters source gap

The locked database is internally incomplete for executable mapping: every
Silver/Gold/Diamond tier references Abilities `0,1,2,3`, while the card's
Ability directory contains only `0,1,2`. This artifact records that dangling
reference and forbids formal promotion. It does not invent Ability `3` or treat
the three known abilities as a complete item.
