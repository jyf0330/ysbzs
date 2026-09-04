# 自身使用伤害成长的数据能力

task_id: 2026-09-04_original_pirate_self_use_damage_growth
status: READY_TO_MERGE
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 原规则Rifle所需自身使用增伤可被CSV/exporter表达，不新增正式物品或近似数值。
related_files: tools/export_original_pirate_content.py; tests/original_pirate_self_use_damage_growth.test.cjs; tests/original_pirate_content_export.test.cjs; 本卡; tasks/index.md
write_scopes: exporter中gain_damage_for_fight的触发/条件/目标合法性与CSV装配校验；新专项与旧拒绝断言迁移。
exclusive_files: tools/export_original_pirate_content.py（本工作树无其他活跃来源功能，前序已提交）；新专项。
shared_file_policy: Specialist仅写上述范围，Lead整合，保留无关pyc和旧任务。
validation: 先红后绿，允许item_ready+always+self_item；保留另一物品响应；拒绝其他ready目标/条件/开战，正常导出包逐字不变，不改workbook/CSV/版本字段。
commit_plan: 与Godot完整支持同步验证后单一机制原子提交；不调用完整原规则验收PASS。

## 数据专项证据

- TDD RED：新专项首次在CSV装配阶段报 EFFECT_DAMAGE_GROWTH_TRIGGER_INVALID:effect_tidescar_matchlock_bronze_growth。GREEN：同专项1/1通过（1.08秒）。
- 正向覆盖CSV→候选→validate_package；保留 another_friendly_item_used 的 self_item / trigger_source_item 两条既有路径。负向覆盖CSV和JSON的其他ready目标、battle_start、错误条件、零/负数，另拒绝JSON布尔/小数/多余参数。
- fixture只复用现有原创档案测试新组合，不导入Rifle、不声明原规则通过；Rifle来源中的80不是初始Ammo/BaseCrit已证明的依据。
- 使用HEAD exporter与当前exporter对同一正式CSV运行正常build_exports并按CLI canonical格式比较：content 169932 bytes、display 26725 bytes逐字不变。content SHA256=0a27bcc78c1c09727634deac766c543bc97c50e0647d2bc17cf6c8a27bc17fa1；display SHA256=7b92728856ff268766c23f38ea4e4d48d8a4d04a63b1d465825e348e3ebb36f3；bundleHash仍d3327b7f2dbc6676703cfc6c4cabf55308cabdfc7859c262e8457c3cc2d363dd。
- 正常exporter --check及git diff --check通过。旧OPC06中原item_ready拒绝样例改为battle_start拒绝，未删除非法分支测试。
- 命令解释器：PATH前置 /Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin 与 /Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin；PYTHONDONTWRITEBYTECODE=1。未运行Godot，未修改workbook/CSV/版本/正式生成物，保留已有两个pyc。
- 最终补充回归：`node --test tests/original_pirate_passive_content.test.cjs tests/original_pirate_source_binding.test.cjs tests/original_pirate_self_use_damage_growth.test.cjs` 3/3 PASS（3.89秒）；`node --test --test-name-pattern='OPC05D|OPC06' tests/original_pirate_content_export.test.cjs` 2/2 PASS（125.99秒，0 skip）。均已终态，无数据测试进程继续运行。
- READY_TO_MERGE仅指本数据能力切片完成并待Lead集成。未重跑npm check:all；既有全量unit失败不因专项通过而关闭。Godot、原规则物品映射、真实初态与热门三构筑独立日志审核均由总任务继续跟踪。
