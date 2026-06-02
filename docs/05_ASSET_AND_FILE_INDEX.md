# 05_ASSET_AND_FILE_INDEX · 文件与素材索引

## 代码文件

| 文件 | 用途 | 当前状态 |
|---|---|---|
| `index.html` | 主程序入口与游戏框架 | ✅ 最新 |
| `game.js` | 游戏逻辑核心 | ✅ 最新 |
| `ui.js` | UI 渲染与交互 | ✅ 最新 |
| `data.js` | 数据定义 | ✅ 最新 |
| `sim.js` | 战斗模拟 | ✅ 最新 |
| `test.js` | 自动化测试（TDD 基准） | ✅ 最新 |
| `external-tables.js` | 外置配置加载 | ✅ 最新 |
| `record_gameplay.mjs` | 游戏录制 | ✅ |
| `replay.js` | 回放加载 | ✅ |
| `playable_day1.js` | Day1 走查脚本 | ✅ |
| `playable_run.js` | Run 走查脚本 | ✅ |
| `e2e/smoke.js` | E2E 冒烟测试 | ✅ |

## 外部数据

| 文件 | 用途 | 当前状态 |
|---|---|---|
| `external-data/unit_patches.json` | 单位补丁 | ✅ 最新 |
| `external-data/shop_unlock_pools.json` | 商店解锁池 | ✅ 最新 |
| `external-data/id_alias.json` | ID 别名 | ✅ 最新 |
| `external-data/meta.json` | 元数据 | ✅ 最新 |

## Excel 数据表

| 文件 | 用途 | 当前状态 |
|---|---|---|
| `docs/ysbzs_商店物品总表_四文件合并.xlsx` | 商店物品/英雄/数值总表 | ✅ 最新（ASCII 别名建议：`ysbzs_shop_master.xlsx`） |

## 参考图

| 文件 | 用途 | 当前状态 |
|---|---|---|
| `docs/reference-ui.jpg` | UI 美术风格参考（羊皮纸手绘风） | ✅ 主参考 |
| `assets/references/` | 其他参考素材目录 | ✅ |
| `test-results/*.png` | UI 验收截图 | ✅ 历史截图 |

## 测试结果与截图

| 文件 | 用途 |
|---|---|
| `test-results/ui-*-goal-final.png` | UI 验收最终截图 |
| `test-results/current-ui-64061-compare.png` | 当前 UI 与参考图对比 |
| `recordings/day1_fire_sample.json` | Day1 回放数据 |
| `recordings/playable_run_report.md` | Run 走查报告 |
| `recordings/playable_day1_report.md` | Day1 走查报告 |

## 美术资产

| 目录/文件 | 用途 | 当前状态 |
|---|---|---|
| `assets/sprites/` | 精灵图 | 📋 空白（emoji 呈现） |
| `assets/references/` | 参考素材 | ✅ |

## 归档文件（不作为当前依据）

| 目录 | 内容 |
|---|---|
| `docs/archive/workflow/` | 旧 AI 工作流规则 |
| `docs/archive/old_specs/` | 旧游戏设计/程序/美术/测试文档 |
| `docs/archive/misc/` | 根目录历史备份文件 |
| `docs/99_归档/`（已合并到 archive） | 早期 GDD 草稿 |

## 使用规则

- 涉及英雄、商店、数值，先看最新 Excel/JSON。
- 涉及 UI/美术，先看参考图和最新截图。
- 涉及代码，先看最新项目目录，不要猜文件结构。
- 旧 zip、旧表、旧图放 archive，不作为当前依据。
