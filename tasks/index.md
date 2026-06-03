# 当前任务总览

updated_at: 2026-06-03 16:30

## 当前执行优先级

### 1. P0 四阶体系 + 元素伤害统一重构 + 表格同步

- **状态**：READY_TO_VALIDATE
- **任务卡**：`tasks/doing/2026-06-03_09-40_four-tier-element-refactor.md`
- **说明**：代码改动已完成（data.js、elements.js、battle.js、ui.js），尚未验收
- **下一步**：跑 `node test.js`，检查旧口径残留，验收后单独提交
- **related_files**：battle.js, data.js, elements.js, ui.js, docs/01_CURRENT_GAME_SPEC.md, docs/03_CURRENT_NUMBERS.md, docs/tables/\*（含 _changes/\*）, scripts/sync-tables.js

### 2. P1 商店界面设计文档编写

- **状态**：PAUSED
- **任务卡**：`tasks/paused/2026-06-02_08-20_shop-ui-doc.md`
- **恢复条件**：四阶重构提交后继续
- **原允许修改**：`docs/04_CURRENT_UI_ART_SPEC.md`（或新建文档）、`docs/10_CHANGELOG.md`

## 当前禁止事项

- 不要继续商店界面文档，除非用户明确恢复。
- 不要把四阶重构和商店任务混提交。
- 不要修改其他任务的 `related_files` 以外文件。
- 检测到文件冲突必须立刻暂停。

## 当前 dirty 文件归属

| 文件 | 归属任务 |
|---|---|
| `battle.js` | 四阶重构 |
| `data.js` | 四阶重构 |
| `elements.js` | 四阶重构 |
| `ui.js` | 四阶重构 |
| `docs/01_CURRENT_GAME_SPEC.md` | 四阶重构 |
| `docs/03_CURRENT_NUMBERS.md` | 四阶重构 |
| `docs/roles/PLANNER_START.md` | 四阶重构 |
| `docs/tables/README.md` | 四阶重构 |
| `docs/tables/_changes/README.md` | 四阶重构 |
| `docs/tables/_changes/SYNC_RULES.md` | 四阶重构 |
| `docs/tables/_changes/TEMPLATE_change.md` | 四阶重构 |
| `docs/tables/_changes/pending/2026-06-03-...` | 四阶重构（staged 删除） |
| `scripts/sync-tables.js` | 四阶重构 |
| `docs/reports/` | 四阶重构（新文件） |
| `docs/tables/13_代码现状与正式口径差异表.md` | 四阶重构（新文件） |
| `docs/tables/_changes/archive/` | 四阶重构（新文件） |
| `docs/tables/_changes/reports/` | 四阶重构（新文件） |
| `scripts/run_10day_simulation.js` | 四阶重构（新文件） |

**结论**：所有 dirty 文件均归属"四阶重构"任务，无文件冲突。

## staged 文件

- `docs/tables/_changes/pending/2026-06-03-fix-planner-lv3-to-four-tiers.md`（staged 删除）
- 属于四阶重构任务，未混入其他任务。

## 断线恢复规则

当用户说"继续当前任务"时：
1. 先读取本文件 `tasks/index.md`。
2. 找到 P0 任务，读取对应任务卡。
3. 运行 `git status --short` + `git diff --stat`。
4. 检查 dirty 文件是否全部可归属当前任务。
5. 检查是否存在 `FILE_CONFLICT_STOP`。
6. 无冲突后按 `resume_next_step` 继续。
