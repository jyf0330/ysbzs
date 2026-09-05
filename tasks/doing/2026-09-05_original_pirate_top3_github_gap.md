---
task_id: 2026-09-05_original_pirate_top3_github_gap
status: READY_TO_MERGE
owner: codex
Goal: lock immutable public-repository evidence that the three observed Vanessa rows remain candidates rather than accepted exact complete builds
related_files: data/candidates/original_pirate/top3_metrics_github_gap/*; tools/verify_original_pirate_top3_github_gap.py; tests/original_pirate_top3_github_gap.test.cjs; aggregate lock
write_scopes: isolated candidate audit, verifier, tests, task card, aggregate lock metadata
shared_file_policy: formal CSV/export/runtime remain byte-identical
validation: exact artifact, fail-closed forgeries, aggregate byte lock
commit_plan: one atomic audit/verifier/test commit
---

# Top-three GitHub evidence gap

The fixed BazaarPlusPlus consumer commit proves that build IDs are snapshot
array indices and that the published build schema omits skills. The uploader can
capture skills, but no public analyzer contract binds them to the three rows.
Raw client version, query/filter/grouping semantics, denominator, and stable row
identity are also absent. Rows 222, 180, and 219 remain candidate-only.

Validation: `node --test` passed 6/6 across the dedicated GitHub-gap suite and
the aggregate byte-lock suite. Canonical audit SHA-256:
`c200e94e8139199fed309f95b87dbe2242c3d66b75482b9368138f2f1a7c2aab`.
