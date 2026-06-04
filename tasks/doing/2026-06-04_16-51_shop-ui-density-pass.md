# 任务：商店 UI 首屏密度优化

task_id: 2026-06-04_16-51_shop-ui-density-pass
status: READY_TO_VALIDATE
priority: P0
created_at: 2026-06-04 16:51
updated_at: 2026-06-04 17:34

## 目标

在已完成的商店 CSS 重构、商品卡瘦身、详情浮层基础上，压缩首屏留白，让商店在 1280x720 视口内能完整读到商品、金币、刷新、完成、队伍和合成提示。

追加同文件 UI 范围：棋盘上的我方/敌方 Pal 单位格子显示心形当前生命 + 元素叠层阈值角标。

追加棋盘信息层范围：怪物格底部短字只显示结果短句，例如 `伤20 血4` 或 `伤20 死`，攻击来源与元素分项保留在点击详情中。

## 相关文件 related_files

- index.html
- preview.js
- ui.js
- test.js
- tasks/doing/2026-06-04_16-51_shop-ui-density-pass.md
- tasks/doing/当前任务.md
- tasks/index.md

## 不应修改的文件 excluded_files

- shop.js
- data.js
- game.js
- docs/archive/
- docs/04_CURRENT_UI_ART_SPEC.md
- tasks/paused/2026-06-02_08-20_shop-ui-doc.md

## 下一步 resume_next_step

等待用户验收；如需提交，先确认是否一起收口当前同任务范围内的 `test.js` 与 HUD 改动。

## 验收 validation_needed

- [x] 1280x720 商店首屏不需要滚动即可看到商品区、刷新、完成、金币、队伍和合成提示。
- [x] 商品卡保留名称、价格、HP、槽数、合成/新核心提示、购买和详情入口。
- [x] 详情浮层仍可打开并展示属性、行动槽、下一阶和合成进度。
- [x] 棋盘我方/敌方 Pal 格子均显示心形当前生命，不显示 `当前/最大`。
- [x] 棋盘我方/敌方 Pal 格子均显示元素符号 + 单格叠层阈值，默认阈值为 `3`。
- [x] 怪物格底部短字只显示 `伤N 血M` / `伤N 死`，不显示英雄来源、攻击过程、元素分项或 `总`。
- [x] `node test.js` 通过。
- [x] 1280×720 浏览器检查：双方城堡 HUD 显示 `80` 与 `🔥 3`，console error 为空。
- [x] 1280×720 浏览器截图：`reports/playtest/shop-ui-density-1280x720.png`，商店 9 张商品卡全可见，首屏无滚动，console error 为空。
- [x] 1280×720 详情截图：`reports/playtest/shop-ui-density-detail-1280x720.png`，详情浮层可打开，行动槽 2 列显示，无需滚动。

## 提交计划 commit_plan

- 提交信息格式：`ui(shop): compact shop first-screen layout`

## 中断记录 interruption_log

（无）

## 冲突记录 conflict_log

2026-06-04 16:51：工作区已有 `index.html`、`ui.js` 的商店 UI 改动，用户明确要求在该成果上继续优化，本任务接管这两份文件的商店 UI 范围。
2026-06-04 17:25：用户追加 Pal 单位格子 HUD 需求，仍落在 `index.html` / `ui.js` 同一 UI 表层文件，补充 `test.js` 覆盖双方 Pal HUD VM。
2026-06-04 17:34：用户追加怪物格底部信息简化需求，落在 `preview.js` 生成显示短字、`ui.js` / `index.html` 渲染样式、`test.js` 覆盖口径。
