---
task_id: 2026-09-05_original_pirate_captains_quarters_source_gap
status: READY_TO_MERGE
owner: root
Goal: lock the version-bound dangling Ability 3 reference and forbid false formal promotion
write_scopes: Captain's Quarters source-gap verifier, artifact, test and task card only
---

# Captain's Quarters source gap

All three source tiers reference Ability `3`, but the locked card Ability
directory contains only `0,1,2`. The source snapshot is insufficient for a
complete original-rule mapping. This task records the blocker and makes
`formalPromotionAllowed=false`; it does not infer what Ability `3` meant.
The verifier recursively rejects duplicate JSON keys, including escaped-equivalent
keys, so first-key and last-key consumers cannot observe contradictory promotion
claims from one artifact.

Independent red-team review replayed top-level, nested and escaped-equivalent
duplicate-key attacks plus coordinated artifact changes and returned scoped
PASS. This accepts only the source-gap record; the item remains blocked.
