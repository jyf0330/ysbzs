# game-data-source — 唯一数据真源

本项目所有游戏数据的人工维护入口只有这个目录。

## 目录说明

| 路径 | 内容 | 维护方式 |
|---|---|---|
| `yaml/` | YAML 格式的源数据（42 文件） | 直接编辑 .yml/.yaml |
| `tables/` | 策划可编辑的 xlsx 表（5 文件） | 用 Excel 编辑 |
| `docs/` | 管线说明、字段映射、缺口记录 | 写 md |
| `yaml/runtime-static/` | 运行时补丁 JSON（无 YAML 源） | 特殊场景才改 |

## 修改数据流程

1. 修改 `game-data-source/yaml/` 下的 .yml 或 `game-data-source/tables/` 下的 .xlsx
2. 运行 `npm run data:rebuild`（删除 external-data 并重建）
3. 运行 `npm run data:validate`（完整性校验）
4. 运行 `node test.js && node gpt_test.js`（功能验收）
5. 提交代码

## 禁止

- 不要手动修改 `external-data/` 下的任何文件（均为生成产物）
- 不要在其他目录放游戏数据文件
