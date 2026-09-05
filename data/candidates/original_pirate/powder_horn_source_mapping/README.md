# Powder Horn source mapping candidate

This isolated candidate maps only locked GameData Ability `0`: when Powder Horn
fires, its `Lowest` listener reloads the card immediately to its right if that
card has `AmmoMax > 0`. Bronze/Silver/Gold/Diamond reload 1/2/3/4 respectively.

It is not a formal content package or a complete Powder Horn item. It does not
establish Rifle initial Ammo, same-tier tie-breaking, enchantments, economy,
acquisition, the zero-Ammo cooldown policy, the Reload wake policy, or a
complete Run battle state.
