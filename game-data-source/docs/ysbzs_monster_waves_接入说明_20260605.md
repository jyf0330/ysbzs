# ysbzs_monster_waves 接入说明

## 文件位置

- `external-data/20260605_敌人出题整理包/2_怪物模板表_机制ID版_20260605.xlsx`
- `external-data/20260605_敌人出题整理包/3_怪物波次表_机制ID版_20260605.xlsx`
- `external-data/20260605_敌人出题整理包/ysbzs_monster_templates_20260605.yaml`
- `external-data/20260605_敌人出题整理包/ysbzs_monster_waves_20260605.yaml`

## 1. 怪物模板表怎么读

- 一行就是一个可复用怪物模板，不带波次上下文。
- 程序主键是 `怪物ID`，不是中文名。
- `机制编号` 和 `机制ID` 顺序一一对应；如果 `机制ID=none`，说明这是纯面板模板。
- `机制参数` 是人读串，格式固定为 `mech_id(key=value,key=value);mech_id2(key=value)`。
- `面板分 = HP + 攻×3 + 防×3 + 盾×5 + 行动×5`。
- `机制分` 直接来自机制词条库 `机制分` 求和，必须是 8 的倍数。
- `威胁分 = 面板分 + 机制分`，用于波次总压力量化。

## 2. 怪物波次表怎么读

- 一行是某场战斗某回合的一组出怪记录，程序主键是 `波次ID + 出怪回合 + 怪物ID`。
- 同一个 `波次ID` 会重复多行；`本波总威胁分` 是整场战斗的总压力量，重复写回同波每一行，方便策划筛表。
- `推荐玩家强度` 一律按“4英雄总强度”口径写，不按当前 2 上阵实现口径写。
- `出现位置规则` 只允许 `front_cluster / front_split / mid_cluster / mid_split / back_corner / back_protected / escort_backline / boss_anchor`。
- `机制参数` 默认写该模板的有效参数；如果以后波次层需要轻度覆写，只能在同机制分档内改，不允许跨档偷改强度。

## 3. 机制ID如何从机制词条库校验

- 正式机制主键只认机制词条库 `内部ID`。
- 校验规则：所有非 `none` 的 `机制ID` 都必须命中 `1_机制词条库_魔塔尖塔可计算版_20260605.xlsx / 机制词条库 / 内部ID`。
- `机制编号` 只做策划复查，不做程序主键。
- 这轮没有新增机制ID，也没有改机制库定义。

## 4. 威胁分如何计算

- 模板面板分：`HP + 攻×3 + 防×3 + 盾×5 + 行动×5`。
- 模板威胁分：`面板分 + 机制分`。
- 波次本行威胁分：`模板威胁分 × 数量 × 出现回合修正`。
- 出现回合修正固定：`T1=1.30 / T2=1.20 / T3=1.10 / T4=1.00 / T5=0.90`。
- 本波总威胁分：同一个 `wave_id` 下全部本行威胁分求和。

## 5. 奖励档如何判断

- `5` 回合内清场：高奖励。
- `6-10` 回合清场：普通奖励或递减奖励。
- `10` 回合未清完：失败。
- 本轮奖励递减在 YAML `reward_modifier.decay_per_extra_turn` 中配置，供程序接时读取。

## 6. 失败惩罚如何接入

- 波次 YAML 的 `fail_penalty` 固定结构为：`{ castle_line_loss, self_resource_loss, economy_reward_multiplier }`。
- 接入时建议在战斗结算阶段按顺序处理：
  1. 扣城堡线。
  2. 扣自身状态/资源。
  3. 把经济收益乘上 `economy_reward_multiplier`。

## 7. REVIEW 项如何处理

- 这轮怪物模板和怪物波次不保留 `REVIEW` 项；预期为 `0`。
- 如果未来出现 `REVIEW`，处理顺序必须是：先补正式机制词条 -> 再替换模板/波次里的 `REVIEW`。

## 8. 哪些机制已用于怪物

- mech_armor_break
- mech_aura
- mech_break_castle
- mech_counter
- mech_curse
- mech_damage_cap
- mech_firm_threshold
- mech_first_hit_block
- mech_grow_attack
- mech_grow_shield
- mech_multi_hit
- mech_opening_shield
- mech_pierce_shield
- mech_poison
- mech_revive
- mech_self_destruct
- mech_shield_regen
- mech_shielded_fragile
- mech_steal_reward
- mech_summon
- mech_weaken
- mech_zone_pressure

## 9. 哪些机制暂未使用

- mech_firm_glancing
- mech_first_strike
- mech_fixed_damage
- mech_ignore_defense
- mech_lifesteal
- mech_shield_refresh
- mech_shield_to_attack
- mech_true_damage

## 10. future canonical YAML 落点

- 未来正式落点建议：
  - `game-data-source/yaml/monster_templates.yml`
  - `game-data-source/yaml/monster_waves.yml`
- 这轮不直接并入正式 `game-data-source/yaml/`，原因是当前任务只做数据产物，不做运行时接线。
- 这两个文件建议先放 `game-data-source/yaml/` 根目录，避免踩到 `scripts/validate_yaml_data.js` 目前只扫描根目录和一级子目录的限制。
- 接线时不要直接覆盖 `encounter_config.yml`；应新增 monster 体系文件，再由下一轮任务决定 `waves.js / externalDataAdapter.js` 读取路径。

## 11. 校验报告

- 机制库机制总数：30
- 怪物模板总数：34
- 波次总数：20
- Day1-Day10 是否完整：是
- 使用到的机制ID列表：mech_armor_break, mech_aura, mech_break_castle, mech_counter, mech_curse, mech_damage_cap, mech_firm_threshold, mech_first_hit_block, mech_grow_attack, mech_grow_shield, mech_multi_hit, mech_opening_shield, mech_pierce_shield, mech_poison, mech_revive, mech_self_destruct, mech_shield_regen, mech_shielded_fragile, mech_steal_reward, mech_summon, mech_weaken, mech_zone_pressure
- 未使用机制ID列表：mech_firm_glancing, mech_first_strike, mech_fixed_damage, mech_ignore_defense, mech_lifesteal, mech_shield_refresh, mech_shield_to_attack, mech_true_damage
- REVIEW 项列表：无
- 无效机制ID列表：无
- 空机制怪物数量：2

### 公式校验

- 模板 `面板分` 已按统一公式重算并对齐。
- 模板 `机制分` 已按机制库分值求和并对齐。
- 模板 `威胁分` 已按 `面板分 + 机制分` 对齐。
- 波次 `本行威胁分 / 本波总威胁分` 已按回合修正重算并对齐。

### 结构校验

- 模板数 `>= 30`：通过。
- 波次数 `= 20`：通过。
- 每波出怪回合覆盖 `1..5`：通过。
- 所有非 `none` 机制都能在机制库 `内部ID` 中命中：通过。
- `REVIEW` 预期为 `0`：通过。

### 波次预算摘要

| 波次ID | 推荐强度 | 目标威胁预算 | 实际总威胁 |
|---|---:|---:|---:|
| wave_d01_morning | 160-200 | 112 | 147.4 |
| wave_d01_afternoon | 220-280 | 192 | 212.6 |
| wave_d02_morning | 260-320 | 224 | 254 |
| wave_d02_afternoon | 300-360 | 280 | 294.9 |
| wave_d03_morning | 340-420 | 320 | 327.5 |
| wave_d03_afternoon | 380-460 | 384 | 405.3 |
| wave_d04_morning | 420-520 | 416 | 409.1 |
| wave_d04_afternoon | 480-580 | 512 | 516.2 |
| wave_d05_morning | 560-680 | 568 | 589.6 |
| wave_d05_afternoon | 620-760 | 688 | 663.4 |
| wave_d06_morning | 680-820 | 720 | 720.8 |
| wave_d06_afternoon | 760-900 | 864 | 913.8 |
| wave_d07_morning | 840-980 | 912 | 899.8 |
| wave_d07_afternoon | 920-1080 | 1080 | 1085.4 |
| wave_d08_morning | 1000-1160 | 1120 | 1164 |
| wave_d08_afternoon | 1080-1240 | 1296 | 1317.5 |
| wave_d09_morning | 1120-1280 | 1296 | 1307.1 |
| wave_d09_afternoon | 1200-1360 | 1488 | 1488 |
| wave_d10_morning | 1280-1440 | 1520 | 1506.9 |
| wave_d10_afternoon | 1360-1560 | 1752 | 1774.6 |