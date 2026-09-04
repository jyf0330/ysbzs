# Cannonball 未附魔真实规则候选

task_id: 2026-09-04_original_pirate_cannonball_candidate
status: DONE
owner: pirate_top_three_source_audit
merge_owner: /root
Goal: 从锁定原版Cannonball身份与银金钻none效果建立可执行候选，供三热门构筑后续组装；不是原创carrier或完整原版玩法验收。
related_files: xlsx/candidates/original_pirate_cannonball_none.xlsx; data/candidates/original_pirate/cannonball_none/*; tools/export_original_pirate_cannonball_candidate.py; tools/add_original_pirate_cannonball_candidate.py; tests/original_pirate_cannonball_candidate.test.cjs; tasks/index.md; 本卡
write_scopes: 上述新候选目录/工具/测试由data线程direct独占；候选工作簿→同域CSV→现有ContentAssembler，不修改正式master/25域CSV、production exporter语义或正式22物品。
exclusive_files: xlsx/candidates/original_pirate_cannonball_none.xlsx; tools/export_original_pirate_cannonball_candidate.py; tools/add_original_pirate_cannonball_candidate.py
shared_file_policy: 前轮已提交c254d21且无tracked dirty，仅两旧pyc保持；Godot由root与test线程独立负责。新增候选路径无他人租约。
contract: 真实独立item_bazaar_cannonball、UUID55377bdf-359b-495c-895c-c7852511c915、实际银金钻none。来源只声明battle_profile，未附魔三档之外不声称完整；目标与参数需先核实源。候选host经济/初态明确synthetic，不冒充原作价格或初始化，不生成PASS字段。
validation: TDD、源身份/三档语义核验、XLSX与CSV重建、整包验证/顺序hash确定性、真实定义scope不可冒用、正式master/CSV/content逐字不变、两端hash与独立审核。
additional_write_scope: tools/export_original_pirate_content.py 的 _item_tags/_expect_canonical_item_tags 增 allow_empty 默认 false，仅物品定义调用 true；selector/condition 标签仍非空。Lead 已授权，前轮 exporter 租约已提交释放。不改版本/正式字节。
host_contract: 仅候选追加 silver 炮弹 stash 实例、银金钻报价与两条相邻升级价格，皆为 synthetic 宿主；炮弹 inactive ammo/crit 0 为 schema 占位，不宣称原作默认属性。原宿主条目不变。
commit_plan: data线程不提交/Godot；完成候选整包导出后冻结给Lead，Lead独立验证并与Godot测试/生成物分别原子提交，不关闭总目标。

## 数据交付证据（2026-09-04）

- 先 RED：新专项因候选 exporter 尚不存在失败；实现后第二次 RED 揭示旧 `_same(tags)` 拒空，完整调整物品定义空 tags 接受域后 GREEN。selector/condition 空 tags 仍拒绝，无 schema/version/正式数据变更。
- 锁定 DB SHA `7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9`，本轮只读核实炮弹 UUID、三档唯一 Custom_0、空主动、唯一 Aura、Tags=[]、HiddenTags=[AmmoReference]、Transform/Quests 均 null。源旧相邻描述与结构 SelfHand 不同，公开 18.0 Hotfix Sep 3 卡片 Deep Mechanics 交叉支持全场正 AmmoMax，不是 Run 版本锁。
- 新候选+既有 passive/max-ammo/item-source/hero-skill-source 专项 **5/5 PASS**；OPC01/OPC02 **2/2 PASS**；OPC03/OPC06 **2/2 PASS**（45.83 秒）。正常生产 exporter `--check` PASS，仍 22 件。
- 新专项实际通过整包 `validate_package`、真实 UUID 与三品质 none scopes、空标签、三档 Aura、原 22 定义不变、行重排 hash 确定、工作簿→CSV 重建、stale CSV 拒绝、变造 identity/amount/enchantment/宿主值拒绝、空筛选标签与非法标签拒绝。未跑 Godot。
- 原 `xlsx/ysbzs_master.xlsx` 与全部 25 个正式域 CSV 对 HEAD 逐字相同；普通 exporter 序列化的 content/display 与 Godot 正式文件逐字相同（170771/26725 字节）。两旧 pyc 完整保留，无新增缓存。
- 最终隔离输出 `/tmp/original-pirate-cannonball-candidate-v2.kOMyW5/{content.json,display.zh-CN.json,provenance.json}`。bundleHash `4304db0c80774356d0c0a04b70c7a0992af2f65ce0fbeab3171f15991847f431`。基线 bundleHash `d79ea7265a57213dc30987dd2a43f067ad1f708f9763c1ec35b4ac717a7b4b28`。
- 实际命令前缀：`PATH=/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin:/Users/ywh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH PYTHONDONTWRITEBYTECODE=1`。
- `git diff --check` PASS；data 不暂存/提交/归档/推送，释放给 Lead。后续 Godot/独立审核由 Lead 回填；最热门三完整构筑、六场战斗日志独立原规则验收仍未完成。

## Lead 集成回填

- Godot 最终 `20260904-cannonball-candidate-v2` 为 15/15 PASS，含属性而非标签筛选、三品质、叠加、Session 存档/回放/恢复及来源漂移拒绝。正常候选 exporter 对 Godot 三输出文件幂等复核成功，hash 为上述 4304db…。
- 独立只读审核对银/金/钻 none 静态容量 Aura 映射 PASS；不是完整 battle_profile、13 附魔、动态生命周期或三阵容六场 PASS。
- Lead 执行 `npm run check:all`：基础 68/68 通过，随后 unit 存在元素/预览/品质/形状等断言失败及 `pal_001 missing required base stat action`，退出 1；串联后续门禁未执行。保留全量失败，不在本任务修无关玩法。
- 双端仅候选切片完成并由 Lead 精确提交；本卡 DONE 仅指该切片，总目标继续 IN_PROGRESS。无生产 master/CSV 改动，无 Godot 正式内容/入口变更。独立线程复核最终 v2 汇总与反向标签、拒绝语义测试，维持静态映射 PASS。
