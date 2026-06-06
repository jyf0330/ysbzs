# 未完全对齐代码的数据缺口

| 优先级 | 数据 | 当前状态 | 代码缺口 |
|---|---|---|---|
| P0 | 127 宠物 | 已能生成 `pal_units.json` / `shop_config.json` | 运行时已能通过 adapter 读基本字段，机制效果仍有 REVIEW |
| P0 | 怪物模板 | 已生成 `monster_templates.json` | `waves.js` 仍使用旧 encounter pool 逻辑，未完全改成模板驱动 |
| P0 | 怪物波次 | 已生成 `monster_waves.json` | 逐回合前 5 回合脚本出怪尚未接入正式怪物行动链 |
| P1 | 事件表 | 已生成 `event_config_new_20260605.json` | shop/event adapter 还需覆盖 free_refresh、复制、升级、改下一战等效果 |
| P1 | 机制映射 | 已生成 `mechanism_mapping.json` | 缺统一 mechanism resolver；REVIEW 项不能硬接 |
| P2 | 机制词条库原表 | 本包只含映射 YAML/报告，项目包里另有机制词条库 xlsx | 后续需合并成 `mechanism_library.yaml/json` |
