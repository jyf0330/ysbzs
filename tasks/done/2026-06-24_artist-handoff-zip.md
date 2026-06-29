# 2026-06-24_artist-handoff-zip

task_id: 2026-06-24_artist-handoff-zip
type: art_delivery
status: DONE
owner: codex
branch: codex/bazaar-day1-day3-route
worktree: shared-worktree

## Goal

整理一个美术专用压缩包，方便外部美术查看当前风格参考、提示文档、已生成素材，并按用户补充要求提供项目代码快照。

## Scope

- 生成美术交付目录与 zip。
- 用户补充要求后，增加项目代码快照 `07_code_snapshot/`。
- 不改代码、不改核心规则、不改 UI。
- 不把旧 zip、`.git/`、`node_modules/`、`output/` 递归打进代码快照。

## related_files

- `tasks/doing/2026-06-24_artist-handoff-zip.md`
- `tasks/index.md`
- `output/artist_tasks_2026-06-24/`

## exclusive_files

- 无

## read_files

- `AGENTS.md`
- `docs/02_CURRENT_WORKFLOW.md`
- `docs/00_AI_START_HERE.md`
- `docs/roles/ARTIST_START.md`
- `docs/PAPER_BATTLE_UI_START_HERE.md`
- `docs/RIGHT_PET_DETAIL_PANEL_PROMPT.md`
- `web/assets/reference_main_style_battle_ui_2026-06-22.jpg`
- `web/assets/reference_trace_base.jpeg`
- `output/generated/`
- `output/generated-assets/`
- `output/generated-board/`
- `output/imagegen/`
- `output/artist_tasks_2026-06-22/`

## validation

- `test -f output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24.zip`
- `unzip -l output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24.zip | sed -n '1,120p'`
- `git status --short --untracked-files=all`

## commit_plan

No auto commit: asset-only delivery zip unless user explicitly asks to commit.

## collaboration

lead_scope: create curated art-only handoff package.
specialist_input: 无
tester_pass: 不适用，未改 UI/交互/代码。
external_ai_input: 无
lead_decision: 只打包可供美术使用的参考和素材，避免扩大到代码任务。

## Evidence

- Created staging directory: `output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24/`
- Created zip: `output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24.zip`
- Created file list: `output/artist_tasks_2026-06-24/package_file_list.txt`
- Added code snapshot: `output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24/07_code_snapshot/`
- Created with-code zip: `output/artist_tasks_2026-06-24/ysbzs_artist_handoff_with_code_2026-06-24.zip`
- Validation:
  - `test -f output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24.zip` -> `ZIP_OK`
  - `unzip -l output/artist_tasks_2026-06-24/ysbzs_artist_handoff_2026-06-24.zip` -> listed 134 zip entries, 122 files in staging directory
  - size: staging directory 33M, zip 33M
  - `git status --short --untracked-files=all` before archive -> only task card/index changes visible; output package is ignored/untracked outside git status
  - `07_code_snapshot/` -> 804 files, 25M
  - `output/artist_tasks_2026-06-24/ysbzs_artist_handoff_with_code_2026-06-24.zip` -> 50M
  - `unzip -l ... | rg '07_code_snapshot/(package.json|README_RUN.md|web/paper-battle.html|web/index.html|src/uiAdapter.cjs|data/csv/|docs/00_AI_START_HERE.md)'` -> key code entries present
  - `unzip -l ... | rg '07_code_snapshot/(node_modules|\\.git|output)/'` -> `NO_FORBIDDEN_DIRS`
