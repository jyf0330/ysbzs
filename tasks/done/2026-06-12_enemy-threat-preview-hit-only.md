# 2026-06-12_enemy-threat-preview-hit-only

task_id: 2026-06-12_enemy-threat-preview-hit-only
status: DONE
type: bugfix/ui-preview
created_at: 2026-06-12
done_at: 2026-06-12

## Goal

修复敌方宠物威胁预览仍然“不好看/不对”的问题：棋盘上只显示实际会被敌方伤害的我方宠物，以及敌方预计最终移动位置；空格不显示伤害、威胁或攻击范围数字。

## Related Files

- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-12_enemy-threat-preview-hit-only.md`

## Validation

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- real browser player-flow verification with screenshot in `output/playwright/`
- independent subagent browser QA with screenshot

## Commit Plan

- `fix: 只显示敌方威胁命中结果`

## Evidence Log

- 2026-06-12: 用户反馈上一版仍未修好；期望是只显示受伤宠物和敌方最终移动位置，空格不应显示伤害。
- 2026-06-12: 复现：主线程真实浏览器截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-threat-preview-hit-only-repro.png` 显示空格仍有 `受N` 移动风险数字，并且空格有 `threat-hit/enemy-move-path/move-risk` 视觉标记。
- 2026-06-12: 红测：`node --test tests/unit/ui_combat_layout_contract.test.cjs` 失败，命中 `web/js/main.js should not draw enemy attack ranges on empty threat cells`。
- 2026-06-12: 实现：浏览器棋盘渲染层不再给空格渲染 `risk-num`，不再给空格添加 `move-risk/move-risk-lethal/threat-hit/enemy-move-path`；只在有单位且 `teamRisk.damage > 0` 时显示 `受N`，只在 `finalMove` 格显示 `终`。
- 2026-06-12: 主线程真实浏览器验收：截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-threat-preview-hit-only-main.png`。证据：`phase=player_turn`；空格 `受N/危N` 数量 0；空格风险 badge 数量 0；空格 `threat-hit/enemy-move-path/move-risk` 数量 0；最终落点 2 个；受伤单位 1 个，文本 `疾风隼 受6`；console error 0。
- 2026-06-12: 独立 QA 子线程 Bohr 真实浏览器验收 PASS。截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-threat-preview-hit-only-subagent.png`。证据：`phase/vmPhase=player_turn/player_turn`；空格 `受N/危N` 数量 0；空格风险 badge 数量 0；空格 `threat-hit/enemy-move-path/move-risk` 数量 0；`.enemy-final-num` 2 个；有单位且显示 `受N` 1 个，文本 `♥10 ⚔17 疾风隼 受6`；console error 0；截图无明显遮挡或错位。

## Validation Result

- PASS: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- PASS: `node --test tests/ui_adapter.test.cjs`
- PASS: `node tests/run_all_tests.cjs` (`44/44 tests passed`)
- PASS: `git diff --check`
