# 2026-06-12_enemy-threat-preview-declutter

task_id: 2026-06-12_enemy-threat-preview-declutter
status: DONE
type: bugfix/ui-preview
done_at: 2026-06-12

## Goal

调整敌方宠物预计行动预览的信息层级：棋盘上只强调敌方预计移动路径/最终位置，以及实际会被伤害的我方宠物；空格不显示伤害数字。

## Related Files

- `web/js/main.js`
- `web/ux-app.js`
- `web/ux-app.css`
- `src/core/battle/planning.cjs`
- `tests/ui_adapter.test.cjs`
- `tests/unit/ui_combat_layout_contract.test.cjs`
- `tasks/index.md`
- `tasks/done/2026-06-12_enemy-threat-preview-declutter.md`

## Validation

- `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- `node --test tests/ui_adapter.test.cjs`
- `node tests/run_all_tests.cjs`
- real browser player-flow verification with screenshot in `output/playwright/`

## Commit Plan

- `fix: 简化敌方宠物威胁预览显示`

## Evidence Log

- 2026-06-12: 用户指出当前棋盘显示不好：空格不应该显示伤害；只需要显示敌方会伤害哪些宠物，以及敌方最终会移动到哪个位置。
- 2026-06-12: 红测：`node --test tests/unit/ui_combat_layout_contract.test.cjs` 失败，缺 `enemy-final-cell/enemy-final-num` 且仍会渲染空格威胁数字；`node --test tests/ui_adapter.test.cjs --test-name-pattern "UI23"` 失败，`threatGrid` 缺最终移动落点标记。
- 2026-06-12: 实现：`buildThreatGrid` 对敌方 `move_path` 的最后一格输出 `finalMove: true`；棋盘 UI 保留攻击/路径淡色范围，但只在 `teamRisk` 命中的我方单位上显示 `受N`，只在敌方路径终点显示 `终`，不再对所有 threat 空格渲染 `危N`。
- 2026-06-12: 主线程真实浏览器验收：打开 `http://127.0.0.1:4173/?sessionId=threat-declutter-main`，点击 `#new-game-btn`、`#etb`。截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-threat-preview-declutter-main.png`。证据：空格 `emptyBadges=[]`；终点格 2 个，文本 `终`；受击单位 1 个，文本 `受6`；console error 0。
- 2026-06-12: 独立测试子线程 Mencius 真实浏览器验收 PASS。截图 `/Users/ywh/Documents/ysbzs/output/playwright/enemy-threat-preview-declutter-subagent.png`。证据：空格 56 个，含 `危N/受N` 为 0；`.enemy-final-num` 2 个，文本 `["终","终"]`；有单位的 `.team-risk-num` 1 个，文本 `["受6"]`；console error 0；截图无明显遮挡或错位。

## Validation Result

- PASS: `node --test tests/unit/ui_combat_layout_contract.test.cjs`
- PASS: `node --test tests/ui_adapter.test.cjs`
- PASS: `node tests/run_all_tests.cjs` (`44/44 tests passed`)
- PASS: `git diff --check`
