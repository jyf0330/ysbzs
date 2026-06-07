# AGENTS.md · 元素背包史 / ysbzs

## 核心层无 DOM 硬规则

1. 核心层不得直接操作 DOM。
2. 核心层不得调用 document / querySelector / innerHTML / classList / refreshUI / render / addEventListener。
3. 核心层只负责状态、棋盘纯对象、规则结算、结构化事件。
4. UI 层只负责读取 ViewModel / 日志格式化结果并渲染 DOM。
5. 棋盘格状态必须来自统一核心对象：state.board.cells。
6. 玩家行为验收必须走真实入口：按钮 / dispatch / autoExecuteTurn。
7. 直接调用内部函数只能做单元测试，不能当玩家链路验收。
8. 不得复制两套战斗、预览、移动、陷阱、日志逻辑。
9. UI 只能发交互意图，不得直接修改核心 state；所有会改变规则状态的玩家操作必须走 reducer.dispatch。

---

First read `docs/02_CURRENT_WORKFLOW.md`: hard triggers are `Goal`, `策划`, `diff`, and `git-c`.

如果指令以「策划」或 `diff` 结尾 → 只读/策划模式，不改代码。

<!-- ywh: web-game -->

AI 入口薄文件。项目总入口是 `docs/00_AI_START_HERE.md`。

## 开始任务

1. 先读 `docs/00_AI_START_HERE.md`。
2. 按任务类型继续读取对应角色入口：
   - 程序/代码任务：`docs/roles/PROGRAMMER_START.md`
   - 美术/生图/素材任务：`docs/roles/ARTIST_START.md`
   - UI/交互/界面任务：`docs/roles/UI_UX_START.md`
   - 策划/数值/规则任务：`docs/roles/PLANNER_START.md`
   - 涉及文件索引：`docs/05_ASSET_AND_FILE_INDEX.md`
3. 按任务类型创建或更新 `tasks/doing/当前任务.md`。

## 任务系统

多任务并行管理参见 `tasks/` 目录：
- `tasks/index.md` — 当前任务总览与断线恢复入口
- `tasks/README.md` — 任务系统细则与 FILE_CONFLICT_STOP 硬规则
- `tasks/doing/` — 当前 ACTIVE 任务（最多 1 个）
- `tasks/paused/` — 暂停任务
- `tasks/done/` — 已完成任务

每次开始任务或修改文件前，先读 `tasks/index.md` 检查冲突。

## 自动提交规则

当任务满足以下**所有**条件时，AI 应自行提交，**不需要请示用户**：
1. 任务卡已记录（有 `task_id` / `commit_plan`）
2. 测试全部通过（`node tests/run_all_tests.cjs` 无失败）
3. 暂存区文件全部归属当前任务 `related_files`
4. 无 FILE_CONFLICT_STOP 触发
5. 提交信息按任务卡 `commit_plan` 格式

不满足任一条件 → 输出 Commit Plan 让用户确认。

## 核心纪律

- 一个任务只允许一个 AI 修改同一代码文件。
- 代码改动默认走 TDD。
- 外部 AI 建议不是项目规则，以代码/目录/任务卡/正式文档/用户指令为准。
- 旧文档在 `docs/archive/`，不作为当前规则来源。

## 冲突优先级

用户最新明确指令 > `docs/00_AI_START_HERE.md` > 当前文档 > 代码真实实现 > archive 旧文档。

## 禁止事项

- 不要把旧聊天记录重新整理成当前规则，除非用户明确要求。
- 不要把 docs/archive/ 中的旧规则当成当前规则。
- 不要每次任务都新建一套规则文档。
- 不要在 AGENTS.md 里堆完整规则。

## 常用命令

- 验证：`node tests/run_all_tests.cjs`
- 状态：`git status --short --untracked-files=all`
- 安全看差异（自动跑测试后出 diff）：`git d`（alias → `.githooks/pre-diff`）
- 总入口：`docs/00_AI_START_HERE.md`
