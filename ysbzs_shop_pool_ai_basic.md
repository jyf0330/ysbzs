# 元素背包史商店物品库 AI Basic

> 用途：给 AI / Codex 读取的基础物品库。已删除“为什么买、等什么组件、设计灵感、稀有理由”等策划解释字段。

## 数量

- 总计：60
- 英雄：30
- 遗物：15
- 消耗品 / 强化品：15

## 核心规则

- 品质：Bronze / Silver / Gold / Diamond。
- 商店分类：hero / relic / consumable。
- 强化品目前归入 consumable，但 tag 中包含 upgrade。
- 英雄拥有 3 个槽位；上阵最多 2 个英雄，总计 6 个槽位。
- G.slots 是战斗快照，由上阵英雄生成，不是商品源数据。

## 英雄 hero

| 品质 | 名称 | 价格 | 流派 | 标签 | 槽1 | 槽2 | 槽3 | 被动 |
|---|---|---:|---|---|---|---|---|---|
| Bronze | 土甲龟<br>`hero_earth_turtle` | 3 | 护城/挡怪 | hero, earth, guard, castle | 土点:目标格+1土 | 土墙:前方2格+1土 | 护城土:城堡前3格+1土 | 自身附近怪物仇恨+1 |
| Bronze | 拾荒商人<br>`hero_scavenger` | 4 | 经济滚雪球 | hero, economy, gold, shop | 小刀:目标格+1随机元素 | 捡钱:本波首次击杀+1金 | 旧货袋:战后给1个随机强化品 | 每晚第一次卖出返还+1金 |
| Bronze | 水壶娃<br>`hero_water_kettle` | 3 | 护城续航 | hero, water, castle, heal | 水点:目标格+1水 | 护城水:城堡周围1圈+1水 | 水线:前方2格+1水 | 每波结束若城堡未受伤，城堡+1血 |
| Bronze | 泉水童子<br>`hero_spring_child` | 3 | 净化/救场 | hero, water, cleanse, heal | 水点:目标格+1水 | 净化:移除我方附近1层负面元素 | 水环:单位周围4格+1水 | 城堡低于50%血时第一次治疗+2 |
| Bronze | 火星猫<br>`hero_spark_cat` | 3 | 轻量连动 | hero, fire, wind, sequence | 火爪:目标格+1火 | 风步:前方2格+1风 | 扑击:最近怪物格+1火 | 若同回合先用风槽，下一火槽中心+1火 |
| Bronze | 火苗鼠<br>`hero_fire_mouse` | 3 | 火叠层/新手输出 | hero, fire, stack, tutorial | 火点:目标格+1火 | 火点:目标格+1火 | 小十字火:中心/上下左右+1火 | 命中已有火层的目标时，预览强调总火伤 |
| Bronze | 爆竹匠<br>`hero_firecracker` | 4 | 空格引爆 | hero, fire, explode, field | 火点:目标格+1火 | 引信:空格+1火并显示引爆预警 | 火十字:中心/上下左右+1火 | 空格已有2火时高亮危险区 |
| Bronze | 风雀<br>`hero_wind_sparrow` | 3 | 远程封路 | hero, wind, line, range | 风点:目标格+1风 | 风线:前方3格+1风 | 斜风:斜向2格+1风 | 每天第一次改方向免费 |
| Silver | 守城工匠<br>`hero_wall_builder` | 5 | 城堡工程 | hero, earth, water, castle, engineer | 补墙:城堡前1格+2土 | 排水沟:城堡周围+1水 | 拒马:最近怪物路径前方+1土 | 城堡受击后，下一次土槽+1层 |
| Silver | 海灯守卫<br>`hero_sea_lamp_guard` | 5 | 减伤/护城 | hero, water, defense, castle | 海灯:城堡周围+1水 | 潮盾:最近友方单位周围+1水 | 退潮:最近怪物路径格+1水 | 每波第一次城堡受击-1 |
| Silver | 炼金商人<br>`hero_alchemist` | 5 | 元素转化经济 | hero, economy, convert, element | 酸瓶:目标格+1随机元素 | 精炼:把背包1个强化品转成同价元素 | 估价:本晚下次卖出+1金 | 每晚第一次购买强化品-1金 |
| Silver | 烈焰术士<br>`hero_flame_mage` | 5 | 单格高叠层 | hero, fire, carry, stack | 灼烧:目标格+2火 | 火线:前方2格+1火 | 焦点:若目标已有火则+2火 | 火击杀后，下个火槽+1层 |
| Silver | 爆蜜蜂<br>`hero_bomb_bee` | 5 | 连锁爆炸 | hero, fire, wind, explode, chain | 蜂针:目标格+1火 | 蜂群:目标周围随机2格+1风 | 爆蜜:若空格爆炸，本格相邻随机格+1火 | 每天第一次空格爆炸后，随机相邻格+1火 |
| Silver | 疾风猎手<br>`hero_gale_hunter` | 5 | 远程穿透 | hero, wind, range, pierce | 猎矢:直线4格+1风 | 标记:最近精英怪+1风且预警 | 穿风:直线穿透怪物+1风 | 攻击被标记怪物时，中心额外+1风 |
| Silver | 金币鸭<br>`hero_coin_duck` | 5 | 存钱/利息 | hero, economy, gold, interest | 啄击:目标格+1随机元素 | 藏币:本晚结束若留满3金，下晚+1金 | 砍价:下次刷新-1金 | saved_coins 达上限时，第一次购买-1金 |
| Silver | 镜狐<br>`hero_mirror_fox` | 5 | 轻复制/补槽 | hero, copy, flex, utility | 镜点:复制左侧单位槽1的元素，目标格+1层 | 镜线:复制左侧单位槽2的元素，前方2格+1层 | 虚影:本槽随机复制自身槽1或槽2 | 只能复制元素和形状，不复制被动 |
| Gold | 守城祭司<br>`hero_castle_priest` | 7 | 高压护城 | hero, water, earth, castle, late | 祈水:城堡周围+2水 | 立碑:城堡前方十字+1土 | 赦免:城堡本波首次受击-2 | 城堡受击后，下波开局城堡前+1土 |
| Gold | 宝库会计<br>`hero_vault_accountant` | 7 | 高阶经济/商店控制 | hero, economy, shop, reroll | 铁算盘:目标格+1随机元素 | 盘点:查看下次刷新首个商品类型 | 调货:本晚刷新后可冻结额外1个 | 每晚第一次刷新后，若未购买，返1金 |
| Gold | 毒藤园丁<br>`hero_poison_gardener` | 7 | 延迟伤害/区域封锁 | hero, earth, water, poison, zone | 毒藤:目标格+1土 | 湿土:目标周围+1水 | 缠绕:已有土水的格子额外+1土 | 怪物停在土水同格时，预览额外-1 |
| Gold | 焰舞者<br>`hero_inferno_dancer` | 7 | 高频火连动 | hero, fire, multicast, carry | 舞火:目标格+2火 | 回旋:相邻4格+1火 | 终舞:若本回合已用2个火槽，目标格+3火 | 每使用一个火槽，终舞预览伤害+1 |
| Gold | 磁石魔像<br>`hero_magnet_golem` | 7 | 聚怪/爆炸准备 | hero, earth, wind, pull, combo | 磁点:目标格+1土 | 牵引:最近怪物路径向目标方向偏移预览 | 聚场:目标周围4格+1风 | 被牵引怪物受到爆炸预览+1 |
| Gold | 红线猎人<br>`hero_redline_hunter` | 7 | 标记/猎杀/爆发 | hero, fire, wind, mark, hunter, elite | 红线:标记最高血怪物并+1风 | 猎火:被标记目标格+2火 | 追猎:若目标已被标记，本槽额外+1火并显示斩杀预警 | 被标记怪物受到火或风伤害时，预览额外-1，每波最多3次 |
| Gold | 风暴绘图师<br>`hero_storm_cartographer` | 7 | 大范围路径控制 | hero, wind, path, control | 测风:标记最近出怪路径3格 | 风暴线:标记路径每格+1风 | 改航:本回合一个槽可重定向 | 被标记路径上的怪物受到风伤预警+1 |
| Gold | 骨契书记<br>`hero_bone_scribe` | 7 | 卖出返强化/轻献祭 | hero, sacrifice, sell, convert | 骨刺:目标格+1土 | 契约:卖出单位时获得其主题元素 | 抄录:本晚第一次卖出返还+1强化品 | 卖出同名单位碎片时额外+1金 |
| Diamond | 世界树幼体<br>`hero_world_tree_seed` | 11 | 多元素终局 | hero, diamond, multi_element, late | 根须:目标格按自身最高强化元素+2层 | 花冠:随机相邻4格各+1不同元素 | 年轮:若目标有2种元素，各额外+1层 | 使用元素强化品时，若不是当前主题元素，返还1金上限每晚1次 |
| Diamond | 日轮爆破手<br>`hero_sun_bomber` | 10 | 终局联动爆炸 | hero, diamond, fire, explode, finisher | 日火:目标格+3火 | 热浪:目标周围8格+1火 | 日轮:若空格达到引爆阈值，爆炸中心+4 | 每天第一次火击杀后，随机空格+1火 |
| Diamond | 月账老板<br>`hero_moon_ledger` | 10 | 终局商店控制 | hero, diamond, economy, shop, control | 月币:目标格+1随机元素 | 订货:下次刷新至少出现1个指定类型 | 赊账:本晚一次购买可延后支付1金 | 每晚第一次冻结免费且冻结上限+1 |
| Diamond | 铸城王<br>`hero_city_wall_king` | 10 | 终局护城大核 | hero, diamond, earth, castle, core | 王墙:城堡前十字+2土 | 号令:所有土槽本波+1层 | 不破:城堡本波首次受击-3 | 每次城堡未受伤过波，下波开局城堡前+1土 |
| Diamond | 雷羽鹰<br>`hero_thunder_eagle` | 10 | 终局远程穿透 | hero, diamond, wind, range, pierce | 雷羽:直线5格+2风 | 鹰眼:标记最远怪物且+1风 | 贯雷:穿透直线+2风 | 攻击被标记目标时，本次穿透额外+1层 |
| Diamond | 预兆双子<br>`hero_omen_twins` | 11 | 预览操控/复制行动 | hero, diamond, copy, trigger, flex | 预兆:显示本回合最高伤槽 | 回响:复制该槽元素和形状但层数-1 | 定命:锁定一个目标格，本回合所有随机效果优先靠近 | 每天第一次复制不复制被动，只复制槽输出 |

## 遗物 relic

| 品质 | 名称 | 价格 | 流派 | 标签 | 效果 |
|---|---|---:|---|---|---|
| Bronze | 商会会员卡<br>`relic_merchant_card` | 5 | 刷新/折扣 | relic, economy, shop | 每晚第一次刷新免费 |
| Bronze | 护城石<br>`relic_castle_stone` | 4 | 城堡减伤 | relic, castle, defense | 城堡每次受击-1，最低1 |
| Bronze | 旧引信<br>`relic_old_fuse` | 4 | 爆炸放大 | relic, explode, fire | 空格爆炸中心+1伤害 |
| Bronze | 火花账本<br>`relic_fire_ledger` | 4 | 火击杀经济 | relic, fire, gold | 火元素击杀时+1金，每波最多1次 |
| Silver | 土偶契约<br>`relic_thorn_contract` | 7 | 反击护城 | relic, earth, castle, retaliate | 每天第一次怪物攻击城堡时，城堡前+2土 |
| Silver | 水壶挂坠<br>`relic_water_gourd` | 6 | 续航 | relic, water, heal | 每波结束若场上有水层，城堡+1血 |
| Silver | 爆裂核心<br>`relic_blast_core` | 7 | 爆炸范围 | relic, fire, explode, area | 每天第一次空格爆炸范围+1 |
| Silver | 风向罗盘<br>`relic_wind_compass` | 6 | 方向控制 | relic, wind, direction | 每天第一次改变槽位方向免费 |
| Silver | 黑市账本<br>`relic_black_market` | 7 | 风险经济 | relic, economy, risk | 每晚可少1城堡血换2金 |
| Gold | 元素熔炉<br>`relic_element_furnace` | 8 | 多元素转化 | relic, multi_element, convert | 每晚可把1个元素强化品转为另一个随机元素 |
| Gold | 猎人标记<br>`relic_hunter_mark` | 8 | 标记/集火 | relic, wind, mark, hunter | 每波开始标记最高血怪，该怪受到风伤+1 |
| Gold | 镜面护符<br>`relic_mirror_charm` | 8 | 复制/放大 | relic, copy, trigger, flex | 每天第一次使用槽位时，若旁边单位同元素，该槽+1层 |
| Diamond | 最后火星<br>`relic_last_spark` | 10 | 火流斩杀 | relic, diamond, fire, finisher | 目标被火伤后若血量<=3，直接击杀普通怪 |
| Diamond | 王旗<br>`relic_royal_banner` | 10 | 全局放大 | relic, diamond, global, buff | 两个上阵单位所有第1槽+1层 |
| Diamond | 重力珠<br>`relic_gravity_orb` | 11 | 聚怪联动 | relic, diamond, pull, aoe | 每波开始最近3只怪路径向同一热点偏移预览 |

## 消耗品 / 强化品 consumable

| 品质 | 名称 | 价格 | 流派 | 标签 | 效果 |
|---|---|---:|---|---|---|
| Bronze | 元素包<br>`cons_element_pack` | 3 | 随机资源 | consumable, upgrade, random | 获得3个随机基础元素强化品 |
| Bronze | 土晶强化品<br>`cons_earth_crystal` | 1 | 槽位改元素/护城 | consumable, upgrade, earth | 对一个槽使用: el改为earth |
| Bronze | 急救包<br>`cons_first_aid` | 2 | 生命救场 | consumable, one_shot, heal | 一个单位+5血或城堡+3血 |
| Bronze | 水滴强化品<br>`cons_water_drop` | 1 | 槽位改元素 | consumable, upgrade, water | 对一个槽使用: el改为water |
| Bronze | 火种强化品<br>`cons_fire_seed` | 1 | 槽位改元素 | consumable, upgrade, fire | 对一个槽使用: el改为fire |
| Bronze | 风向针<br>`cons_wind_vane` | 2 | 方向救场 | consumable, one_shot, direction | 改变一个未使用槽位方向 |
| Bronze | 风羽强化品<br>`cons_wind_feather` | 1 | 槽位改元素/方向 | consumable, upgrade, wind | 对一个槽使用: el改为wind |
| Silver | 手动引爆符<br>`cons_manual_fuse` | 4 | 临时爆炸救场 | consumable, one_shot, explode | 选择一个已有2层同元素的空格，本波临时视为达阈值引爆 |
| Silver | 折扣券<br>`cons_discount_ticket` | 3 | 减费/找核心 | consumable, economy, discount | 下一个购买商品-2金，最低1 |
| Silver | 浓缩火种<br>`cons_condensed_fire` | 3 | 槽位加层 | consumable, upgrade, fire, layer | 对火槽使用: layerBonus+1，单槽最多+2 |
| Silver | 深水瓶<br>`cons_deep_water` | 3 | 槽位加层/回血 | consumable, upgrade, water, layer | 对水槽使用: layerBonus+1，单槽最多+2 |
| Silver | 穿透羽<br>`cons_pierce_feather` | 4 | 穿透强化 | consumable, upgrade, wind, pierce | 对风线槽使用: 第一次命中后继续影响后1格 |
| Silver | 重土块<br>`cons_heavy_stone` | 3 | 槽位加层/嘲讽 | consumable, upgrade, earth, guard | 对土槽使用: layerBonus+1，单槽最多+2 |
| Silver | 重铸骰<br>`cons_reroll_dice` | 3 | 单格刷新 | consumable, economy, reroll | 重置商店中1个未冻结商品 |
| Gold | 黑市契约<br>`cons_black_contract` | 6 | 高风险换核心 | consumable, economy, risk | 城堡-2血，立即刷新并保证出现1个高一级质量商品 |

## 机器可读 JSON

```json
{
  "summary": {
    "total": 60,
    "hero": 30,
    "relic": 15,
    "consumable": 15
  },
  "items": [
    {
      "id": "hero_fire_mouse",
      "type": "hero",
      "name": "火苗鼠",
      "quality": "Bronze",
      "price": "3",
      "theme": "火",
      "archetype": "火叠层/新手输出",
      "tags": [
        "hero",
        "fire",
        "stack",
        "tutorial"
      ],
      "slot1": "火点:目标格+1火",
      "slot2": "火点:目标格+1火",
      "slot3": "小十字火:中心/上下左右+1火",
      "passive": "命中已有火层的目标时，预览强调总火伤"
    },
    {
      "id": "hero_water_kettle",
      "type": "hero",
      "name": "水壶娃",
      "quality": "Bronze",
      "price": "3",
      "theme": "水",
      "archetype": "护城续航",
      "tags": [
        "hero",
        "water",
        "castle",
        "heal"
      ],
      "slot1": "水点:目标格+1水",
      "slot2": "护城水:城堡周围1圈+1水",
      "slot3": "水线:前方2格+1水",
      "passive": "每波结束若城堡未受伤，城堡+1血"
    },
    {
      "id": "hero_wind_sparrow",
      "type": "hero",
      "name": "风雀",
      "quality": "Bronze",
      "price": "3",
      "theme": "风",
      "archetype": "远程封路",
      "tags": [
        "hero",
        "wind",
        "line",
        "range"
      ],
      "slot1": "风点:目标格+1风",
      "slot2": "风线:前方3格+1风",
      "slot3": "斜风:斜向2格+1风",
      "passive": "每天第一次改方向免费"
    },
    {
      "id": "hero_earth_turtle",
      "type": "hero",
      "name": "土甲龟",
      "quality": "Bronze",
      "price": "3",
      "theme": "土",
      "archetype": "护城/挡怪",
      "tags": [
        "hero",
        "earth",
        "guard",
        "castle"
      ],
      "slot1": "土点:目标格+1土",
      "slot2": "土墙:前方2格+1土",
      "slot3": "护城土:城堡前3格+1土",
      "passive": "自身附近怪物仇恨+1"
    },
    {
      "id": "hero_firecracker",
      "type": "hero",
      "name": "爆竹匠",
      "quality": "Bronze",
      "price": "4",
      "theme": "火",
      "archetype": "空格引爆",
      "tags": [
        "hero",
        "fire",
        "explode",
        "field"
      ],
      "slot1": "火点:目标格+1火",
      "slot2": "引信:空格+1火并显示引爆预警",
      "slot3": "火十字:中心/上下左右+1火",
      "passive": "空格已有2火时高亮危险区"
    },
    {
      "id": "hero_scavenger",
      "type": "hero",
      "name": "拾荒商人",
      "quality": "Bronze",
      "price": "4",
      "theme": "经济",
      "archetype": "经济滚雪球",
      "tags": [
        "hero",
        "economy",
        "gold",
        "shop"
      ],
      "slot1": "小刀:目标格+1随机元素",
      "slot2": "捡钱:本波首次击杀+1金",
      "slot3": "旧货袋:战后给1个随机强化品",
      "passive": "每晚第一次卖出返还+1金"
    },
    {
      "id": "hero_spring_child",
      "type": "hero",
      "name": "泉水童子",
      "quality": "Bronze",
      "price": "3",
      "theme": "水",
      "archetype": "净化/救场",
      "tags": [
        "hero",
        "water",
        "cleanse",
        "heal"
      ],
      "slot1": "水点:目标格+1水",
      "slot2": "净化:移除我方附近1层负面元素",
      "slot3": "水环:单位周围4格+1水",
      "passive": "城堡低于50%血时第一次治疗+2"
    },
    {
      "id": "hero_spark_cat",
      "type": "hero",
      "name": "火星猫",
      "quality": "Bronze",
      "price": "3",
      "theme": "火风",
      "archetype": "轻量连动",
      "tags": [
        "hero",
        "fire",
        "wind",
        "sequence"
      ],
      "slot1": "火爪:目标格+1火",
      "slot2": "风步:前方2格+1风",
      "slot3": "扑击:最近怪物格+1火",
      "passive": "若同回合先用风槽，下一火槽中心+1火"
    },
    {
      "id": "hero_flame_mage",
      "type": "hero",
      "name": "烈焰术士",
      "quality": "Silver",
      "price": "5",
      "theme": "火",
      "archetype": "单格高叠层",
      "tags": [
        "hero",
        "fire",
        "carry",
        "stack"
      ],
      "slot1": "灼烧:目标格+2火",
      "slot2": "火线:前方2格+1火",
      "slot3": "焦点:若目标已有火则+2火",
      "passive": "火击杀后，下个火槽+1层"
    },
    {
      "id": "hero_wall_builder",
      "type": "hero",
      "name": "守城工匠",
      "quality": "Silver",
      "price": "5",
      "theme": "土水",
      "archetype": "城堡工程",
      "tags": [
        "hero",
        "earth",
        "water",
        "castle",
        "engineer"
      ],
      "slot1": "补墙:城堡前1格+2土",
      "slot2": "排水沟:城堡周围+1水",
      "slot3": "拒马:最近怪物路径前方+1土",
      "passive": "城堡受击后，下一次土槽+1层"
    },
    {
      "id": "hero_gale_hunter",
      "type": "hero",
      "name": "疾风猎手",
      "quality": "Silver",
      "price": "5",
      "theme": "风",
      "archetype": "远程穿透",
      "tags": [
        "hero",
        "wind",
        "range",
        "pierce"
      ],
      "slot1": "猎矢:直线4格+1风",
      "slot2": "标记:最近精英怪+1风且预警",
      "slot3": "穿风:直线穿透怪物+1风",
      "passive": "攻击被标记怪物时，中心额外+1风"
    },
    {
      "id": "hero_alchemist",
      "type": "hero",
      "name": "炼金商人",
      "quality": "Silver",
      "price": "5",
      "theme": "经济/元素",
      "archetype": "元素转化经济",
      "tags": [
        "hero",
        "economy",
        "convert",
        "element"
      ],
      "slot1": "酸瓶:目标格+1随机元素",
      "slot2": "精炼:把背包1个强化品转成同价元素",
      "slot3": "估价:本晚下次卖出+1金",
      "passive": "每晚第一次购买强化品-1金"
    },
    {
      "id": "hero_sea_lamp_guard",
      "type": "hero",
      "name": "海灯守卫",
      "quality": "Silver",
      "price": "5",
      "theme": "水",
      "archetype": "减伤/护城",
      "tags": [
        "hero",
        "water",
        "defense",
        "castle"
      ],
      "slot1": "海灯:城堡周围+1水",
      "slot2": "潮盾:最近友方单位周围+1水",
      "slot3": "退潮:最近怪物路径格+1水",
      "passive": "每波第一次城堡受击-1"
    },
    {
      "id": "hero_bomb_bee",
      "type": "hero",
      "name": "爆蜜蜂",
      "quality": "Silver",
      "price": "5",
      "theme": "火风",
      "archetype": "连锁爆炸",
      "tags": [
        "hero",
        "fire",
        "wind",
        "explode",
        "chain"
      ],
      "slot1": "蜂针:目标格+1火",
      "slot2": "蜂群:目标周围随机2格+1风",
      "slot3": "爆蜜:若空格爆炸，本格相邻随机格+1火",
      "passive": "每天第一次空格爆炸后，随机相邻格+1火"
    },
    {
      "id": "hero_coin_duck",
      "type": "hero",
      "name": "金币鸭",
      "quality": "Silver",
      "price": "5",
      "theme": "经济",
      "archetype": "存钱/利息",
      "tags": [
        "hero",
        "economy",
        "gold",
        "interest"
      ],
      "slot1": "啄击:目标格+1随机元素",
      "slot2": "藏币:本晚结束若留满3金，下晚+1金",
      "slot3": "砍价:下次刷新-1金",
      "passive": "saved_coins 达上限时，第一次购买-1金"
    },
    {
      "id": "hero_mirror_fox",
      "type": "hero",
      "name": "镜狐",
      "quality": "Silver",
      "price": "5",
      "theme": "通用",
      "archetype": "轻复制/补槽",
      "tags": [
        "hero",
        "copy",
        "flex",
        "utility"
      ],
      "slot1": "镜点:复制左侧单位槽1的元素，目标格+1层",
      "slot2": "镜线:复制左侧单位槽2的元素，前方2格+1层",
      "slot3": "虚影:本槽随机复制自身槽1或槽2",
      "passive": "只能复制元素和形状，不复制被动"
    },
    {
      "id": "hero_castle_priest",
      "type": "hero",
      "name": "守城祭司",
      "quality": "Gold",
      "price": "7",
      "theme": "水土",
      "archetype": "高压护城",
      "tags": [
        "hero",
        "water",
        "earth",
        "castle",
        "late"
      ],
      "slot1": "祈水:城堡周围+2水",
      "slot2": "立碑:城堡前方十字+1土",
      "slot3": "赦免:城堡本波首次受击-2",
      "passive": "城堡受击后，下波开局城堡前+1土"
    },
    {
      "id": "hero_inferno_dancer",
      "type": "hero",
      "name": "焰舞者",
      "quality": "Gold",
      "price": "7",
      "theme": "火",
      "archetype": "高频火连动",
      "tags": [
        "hero",
        "fire",
        "multicast",
        "carry"
      ],
      "slot1": "舞火:目标格+2火",
      "slot2": "回旋:相邻4格+1火",
      "slot3": "终舞:若本回合已用2个火槽，目标格+3火",
      "passive": "每使用一个火槽，终舞预览伤害+1"
    },
    {
      "id": "hero_storm_cartographer",
      "type": "hero",
      "name": "风暴绘图师",
      "quality": "Gold",
      "price": "7",
      "theme": "风",
      "archetype": "大范围路径控制",
      "tags": [
        "hero",
        "wind",
        "path",
        "control"
      ],
      "slot1": "测风:标记最近出怪路径3格",
      "slot2": "风暴线:标记路径每格+1风",
      "slot3": "改航:本回合一个槽可重定向",
      "passive": "被标记路径上的怪物受到风伤预警+1"
    },
    {
      "id": "hero_vault_accountant",
      "type": "hero",
      "name": "宝库会计",
      "quality": "Gold",
      "price": "7",
      "theme": "经济",
      "archetype": "高阶经济/商店控制",
      "tags": [
        "hero",
        "economy",
        "shop",
        "reroll"
      ],
      "slot1": "铁算盘:目标格+1随机元素",
      "slot2": "盘点:查看下次刷新首个商品类型",
      "slot3": "调货:本晚刷新后可冻结额外1个",
      "passive": "每晚第一次刷新后，若未购买，返1金"
    },
    {
      "id": "hero_bone_scribe",
      "type": "hero",
      "name": "骨契书记",
      "quality": "Gold",
      "price": "7",
      "theme": "土/献祭",
      "archetype": "卖出返强化/轻献祭",
      "tags": [
        "hero",
        "sacrifice",
        "sell",
        "convert"
      ],
      "slot1": "骨刺:目标格+1土",
      "slot2": "契约:卖出单位时获得其主题元素",
      "slot3": "抄录:本晚第一次卖出返还+1强化品",
      "passive": "卖出同名单位碎片时额外+1金"
    },
    {
      "id": "hero_poison_gardener",
      "type": "hero",
      "name": "毒藤园丁",
      "quality": "Gold",
      "price": "7",
      "theme": "土水",
      "archetype": "延迟伤害/区域封锁",
      "tags": [
        "hero",
        "earth",
        "water",
        "poison",
        "zone"
      ],
      "slot1": "毒藤:目标格+1土",
      "slot2": "湿土:目标周围+1水",
      "slot3": "缠绕:已有土水的格子额外+1土",
      "passive": "怪物停在土水同格时，预览额外-1"
    },
    {
      "id": "hero_magnet_golem",
      "type": "hero",
      "name": "磁石魔像",
      "quality": "Gold",
      "price": "7",
      "theme": "土风",
      "archetype": "聚怪/爆炸准备",
      "tags": [
        "hero",
        "earth",
        "wind",
        "pull",
        "combo"
      ],
      "slot1": "磁点:目标格+1土",
      "slot2": "牵引:最近怪物路径向目标方向偏移预览",
      "slot3": "聚场:目标周围4格+1风",
      "passive": "被牵引怪物受到爆炸预览+1"
    },
    {
      "id": "hero_city_wall_king",
      "type": "hero",
      "name": "铸城王",
      "quality": "Diamond",
      "price": "10",
      "theme": "土",
      "archetype": "终局护城大核",
      "tags": [
        "hero",
        "diamond",
        "earth",
        "castle",
        "core"
      ],
      "slot1": "王墙:城堡前十字+2土",
      "slot2": "号令:所有土槽本波+1层",
      "slot3": "不破:城堡本波首次受击-3",
      "passive": "每次城堡未受伤过波，下波开局城堡前+1土"
    },
    {
      "id": "hero_sun_bomber",
      "type": "hero",
      "name": "日轮爆破手",
      "quality": "Diamond",
      "price": "10",
      "theme": "火",
      "archetype": "终局联动爆炸",
      "tags": [
        "hero",
        "diamond",
        "fire",
        "explode",
        "finisher"
      ],
      "slot1": "日火:目标格+3火",
      "slot2": "热浪:目标周围8格+1火",
      "slot3": "日轮:若空格达到引爆阈值，爆炸中心+4",
      "passive": "每天第一次火击杀后，随机空格+1火"
    },
    {
      "id": "hero_thunder_eagle",
      "type": "hero",
      "name": "雷羽鹰",
      "quality": "Diamond",
      "price": "10",
      "theme": "风",
      "archetype": "终局远程穿透",
      "tags": [
        "hero",
        "diamond",
        "wind",
        "range",
        "pierce"
      ],
      "slot1": "雷羽:直线5格+2风",
      "slot2": "鹰眼:标记最远怪物且+1风",
      "slot3": "贯雷:穿透直线+2风",
      "passive": "攻击被标记目标时，本次穿透额外+1层"
    },
    {
      "id": "hero_moon_ledger",
      "type": "hero",
      "name": "月账老板",
      "quality": "Diamond",
      "price": "10",
      "theme": "经济",
      "archetype": "终局商店控制",
      "tags": [
        "hero",
        "diamond",
        "economy",
        "shop",
        "control"
      ],
      "slot1": "月币:目标格+1随机元素",
      "slot2": "订货:下次刷新至少出现1个指定类型",
      "slot3": "赊账:本晚一次购买可延后支付1金",
      "passive": "每晚第一次冻结免费且冻结上限+1"
    },
    {
      "id": "hero_world_tree_seed",
      "type": "hero",
      "name": "世界树幼体",
      "quality": "Diamond",
      "price": "11",
      "theme": "四色",
      "archetype": "多元素终局",
      "tags": [
        "hero",
        "diamond",
        "multi_element",
        "late"
      ],
      "slot1": "根须:目标格按自身最高强化元素+2层",
      "slot2": "花冠:随机相邻4格各+1不同元素",
      "slot3": "年轮:若目标有2种元素，各额外+1层",
      "passive": "使用元素强化品时，若不是当前主题元素，返还1金上限每晚1次"
    },
    {
      "id": "hero_omen_twins",
      "type": "hero",
      "name": "预兆双子",
      "quality": "Diamond",
      "price": "11",
      "theme": "通用/预览",
      "archetype": "预览操控/复制行动",
      "tags": [
        "hero",
        "diamond",
        "copy",
        "trigger",
        "flex"
      ],
      "slot1": "预兆:显示本回合最高伤槽",
      "slot2": "回响:复制该槽元素和形状但层数-1",
      "slot3": "定命:锁定一个目标格，本回合所有随机效果优先靠近",
      "passive": "每天第一次复制不复制被动，只复制槽输出"
    },
    {
      "id": "relic_fire_ledger",
      "type": "relic",
      "name": "火花账本",
      "quality": "Bronze",
      "price": "4",
      "theme": "火",
      "archetype": "火击杀经济",
      "tags": [
        "relic",
        "fire",
        "gold"
      ],
      "effect": "火元素击杀时+1金，每波最多1次"
    },
    {
      "id": "relic_old_fuse",
      "type": "relic",
      "name": "旧引信",
      "quality": "Bronze",
      "price": "4",
      "theme": "火",
      "archetype": "爆炸放大",
      "tags": [
        "relic",
        "explode",
        "fire"
      ],
      "effect": "空格爆炸中心+1伤害"
    },
    {
      "id": "relic_castle_stone",
      "type": "relic",
      "name": "护城石",
      "quality": "Bronze",
      "price": "4",
      "theme": "土水",
      "archetype": "城堡减伤",
      "tags": [
        "relic",
        "castle",
        "defense"
      ],
      "effect": "城堡每次受击-1，最低1"
    },
    {
      "id": "relic_merchant_card",
      "type": "relic",
      "name": "商会会员卡",
      "quality": "Bronze",
      "price": "5",
      "theme": "经济",
      "archetype": "刷新/折扣",
      "tags": [
        "relic",
        "economy",
        "shop"
      ],
      "effect": "每晚第一次刷新免费"
    },
    {
      "id": "relic_wind_compass",
      "type": "relic",
      "name": "风向罗盘",
      "quality": "Silver",
      "price": "6",
      "theme": "风",
      "archetype": "方向控制",
      "tags": [
        "relic",
        "wind",
        "direction"
      ],
      "effect": "每天第一次改变槽位方向免费"
    },
    {
      "id": "relic_water_gourd",
      "type": "relic",
      "name": "水壶挂坠",
      "quality": "Silver",
      "price": "6",
      "theme": "水",
      "archetype": "续航",
      "tags": [
        "relic",
        "water",
        "heal"
      ],
      "effect": "每波结束若场上有水层，城堡+1血"
    },
    {
      "id": "relic_blast_core",
      "type": "relic",
      "name": "爆裂核心",
      "quality": "Silver",
      "price": "7",
      "theme": "火",
      "archetype": "爆炸范围",
      "tags": [
        "relic",
        "fire",
        "explode",
        "area"
      ],
      "effect": "每天第一次空格爆炸范围+1"
    },
    {
      "id": "relic_black_market",
      "type": "relic",
      "name": "黑市账本",
      "quality": "Silver",
      "price": "7",
      "theme": "经济",
      "archetype": "风险经济",
      "tags": [
        "relic",
        "economy",
        "risk"
      ],
      "effect": "每晚可少1城堡血换2金"
    },
    {
      "id": "relic_thorn_contract",
      "type": "relic",
      "name": "土偶契约",
      "quality": "Silver",
      "price": "7",
      "theme": "土",
      "archetype": "反击护城",
      "tags": [
        "relic",
        "earth",
        "castle",
        "retaliate"
      ],
      "effect": "每天第一次怪物攻击城堡时，城堡前+2土"
    },
    {
      "id": "relic_mirror_charm",
      "type": "relic",
      "name": "镜面护符",
      "quality": "Gold",
      "price": "8",
      "theme": "通用",
      "archetype": "复制/放大",
      "tags": [
        "relic",
        "copy",
        "trigger",
        "flex"
      ],
      "effect": "每天第一次使用槽位时，若旁边单位同元素，该槽+1层"
    },
    {
      "id": "relic_hunter_mark",
      "type": "relic",
      "name": "猎人标记",
      "quality": "Gold",
      "price": "8",
      "theme": "风",
      "archetype": "标记/集火",
      "tags": [
        "relic",
        "wind",
        "mark",
        "hunter"
      ],
      "effect": "每波开始标记最高血怪，该怪受到风伤+1"
    },
    {
      "id": "relic_element_furnace",
      "type": "relic",
      "name": "元素熔炉",
      "quality": "Gold",
      "price": "8",
      "theme": "四色",
      "archetype": "多元素转化",
      "tags": [
        "relic",
        "multi_element",
        "convert"
      ],
      "effect": "每晚可把1个元素强化品转为另一个随机元素"
    },
    {
      "id": "relic_royal_banner",
      "type": "relic",
      "name": "王旗",
      "quality": "Diamond",
      "price": "10",
      "theme": "通用",
      "archetype": "全局放大",
      "tags": [
        "relic",
        "diamond",
        "global",
        "buff"
      ],
      "effect": "两个上阵单位所有第1槽+1层"
    },
    {
      "id": "relic_last_spark",
      "type": "relic",
      "name": "最后火星",
      "quality": "Diamond",
      "price": "10",
      "theme": "火",
      "archetype": "火流斩杀",
      "tags": [
        "relic",
        "diamond",
        "fire",
        "finisher"
      ],
      "effect": "目标被火伤后若血量<=3，直接击杀普通怪"
    },
    {
      "id": "relic_gravity_orb",
      "type": "relic",
      "name": "重力珠",
      "quality": "Diamond",
      "price": "11",
      "theme": "土风",
      "archetype": "聚怪联动",
      "tags": [
        "relic",
        "diamond",
        "pull",
        "aoe"
      ],
      "effect": "每波开始最近3只怪路径向同一热点偏移预览"
    },
    {
      "id": "cons_fire_seed",
      "type": "consumable",
      "name": "火种强化品",
      "quality": "Bronze",
      "price": "1",
      "theme": "火",
      "archetype": "槽位改元素",
      "tags": [
        "consumable",
        "upgrade",
        "fire"
      ],
      "effect": "对一个槽使用: el改为fire"
    },
    {
      "id": "cons_water_drop",
      "type": "consumable",
      "name": "水滴强化品",
      "quality": "Bronze",
      "price": "1",
      "theme": "水",
      "archetype": "槽位改元素",
      "tags": [
        "consumable",
        "upgrade",
        "water"
      ],
      "effect": "对一个槽使用: el改为water"
    },
    {
      "id": "cons_wind_feather",
      "type": "consumable",
      "name": "风羽强化品",
      "quality": "Bronze",
      "price": "1",
      "theme": "风",
      "archetype": "槽位改元素/方向",
      "tags": [
        "consumable",
        "upgrade",
        "wind"
      ],
      "effect": "对一个槽使用: el改为wind"
    },
    {
      "id": "cons_earth_crystal",
      "type": "consumable",
      "name": "土晶强化品",
      "quality": "Bronze",
      "price": "1",
      "theme": "土",
      "archetype": "槽位改元素/护城",
      "tags": [
        "consumable",
        "upgrade",
        "earth"
      ],
      "effect": "对一个槽使用: el改为earth"
    },
    {
      "id": "cons_condensed_fire",
      "type": "consumable",
      "name": "浓缩火种",
      "quality": "Silver",
      "price": "3",
      "theme": "火",
      "archetype": "槽位加层",
      "tags": [
        "consumable",
        "upgrade",
        "fire",
        "layer"
      ],
      "effect": "对火槽使用: layerBonus+1，单槽最多+2"
    },
    {
      "id": "cons_deep_water",
      "type": "consumable",
      "name": "深水瓶",
      "quality": "Silver",
      "price": "3",
      "theme": "水",
      "archetype": "槽位加层/回血",
      "tags": [
        "consumable",
        "upgrade",
        "water",
        "layer"
      ],
      "effect": "对水槽使用: layerBonus+1，单槽最多+2"
    },
    {
      "id": "cons_heavy_stone",
      "type": "consumable",
      "name": "重土块",
      "quality": "Silver",
      "price": "3",
      "theme": "土",
      "archetype": "槽位加层/嘲讽",
      "tags": [
        "consumable",
        "upgrade",
        "earth",
        "guard"
      ],
      "effect": "对土槽使用: layerBonus+1，单槽最多+2"
    },
    {
      "id": "cons_pierce_feather",
      "type": "consumable",
      "name": "穿透羽",
      "quality": "Silver",
      "price": "4",
      "theme": "风",
      "archetype": "穿透强化",
      "tags": [
        "consumable",
        "upgrade",
        "wind",
        "pierce"
      ],
      "effect": "对风线槽使用: 第一次命中后继续影响后1格"
    },
    {
      "id": "cons_manual_fuse",
      "type": "consumable",
      "name": "手动引爆符",
      "quality": "Silver",
      "price": "4",
      "theme": "火",
      "archetype": "临时爆炸救场",
      "tags": [
        "consumable",
        "one_shot",
        "explode"
      ],
      "effect": "选择一个已有2层同元素的空格，本波临时视为达阈值引爆"
    },
    {
      "id": "cons_wind_vane",
      "type": "consumable",
      "name": "风向针",
      "quality": "Bronze",
      "price": "2",
      "theme": "风",
      "archetype": "方向救场",
      "tags": [
        "consumable",
        "one_shot",
        "direction"
      ],
      "effect": "改变一个未使用槽位方向"
    },
    {
      "id": "cons_first_aid",
      "type": "consumable",
      "name": "急救包",
      "quality": "Bronze",
      "price": "2",
      "theme": "通用",
      "archetype": "生命救场",
      "tags": [
        "consumable",
        "one_shot",
        "heal"
      ],
      "effect": "一个单位+5血或城堡+3血"
    },
    {
      "id": "cons_discount_ticket",
      "type": "consumable",
      "name": "折扣券",
      "quality": "Silver",
      "price": "3",
      "theme": "经济",
      "archetype": "减费/找核心",
      "tags": [
        "consumable",
        "economy",
        "discount"
      ],
      "effect": "下一个购买商品-2金，最低1"
    },
    {
      "id": "cons_reroll_dice",
      "type": "consumable",
      "name": "重铸骰",
      "quality": "Silver",
      "price": "3",
      "theme": "经济",
      "archetype": "单格刷新",
      "tags": [
        "consumable",
        "economy",
        "reroll"
      ],
      "effect": "重置商店中1个未冻结商品"
    },
    {
      "id": "cons_element_pack",
      "type": "consumable",
      "name": "元素包",
      "quality": "Bronze",
      "price": "3",
      "theme": "四色",
      "archetype": "随机资源",
      "tags": [
        "consumable",
        "upgrade",
        "random"
      ],
      "effect": "获得3个随机基础元素强化品"
    },
    {
      "id": "cons_black_contract",
      "type": "consumable",
      "name": "黑市契约",
      "quality": "Gold",
      "price": "6",
      "theme": "经济/风险",
      "archetype": "高风险换核心",
      "tags": [
        "consumable",
        "economy",
        "risk"
      ],
      "effect": "城堡-2血，立即刷新并保证出现1个高一级质量商品"
    },
    {
      "id": "hero_redline_hunter",
      "type": "hero",
      "name": "红线猎人",
      "quality": "Gold",
      "price": "7",
      "theme": "火风",
      "archetype": "标记/猎杀/爆发",
      "tags": [
        "hero",
        "fire",
        "wind",
        "mark",
        "hunter",
        "elite"
      ],
      "slot1": "红线:标记最高血怪物并+1风",
      "slot2": "猎火:被标记目标格+2火",
      "slot3": "追猎:若目标已被标记，本槽额外+1火并显示斩杀预警",
      "passive": "被标记怪物受到火或风伤害时，预览额外-1，每波最多3次"
    }
  ]
}
```
