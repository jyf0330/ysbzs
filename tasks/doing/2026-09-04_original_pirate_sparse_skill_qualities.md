# 英雄技能实际品质集合

task_id: 2026-09-04_original_pirate_sparse_skill_qualities
status: READY_TO_MERGE
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 技能仅声明实际非空品质；起始/学习/升级/Ghost精确引用与可达性同步，禁止补造缺档。
related_files: tools/export_original_pirate_content.py; tests/original_pirate_sparse_skill_qualities.test.cjs; tests/original_pirate_content_export.test.cjs; 本卡; tasks/index.md
write_scopes: exporter英雄技能品质装配/校验、起始和训练档案校验、升级和可达性集合（CSV及JSON）；新专项；旧OPC06仅ghost-snapshot-hero-skill-quality命名vector按Lead授权迁移到未知品质；本卡与索引。mode=direct。
exclusive_files: tools/export_original_pirate_content.py; tests/original_pirate_sparse_skill_qualities.test.cjs
shared_file_policy: Lead显式接续授权；前序已提交，开工仅两份既有pyc，保留不动。
validation: TDD，真实整包validate_package，CSV/JSON缺档引用负测，旧正式导出逐字不变，相关专项与--check。
commit_plan: READY_TO_MERGE后释放；不Godot、不暂存/提交/归档。sourceBinding扩展是下一独立原子切片。

合同：非空bronze/silver/gold/diamond子集；起始/学习品质显式存在，不强制铜。升级仅全局相邻且双端存在。保留每技能唯一取得入口和全部声明档可达，带洞不可达集合拒绝。不放宽触发或操作，不改工作簿/CSV/正式版本/输出。

## 验证

- TDD RED：HERO_SKILL_QUALITY_COVERAGE_INVALID:hero_skill_tailwind_return；继续真实整包验证发现CSV和JSON两处旧Ghost技能日次品质硬编码，已改为明确引用存在档案。物品日次品质不变，不将作者快照合同当作原版自然获取许可。
- 新专项正向金单档、钻单档、银→金、金→钻、银→金→钻，金起始；负向包含空/未知档案、starting/learn/upgrade/Ghost引用不存在档案、非法类型、已存在但跨档升级、有洞不可达集合及高档取得使低档不可达。
- 新专项、maxAmmo、selfUse、passive、sourceBinding合跑5/5 PASS（0.43秒）；最后补充非法JSON类型/跨档向量后新专项1/1 PASS（0.36秒）。JSON向量重签bundleHash，断言不是hash错误掩盖语义错误。
- 正式CSV分别经HEAD d592f71与当前build_exports，按CLI canonical JSON加换行比较：content169932字节、display26725字节逐字一致；SHA分别0a27bcc78c1c09727634deac766c543bc97c50e0647d2bc17cf6c8a27bc17fa1、7b92728856ff268766c23f38ea4e4d48d8a4d04a63b1d465825e348e3ebb36f3。正常exporter --check PASS，git diff --check PASS。
- OPC06首轮暴露旧Ghost已有silver档拒绝断言过时，经Lead授权只将该vector改为未知legendary档，不删除负测；复跑1/1 PASS（22.53秒），进程已结束。
- 测试PATH前置codex-primary-runtime/dependencies/python/bin及node/bin，PYTHONDONTWRITEBYTECODE=1。无Godot/全量npm测试，无CSV/workbook/版本改动，两个既有pyc保留。
