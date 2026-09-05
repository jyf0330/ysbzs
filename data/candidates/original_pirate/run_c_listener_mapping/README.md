# Run C item-used listener mapping candidate

This isolated candidate locks two abilities that can observe the same friendly
Ammo Weapon use: Cannonade Ability 1 (`Medium`, charge self 2000ms) and
Grapeshot Ability 1 (`Lowest`, reload self 1 Ammo). It provides a source-backed
case where Cannonade must dispatch before Grapeshot for one emitted event.

The artifact does not supply a complete emitter item, complete items, nested or
same-tier ordering, enchantments, a full Run state, or proof that representative
Run C is an exact top-three build.
