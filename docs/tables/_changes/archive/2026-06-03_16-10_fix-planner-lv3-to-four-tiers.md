# 变更单：修正 PLANNER_START.md 中"最高 lv3"旧口径

- **change_id**：2026-06-03_16-10_fix-planner-lv3-to-four-tiers
- **created_at**：2026-06-03 16:10
- **applied_at**：2026-06-03 16:33
- **影响文件**：docs/roles/PLANNER_START.md
- **变更等级**：P1 重要
- **状态**：**applied**

---

## 变更理由

`docs/roles/PLANNER_START.md` 第 15 行仍使用旧口径：

> 英雄同名 2 合 1 升阶，最高 lv3。

但项目正式规则已于 2026-06-03 变更为四阶体系（青铜/白银/黄金/钻石），详见 `docs/06_DECISION_LOG.md`。PLANNER_START.md 未同步更新。

---

## 变更内容

### 1. docs/roles/PLANNER_START.md（第 15 行，"策划铁律"段）

| 位置 | 当前值 | 目标值 | 说明 |
|------|--------|--------|------|
| 第 15 行，`英雄同名 2 合 1 升阶，最高 lv3。` | 最高 lv3 | 英雄同名 2 合 1 升阶，档位四阶：青铜 → 白银 → 黄金 → 钻石（钻石为最高）。 | 对齐正式四阶口径 |

### 2. docs/tables/01_核心规则表.md（检查项）

同步时检查该文件是否仍存在 "最高 lv3" 或 "lv3" 作为最高档位的描述，如有则一并修正。

### 3. 其他表格文件

`grep -rl "最高 lv3\|lv3 最高" docs/` — 如有命中在 current 文档中，一并修正。

---

## 验收条件

1. `grep -r "最高 lv3\|lv3 最高" docs/ --include="*.md"` 不再返回 `docs/roles/PLANNER_START.md` 或 `docs/tables/01_核心规则表.md` 中的命中。
2. `PLANNER_START.md` 中的档位描述与 `docs/01_CURRENT_GAME_SPEC.md` 一致。

---

## 同步记录（由 AI 执行同步时填写）

- **applied_at**：2026-06-03 16:33
- **同步报告**：`reports/2026-06-03_16-33_sync-report.md`
- **残留风险**：无
