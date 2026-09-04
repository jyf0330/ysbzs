# 英雄技能 Aura 与真实生命循环候选

task_id: 2026-09-04_original_pirate_hero_skill_auras
status: DONE
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 正常表链支持纯 Aura/效果加 Aura 英雄技能；实际 Circle of Life 钻石独立候选，不声明完整海盗验收。
related_files: tools/export_original_pirate_content.py; tools/export_master_to_csv.py; tools/original_pirate_source_binding.py; tools/bazaar_run_source_views.py; tools/add_original_pirate_hero_skill_auras.py; tools/export_original_pirate_circle_of_life_candidate.py; tools/export_original_pirate_cannonball_candidate.py; xlsx/ysbzs_master.xlsx; xlsx/candidates/original_pirate_circle_of_life.xlsx; data/csv/44_bz_gameplay.csv; data/csv/62_bz_hero_skills.csv; data/csv/69_bazaar_run_source_views.csv; data/csv/70_bazaar_run_source_members.csv; data/csv/72_bz_hero_skill_auras.csv; data/candidates/original_pirate/circle_of_life/*; tests/original_pirate_hero_skill_auras.test.cjs; 相关旧来源/版本/CSV/候选 tests; data/csv/README_csv_source.md; tasks/index.md; 本卡
write_scopes: 上述数据迁移直接写入。正式现有两技能行为/22物品不变；炮弹候选只重锁新基线；新增源视图只有Circle实际身份。不得改Godot。
exclusive_files: xlsx/ysbzs_master.xlsx; tools/export_original_pirate_content.py; tools/export_master_to_csv.py; tools/original_pirate_source_binding.py; tools/bazaar_run_source_views.py
shared_file_policy: 前轮炮弹已提交释放，当前仅2旧pyc保留。root授权本轮全数据文件；Godot其他线程独立负责。
additional_write_scope: tools/add_bazaar_run_source_view.py existing-sheet no-rewrite 验证仅比较原VIEW_ID行并继续完整当前view验证，保留新增Circle视图，不修改旧锁。
validation: TDD RED/GREEN，正常XLSX→CSV→exporter，严格负测/版本拒绝/重排hash，既有技能行为不变，实际Circle身份和diamond范围，更新炮弹候选依赖，三包交Lead。
commit_plan: 不stage/commit/archive/push，不跑Godot；完成READY_TO_MERGE释放给Lead。

## 交付合同与边界

- content38/runtimeBundle36/catalog27，Lifesteal v2、rules v33；revision34与56身份不变。44正规更新三项规则字段，62追加aura_ids，72为独立技能Aura域。正式两技能填auras=[]，22物品与旧技能效果数值不变。
- 纯Aura为triggerEvent=none、maxTriggersPerBattle=0、effects=[]；响应技能CSV继续一行一个operation，JSON保留非空多effects逐项校验。目标仅最左己方指定标签物品，非空标签；吸血整数1..10000。没有把技能伪装item。
- Circle真实UUID9ec041be-6f89-4e95-963d-1deb7460e1d0，仅diamond静态最左Weapon100%吸血。新增独立一成员来源视图，旧140及原15成员锁不变。训练师/1金币/天数为明确synthetic宿主，并非原版自然获取。
- 炮弹候选只重基线摘要，三档none规则不变。生命值伤害基数、治疗结算等仍依项目合同，不宣称完整原版物品、原版技能全部结算或热门三构筑日志验收通过。

## 验证（2026-09-04）

- TDD先RED（schema不支持），再实现；最初综合回归36/37有一项旧lifesteal v2负例与新合同相同，精准改成拒绝旧v1后复跑OPC03/06 2/2通过。
- 最终一次完整7文件：35/35 PASS，51.99秒：original_pirate_content_export、original_pirate_hero_skill_auras、original_pirate_hero_skill_sources、original_pirate_sparse_skill_qualities、original_pirate_cannonball_candidate、bazaar_run_source_view、bazaar_reference_members。新Aura测试包含JSON多effects正测、CSV/JSON严格负测、重新签名伪造来源仍拒绝。
- CSV08B 1/1 PASS；master --original-pirate-only --check、--reference-source-lock-only --check、content exporter --check均PASS。43个非本轮拥有的原工作表逐cell不变；22物品与旧两技能剔除新空auras后执行定义相同。
- git diff --check PASS；未跑Godot、未以本专项宣称check:all全绿。未修改AGENTS。旧2个pyc完整保留。
- 复现环境：PATH前置 /Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin 和同级node/bin；PYTHONDONTWRITEBYTECODE=1；node --test tests/{上述文件}.test.cjs。

## 冻结候选输出

- /tmp/original-pirate-hero-auras-production-v2/content.json；bundleHash=53b65f2034c8fa1b3a4e67361ec2be06f0d7cc5ab2631af089b6d0a3f462bd04。
- /tmp/original-pirate-hero-auras-cannonball-v2/content.json；bundleHash=e50befcc2f41297a580dcfa7a020c46d2ecd37ed156856829fb7933e61d8f336。
- /tmp/original-pirate-hero-auras-circle-v2/content.json；bundleHash=6ee420f94ac5bf19c0d89e5ee514e0e5013dab5418f959d4c03b2753b7e37a90。
- 三目录均有display.zh-CN.json，两个候选另有provenance.json。旧v1目录不是最终合同。
- 所有实现/测试/工作簿/CSV写入释放给Lead；仅Lead决定集成与归档。未暂存、提交或推送。

## Lead integration

- Godot已验证生产与候选内容、来源、编译、恢复及真实Circle公开学习后实际吸血：tick7 / DAMAGE57 / LIFESTEAL_HEAL58，真实技能贡献10000bps、实际恢复6HP；仍明确project settlement，不是原规则验收。
- Godot英雄Aura专项15/15、炮弹兼容专项15/15；真实Circle加强专项1/1。默认完整Session180秒累计超时，已保留事实并逐项覆盖，不影响数据静态映射结论。
- 本轮check:all重跑exit1：base68/68，unit171/183、12项失败；与既有父基线日志逐项同名同错误12/12，后续串联门禁未运行。日志/tmp/original-pirate-hero-auras-check-all.LBl2tR/check-all.log。不是check:all全绿，也未本轮重跑父提交。
- Lead归档数据切片并精确提交；仅在Godot对应完整迁移验证结束后一起推送。三构筑六场独立日志验收仍开放。
