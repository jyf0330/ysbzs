# ysbzs 架构补齐报告：boardgame.io + Showdown/Forge Kernel 合流

## 本轮目标

以本对话中确定的规则为基准：

- boardgame.io-main 作为不可修改上游底座。
- ysbzs 作为规则内核。
- 普通 battle、day7 试炼、元素包、修饰器、触发队列、changeLog、battleEventProtocol 尽量合流。
- 不继续把 day7 或 trialEngine 做成第二套战斗引擎。

## 本轮已补齐

### 1. 试炼形状索引修复

问题：`trialEngine.cjs` 用 `shapesByPetId` 去查 `shapeId`，导致第7天试炼单位形状可能退回默认值。

修复：

- `src/core/data.cjs` 新增 `shapesByShapeId`。
- `src/core/trialEngine.cjs` 改为优先 `shapeId` 查形状，失败再回退 `petId`。
- 新增测试：融焰娘 `B2_fire_core_double` 正确解析为 `爆心二连 / hitCells=2`。

### 2. 普通 battle 加元素接入 elementPackets

问题：普通战斗中 `applyElement()` 仍直接改 `target.elements[element] += layers`，没有生成元素包，和 day7 / 元素包系统割裂。

修复：

- `battle.cjs:applyElement()` 改为走 `elements.addElementPacketToHolder()`。
- 命中单位时，目标单位和所在格都生成元素包。
- 保留聚合值 `elements`，但来源由 `elementPackets` 记录。
- 新增测试：普通 battle 攻击后，单位和格子都有火元素包。

### 3. 普通 battle 加元素进入 triggerQueue

问题：`triggerQueue` 之前主要停留在独立测试，没有进入真实 battle 流程。

修复：

- `elements.cjs:addElementToCell()` 在生成元素包后，加入 `after_add_element_packet` 触发队列。
- 当前先做最小闭环：队列排序、出队、写入 `TRIGGER_QUEUE_RESOLVE` changeLog。
- 新增测试：普通 battle 加元素会产生 `TRIGGER_QUEUE_RESOLVE`。

### 4. continuousEffects 接入元素添加入口

问题：`continuousEffects.cjs` 独立可测，但没有参与普通加元素。

修复：

- `elements.cjs:addElementToCell()` 在写入元素包前，先调用 `applyContinuousEffects()`。
- 支持 `action.addElement.火` 这类目标路径。
- 记录 `APPLY_CONTINUOUS_EFFECTS` changeLog。

### 5. 旧 terrain 成型不再清掉元素包来源

问题：旧 `addTerrainModule()` 会 `clearCellElements()`，这会清空元素包来源，与“元素包可解释/可回放”冲突。

修复：

- `addTerrainModule()` 保留 legacy terrain 模块，但不再清空 `elements` / `elementPackets`。
- `maybeFormTerrain()` 额外写入 `cell.elementStates[element]`，表示元素成型/爆火陷阱候选。
- 旧 terrain 模块作为兼容派生信息保留，不再作为元素事实源。

### 6. 火陷阱进入触发接入普通怪物移动

问题：空格火3+形成爆火陷阱后，普通敌方移动踩入时缺通用触发。

修复：

- `triggerTerrainOnEnter()` 开头检测敌方踩入异阵营火3+格。
- 调用统一 `elements.explodeIfEnemyOnFire()`。
- 造成 Σ(1..N) 火爆伤害，清除格子火元素包。
- 写入 `FIRE_TRAP_TRIGGER` 事件。

### 7. 元素结算清理单位镜像包

问题：命中单位时单位和格子都会有元素包；火爆/统一结算后只清格子会留下单位旧包。

修复：

- `settleElements()` 清格子元素时，同步清目标单位对应元素包。
- `useActionSlot()` 触发火爆后，同步清目标单位火包。

## 本轮新增/更新测试

`apps/ysbzs/tests/run_all_tests.cjs` 从 37 项增加到 39 项：

1. 普通 battle 加元素会生成 cell/unit elementPackets，并进入 triggerQueue。
2. trial shape lookup 使用 shapeId 索引，而不是 petId-only map。

## 当前验收

已运行：

```bash
bash scripts/run_all_checks.sh
```

结果：全部通过。

关键输出：

- upstream boardgame.io-main unchanged：PASS
- apps/ysbzs npm test：39/39 passed
- check:csv：PASS
- check:day7：PASS
- check:dom：PASS
- apps/ysbzs-boardgameio check:game / check:client / check:browser：PASS

## 仍未完全做完的部分

这些不是本轮没做，而是仍属于后续系统化工程：

1. `triggerQueue` 现在已经进入普通 battle 加元素流程，但还只是最小闭环；后续要让 effect objects 真正监听并执行复杂效果。
2. `objectRegistry` 仍主要是收集器，还没有成为全战斗触发查找入口。
3. `trialEngine` 仍承担部分试炼行动编排细节；更理想是只生成通用 action，完全交给 battle action resolver。
4. boardgame.io 页面验收仍是测试型页面/Client 检查，后续需要真正玩家 UI 页面绑定 boardgame.io client.moves。
5. replay 仍是 replay data 基础，不是完整播放器。
6. 机制表分级还可以进一步细化为 `implemented_core / implemented_trial_only / data_only / placeholder`。

## 当前结论

这版已经比上一版更接近目标主链路：

```txt
boardgame.io move
→ YSBZSGame.moves
→ ysbzs reducer/core
→ battle.cjs
→ elements.cjs
→ elementPackets / continuousEffects / triggerQueue
→ changeLog / battleEventProtocol
→ boardgame.io G 更新
```

但它仍不是完整“大巴扎规则编辑器”。后续重点是把 triggerQueue 和 objectRegistry 从 MVP 升级为真正的物体触发执行层。
