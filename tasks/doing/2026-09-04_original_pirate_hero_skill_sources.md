# 英雄技能来源绑定数据迁移

task_id: 2026-09-04_original_pirate_hero_skill_sources
status: VERIFIED_CORE_ONLY
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 定义级技能sourceBinding与真实15成员external_run_view来源消费；只证明身份，不认定原版执行。
related_files: tools/original_pirate_source_binding.py; tools/export_original_pirate_content.py; tools/export_master_to_csv.py; xlsx/ysbzs_master.xlsx; data/csv/71_bz_hero_skill_source_bindings.csv; data/csv/README_csv_source.md; 对应数据测试及局部工作表迁移脚本; tasks/index.md; 本卡
write_scopes: 上述文件中技能来源定义/装配/验证/canonical/hash及版本37/35/26；新增71域8行本地声明；external_run_view从69/70派生；其他实际字段和数值不变。mode=direct。
exclusive_files: tools/original_pirate_source_binding.py; tools/export_original_pirate_content.py; tools/export_master_to_csv.py; xlsx/ysbzs_master.xlsx
shared_file_policy: 前序38014e6已提交释放，只有既有两pyc；Godot由root独立负责，数据所有权授予本线程，root仅审核直到释放。
contract: sourceCatalogv2；新origin external_run_view，snapshot五字段不变，metadata严格parentSnapshotId/artifactMetadata/selectionScope/evidenceUrl/memberCount/membersSha256；成员sourceType/sourceUuid/sourceHeroes/spawningEligibility/sourceQualities字符串编码。父身份来自66，成员摘要按70原算法；不继承父Vanessa范围，不强制装配无直接绑定父快照。skill scope quality+hero_skill_profile，外部对象必须typed member且品质存在；local/synthetic绑定heroSkillId。旧external_reference140不变。contentRevision/56快照保持原值，版本与bundleHash标识合同变更。
validation: TDD，完整master/CSV/JSON链，两端hash同步，真实external skill正向identity-only和拒绝负例，旧来源/品质/导出回归，数值效果不变。
commit_plan: 不提交不Godot；READY后释放交Lead一次完整集成。更新index/相关入口测试，保留旧pyc。

## Lead 集成复验

- Godot正式content已由本导出器生成；来源专项最终13/13 PASS，Python日志材料14/14 PASS。
- Lead完整数据复跑31/31 PASS（整包28项+新旧来源与稀疏品质3项），不再仅依赖分段复跑。
- 独立审核线程CORE_ONLY代码审核PASS；身份来源与规则验收严格分离，热门三完整阵容原规则六场尚未通过。
- 本数据切片可独立回退；由Lead精确提交任务分支，主数据工作区两pyc不纳入。

## 精确补充租约

- tests/original_pirate_hero_skill_sources.test.cjs：新定义绑定/真实external视图/CSV和JSON拒绝专项。
- tests/original_pirate_source_binding.test.cjs：synthetic目录摘要变更同步技能绑定。
- tests/original_pirate_sparse_skill_qualities.test.cjs：稀疏fixture同步删除未声明品质71行。
- tests/original_pirate_content_export.test.cjs：25域/schema37/35/26期待、定义字段/canonical；父稀疏品质遗留ghost-hero-skill-quality-band旧CSV拒绝vector迁移未知legendary（不删负测）。
- tests/csv_source.test.cjs：工作表名单加入71。
- tools/add_original_pirate_hero_skill_sources.py：仅新增71工作表，旧46sheet单元格值核验不变，重复运行不重写。

## 证据与交付

- TDD RED：hero skill binding missing；GREEN新来源/旧来源/稀疏3/3。
- 新来源、旧来源、稀疏、maxAmmo、自用增伤、passive、旧140、Run视图八专项8/8 PASS（1.24秒）；CSV08B1/1 PASS；master --original-pirate-only --check及--reference-source-lock-only --check均PASS。
- 完整content专项首轮27/28：唯一失败是父稀疏品质遗留CSV Ghost品质band向量（合法silver档已不应拒绝）；只改为未知legendary后OPC03复跑1/1 PASS（20.79秒）。其余27项含OPC06整包拒绝均通过。没有宣称本轮npm全量全绿。
- sourceCatalogv2/content37/runtime35/catalog26；revision34/rules32/56快照不变。71八行皆本地原创，未新增任何原版执行映射。
- 候选目录 /tmp/original-pirate-hero-sources.2Mi4Ly：content.json、display.zh-CN.json；formal bundleHash=d79ea7265a57213dc30987dd2a43f067ad1f708f9763c1ec35b4ac717a7b4b28。
- external-skill-identity-only.json只把原创mist_salvo四档绑定真实Aggressive UUID，行为仍原创，不是原版技能。其bundleHash=ed4008a09ea42d66d123054fb0c66947040be9cf651d67318ed43fb7e1e76400；run snapshotDigest=769da2ce1212383cca9439eda1939c7e64222887a00f90616db01d2811924702。sourceCatalog.identity-only.json供两端canonical复核。
- 新external metadata除artifactMetadata外五值皆字符串，memberCount='15'；父目录不要求在sourceCatalog出现，snapshot集合仍精确等于物品与技能实际引用并集。
- 与Godot HEAD旧正式content逐字段比较，只schema/sourceCatalog版本、技能sourceBinding、bundleHash变化；执行字段全部一致。display与旧正式文件逐字一致。git diff --check PASS。
- 本线程所有运行已终态，停止写实现/测试；未Godot、未stage/commit/push，旧两pyc保留。READY仅本数据迁移等待Lead集成，真实技能效果和热门三完整构筑日志独立审核仍未通过。
