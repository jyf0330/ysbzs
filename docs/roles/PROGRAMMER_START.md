# PROGRAMMER_START · 程序任务入口

程序任务只关心：当前规则、真实代码、测试、最小改动。

## 必读文件

1. `../00_AI_START_HERE.md`
2. `../01_CURRENT_GAME_SPEC.md`
3. `../02_CURRENT_WORKFLOW.md`
4. `../03_CURRENT_NUMBERS.md`
5. `../06_DECISION_LOG.md`

## 程序任务原则

- 先读文档，再看代码。
- 以真实代码结构为准，不要凭空重构。
- 小步修改，优先不破坏现有测试。
- 不要顺手改美术风格、策划数值、文案结构。
- 涉及规则冲突时，先写冲突清单。
- 涉及大改时，先补测试或验收点。
- 代码改动默认 TDD：先确认 RED（失败测试），再实现（GREEN）。
- 当前使用 TDD 框架：`node test.js`，测试文件 `test.js`。

## 当前代码架构

| 文件 | 职责 |
|---|---|
| `index.html` | 主程序入口与游戏框架 |
| `game.js` | 游戏逻辑核心 |
| `ui.js` | UI 渲染与交互 |
| `data.js` | 数据定义 |
| `sim.js` | 战斗模拟 |
| `test.js` | 自动化测试（TDD 基准） |
| `external-data/*.json` | 外置配置文件（手写补丁/别名） |
| `external-data/generated-json/*.json` | Excel 策划表自动导出产物（英雄、Pal、商店、遗物、事件、遭遇） |
| `external-tables.js` | 外置配置加载（加载 generated-json 的桥梁） |
| `scripts/export_excel_to_json.py` | Excel → JSON 导出脚本 |

## 输出要求

程序任务结束必须说明：

1. 改了哪些文件。
2. 改了什么逻辑。
3. 有没有影响旧功能。
4. 怎么验证。
