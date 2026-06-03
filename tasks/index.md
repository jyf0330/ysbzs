# 当前任务总览

updated_at: 2026-06-03 17:00

## 当前执行优先级

### 1. ✅ 四阶体系 + 元素伤害统一重构 + 表格同步

- **状态**：DONE
- **任务卡**：`tasks/doing/2026-06-03_09-40_four-tier-element-refactor.md`
- **commit**：`9f0ab9c`
- **验收**：436/436 通过，无旧口径残留

### 2. 商店界面设计文档编写

- **状态**：PAUSED
- **任务卡**：`tasks/paused/2026-06-02_08-20_shop-ui-doc.md`
- **恢复条件**：用户明确恢复后继续
- **说明**：尚未开始正式撰写，输入资料路径已确认

## 工作区状态

- `git status --short`：✅ 干净，无 dirty 文件
- 无 staged 文件
- 无待处理冲突

## 断线恢复规则

当用户说"继续当前任务"时：
1. 先读取本文件 `tasks/index.md`。
2. 找到 P0 任务，读取对应任务卡。
3. 运行 `git status --short` + `git diff --stat`。
4. 检查 dirty 文件是否全部可归属当前任务。
5. 检查是否存在 `FILE_CONFLICT_STOP`。
6. 无冲突后按 `resume_next_step` 继续。
