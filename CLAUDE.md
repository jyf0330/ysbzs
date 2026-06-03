# CLAUDE.md · 元素背包史 / ysbzs

First read `docs/02_CURRENT_WORKFLOW.md`: hard triggers are `Goal`, `diff`, and `git-c`.

<!-- ywh: web-game -->

Claude 入口薄文件。项目总入口是 `docs/00_AI_START_HERE.md`。

## 开始任务

1. 先读 `docs/00_AI_START_HERE.md`。
2. 按任务类型继续读取对应角色入口：
   - 程序/代码任务：`docs/roles/PROGRAMMER_START.md`
   - 美术/生图/素材任务：`docs/roles/ARTIST_START.md`
   - UI/交互/界面任务：`docs/roles/UI_UX_START.md`
   - 策划/数值/规则任务：`docs/roles/PLANNER_START.md`
   - 涉及文件索引：`docs/05_ASSET_AND_FILE_INDEX.md`
3. 按任务类型创建或更新 `tasks/doing/当前任务.md`。

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
- 不要在 CLAUDE.md 里堆完整规则。

## 常用命令

- 验证：`node test.js`
- 状态：`git status --short --untracked-files=all`
- 看差异（自动跑测试→安全 diff）：`git d`（alias，等效 `.githooks/pre-diff`）
- 总入口：`docs/00_AI_START_HERE.md`
