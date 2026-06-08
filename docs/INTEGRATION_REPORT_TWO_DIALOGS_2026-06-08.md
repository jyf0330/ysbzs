# 两个对话内容合并接入报告（2026-06-08）

## 合并目标

本包同时保留并接入两条要求：

1. **boardgame.io 必须作为不改源码的上游底座**：`upstream/boardgame.io-main` 原样保留，游戏通过 `apps/ysbzs-boardgameio` 包装成真实 boardgame.io Game。
2. **Showdown / Forge 风格规则内核必须进入 ysbzs**：把 `ysbzs_showdown_forge_rule_kernel_2026-06-08.zip` 的规则内核合入 `apps/ysbzs`，包含元素包、replacement effect、continuous effect、结构化事件协议、changeLog、triggerQueue、modifierEngine 等。

## 本次合并方式

- 以 `ysbzs_on_boardgameio_main_real_connected_2026-06-08.zip` 为外壳。
- 保留 `upstream/boardgame.io-main` 不改。
- 用 `ysbzs_showdown_forge_rule_kernel_2026-06-08.zip` 中的 ysbzs 规则内核替换/更新 `apps/ysbzs`。
- 保留 `apps/ysbzs-boardgameio` 作为唯一真实 boardgame.io 接入层。
- 保留 `boardgameio-adapter` 作为历史烟测/对照入口，不作为主入口。

## 当前主入口

```txt
apps/ysbzs-boardgameio/src/YSBZSGame.cjs
```

真实链路：

```txt
boardgame.io Client / MAKE_MOVE
→ YSBZSGame.moves
→ apps/ysbzs reducer/core
→ ysbzs 规则内核
→ G 更新
→ boardgame.io deltalog / client state
```

## 已进入 apps/ysbzs 的规则内核能力

- `battleEventProtocol.cjs`：结构化战斗事件协议。
- `replacementEffects.cjs`：事件执行前改写，例如 next_element_x2、元素转换保留 modifier。
- `continuousEffects.cjs`：持续修饰，支持 base→final 思路。
- `elementPackets.cjs`：元素包、来源、modifier、转换、聚合同步。
- `changeLog.cjs`：inputLog/changeLog/battleTrace/replay 基础。
- `triggerQueue.cjs`：触发排序基础。
- `modifierEngine.cjs`：修饰器链基础。
- `objectRegistry.cjs`：效果物体收集基础。
- `explainTrace.cjs`：结构化事件转中文解释基础。

## 已验证的核心样例

```txt
宠物A上火2
宠物B上风2，并带 next_element_x2
宠物C把风2转火2，保留 modifier
宠物D再上火1，触发翻倍变火2
最终聚合火6
changeLog 记录来源、转换、modifier 生效
```

## 验收结果

已运行：

```bash
bash scripts/verify_no_upstream_edits.sh
cd apps/ysbzs && npm test
cd apps/ysbzs && npm run check:csv
cd apps/ysbzs && npm run check:day7
cd apps/ysbzs && npm run check:dom
cd apps/ysbzs && npm run check:all
cd apps/ysbzs-boardgameio && npm run check:game
cd apps/ysbzs-boardgameio && npm run check:client
cd apps/ysbzs-boardgameio && npm run check:browser
bash scripts/run_all_checks.sh
```

结果：全部通过。

## 仍需注意

当前已同时满足“上游 boardgame.io 不改 + ysbzs 包成真实 boardgame.io Game + Showdown/Forge 规则内核进入 ysbzs”。

但以下仍不是最终成品：

1. `triggerQueue/objectRegistry/modifierEngine` 仍是 MVP，后续要继续接入更多真实 battle 入口。
2. boardgame.io 页面验收仍偏测试型，后续可做真正可玩的 `apps/ysbzs-boardgameio/web/index.html`。
3. replay 仍是数据基础，尚无完整播放器。
4. 30宠全部技能尚未完全表驱动，只是规则底层已具备能力。
5. `boardgameio-adapter` 是历史烟测/对照，后续不要在里面继续加主功能。
