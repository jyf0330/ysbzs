# ysbzs Benchmark Fixtures

> 来源：`docs/01_游戏设计（策划主导）/关卡策划/` 下的 03_商店闭环 + 04_刷怪闭环 + 02_shop_config_bazaar  
> 状态：文档抽取，未经代码修改  
> 最后更新：2026-05-31

## 文件说明

| 文件 | 内容 | 记录数 |
|------|------|--------|
| `monster_types.json` | 12种怪物完整字段（HP/ATK/AP/Gold/Tags/Role/ability） | 12 |
| `combat_segments.json` | 20个战斗小段（Day/Phase/R1/R2/总HP/总ATK/回合数） | 20 |
| `shop_rules.json` | 大巴扎商店结构（摊位/标签/品级/保证位/刷新/冻结） | — |
| `economy_rules.json` | 10天经济闭环（收入/花费/余金/检查点） | 10天 |
| `ability_status.json` | 全部ability pending状态（怪物5+英雄7+T3/T4 4） | 16 |
| `legacy_ids.json` | 旧ID→新ID映射/alias/legacy标注 | 21 heroes |

## HP/ATK 自洽验证

- 20个战斗小段的文档 totalHP/totalATK 全部由 monster_types 自动计算验证
- 结果：**20/20 完全一致**
- 验证命令：`node -e "..."` 见本目录创建日志

## 已知文档-代码差异

| 差异点 | 文档值 | 代码值 | fixture基准 |
|--------|--------|--------|-------------|
| elite.hp | 20 | 18 | 文档(20) |
| boss.hp | boss5=35 | boss=30 | 文档boss5(35) |
| 代码monster种类 | 12种 | 6种(normal..boss) | 文档(12) |
| DAY_WAVE_CONFIG | Day1-10 | Day1-5 | — |
| DAY_ROUND_CONFIG | Day1-10 | Day1-5 | — |
| SHOP_POOLS | Day1-10 | Day1-5 | — |
| GRADE_BASE | 青铜2/白银4/黄金6/钻石8 | 同值 | PASS |
| SHOP_PRICE_CONFIG | 品级定价 | tier1:3/tier2:6 | 不一致 |

## 覆盖范围

- [x] 火伤害闭环
- [x] 中立召唤流闭环（不绑定水）
- [x] 10天完整节点
- [x] pT3/pT4 成长节点
- [x] 经济闭环推演
- [x] Monster ability pending
- [x] Hero ability pending
- [ ] 水治疗（二阶段）
- [ ] 风牵制（二阶段）
- [ ] 土阻挡（二阶段）
