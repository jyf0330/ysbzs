# 17 · YAML 数据迁移

## 为什么改成 YAML 源数据

- **可读性**：YAML 比 JSON 更适合人工阅读和修改，支持注释。
- **唯一源**：消除「Excel → JSON → 手工补丁」多重来源的混乱。
- **版本控制友好**：YAML diff 比 JSON diff 更清晰。
- **减少手写错误**：JSON 缺少逗号、多余逗号等问题在 YAML 中不存在。

## 职责边界

| 层 | 角色 | 是否人工维护 |
|---|---|---|
| `external-data/source-yaml/` | **唯一人工维护源数据** | ✅ 是 |
| `external-data/generated-json/` | 自动生成产物，运行时读取 | ❌ 否（禁止手改） |
| `external-data/id_alias.json` | ID 别名映射（手写补丁） | ✅ 是（非 generated-json） |
| `external-data/shop_unlock_pools.json` | 商店解锁池（手写补丁） | ✅ 是（非 generated-json） |
| `external-data/unit_patches.json` | 单位数值补丁（手写补丁） | ✅ 是（非 generated-json） |
| `external-data/meta.json` | 元数据标注 | ✅ 是（非 generated-json） |
| `external-data/*.zip` | Excel 导出的原始压缩包 | ❌ 存档备份，不直接修改 |

## 修改数据的正确流程

```text
1. 修改 external-data/source-yaml/ 下对应的 .yml 文件
2. 运行 npm run data:build    # YAML → JSON 导出
3. 运行 npm run data:validate  # 数据完整性校验
4. 运行 npm test               # 游戏逻辑测试
5. 必要时运行 npm run gpt_test  # gpt_test.js 审计
6. 提交代码
```

### 快捷命令

```bash
npm run data:build    # 仅导出 YAML → JSON
npm run data:validate # 仅校验 YAML 完整性
npm run data:check    # 导出 + 校验（推荐日常使用）
node test.js          # 游戏测试
```

## 目录结构

```
external-data/
├── source-yaml/                    # ★ 人工维护源数据
│   ├── pal_units.yml               # Pal 单位主表（60 个）
│   ├── shop_config.yml             # 商店规则 + 来源 + 运行时配置
│   ├── hero_config.yml             # 英雄定义
│   ├── relic_config.yml            # 遗物定义（17 个）
│   ├── event_config.yml            # 事件定义（16 个）
│   ├── encounter_config.yml        # 遭遇战波次（10 天）
│   ├── battle_config.yml           # 战斗参数
│   ├── game_config.yml             # 游戏配置（经济/容量）
│   ├── round_config.yml            # 每日回合数
│   ├── terrain_config.yml          # 地形/陷阱定义
│   ├── action-slots/
│   │   ├── action_template_enriched.yml  # 行动模板（180 条）
│   │   └── action_growth_enriched.yml    # 行动成长（720 条）
│   └── attack-shapes/
│       ├── attack_shape_master.yml        # 22 种攻击形状主表
│       ├── attack_shape_cells.yml         # 形状单元格坐标
│       └── attack_shape_sd_replacement_22.yml  # SD 替换数据
│
├── generated-json/                 # ★ 自动生成（YAML → JSON）
│   ├── pal_units.json
│   ├── shop_config.json
│   ├── ...（同上结构）
│   ├── action-slots/...
│   └── attack-shapes/...
│
├── id_alias.json                   # 手写补丁：ID 别名映射
├── shop_unlock_pools.json          # 手写补丁：商店解锁池
├── unit_patches.json               # 手写补丁：单位数值
├── meta.json                       # 手写补丁：元数据标注
└── generated-json-bak/             # 备份（迁移时创建）
```

## 已迁移文件清单（15 个）

| # | YAML 路径 | 原 JSON 路径 | 数据规模 |
|---|---|---|---|
| 1 | `pal_units.yml` | `generated-json/pal_units.json` | 60 pal 单位 |
| 2 | `shop_config.yml` | `generated-json/shop_config.json` | 12 规则 + 60 来源 |
| 3 | `hero_config.yml` | `generated-json/hero_config.json` | 1 英雄 + 起始配置 |
| 4 | `relic_config.yml` | `generated-json/relic_config.json` | 17 遗物 |
| 5 | `event_config.yml` | `generated-json/event_config.json` | 16 事件 |
| 6 | `encounter_config.yml` | `generated-json/encounter_config.json` | 10+ 波次 |
| 7 | `battle_config.yml` | `generated-json/battle_config.json` | 战斗参数 |
| 8 | `game_config.yml` | `generated-json/game_config.json` | 经济/容量 |
| 9 | `round_config.yml` | `generated-json/round_config.json` | 10 天回合数 |
| 10 | `terrain_config.yml` | `generated-json/terrain_config.json` | 4 种地形 |
| 11 | `action-slots/action_template_enriched.yml` | `generated-json/action-slots/action_template_enriched.json` | 180 模板 |
| 12 | `action-slots/action_growth_enriched.yml` | `generated-json/action-slots/action_growth_enriched.json` | 720 成长 |
| 13 | `attack-shapes/attack_shape_master.yml` | `generated-json/attack-shapes/attack_shape_master.json` | 22 形状 |
| 14 | `attack-shapes/attack_shape_cells.yml` | `generated-json/attack-shapes/attack_shape_cells.json` | 188 坐标 |
| 15 | `attack-shapes/attack_shape_sd_replacement_22.yml` | `generated-json/attack-shapes/attack_shape_sd_replacement_22.json` | 22 替换 |

## 未迁移文件（保持原样）

以下文件不属于正式运行数据，无需 YAML 源：

- `generated-json/export_report.json` — Excel 导出报告
- `generated-json/legacy_data.json` — 旧系统兼容数据
- `generated-json/ysbzs_v3_combined_config.json` — 组合导出产物
- `generated-json/attack-shapes/attack_shape_export_report.json` — 导出报告
- `generated-json/attack-shapes/attack_shape_config.json` — 组合视图（数据在 master + cells + sd 中已覆盖）
- `generated-json/attack-shapes/attack_shape_global_rule.json` — 全局规则元数据
- `generated-json/attack-shapes/ysbzs_attack_shapes_rework_20260603.json` — 原始导出
- `generated-json/attack-shapes/action_slot_schema_patch.json` — Schema 补丁文档
- `generated-json/action-slots/action_slot_enrich_report.json` — 导入报告

## 禁止事项

1. **禁止手改 `external-data/generated-json/` 下的任何 JSON 文件。**
   - 所有数据修改必须通过 YAML 源。
   - 如果因为某些原因必须改 JSON，必须在提交注释中说明理由。
2. **禁止 YAML 与 JSON 字段不一致。**
   - 运行 `npm run data:build` 后 YAML → JSON 自动同步。
   - 运行 `npm run data:validate` 可检查数据完整性。
3. **禁止在非数据迁移任务中顺手修改数据结构或数值。**
   - 如需改数值，先确认是否与当前任务相关。
4. **禁止把运行时代码改成直接依赖 YAML。**
   - 浏览器运行时代码继续从 `generated-json/*.json` 加载。
   - `externalDataAdapter.js` 继续保持 JSON 加载方式。

## 运行时读取策略

- **浏览器**：`index.html` 从 `external-data/generated-json/` 通过 `fetch` 加载 JSON。
- **Node.js 测试**：`externalDataAdapter.js` 通过 `fs.readFileSync` 直接从 `generated-json/` 读取 JSON。
- 所有现有代码无需修改，运行时读取路径不变。

## scripts 说明

### `scripts/export_yaml_to_json.js`

- 读取 `external-data/source-yaml/**/*.yml` / `.yaml`。
- 按相同相对路径输出到 `external-data/generated-json/`。
- 输出格式：2 空格缩进、UTF-8、末尾换行。
- 解析失败 → `process.exit(1)`。
- 使用 `js-yaml` 库，不自己写 parser。

### `scripts/validate_yaml_data.js`

校验项：
1. ✅ 所有 YAML 文件能正常解析。
2. ✅ ID 唯一性：`unit_id`、`relic_id`、`event_id`、`shape_sn`、`wave_id`、`hero_id` 无重复。
3. ✅ 引用完整性：action template/growth 引用 pal_id 存在；shape_sn 引用存在于 attack_shape_master；shop_source 引用存在；event_reward 引用 relic_id/pal_id 存在。
4. ✅ 枚举合法性：element（fire/water/wind/earth）、quality（青铜/白银/黄金/钻石）、size（small/medium/large）。
5. ✅ 关键数量：attack_shape_master=22、core=12、reserve=10、pal≥60、template≥180、growth≥720。
6. ❌ 数值合法性：price≥0、slot_index∈{1,2,3}（发现后会 warn，非致命 error）。
