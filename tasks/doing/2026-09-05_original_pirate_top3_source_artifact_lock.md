---
task_id: 2026-09-05_original_pirate_top3_source_artifact_lock
status: READY_TO_MERGE
owner: lead
Goal: lock the exact raw bytes of every current top-three-build source candidate artifact without promoting candidate semantics
related_files: tools/verify_original_pirate_top3_source_artifact_lock.py; tests/original_pirate_top3_source_artifact_lock.test.cjs; this card
write_scopes: aggregate read-only verifier, dedicated mutation tests, and task index entry
exclusive_files: tools/verify_original_pirate_top3_source_artifact_lock.py; tests/original_pirate_top3_source_artifact_lock.test.cjs; this card
shared_file_policy: candidate artifacts, formal master/CSV/exporter, runtime package, and existing candidate tests remain byte-identical
validation: exact candidate-directory set, ten exact workbooks, raw-byte aggregate, mutation/add/remove/symlink fail-closed tests
commit_plan: one atomic verifier/test/task-card commit
---

# Top-three source artifact byte lock

This gate locks 65 current candidate files across twelve isolated candidate
directories and ten workbooks. Captain's Quarters remains an explicit source-gap
record because its source references a missing Ability 3; the lock does not fill
that gap.

The canonical aggregate SHA-256 is
`ced85f8b4d3005cb184a2f96c5eca10d20ad2f3cec05a6297e475f295b1d32c2`.
Paths and byte lengths are framed into the digest, so byte edits, path changes,
additions and removals all change it. Symlink substitution is rejected before
hashing.

Passing this gate means only `candidate_source_artifact_integrity_only`.
`completeBuildsAccepted=false` and `originalRulesAccepted=false` remain fixed;
it is not evidence for exact patch identity, runtime semantics, six match logs,
or independent final acceptance.
