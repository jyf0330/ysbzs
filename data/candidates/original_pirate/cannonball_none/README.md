# 炮弹未附魔静态战斗候选

这是来源锁定的真实 `item_bazaar_cannonball`，不是把原创物品换一个来源身份。候选小工作簿 `xlsx/candidates/original_pirate_cannonball_none.xlsx` 是五个追加 CSV 域的真相；导出器验证工作簿与 CSV 完全一致，再追加到锁定的正式基线，经现有 `ContentAssembler` 与完整包校验生成。不改变正式工作簿、CSV、22 件物品或战斗规则。

## 已转译范围

只含未附魔银、金、钻三档：Small 一槽，实际显式 Tags 为空，被动，无主动效果，装备区己方最大弹药大于零的所有物品分别增加 1、2、3 最大弹药。不是相邻筛选，也不是 Ammo 标签筛选，不补当前弹药。来源 UUID、DB SHA 和声明范围进入候选来源目录/附带 provenance；来源身份绑定不是原规则审核通过。

锁定 DB 的结构化 selector 是 `SelfHand`，旧内部描述仍说相邻；本轮以结构化规则核对，公开 [18.0 Hotfix Sep 3 卡片](https://bazaardb.gg/card/fc1y26n2vlf7p25ykxyzq2l341/Cannonball) 的详细机制同样给出全场正最大弹药筛选。网页版本不证明代表 Run 的版本。

## 明确不是原作事实的宿主字段

候选买价 2/3/4、卖价 1、升级价 1，以及追加的白银储藏实例都是 synthetic 测试宿主，非原作经济/获取/首次初态证据。无主动的炮弹用 schema 的禁用弹药零值、暴击率零值与唯一 Aura 优先级零作占位，不据此推导原作缺字段默认值。原有宿主初态条目不变。

未覆盖其 13 种附魔、物品移除/变形的 Aura 生命周期、原版首次装弹、原版完整获取流程；其余 22 件宿主物品与规则仍为项目原创。此候选不等于完整物品、完整海盗玩法、最热门三套完整阵容或六场日志验收。

## 重建

先将已提供的 bundled Python 放入 PATH（需要 openpyxl），并设置 `PYTHONDONTWRITEBYTECODE=1`。

```sh
python3 tools/add_original_pirate_cannonball_candidate.py
python3 tools/export_original_pirate_cannonball_candidate.py --out-dir <新的隔离目录>
node --test tests/original_pirate_cannonball_candidate.test.cjs
```

第一个脚本只读校验已锁客户端 DB，生成/校验候选工作簿和五 CSV，不保存原始 payload、原文或资产。第二个脚本不需客户端 DB，严格校验候选转译锁、完整来源成员、正式 CSV 集合摘要和基线 bundleHash；输出整包、中文显示 sidecar 和限制说明。已有不同输出拒绝覆盖。候选 schema 沿用当前版本；本轮仅扩大物品定义 tags 对空数组的接受域，筛选/条件 tags 仍须非空。
