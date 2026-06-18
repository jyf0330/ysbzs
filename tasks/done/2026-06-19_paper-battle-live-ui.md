# 2026-06-19_paper-battle-live-ui

task_id: 2026-06-19_paper-battle-live-ui
type: UI / browser page
status: DONE

## Goal

提交 `paper-battle.html` 纸上西游描线战斗界面：页面使用真实 `/api/view` 和 `/api/action`，不依赖静态 ViewModel。

## Scope

- 新增纸上西游战斗页面、样式和交互脚本。
- 新增参考底图资源。
- 新增页面说明文档和验证脚本。
- 用正式 4173 页面真实点击流程验证页面可打开、能初始化试炼、能选择角色/行动块并进入真实操作状态。

## related_files

- `docs/PAPER_BATTLE_UI_START_HERE.md`
- `tools/check_paper_battle_ui.cjs`
- `web/assets/reference_trace_base.jpeg`
- `web/paper-battle.css`
- `web/paper-battle.html`
- `web/paper-battle.js`
- `docs/10_CHANGELOG.md`
- `tasks/index.md`
- `tasks/doing/2026-06-19_paper-battle-live-ui.md`
- `output/playwright/paper-battle-live-ui-2026-06-19.png`

## validation

- `node tools/check_paper_battle_ui.cjs`
- Formal UI gate on `http://127.0.0.1:4173/paper-battle.html`
- `npm run check:all`

## commit_plan

message: `feat(ui): add live paper battle interface`

## collaboration

lead_scope: Git-c收口未归属的 paper-battle 可见 UI 文件，补任务卡与正式浏览器证据。
specialist_input: 无
tester_pass: completed
external_ai_input: 无
lead_decision: accept

## verification_results

- API validation: `node tools/check_paper_battle_ui.cjs` passed with `PASS paper-battle.html -> live /api/view + /api/action flow`.
- Formal UI gate on fixed port `4173`: Playwright opened `http://127.0.0.1:4173/paper-battle.html`, waited for boot to finish, clicked `新试炼`, selected the first hero, selected the first action shape, clicked direction `右`, then clicked `开始行动`.
- Formal UI assertions: title `第7天 · 火核心试炼`; phase `我方调整阶段`; 4 hero cards; 12 action shape cards; 64 board cells; visible selected hero and selected slot; event log populated by real API events.
- Screenshot: `output/playwright/paper-battle-live-ui-2026-06-19.png`
- Console errors: `[]`
- Main-thread screenshot review: screenshot shows the formal paper-battle page with traced board, roster, 12 action shapes, right operation controls, live event log, and no obvious overlap or missing state.
- Full validation: `npm run check:all` passed.

## commit_status

- pending commit
