# 候选 Run 独立身份视图

task_id: 2026-09-04_bazaar_run_source_view
status: DONE
owner: /root (implementation: pirate_top_three_source_audit)
merge_owner: /root
Goal: 将已观察Run的Spices及14技能身份、来源分类和DB实际品质集合独立锁入参考表，不升级runtime。
related_files: xlsx/ysbzs_master.xlsx; data/csv/69_bazaar_run_source_views.csv; data/csv/70_bazaar_run_source_members.csv; data/csv/README_csv_source.md; tools/export_master_to_csv.py; tools/bazaar_run_source_views.py; tools/add_bazaar_run_source_view.py; tests/bazaar_run_source_view.test.cjs; tests/csv_source.test.cjs; 本卡; tasks/index.md
write_scopes: 工作簿仅新增BAZAAR_RUN_SOURCE_VIEWS/MEMBERS；export_master仅登记与前置校验/排序；新模块脚本测试全文件；csv_source仅工作表名单；README新增来源范围；本卡/index。mode=direct。
exclusive_files: xlsx/ysbzs_master.xlsx; tools/export_master_to_csv.py; tools/bazaar_run_source_views.py; tools/add_bazaar_run_source_view.py
shared_file_policy: Lead授权独立参考数据切片，已有pyc保留；旧66/67/68及runtime/content exporter不改。
validation: TDD、只读DB SHA及15身份集合核对、workbook旧sheet逐cell不变、CSV确定性重建/畸形拒绝、正常content/display不变。
commit_plan: Lead精确提交本目录切片并推送codex/original-pirate-passive-content；不运行Godot，不关闭整体原规则目标。

69字段view_id,parent_source_snapshot_id,selection_scope,evidence_url,usage_scope,member_count,members_sha256；70字段view_id,source_type,source_uuid,source_heroes,spawning_eligibility,source_qualities。英雄小写字典序以|分隔；品质小写按铜银金钻以|分隔；生成资格保留源枚举Always/GuidOnly。非空无重复，完整canonical集合锁。来源品质不是实例品质；Run链接不证明版本、热度或自然获取池。

## 已完成证据

- TDD RED为source view validator missing；GREEN新专项、旧140成员专项、旧external item来源绑定专项3/3 PASS（1.14秒）。新增重签UUID/类别/品质与PASS字段负测后新专项复跑1/1 PASS（1.01秒）。
- 本机DB只读SHA核验7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9；15个名字唯一匹配且规范化身份属性摘要04aaf9676efff60f370c1400168390909715d975e702c87f021737c72cb3b6a5；独立子线程也核对15/15。只保存必要身份属性，无原始payload/文案/素材。
- 新增脚本只新增两表，并逐值比较44个旧sheet不变；root独立从HEAD逐cell复核相同。66/67未改，父hero_scope仅旧Vanessa集合语义，本视图仅复用其完整DB artifact/build身份。
- 正常reference-source-lock-only导出5域及--check PASS；CSV02F/CSV02H/CSV08B 3/3 PASS（0.50秒）。普通完整master --check仍失败：ValueError: pet pal_001 missing required base stat action，未宣称完整导出通过。
- 正常content exporter --check PASS；内存CLI canonical输出content169932字节SHA0a27bcc78c1c09727634deac766c543bc97c50e0647d2bc17cf6c8a27bc17fa1，display26725字节SHA7b92728856ff268766c23f38ea4e4d48d8a4d04a63b1d465825e348e3ebb36f3，与迁移前相同。未写正式content/display、未改runtime sourceCatalog或schema。
- 临时XLSX使用同目录唯一NamedTemporaryFile；第二次运行明确no workbook rewrite。git diff --check PASS。测试PATH前置bundled python/bin及node/bin，PYTHONDONTWRITEBYTECODE=1；本轮新增helper pyc已精确删除，旧两份pyc保留。
- root本轮公开Run页面重查最终六物品和14技能一致。Day14 Hour2出现Pygmalien→Bootstraps→Spices，Day7 Hour5 MountainPass→ValleyFever，Day13 Hour4 Inspired by Karnok且final有InspiredRage；仅成员交叉佐证，不推导通用获取规则。页面footer不是Run版本锁。
- root本轮Vanessa社区统计3868/总28624，前三类别Ammo·Tool777、Slow·Aquatic527、Weapon·Damage497；仅流派热度，不是三套固定阵容排行，不改变69 evidence_url或最终验收名单。
- 本数据参考目录READY_TO_MERGE；独立源码审查由root协调，未stage/commit/push/Godot。真实技能绑定/机制执行/完整初态/三构筑日志独立审核仍属于后续工作。

## Lead 集成验证

- 主线程独立来源专项3/3通过（1.15秒）、CSV08B 1/1通过、reference-source-lock-only --check通过；真实DB添加脚本复跑明确no workbook rewrite。旧44张工作表逐cell与父提交8bd338e一致；66/67逐字不变；当前build_exports与Godot正式content.json/display.zh-CN.json逐字相同（169932/26725字节）。
- 独立只读审核线程检查了代码及内存负例：UUID/类型/品质改动连同69摘要一起重签仍拒绝，父DB摘要变更拒绝，Spices的Pygmalien分类没有继承父Vanessa范围。结论仅为reference-only目录通过。
- npm run check:all已终态失败：基础68/68，unit 171/183，串联后续门禁未执行。主线程另以同一环境复跑unit，171/183；将精确父提交8bd338e解包到隔离/tmp/pirate-source-parent-audit.ufoDBW后复跑同一183项，也为171/183，相同12个测试名/位置全部重现（当前12.74秒、父12.77秒）。这是已有失败重现证据，不是全量通过。
- 12个失败位置：action_slot_element_layers:27/41；manual_flow_preview_lethal_diff:44；mechanics_feasible:19；pet_merge_quality_upgrade:42；preview_dead_target_element_spread:20；quality_tiers_factory:56；runtime_data_report:12/57；runtime_database:13/52；shape_catalog:52（均在tests/unit/*.test.cjs）。四个runtime report/database失败同为pal_001缺少action基础值。
- 不涉及UI、规则数值或正式内容变更，当前功能Spec不变。后续必须原子迁移两端技能sourceBinding、实际执行及六场完整日志审核；69/70尚未作为runtime可执行来源消费。
