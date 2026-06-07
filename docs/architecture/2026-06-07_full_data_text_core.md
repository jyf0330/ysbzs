# 01-09 全数据联动接入说明

本包放弃旧 UI 迁移，先做可测试、可回放、可文字输出的新核心。

## 架构
`SourceTables → NormalizedData → Command → Reducer → StateChange/EventLog → TextReport`

## 命令
- `RUN_BATTLE`
- `REWARD_OPTIONS`
- `PICK_REWARD`
- `ENTER_SHOP`
- `ROLL_SHOP`
- `FREEZE_OFFER`
- `UNFREEZE_OFFER`
- `BUY_OFFER`
- `APPLY_SHOP_EVENT`
- `EXIT_SHOP`

## 验收
- `npm run check:all` 必须全通过。
- `src/` 不允许 DOM/UI 调用。
- 商店行为必须有事件：进入、刷新、冻结、购买、事件、离开。
- 普通战报必须能同时描述战斗和商店。

## 执行边界
这是外部 AI/ChatGPT 的建议包，不是项目真实规则终局。执行时以当前项目代码、目录结构、任务卡、正式文档、用户最新指令和执行者判断为准；只吸收有用部分，丢弃无用、过重、重复或不适配内容。
