# 任务：敌人出题导向的数据表整理

task_id: 2026-06-05_16-21_enemy-led-planner-tables
status: DONE
priority: P0
created_at: 2026-06-05 16:21
updated_at: 2026-06-06 12:30
done_at: 2026-06-06
commits:
  - e775d7a (feat(data): 宠物主表换源为策划表 127 只 + 面板全量同步)
  - 7af3b92 (docs(data): 敌人出题包 — 怪物模板/波次/机制ID/事件表 + pal_source 映射)

## 目标

基于 2026-06-05 新口径，整理一组“人类策划好读、好查、好改”的表格资产，优先服务敌人出题思路，同时保留后续程序可接入的结构边界。

本轮目标产物：

1. `1_宠物总表_127_数值定位版_20260605.xlsx`
2. `2_怪物波次表_Day1-Day5_20260605.xlsx`
3. `1_机制词条库_魔塔尖塔可计算版_20260605.xlsx`
4. 配套 YAML/MD：把公式、默认值、复杂枚举、字段解释、验收口径从主表剥离
5. 机制ID接入版主表与配套 YAML/MD/zip，统一引用机制词条库 `内部ID`
6. 怪物模板表 + Day1-Day10 机制ID波次包，统一引用机制词条库 `内部ID`
7. `4_事件主表_策划好读版_20260605.xlsx`
8. `ysbzs_events_20260605.yaml`
9. `ysbzs_events_接入说明_20260605.md`

## 相关文件 related_files

- external-data/20260605_敌人出题整理包/1_宠物总表_127_数值定位版_20260605.xlsx
- external-data/20260605_敌人出题整理包/2_怪物波次表_Day1-Day5_20260605.xlsx
- external-data/20260605_敌人出题整理包/1_机制词条库_魔塔尖塔可计算版_20260605.xlsx
- external-data/20260605_敌人出题整理包/planner_table_rules_20260605.yaml
- external-data/20260605_敌人出题整理包/planner_table_notes_20260605.md
- external-data/20260605_敌人出题整理包/README.md
- external-data/20260605_敌人出题整理包/1_宠物总表_127_机制ID版_20260605.xlsx
- external-data/20260605_敌人出题整理包/2_怪物波次表_机制ID版_20260605.xlsx
- external-data/20260605_敌人出题整理包/ysbzs_mechanism_mapping_20260605.yaml
- external-data/20260605_敌人出题整理包/ysbzs_monster_waves_20260605.yaml
- external-data/20260605_敌人出题整理包/ysbzs_mechanism_id接入说明_20260605.md
- external-data/20260605_敌人出题整理包/ysbzs_mechanism_id_report_20260605.json
- external-data/20260605_敌人出题整理包/ysbzs_mechanism_id_pack_20260605.zip
- external-data/20260605_敌人出题整理包/2_怪物模板表_机制ID版_20260605.xlsx
- external-data/20260605_敌人出题整理包/3_怪物波次表_机制ID版_20260605.xlsx
- external-data/20260605_敌人出题整理包/ysbzs_monster_templates_20260605.yaml
- external-data/20260605_敌人出题整理包/ysbzs_monster_waves_20260605.yaml
- external-data/20260605_敌人出题整理包/ysbzs_monster_waves_接入说明_20260605.md
- external-data/20260605_敌人出题整理包/ysbzs_monster_waves_mechanism_id_pack_20260605.zip
- external-data/20260605_敌人出题整理包/4_事件主表_策划好读版_20260605.xlsx
- external-data/20260605_敌人出题整理包/ysbzs_events_20260605.yaml
- external-data/20260605_敌人出题整理包/ysbzs_events_接入说明_20260605.md
- tasks/doing/2026-06-05_16-21_enemy-led-planner-tables.md
- tasks/doing/当前任务.md
- tasks/index.md

## 不应修改的文件 excluded_files

- battle.js
- waves.js
- game.js
- ui.js
- externalDataAdapter.js
- external-data/generated-json/
- external-data/source-yaml/pal_units.yml
- external-data/source-yaml/encounter_config.yml
- docs/archive/
- tasks/paused/2026-06-02_08-20_shop-ui-doc.md

## 输入素材（只读）

- external-data/1_宠物主表_127_策划好读版_20260605.xlsx
- external-data/1_宠物主表_127_效果分公式版_20260605.xlsx
- external-data/下载.7z
- 用户 2026-06-05 本轮指令中的宠物/敌人/波次/机制口径

## 下一步 resume_next_step

1. 用户或下一位 AI 先审读事件主表、事件 YAML 和事件接入说明
2. 若确认继续细调，优先从怪物波次与敌人题型反推宠物数值与事件对策位
3. 若要接运行时，再单开任务把事件 adapter 和 monster_templates / monster_waves adapter 拆开推进
4. 如继续做怪物正式接线，再单开任务把 monster_templates / monster_waves 并入 `external-data/source-yaml/`

## 验收 validation_needed

- [x] 宠物总表为单 sheet、单主题、字段精简，保留目标分/面板分/机制分/总强度/差值
- [x] 宠物表不混入价格、解锁日、池档、trigger/condition/effect/log、cells 坐标、成长 720 行
- [x] 怪物波次表按 Day1-Day5、前 5 回合展开，体现敌人“出题”目标
- [x] 机制词条库拆成可计算词条，不停留在灵感描述
- [x] 机制词条库已改为新字段：适用对象 / 触发时机 / 机制分 / 被克制 / 首版优先级
- [x] 容易混的机制已拆开：伤害类 / 坚固类 / 护盾类
- [x] YAML 明确公式、离散档、默认值、枚举、参数口径
- [x] MD 明确字段说明、接入边界、验收口径
- [x] 不修改运行时代码或 generated-json
- [x] 生成 `2_怪物模板表_机制ID版_20260605.xlsx`
- [x] 生成 `3_怪物波次表_机制ID版_20260605.xlsx`
- [x] 生成 `ysbzs_monster_templates_20260605.yaml`
- [x] 生成 `ysbzs_monster_waves_20260605.yaml`
- [x] 生成 `ysbzs_monster_waves_接入说明_20260605.md`
- [x] 生成 `ysbzs_monster_waves_mechanism_id_pack_20260605.zip`
- [x] 完成 Day1-Day10 / 20 波 / 34 模板 / 机制ID合法性校验
- [x] 生成 `4_事件主表_策划好读版_20260605.xlsx`
- [x] 生成 `ysbzs_events_20260605.yaml`
- [x] 生成 `ysbzs_events_接入说明_20260605.md`
- [x] 事件主表单 sheet、22 列表头、22 条选项行
- [x] 事件 YAML 中 `event_master=14`、`event_options=22`，且 `event_id + option_id` 与 xlsx 一一对应
- [x] 所有非空 `机制词条IDs` 都能在机制词条库 `内部ID` 列找到
- [x] Day4 首次出现黄金预览事件、Day6 首次出现钻石预览事件
- [x] `bridge_now` 只包含旧事件系统可表达的效果组合，`adapter_needed` 已在接入说明里标清未来挂点

## 当前进度

- [x] 读取现有 127 宠物表（策划好读版 / 效果分公式版）
- [x] 新建任务卡并切换当前任务入口
- [x] 输出 `planner_table_rules_20260605.yaml`
- [x] 输出 `planner_table_notes_20260605.md`
- [x] 生成 `1_宠物总表_127_数值定位版_20260605.xlsx`
- [x] 生成 `2_怪物波次表_Day1-Day5_20260605.xlsx`
- [x] 生成 `1_机制词条库_魔塔尖塔可计算版_20260605.xlsx`
- [x] 做首屏结构检查与 PNG 预览核对
- [x] 按严格口径重算宠物总表数值：`abs(差值)<=5`、非钻石防=0、HP/盾离散档、机制分=8倍数
- [x] 按新字段重做机制词条库：适用对象 / 触发时机 / 机制分 / 被克制 / 首版优先级
- [x] 拆开伤害类、坚固类、护盾类，并同步更新 YAML / MD 说明
- [x] 按机制词条库 `内部ID` 重做宠物总表 / 怪物波次表的机制引用
- [x] 生成机制映射 YAML、怪物波次 YAML、机制ID接入说明和 zip 整理包
- [x] 校验宠物 127 行、怪物波次 55 行、机制ID 合法性与 PNG 预览
- [x] 生成 `4_事件主表_策划好读版_20260605.xlsx`
- [x] 生成 `ysbzs_events_20260605.yaml` 与 `ysbzs_events_接入说明_20260605.md`
- [x] 校验事件主表 22 行 / YAML 14 事件组 / 22 选项 / 29 效果 / 8 条条件 / 7 条 bridge_now
- [x] 生成 Day1-Day10 怪物模板表与机制ID版怪物波次表
- [x] 生成 monster_templates / monster_waves YAML 与接入说明
- [x] 完成 34 模板 / 20 波 / 22 优先机制覆盖 / 6 文件打包校验

## 提交计划 commit_plan

- 本轮优先交付表格与说明文件；是否提交由任务归属与工作区状态再判断
- 如提交，提交信息格式：`docs(data): add planner-friendly pet wave mechanic tables`

## 中断记录 interruption_log

2026-06-05 16:21：用户将当前优先级切到宠物总表、怪物波次表、机制词条库整理；本任务接管 `external-data/` 下新表格与说明文件，不进入运行时接线。
2026-06-05 16:39：三张主表与配套 YAML/MD 已产出，当前进入 `READY_TO_VALIDATE`，等待用户确认是否继续做第二轮数值细调。
2026-06-05 16:53：按用户新规则重算宠物总表；当前宠物总表已满足 `abs(差值)<=5`、`非钻石防=0`、`HP/盾固定档位`、`机制分为8倍数`。
2026-06-05 17:47：按用户新规则重做机制词条库，新增 `适用对象 / 触发时机 / 机制分 / 被克制 / 首版优先级` 字段，并将伤害类、坚固类、护盾类机制拆开。
2026-06-06 00:14：新增机制ID接入版宠物表与怪物波次表，补齐 `ysbzs_mechanism_mapping_20260605.yaml`、`ysbzs_monster_waves_20260605.yaml`、`ysbzs_mechanism_id接入说明_20260605.md` 与 `ysbzs_mechanism_id_pack_20260605.zip`；完成 127 / 55 行校验、机制ID合法性检查与 PNG 预览。
2026-06-06 00:31：修正怪物波次机制ID版字段错位：`定位` 改回原 `出怪组`，`设计目的` 保留原长备注，`备注` 仅保留 REVIEW/近似映射说明；重新导出 xlsx / YAML / zip。
2026-06-06 00:46：按“未来数据源优先”的事件方案新增 `4_事件主表_策划好读版_20260605.xlsx`、`ysbzs_events_20260605.yaml`、`ysbzs_events_接入说明_20260605.md`；完成 14 个事件组 / 22 条选项 / 29 条效果 / 8 条条件 / 7 条 bridge_now 的结构校验，并同步整理包 `README.md`。
2026-06-06 01:14：完成怪物模板表 + Day1-Day10 机制ID波次包：补齐 `2_怪物模板表_机制ID版_20260605.xlsx`、`3_怪物波次表_机制ID版_20260605.xlsx`、`ysbzs_monster_templates_20260605.yaml`、`ysbzs_monster_waves_20260605.yaml`、`ysbzs_monster_waves_接入说明_20260605.md`、`ysbzs_monster_waves_mechanism_id_pack_20260605.zip`；完成 xlsx 行数检查、YAML 解析检查、zip 内容检查。

## 冲突记录 conflict_log

2026-06-05 16:21：已检查当前 ACTIVE/PAUSED 任务卡，现有任务占用代码/UI/文档文件，不与本任务计划修改的 `external-data/` 新资产重叠，未触发 FILE_CONFLICT_STOP。
