# 商店系统外部参考 · SuperAutoTest

## 参考定位

- 上游仓库：`https://github.com/koisland/SuperAutoTest`
- 本地路径：`references/SuperAutoTest/`
- 本地快照：`f0a2023`
- 用途：为“Super Auto Pets 式商店”提供规则结构、状态切换和测试样例参考，不直接作为 UI 或前端实现模板。

## 优先阅读文件

1. `references/SuperAutoTest/README.md`
2. `references/SuperAutoTest/src/lib/shop/store.rs`
3. `references/SuperAutoTest/src/lib/shop/team_shopping.rs`
4. `references/SuperAutoTest/src/lib/tests/test_team_shop.rs`

## 可直接借鉴的商店规则点

### 1. 商店是独立状态机

- `ShopState` 明确区分 `Open` / `Closed`
- `open_shop()` / `close_shop()` 作为显式入口
- 商店开启时允许买卖/冻结/刷新，关闭后回到战斗流程

对本项目的启发：

- 现在 `G.phase === 'SHOP'` 已经有阶段概念，但如果后续改成更复杂的 SAP 式商店，可以把“进入商店 / 离开商店 / 商店内操作限制”统一成一组明确规则，而不是散落在多个按钮判断里。

### 2. 金币、刷新和冻结是核心循环

- 默认金币：`DEFAULT_COIN_COUNT = 10`
- `roll_shop()` 负责重刷商品，并消耗金币
- `freeze_shop()` 让商品跨一次关店/开店仍保留
- `saved_coins`、`free_rolls` 也被作为商店内的独立资源处理

对本项目的启发：

- 如果以后商店要从“固定 3 商品 + 刷新”升级为更强的构筑层，冻结位、免费刷新、跨波次存钱这些都可以作为二期系统点，而不是先塞进现有购买逻辑。

### 3. 商品操作统一走接口

- `buy(from, item_type, to)`
- `sell(pos)`
- `move_pets(from, to, merge)`
- `replace_shop(shop)`

对本项目的启发：

- 本项目后续如果出现“买入背包”“买入上阵区”“合成/合并”“卖出返利”等分支，最好也统一成动作接口，再让 UI 调这些接口，避免按钮逻辑直接改全局状态。

### 4. 商店内容生成可控

- `set_shop_seed(Some(...))` 固定随机种子
- `set_shop_tier(...)` 控制当前商店 tier
- `set_shop_packs(...)` 控制可出现的包池

对本项目的启发：

- 很适合我们以后做教程关、固定教学商店、复盘复现、回放验证和可重复测试。

### 5. 测试先定义行为边界

`test_team_shop.rs` 已经覆盖了这些边界：

- 商店能否正常打开/关闭
- 关闭商店时禁止购买/出售/冻结/刷新
- 买到没钱为止时应报错
- 卖出返金币
- 冻结后跨一次战斗仍保留

对本项目的启发：

- 以后如果重做商店，测试应先覆盖“什么时候能买”“什么时候不能买”“刷新扣费”“冻结保留”“离店进入下一流程”等边界，再写 UI。

## 不建议直接照搬的部分

- Rust 类型系统、数据库抓取、Wiki 数据源和 SQLite 结构，不适合直接迁到当前单文件原型。
- Super Auto Pets 的“宠物队伍商店”与本项目“攻击方块/元素/背包商店”题材不同，商品实体和成长方式需要重新映射。

## 推荐使用方式

当后续需要设计或改造商店时，按下面顺序读：

1. 本文，确认这份参考到底看什么
2. `README.md` 的 Shops 段，快速看公开能力面
3. `src/lib/shop/team_shopping.rs`，看行为接口和状态约束
4. `src/lib/tests/test_team_shop.rs`，看边界和预期行为
5. 再对照本项目正式文档判断是否进入“大需求 / 新模块”
