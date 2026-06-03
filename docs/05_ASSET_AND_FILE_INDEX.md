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
| `external-data/generated-json/` | 策划表 Excel → JSON 导出产物（游戏用配置） | ✅ 最新（8 个 JSON 文件，见下方选单） |
| `external-data/export_excel_to_json.py` | 策划表 → JSON 导出脚本 | ✅ 最新 |
| `external-data/ysbzs_pal_relic_event_pack_*.zip` | 策划表 Excel 压缩包（含 Pal/遗物/事件表） | ✅ 最新 |
| `scripts/export_excel_to_json.py` | export_excel_to_json.py 的副本（待归档） | ⚠️ 入口已改为 external-data/ |

## Excel 数据表

| 文件 | 用途 | 当前状态 |
|---|---|---|
| `docs/ysbzs_商店物品总表_四文件合并.xlsx` | 商店物品/英雄/数值总表（旧，仅参考） | 🗄 旧 |
| `external-data/_export_official/`（压缩包解压后） | 策划表 Excel（Pal/遗物/事件/商店/遭遇） | ✅ 最新 |

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

## 策划表导出产物（generated-json）

| JSON 文件 | 包含的 Excel 表 | 行数 |
|---|---|---|
| `hero_config.json` | hero_master, hero_starting_config, hero_level_rule, hero_level_reward, hero_bias | ~13 |
| `pal_units.json` | pal_master, pal_stats_raw, pal_stats_ysbzs, pal_work_suitability, unit_usage, action_template, action_growth | ~1200 |
| `shop_config.json` | shop_rule, shop_source | ~72 |
| `relic_config.json` | relic_master, relic_effect, relic_source | ~49 |
| `event_config.json` | event_master, event_option, event_reward, event_condition, level_reward | ~81 |
| `encounter_config.json` | encounter_wave | ~7 |
| `ysbzs_v3_combined_config.json` | 以上全部合并 + meta 元信息 | - |
| `export_report.json` | 导出报告（ok/errors/warnings/row_counts） | - |

## Excel → JSON 导出操作

**场景：** 策划修改了 Excel 表，需要重新生成 JSON。

```bash
cd /Users/ywh/Documents/ysbzs/external-data

# 1. 自动找压缩包解压 → 导出 → 校验
PACK="$(ls -t ysbzs_pal_relic_event_pack_*.zip | head -1)"
rm -rf _export_official
mkdir -p _export_official
unzip -q -o "$PACK" -d _export_official
EXCEL="$(find _export_official -name 'ysbzs_pal_relic_event_tables_*.xlsx' -print -quit)"

# 2. 导出（自动备份旧 generated-json）
TS="$(date +%Y-%m-%d_%H-%M)"
[ -d generated-json ] && mv generated-json "generated-json_backup_$TS"
python3 export_excel_to_json.py --excel "$EXCEL" --out generated-json --strict

# 3. 验证
python3 -c "import json,pathlib; r=json.loads(pathlib.Path('generated-json/export_report.json').read_text()); assert r['ok'] and not r['errors'], '验证失败'"
echo "✅ ok"
```

**快捷命令（单行）：**
```bash
cd /Users/ywh/Documents/ysbzs/external-data && PACK="\$(ls -t ysbzs_pal_relic_event_pack_*.zip | head -1)"; rm -rf _export_official; mkdir -p _export_official; unzip -q -o "\$PACK" -d _export_official; EXCEL="\$(find _export_official -name 'ysbzs_pal_relic_event_tables_*.xlsx' -print -quit)"; TS="\$(date +%Y-%m-%d_%H-%M)"; [ -d generated-json ] && mv generated-json "generated-json_backup_$TS"; python3 export_excel_to_json.py --excel "\$EXCEL" --out generated-json --strict
```

**核心行数验收标准：** pal_master=60, action_template=180, action_growth=720, shop_source=60, event_master=16, relic_master=17

## 使用规则

- 涉及英雄、商店、数值，先看最新 Excel/JSON。
- 涉及 UI/美术，先看参考图和最新截图。
- 涉及代码，先看最新项目目录，不要猜文件结构。
- 旧 zip、旧表、旧图放 archive，不作为当前依据。
