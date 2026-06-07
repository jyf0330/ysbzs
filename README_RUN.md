# ysbzs 全数据核心 + 原 UI 单轨接入包（01-09 全接入）

## 目标
`src/core` 是唯一战斗真源；浏览器原 UI 只通过 `src/uiAdapter.cjs` / ViewModel 展示和下发命令。数据读取 01-09 全数据联动包整理出的 `data/normalized_data.json` / CSV 真源，跑：

`SourceTables → NormalizedData → Command → Reducer → EventLog → ViewModel/TextReport → Browser UI`

## 已接入数据
- 01 宠物主表：127
- 02 怪物模板：34
- 03 怪物波次：134
- 04 机制词条：61
- 05 事件主表：32
- 06 商店奖励池：127
- 07 遗物祝福：40
- 08 形状行动槽：127
- 09 跨表校验：10

## 一次运行
```bash
npm run check:all
npm run report
npm run shop
npm run ui
```

## 当前战斗闭环
- 我方英雄 Leader vs 敌方Boss Leader 已进入核心状态、棋盘、血条和胜负判断。
- 我方宠物使用统一移动/攻击形状/元素/地形逻辑击败敌方Boss。
- 玩家阵营读取 `factionRules.player`：无限移动、3层成型/引爆、显示元素生成。
- 敌方阵营读取 `factionRules.enemy`：表格 AP 移动、99层成型/引爆、默认隐藏元素生成。
- 全队自动规划使用沙盒 beam 评分，避免低血目标过量溢出，能转向其他怪、Boss 或地形收益。
- 敌方 AI 枚举目标、可站位和方向，移动逐格触发地形，攻击后在核心生成敌方元素。
- 元素伤害为线性层数伤害：3层 = 3伤害。
- `web/battle.js`、`web/elements.js` 只保留旧函数名兼容，不再执行真实结算。

## 商店已接入什么
- 夜市基础池 `night_base`
- 元素池 `elem_火/水/风/土`
- 定位池 `role_*`
- 品质池 `tier_pT*`
- 奖励池 `reward_pT*`
- 解锁日、默认价、价格覆盖、权重
- 刷新、免费刷新、冻结、购买、金币变化、同名合成、奖励候选、遗物候选、商店事件

## 注意
机制 61 条都已注册进统一钩子；其中复杂机制先走通用事件/数值实现，后续可以按策划细化每条机制的特殊表现。`castleLine/playerCastle/enemyCastle` 仍可能作为兼容字段或旧 DOM id 存在，但玩家可见口径统一为“我方英雄 / 敌方Boss / 英雄防线”。
