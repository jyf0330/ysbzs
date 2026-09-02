# The Bazaar 本机 GameData 来源锁 v1

task_id: 2026-09-03_bazaar_local_gamedata_source_lock
status: DONE
owner: codex-gamedata-source-lock
branch: codex/original-pirate-content

## Goal

把本机已安装 The Bazaar 客户端的 build-bound `GameData` 缓存固定为严格 reference-only 来源：记录 Steam build、客户端版本、缓存 ETag、数据库/压缩包 hash，以及 Vanessa `Always` 物品与技能各 138 条的 canonical UUID 集合 hash。该来源只证明本机 build 对应的结构化身份与规则载荷存在；由于数据库没有显式 Patch 字段且再分发许可未确认，保持 `patch_version_confirmed=false`、`rule_semantics_verified=false`、`payload_committed=false`，不把数据库、专有原文或未冻结数值写入仓库。

## related_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/66_bazaar_reference_snapshots.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`
- `data/csv/README_csv_source.md`
- `tasks/index.md`
- 本任务卡

## write_scopes

- `xlsx/ysbzs_master.xlsx`: 在 `BAZAAR_REFERENCE_SNAPSHOTS` 页加入一条 build-bound cache candidate；保持现有 23 列 schema
- `66_bazaar_reference_snapshots.csv`: 由 master 导出的本机 cache 来源行；数据库 hash 为主 artifact，138/138 identity-set hash 写入 verification policy
- `tools/export_master_to_csv.py`: 固定第三条来源行、ID-set hash 形状和 fail-closed 校验
- `tests/csv_source.test.cjs`: workbook/CSV 重建、字段边界与 forged 负向门禁
- `data/csv/README_csv_source.md`: build-bound、patch 未确认、不可再分发边界
- `tasks/index.md`: 任务状态

## exclusive_files

- `xlsx/ysbzs_master.xlsx`
- `data/csv/66_bazaar_reference_snapshots.csv`
- `tools/export_master_to_csv.py`
- `tests/csv_source.test.cjs`

## validation

- PASS：`python3 tools/export_master_to_csv.py --check --reference-source-lock-only`；master 的 23 列、三条来源行与 `34`/`66` CSV 可严格重建。
- PASS：以 bundled Python 注入 PATH 执行 `node --test --test-name-pattern='CSV02F|CSV02H|CSV08B' tests/csv_source.test.cjs`，3/3；覆盖本机 cache 行的精确字段、空 Patch、构建绑定、reference-only/未核验许可边界，伪造 Patch、数量、许可、ID-set hash/shape 的负向门禁，以及总表可读结构不漂移。
- PASS：只读 SQLite `PRAGMA integrity_check=ok`；Vanessa + `SpawningEligibility=Always` 得到 Item 138/138、Skill 138/138，两组均无空 UUID 或重复 UUID。
- PASS：以 UUID 升序、UTF-8、换行连接且无末尾换行独立复算：Item ID-set SHA-256 `ac97522afdae6d9f0174b4c695bc272252adcc6ad9aea924853712e43d6d9708`；Skill ID-set SHA-256 `66cacbf986415cf6218e98254274d4b58c528136186e7fc7b632d0b01588d81b`；合并 276 ID-set SHA-256 `99f0510637bac871277714de3ad5cb7132c1bfdad2f6d1718b8f3fc036bf04c7`。
- PASS：`GameData.db` 41,197,568 字节 raw SHA-256 `352c635cda5acf8af7ab91a81fa73a5d33c3e6beec19ffd9e29dbd17d8a89d31`；对应 zip SHA-256 `fa6f87ebee580acc4e866cecc0a2625e76f7acff2c70ccc68581cbb641e3246c`。仓库只保存 hash/元数据，不保存两份载荷。
- PASS：`git diff --check`；待主代理执行 staged diff 审计、精确提交与推送。

## Contract

- 第三行身份固定为 `snapshot_vanessa_local_cache_24720155_398715e6`，只表示 Steam build `24720155`、客户端 `1.0.11980-prod-macos-arm64-d75a8ee9`、GameData ETag `398715e6296f400e5d7aa829f8f8ed35` 对应的本机缓存候选。
- `game_patch` 必须为空；没有显式 Patch↔build 上游关系前，不得把它称为 Patch 18 目录或规则来源。
- `record_count=276` 只计入 Vanessa `Always` Item 138 + Skill 138 的 canonical UUID 身份集合；不把当前缓存的 merchant package 推断绑定到旧 93 条对象。
- `license_status=unverified`、`usage_scope=reference_only`、`catalog_status=reference_reserved`；不进入 34 条旧对象绑定，也不进入原创海盗可执行目录。
- `rule_verification_policy` 只冻结两组身份集合 hash；逐条规则语义和玩家正式 Trace 仍须另行核验。

## deferred_scope

- 不提交 `GameData.db`、zip、manifest、tooltip、名称原文、效果文本或数值。
- 不把当前缓存直接称作 Patch 18；须等上游显式 content release/build 关系或逐条官方差异交叉验证。
- 不把旧 93 merchant package 冒充当前确认集合；当前缓存的 91 条 package 仅保留审计结论。

## commit_plan

- 一个原子提交：`data(source): lock installed GameData reference`
