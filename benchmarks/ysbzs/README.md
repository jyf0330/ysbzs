# ysbzs v1 基准测试套件

> 标准考卷 + 数据自洽 + 实现缺口报告  
> 不是功能验收，不测试不同 Agent  
> 不改 index.html 核心逻辑

## 快速开始

```bash
# Smoke（4个Case）：C01 口径 / C05 定价 / C10 HP计算 / C12 旧ID
npm run benchmark:smoke

# Full（12个Case）：全部
npm run benchmark
```

## 目录结构

```
benchmarks/ysbzs/
├── README.md
├── cases.json                    # 12个benchmark case定义
├── fixtures/
│   ├── README.md                 # fixture说明 + 自洽验证结果
│   ├── monster_types.json        # 12种怪物完整字段
│   ├── combat_segments.json      # 20个战斗小段
│   ├── shop_rules.json           # 摊位/标签/品级/保证位/刷新规则
│   ├── economy_rules.json        # 收入/击杀金/刷新费/出售返还
│   ├── ability_status.json       # 全部ability状态
│   └── legacy_ids.json           # 旧ID标注
└── run-benchmark.mjs             # 主Runner
```

## 判据

| 判据 | 含义 |
|------|------|
| 🟢 PASS | 文档/fixture/代码一致 |
| 🔴 FAIL | 文档内部矛盾、fixture算错、旧口径污染 |
| 🟡 PENDING_OK | 文档明确pending，未实现不算失败 |
| 🔵 SPEC_TARGET | 文档定义未来目标，当前不要求实现 |
| ⚪ NOT_IMPLEMENTED | 文档要求active，代码没有 |
| ⬜ GAP_ONLY | 只记录实现缺口，不影响总通过 |

## 报告输出

```
reports/benchmark/
├── ysbzs-benchmark-report.json   # 机器可读
├── ysbzs-benchmark-report.md     # 人类可读
└── implementation-gap-report.md  # 实现缺口报告
```
