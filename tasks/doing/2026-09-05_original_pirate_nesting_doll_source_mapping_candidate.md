---
task_id: 2026-09-05_original_pirate_nesting_doll_source_mapping_candidate
status: READY_TO_MERGE
owner: root
Goal: lock Nesting Doll base tiers and Fiery overlay as an isolated fail-closed source mapping
write_scopes: Nesting Doll candidate files only; no formal master, formal CSV or exporter changes
---

# Nesting Doll source mapping candidate

The locked source provides three base tiers, the daily permanent AmmoMax gain,
dynamic Shield-per-current-Ammo Auras, and the Fiery Burn overlay. This task does
not infer the unresolved runtime binding and phase ordering needed to execute it
as original rules.

The checked mapping carries Auras `2/3/4/9` as structured entries. `--check`
rebuilds and compares both committed JSON artifacts, including the provenance
digest, in addition to workbook and CSV checks.

Validation: locked DB plus five subtree hashes PASS; candidate and artifact
tamper rejection 1/1 PASS; formal master/content checks PASS with v39/23 items
and canonical SHA `8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366`.
Independent cross-review replayed the missing-Aura and coordinated-JSON attacks
and returned scoped PASS. This does not grant executable or original-rule
acceptance.
