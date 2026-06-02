# AI 项目总规则 · 元素背包史

## 必读顺序

 按任务类型决定是否创建或更新 `tasks/doing/当前任务.md`；只读评审 / 流程审计不创建任务卡。

## 项目标识

- 项目：元素背包史（ysbzs）
- 类型：`game`
- 工作流：`ywh-game`
- 仓库：`git@github.com:jyf0330/ysbzs.git`
- 主文件：`index.html`
- 测试：`node test.js`（当前基准只维护在 [docs/00_CURRENT_CONTEXT.md](./00_CURRENT_CONTEXT.md)，入口文件不要复制数字）

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

- 执行纪律总纲（任务先分类、代码基线、文档基线、设计未拍板不实现、建议来源与执行优先级）
- Superpowers 执行链与文档门禁分级
- Codex Goal 适配（何时开启、转换步骤、Charter 字段、Goal Skill Hooks）
- 任务分流与最小读取
- 工作区状态必读门禁
- 任务卡生命周期
- TDD 硬门禁
- subagent 使用边界
- graphify 使用边界
- Demo 阶段文档门禁
- 文档同步规则
- 验证后文档同步与 Git 收尾判断
- 代码与文档不一致处理
- 商店/经济/成长系统参考方向
- 建议来源与执行优先级
