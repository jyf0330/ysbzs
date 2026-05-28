# 当前任务卡

## 任务

- 标题：文字战斗系统问题修复（battleReport / 日志一致性）
- 类型：排查 / 修 bug
- 目标：
  1. USE_SLOT actionLog 补上 desc 字段，让 battleReport 包含玩家行动记录
  2. 清理 `simLog` 死字段（声明未使用）
  3. 对齐 glog 消息格式与 dayHalf 系统（renderTurn 标签体系）

## 范围

- 允许读取：`docs/00_CURRENT_CONTEXT.md`、本任务卡、`index.html`、`test.js`、`docs/10_CHANGELOG.md`、`docs/01_游戏设计（策划主导）/战斗系统.md`
- 允许修改：`index.html`、`test.js`、`docs/10_CHANGELOG.md`、本任务卡
- 禁止修改：其他游戏规则与无关文档

## TDD 记录

- RED：无新增 RED 步骤（只改 actionLog 结构字段和日志文案，不改变运行时行为；现有 256 测试全部通过）
- GREEN：`node test.js` → 256 通过，0 失败
- 豁免原因：纯字段补齐、代码清理和日志文案对齐，不改变战斗数值、状态机或 UI 可观察行为。actionLog desc 字段补齐后 battleReport 字符串内容变化，测试中 battleReport 是包含性检查（br.some(l=>l.includes(...))），不影响已有断言通过。

## 改动明细

### 1. USE_SLOT actionLog 加 desc 字段

文件：`index.html`，dispatchGameAction USE_SLOT 分支
改动：`G.actionLog.push(...)` 增加 `desc:` 字段，生成中文描述字符串（含英雄名、行动块编号、元素类型、形状格数）
影响：`buildBattleReport` 中 `act.type==='USE_SLOT'&&act.desc` 分支现在为真，玩家行动记录出现在 battleReport 中

### 2. 清理 simLog 死字段

文件：`index.html`，initGame()
改动：删除 `simLog:[]` 行
影响：无运行时变化

### 3. 对齐 glog 消息格式与 dayHalf 系统

文件：`index.html`
- spawnWaveForDay: 日志消息使用 renderTurn 同款 dayHalf 标签逻辑
- finishMonsters: 下午波消息和商店阶段消息统一格式
- closeShop: 第一天战斗开始日志格式一致
