# 最大弹药 Aura 数据能力

task_id: 2026-09-04_original_pirate_max_ammo_aura
status: READY_TO_MERGE
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 新增 grant_max_ammo 与 friendly_ammo_items 空参数的窄域导出合同；不导入 Cannonball、不推断初始装填。
related_files: tools/export_original_pirate_content.py; tests/original_pirate_max_ammo_aura.test.cjs; 本卡; tasks/index.md
write_scopes: exporter 的 Aura 常量、_validate_executable_aura、ContentAssembler._auras；新专项全文件；本卡及索引条目。mode=direct。
exclusive_files: tools/export_original_pirate_content.py; tests/original_pirate_max_ammo_aura.test.cjs
shared_file_policy: Lead 明确接续授权，前序 self-use 已在 HEAD ec3a12f，无未提交源码；旧卡归档归 Lead。保留两份既有 pyc，不触碰其他工作树。
validation: TDD；CSV→assemble→validate_package；JSON 重签整包负测；旧 Aura 不变；正常生产输出逐字不变；exporter --check；git diff --check。
commit_plan: 停 READY_TO_MERGE；不暂存、不提交、不归档、不推送；Godot 由 Lead 串行验证。

合同：新目标 CSV target_tags 为空、target_exclude_self=false，JSON params={}；operation 仅正整数 amount，lifesteal_bps 为空。不按 Ammo 标签/相邻筛选，不填当前 Ammo。仅本场冻结来源/目标静态正向容量加成，完整生命周期和原版初态仍未验收。

## 数据验证证据

- RED：新专项在未实现时失败于 AURA_TARGET_INVALID:aura_mistkelp_remedy_kit_bronze_weapon_damage；实现后 GREEN 1/1。最后新增缺少 amount 负测后复跑 1/1 PASS（0.31秒）。
- `node --test tests/original_pirate_max_ammo_aura.test.cjs tests/original_pirate_self_use_damage_growth.test.cjs tests/original_pirate_passive_content.test.cjs tests/original_pirate_source_binding.test.cjs`：4/4 PASS（0.39秒）。
- `node --test --test-name-pattern='OPC02N' tests/original_pirate_content_export.test.cjs`：旧伤害/吸血 Aura 1/1 PASS（0.18秒）。
- `node --test --test-name-pattern='OPC06' tests/original_pirate_content_export.test.cjs`：旧整包拒绝回归 1/1 PASS（22.87秒），进程已结束。
- 新专项经 CSV→ContentAssembler→validate_package；结构合法负向 JSON 均重签 bundleHash 后走整包校验；畸形 params 则明确断言先于 hash 被 schema 拒绝，未用哈希失败掩盖语义检查。覆盖错误目标/标签/排除自己/操作、额外参数、缺失/零/负数/小数/布尔/字符串 amount。原有 Aura 和所有 profile Ammo 字段不变。
- 同一正式 CSV，分别运行 HEAD ec3a12f 与当前 exporter 的 build_exports，按 CLI canonical JSON 加换行比较，content/display 逐字一致：content 169932 bytes，SHA256 0a27bcc78c1c09727634deac766c543bc97c50e0647d2bc17cf6c8a27bc17fa1；display 26725 bytes，SHA256 7b92728856ff268766c23f38ea4e4d48d8a4d04a63b1d465825e348e3ebb36f3。bundleHash 保持 d3327b7f2dbc6676703cfc6c4cabf55308cabdfc7859c262e8457c3cc2d363dd。
- 正常 `python3 tools/export_original_pirate_content.py --check` PASS；git diff --check PASS。
- PATH 前置 `/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin` 与同 dependencies 下 `node/bin`，PYTHONDONTWRITEBYTECODE=1。未运行 Godot 或全量 npm check:all。
- 未修改 workbook、CSV、正式物品/生成包/版本；保留两份既有 pyc。仅本数据能力 READY_TO_MERGE，不声明原版装填、完整 Cannonball 或热门三构筑独立战斗日志审核通过。
