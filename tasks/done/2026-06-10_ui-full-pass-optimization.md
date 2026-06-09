# 任务卡：界面全量优化 Pass

task_id: 2026-06-10_ui-full-pass-optimization
status: ACTIVE
created_at: 2026-06-10

## 目标

对游戏界面进行截图审查后发现的全部视觉/可读性问题的系统性修复。

## 问题清单

- P0 顶部状态栏：天数/回合字号大，金币/版本降调为辅助信息
- P0 右侧主操作按钮层级：结束回合高亮，其余按钮降调
- P1 左侧宠物卡片紧凑化：stat行更密，去冗余间距
- P1 行动块可读性：name/small字号增大，格子增高
- P1 棋盘单位token可读性：名字和HP数字更大更清晰
- P2 右侧详情区：空状态提示改为有意义内容引导
- P2 底部日志：格式化前缀改中文分类，字号增大

## related_files

- web/ux-app.css
- web/index.html
- web/ux-app.js

## commit_plan

feat(ui): 界面全量优化 Pass - 信息层级、可读性、按钮权重
