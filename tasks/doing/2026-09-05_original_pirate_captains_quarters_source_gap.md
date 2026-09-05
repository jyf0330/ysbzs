---
task_id: 2026-09-05_original_pirate_captains_quarters_source_gap
status: READY_TO_MERGE
owner: root
Goal: lock two independent v5 dangling Ability 3 observations and the fixed-commit v2 predecessor without false formal promotion
write_scopes: Captain's Quarters source-gap verifier, artifact, test and task card only
---

# Captain's Quarters source gap

All three source tiers reference Ability `3`, but the locked card Ability
directory contains only `0,1,2` in two independently hashed v5 databases. The
source evidence is insufficient for a complete original-rule mapping. This task
records the blocker and makes
`formalPromotionAllowed=false`; it does not infer what Ability `3` meant.
The verifier recursively rejects duplicate JSON keys, including escaped-equivalent
keys, so first-key and last-key consumers cannot observe contradictory promotion
claims from one artifact.

The fixed GitHub v2 predecessor resolves Ability `3` as a low-priority random
one-Weapon damage buff, but it cannot be copied forward: v5 represents the
all-Weapons damage action under Ability `2`, whose observed priority is `Low`
in the archived cache and `High` in the current cache. Promotion and battle
logs remain forbidden until one complete raw-client-version-bound source and
original runtime ordering are available.

Validation locks the canonical audit SHA-256
`013f6eec78caf00942304f983593746e56c22f152dea79ec343b1bd542e4308e`
and keeps `formalPromotionAllowed=false`, `battleLogsAllowed=false`.
The Captain, GitHub-gap, and aggregate-lock suites pass 9/9 together, including
forged promotion, mutated history, missing second-source, and duplicate-key attacks.

The earlier v1 artifact received a scoped independent red-team PASS. This v2
extension preserves those duplicate-key and coordinated-change attacks and adds
the second-source and historical-mutation cases; it does not claim a new final
independent acceptance. The item remains blocked.
