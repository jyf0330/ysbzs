# 06_DECISION_LOG · 决策记录

本文档记录项目中的关键决策。追加在末尾，不倒序。

---

## 2026-05-25 · AI 规则源头

- **决策**：`docs/00_AI_PROJECT_RULES.md` 是项目 AI 规则唯一源头（现已归档到 `docs/archive/workflow/`，改用 `docs/02_CURRENT_WORKFLOW.md`）。
- **影响**：`AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md` 只保留入口信息。

---

## 2026-05-25 · 同步 ywh 工作流口令

- **决策**："同步 ywh 工作流"是固定口令，以上游 `ywh` / `ywh-game` 为准只同步工作流结构与 AI 入口。
- **禁止**：不改 `index.html`、`test.js` 或游戏核心代码。

---

## 2026-05-25 · 多 AI 读取范围

- **决策**：不要让所有 AI 默认读取所有文档。
- **执行**：总控 AI 生成任务卡，执行 AI 只读任务卡指定范围，验收 AI 只读验收所需材料。
- **约束**：一个任务只允许一个 AI 修改同一代码文件。

---

## 2026-05-25 · 归档文档定位

- **决策**：旧归档只作历史参考，不作为当前规则源头。
- **执行**：历史草稿迁出根目录到 `docs/99_归档/`（现已合并到 `docs/archive/`）。

---

## 2026-05-25 · UI 文档三层结构

- **决策**：UI 相关文档分为美术风格、HUD 显示层、用户界面与操作规范。（现统一到 `04_CURRENT_UI_ART_SPEC.md`）

---

## 2026-05-25 · Demo 阶段门禁

- **决策**：Demo 阶段保留核心文档门禁，部分补充文档改为按需。

---

## 2026-06-03 · 第一阶段拍板口径（文档收束后）

- **决策**：文档收束后更新核心口径，以下为当前正式规则，覆盖所有旧文档中的矛盾内容。
- **10 条口径**：
  1. 第一阶段核心：火伤害闭环 + 召唤流闭环
  2. 召唤流没有"中立召唤"，必须归属具体元素/英雄流派
  3. 商店第一版只卖英雄，不卖行动槽、元素瓶、强化块、遗物
  4. 英雄/商品档位四阶：青铜、白银、黄金、钻石
  5. 钻石为最高档位
  6. 同名合成按档位升级：青铜 → 白银 → 黄金 → 钻石
  7. 完整 Run 当前目标 10 天结束
  8. 前 3 天教学核心循环，第 4-10 天成长、组合、压力与最终战
  9. 整体向 The Bazaar 结构对齐，节奏压缩
  10. 旧文档中的 5 天闭环、lv3 最高、中立召唤、水+召唤唯一核心，均不作为当前正式规则
- **影响**：
  - 更新 `00_AI_START_HERE.md`：核心验证目标、档位描述
  - 更新 `01_CURRENT_GAME_SPEC.md`：召唤引擎→召唤流闭环、Run 结构 5→10 天、档位四阶、移除 lv3 口径
  - 旧代码中如有 lv3 硬编码需逐步迁移到四阶系统

---

## 2026-06-03 · 收尾校准：全文档旧口径清除

- **决策**：对全部 current 文档执行一致性校准，确保旧口径（中立召唤、lv3 最高、5 天 Run、水+召唤唯一核心）不再出现在任何当前规则文件中。
- **校准范围**：
  - `03_CURRENT_NUMBERS.md`：Run 5天→10天、lv3→四阶档位、价格标 NEEDS_DECISION
  - `05_ASSET_AND_FILE_INDEX.md`：全路径核实通过，Excel 补 ASCII 别名建议
  - `08_ROADMAP.md`：S1/S3 移除旧口径，5天→10天，水+召唤标注为旧口径
  - `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md`：确认清洁，只指向入口，无内嵌旧规则
  - `06_DECISION_LOG.md`：追加本条目
  - `10_CHANGELOG.md`：追加校准记录
- **验收**：current 文档中不再出现中立召唤、lv3 最高、5 天 Run、水+召唤唯一核心作为当前规则。

---

## 2026-06-03 · 文档口径纠正：元素加层、互克反应废弃、火魔十字引爆条件收紧

- **决策**：
  - EL_ADD：按行动槽 layers/tier 加层，不固定 +1
  - 删除旧 EL_CROSS_REACT 互克相遇覆盖/爆炸规则
  - 同一格可多元素并存，互不覆盖
  - 默认引爆范围为单体；只有钻石火魔 fire_demon 在场上或背包/备战区时，火引爆才扩展为十字 5 格
- **影响文档**：
  - `01_CURRENT_GAME_SPEC.md`：引爆范围改为条件触发
  - `03_CURRENT_NUMBERS.md`：同上，标注青铜/白银/黄金不启用
  - `tables/01_核心规则表.md`：EL_ADD 修正、EL_CROSS_REACT 标记废弃
  - `tables/07_元素规则表.md`：E07 废弃、新增 E07b 多元素并存
  - `tables/10_UI文案表.md`：ET04 改为条件文案
  - `tables/11_测试用例表.md`：TC62/TC63 说明修正
  - `tables/20_UI信息层级表.md`：B09 改为克制倍率提示
  - `tables/25_战斗日志模板表.md`：E03 废弃、E08/E09 新增
- **验收**：current 文档中不再将旧规则写为默认当前规则。

---

## 2026-06-02 · 文档体系统一

- **决策**：建立单一入口 + 分角色入口 + 当前规则唯一真相 + 旧文档归档结构。
- **新结构**：
  - 总入口：`docs/00_AI_START_HERE.md`
  - 当前规则：`01_CURRENT_GAME_SPEC.md`、`02_CURRENT_WORKFLOW.md`、`03_CURRENT_NUMBERS.md`、`04_CURRENT_UI_ART_SPEC.md`
  - 文件索引：`05_ASSET_AND_FILE_INDEX.md`
  - 决策日志：`06_DECISION_LOG.md`（本文件，取代 `09_DECISIONS.md`）
  - 角色入口：`docs/roles/*.md`
- **影响**：
  - 旧入口文件（`00_AI_PROJECT_RULES.md`、`00_AI_WORKFLOW_DETAILS.md`、`00_CURRENT_CONTEXT.md`）归档
  - 旧 GDD/程序/美术/测试文档归档到 `docs/archive/`
  - `AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md` 统一指向新入口
  - 后续新增规则只更新当前文档和决策日志
