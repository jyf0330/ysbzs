# Level Planning 03/04 Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the 03/04 level-planning documents into one reviewed execution entry without touching runtime code.

**Architecture:** Keep the original source documents as historical design material, add a canonical consolidation document, and mark each source file with its current status. Treat unresolved design conflicts as explicit `[NEEDS_REVIEW]` gates.

**Tech Stack:** Markdown documentation in the existing `ysbzs` repository; validation via `rg` and `git diff --check`.

---

### Task 1: Preserve The Previous Active Task Card

**Files:**
- Create: `tasks/done/2026-05-31-debug-panel-v3-计划保留未执行.md`
- Modify: `tasks/doing/当前任务.md`

- [x] **Step 1: Archive the previous Debug panel task card**

Copy the old Debug v3 task card into `tasks/done/2026-05-31-debug-panel-v3-计划保留未执行.md` and mark it as an unexecuted retained plan.

- [x] **Step 2: Replace the active task card**

Set `tasks/doing/当前任务.md` to the 03/04 consolidation task, with explicit read/write scope and a TDD exemption because this task is documentation-only.

### Task 2: Write The Consolidation Spec And Plan

**Files:**
- Create: `docs/superpowers/specs/2026-05-31-level-planning-03-04-consolidation-design.md`
- Create: `docs/superpowers/plans/2026-05-31-level-planning-03-04-consolidation.md`

- [x] **Step 1: Write the design spec**

Document the background, current formal sources, adopted approach, non-goals, and validation gates.

- [x] **Step 2: Write the implementation plan**

Document the exact files and validation steps for this documentation-only consolidation.

### Task 3: Create The Canonical 03/04 Consolidation Entry

**Files:**
- Create: `docs/01_游戏设计（策划主导）/关卡策划/03_04_关卡商店刷怪收束计划.md`

- [x] **Step 1: Create a current-source section**

State that the current formal baseline is water+summon, 5-day run, castle HP not automatically restored, and shop sells heroes only.

- [x] **Step 2: Create a retained-design section**

Preserve useful ideas from 03/04: Bazaar-inspired shop nodes, boss/elite rewards, pressure curve, monster type table, ability hooks.

- [x] **Step 3: Create a `[NEEDS_REVIEW]` section**

List unresolved decisions: 10-day run, pricing model, economy model, castle recovery, active hero count, summon element identity, ability-system timing.

- [x] **Step 4: Create code-reality and follow-up task slices**

Record implemented vs missing capabilities, then split future implementation into small TDD tasks: 5-day wave tuning, shop reward node spec, price model decision, monster table data layer, ability-system pilot, summon AI, and pT3/pT4 heroes.

### Task 4: Mark The Four Source Documents

**Files:**
- Modify: `docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md`
- Modify: `docs/01_游戏设计（策划主导）/关卡策划/03_步骤456_定价新英雄多目标.md`
- Modify: `docs/01_游戏设计（策划主导）/关卡策划/04_第2天代码差距.md`
- Modify: `docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md`

- [x] **Step 1: Add top status blocks**

Add a short 2026-05-31 status note to each file, pointing to `03_04_关卡商店刷怪收束计划.md`.

- [x] **Step 2: Preserve original content**

Do not rewrite tables or old reasoning in-place; keep them as source material.

### Task 5: Changelog And Validation

**Files:**
- Modify: `docs/10_CHANGELOG.md`
- Read: all touched Markdown files

- [x] **Step 1: Add CHANGELOG entry**

Record the consolidation, Superpowers/subagent review, and the fact that runtime code was intentionally not changed.

- [x] **Step 2: Run reference checks**

Run:

```bash
rg -n "03_04_关卡商店刷怪收束计划|2026-05-31 收束状态|NEEDS_REVIEW" docs/01_游戏设计（策划主导）/关卡策划 tasks/doing/当前任务.md docs/superpowers docs/10_CHANGELOG.md
```

Expected: the canonical file, four source notes, task card, spec, plan, and changelog are discoverable.

Observed: PASS. The search finds the source-file status notes, task card, Superpowers spec/plan, changelog, and the canonical `[NEEDS_REVIEW]` gate.

- [x] **Step 3: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

Observed: PASS. No output.
