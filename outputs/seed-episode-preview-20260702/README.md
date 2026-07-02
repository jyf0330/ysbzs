# 种子整集预览表

生成时间：2026-07-02T19:03:07.699Z

覆盖 seed：ysbzs-local / ysbzs-local-2 / ysbzs-local-3

覆盖天数：D1-10

边界：这是 seed 生成的策划/平衡快照，不是正式 runtime 存储真相。正式游戏仍应保存配置、seed、玩家命令和必要状态。

## 文件

- seed_episode_preview.json：完整结构化数据。
- seed_episode_steps.csv：每个 seed 每天每步的节点 3 选 1 / 固定战预览。
- seed_episode_pet_sources.csv：每个节点选项可能给到的宠物来源，包含商店和奖励。
- seed_episode_battle_enemies.csv：每场战斗按 seed 展开的敌人/品质/波次。

## 当前实现口径

节点、遭遇、商店、奖励和波次都从当前 data/csv 归一化数据读取。路线和遭遇候选使用当前核心 seed 加权不放回抽样规则；路线商店、路线奖励和战斗波次使用与核心 runtime 相同的 seed 上下文，方便提前看同一个 seed 在正式游玩入口会出现什么。
