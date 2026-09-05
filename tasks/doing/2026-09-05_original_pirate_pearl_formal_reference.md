---
task_id: 2026-09-05_original_pirate_pearl_formal_reference
status: READY_TO_MERGE
owner: pearl_formal_slice
Goal: promote the exact locked Pearl base mapping into formal reference-battle-only content with all unknown phase, re-entry and same-timestamp cases failing closed
related_files: xlsx/ysbzs_master.xlsx; data/csv/44_bz_gameplay.csv; data/csv/46_bz_items.csv; data/csv/47_bz_item_effects.csv; data/csv/48_bz_item_skills.csv; data/csv/56_bz_source_snapshot.csv; data/csv/60_bz_ghost_snapshots.csv; data/csv/68_bz_item_source_bindings.csv; data/csv/71_bz_hero_skill_source_bindings.csv; data/csv/73_bz_source_effect_mappings.csv; tools/export_original_pirate_content.py; tools/add_original_pirate_pearl_formal_reference.py; tests/original_pirate_pearl_formal_reference.test.cjs; this card
write_scopes: Pearl reference-only formal data and exact mapping catalog extension; no player acquisition and no original-rules acceptance
exclusive_files: tools/add_original_pirate_pearl_formal_reference.py; tests/original_pirate_pearl_formal_reference.test.cjs; this card
validation: deterministic workbook CSV export; exact source mapping digest; formal exporter; acquisition exclusion; Godot compiler kernel Trace replay and atomic fail-closed tests
commit_plan: one data commit and one downstream Godot atomic commit; neither pushed by delegated slice
---

# Pearl formal reference-only slice

- Source-locked fields: Vanessa Small Aquatic Pearl, 5000ms cooldown, Multicast 1,
  Low CardFired self-player Shield 10/20/40/80, and Low ItemUsed response that
  observes another friendly Aquatic item and charges Pearl by 1000ms.
- The item remains `reference_battle_only`; shop, reward, upgrade, enchantment,
  progression and new-run acquisition continue to reject it.
- The source does not prove initial cooldown phase, cross-item same-priority order,
  CardFired/ItemUsed inter-phase ordering, or Charge-caused Ready re-entry. Runtime
  integration must execute only an unambiguous single-response/non-ready window and
  atomically reject every boundary above.
- `originalRulesAccepted=false`; this slice is not a complete item, natural Run,
  exact-top-three proof or final six-match acceptance.

## Verification

- Bundled-Python workbook export matches all 27 generated CSV domains.
- Content exporter v40/v38 accepts the exact Pearl mapping and produces a
  deterministic hash-bound runtime/display bundle.
- Node content/export, source-priority, Pearl mapping, Pearl formal-reference,
  and Water Wheel regression tests pass.
- Downstream Godot tests pass for content validation, compiler, fixed-tick
  kernel, Pearl formal Trace/replay, and Water Wheel formal regression.
- Same-priority responses, Charge-caused Ready re-entry, and Pearl
  CardFired-versus-ItemUsed phase ambiguity return stable errors with unchanged
  state and empty incremental Trace.
