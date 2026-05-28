# AI 项目总规则 · 元素背包史

## 必读顺序

1. 调用并阅读 `ywh-game` skill。
2. 读取本文件。
3. 读取 [docs/00_AI_WORKFLOW_DETAILS.md](./00_AI_WORKFLOW_DETAILS.md)。
4. 运行 `git status --short --untracked-files=all`；如有非 `.omx/` 改动，继续读 `git diff --stat` 和必要 diff 摘要。
5. 按任务类型决定是否创建或更新 `tasks/doing/当前任务.md`；只读评审 / 流程审计不创建任务卡。

## 项目标识

- 项目：元素背包史（ysbzs）
- 类型：`game`
- 工作流：`ywh-game`
- 仓库：`git@github.com:jyf0330/ysbzs.git`
- 主文件：`index.html`（单文件原型，禁止无故拆分）
- 测试：`node test.js`（当前基准只维护在 [docs/00_CURRENT_CONTEXT.md](./00_CURRENT_CONTEXT.md)，入口文件不要复制数字）

## 硬红线

- 禁止跳过 `ywh-game` 和 [docs/00_AI_WORKFLOW_DETAILS.md](./00_AI_WORKFLOW_DETAILS.md)。
- 禁止默认全量读取 `docs/` 或源码。
- 禁止把归档文档当成当前规则。
- 禁止多个 AI 同时修改同一代码文件。
- 禁止未读 `git diff --stat` / 必要 diff 摘要就汇报未归属改动。
- 禁止文档未同步就 `git add` / `git commit` / `git push`。
- 禁止把“同步 ywh 工作流”理解成业务代码重构。
- 禁止完成任务后继续把旧任务卡留在 `tasks/doing/当前任务.md` 当作当前任务。
- 默认自主执行；但遇到破坏性操作、未归属核心改动、代码-文档冲突或 `[NEEDS_REVIEW]` 决策时，先暂停并列出取舍。
- 代码改动默认执行 TDD：bugfix、核心机制、UI 可观察行为、重构或行为变化，必须先写失败测试或复现用例并确认 RED，再改实现。
- subagent 可用于并行审查、验收或文档分析，但不是硬门禁；同一任务仍只允许一个 AI 修改同一代码文件。

## 快捷口令

- `同步 ywh 工作流`：以上游 `ywh` / `ywh-game` 为准，只同步项目工作流结构与 AI 入口，不改 `index.html`、`test.js` 或游戏核心代码。
- `只读评审 / 流程审计`：只判断、解释、审查建议或分析流程风险；不改文件、不更新 CHANGELOG、不进入 Git 收尾。

## 语言策略

本项目规则使用中文为主，保留英文命令、路径、固定关键词和必要短句。原因是项目文档和用户决策均为中文；全英文会降低维护效率，纯中文又会削弱命令/工具语义。

## 云服务器部署

- 服务器别名：`sts2-cloud`，IP：`124.222.83.113`，用户：`ubuntu`
- SSH 密钥：`~/.ssh/web.pem`（源文件：`~/Desktop/云服务器相关/web.pem`）
- nginx 站点路径：`/var/www/ysbzs/`
- 访问地址：`http://124.222.83.113/ysbzs/`

### 部署铁律

- **必须**使用 `git show HEAD:<文件>` 提取最新 commit 的稳定版本上传。
- **禁止**直接上传工作区文件——工作区可能有其他 AI 未提交的修改，直接 scp 会部署半成品。
- **禁止**因此规则而替其他 AI 提交代码；只部署已存在的 commit。

### 标准部署步骤

```bash
# 1. 提取稳定版本
git show HEAD:index.html > /tmp/ysbzs_stable.html

# 2. 上传
scp -i ~/.ssh/web.pem /tmp/ysbzs_stable.html ubuntu@124.222.83.113:/var/www/ysbzs/index.html

# 3. 验证
curl -s -o /dev/null -w "%{http_code}" http://124.222.83.113/ysbzs/
```

### nginx 配置位置

`/etc/nginx/sites-enabled/agar-io-clone`，在 server 块内追加 `/ysbzs/` 的 location 规则。修改后执行 `sudo systemctl reload nginx`。

## 细则入口

所有细则维护在 [docs/00_AI_WORKFLOW_DETAILS.md](./00_AI_WORKFLOW_DETAILS.md)，包括：

- 任务分流与最小读取
- 工作区状态必读门禁
- 任务卡生命周期
- graphify 使用边界
- Demo 阶段文档门禁
- 文档同步规则
- 验证后文档同步与 Git 收尾判断
- 代码与文档不一致处理
