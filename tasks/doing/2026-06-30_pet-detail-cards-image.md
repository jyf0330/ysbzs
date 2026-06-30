# 2026-06-30_pet-detail-cards-image

task_id: 2026-06-30_pet-detail-cards-image
type: asset
status: READY_TO_MERGE
owner: Codex
branch: codex/bazaar-day1-day3-route

## Goal

按当前真实宠物数据输出捣蛋猫、火绒狐、冲浪鸭三张中文详情图；技能显示必须是中文，不使用代码里的英文技能字段。

## Scope

- 只生成交付图片和对应 HTML 源文件。
- 不修改游戏运行时代码、核心规则、CSV 和正式 UI。
- 用确定性 HTML/CSS 渲染文字，避免生图模型写错中文。

## related_files

- `output/pet-detail-cards-2026-06-30.html`
- `output/pet-detail-cards-2026-06-30.png`
- `output/generated/pet-detail-final-style-2026-06-30.png`
- `tasks/doing/2026-06-30_pet-detail-cards-image.md`

## exclusive_files

- 无

## read_files

- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/ARTIST_START.md`
- `data/csv/01_pets.csv`
- `data/csv/08_action_shapes.csv`
- `data/csv/27_shape_catalog.csv`
- `web/js/main.js`
- `src/core/unitFactory.cjs`
- `src/core/mechanics.cjs`

## validation

- pass: generated deterministic HTML source at `output/pet-detail-cards-2026-06-30.html`
- pass: exported PNG at `output/pet-detail-cards-2026-06-30.png`
- pass: Playwright layout check found no text overflow in card/detail text elements
- pass: Playwright text check found no `castleReduce` / `spaceExplosionBonus` / `healAmpBonus` visible text
- pass: Lead reviewed final PNG; all three cards are visible, complete, and use Chinese skill names: `守护减伤` / `爆点轰击` / `疗愈增幅`
- pass: generated final-style art mockup at `output/generated/pet-detail-final-style-2026-06-30.png`; reviewed image uses polished parchment/wood game style and shows only `单位元素层：风3/火3/水3`, without duplicate `脚下元素层`

## commit_plan

- message: `chore: add pet detail card image`
- auto_commit: no; user requested an image artifact, not a code commit

## collaboration

lead_scope: Generate deterministic Chinese detail-card image artifact.
specialist_input: 无
tester_pass: 无，非正式 UI 改动；以本地图像渲染和人工查看为准
external_ai_input: 无
lead_decision: Used HTML/CSS screenshot for exact Chinese text and current data fidelity instead of diffusion image generation, because the request is text-heavy and requires no English skill names.
