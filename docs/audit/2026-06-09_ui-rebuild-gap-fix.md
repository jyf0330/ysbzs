# 2026-06-09 UI 重构遗漏审查与补完

## 发现的遗漏

1. `check:all` 没覆盖 `test:ui / test:full / test:ops / check:browser`，存在表面通过风险。
2. `tests/ui_adapter.test.cjs` 仍按旧 127 宠口径断言。
3. `tests/full_coverage.test.cjs` 仍是旧 127 数据全覆盖，不适配当前 30 宠 CSV。
4. `replayBattleTrace(events)` 参数串错，实际没有稳定调用 `REPLAY_BATTLE_TRACE`。
5. 新 UI 中选中行动槽后再点空格，会被当成移动目标，目标选择和移动意图混在一起。
6. `runCommand` 结束后用 `setBusy(false)` 统一解锁按钮，容易让非当前阶段按钮短暂可点。
7. 浏览器玩家链路脚本在当前容器 Chromium 被 URLBlocklist 拦截时只走 fallback，且缺少超时保护。
8. README / MANIFEST / 角色入口仍残留旧 UI 与旧数据口径说明。

## 已补完

- 新增 `slotArmed`：槽位瞄准时点击棋盘只选目标格，不移动英雄。
- 重写按钮禁用规则：按 phase + busy + 金币/槽位状态判断。
- 修复 `replayBattleTrace(events)`，新增 `exportReplay()` 门面。
- 更新 `test:ui` 到 30 宠口径，并加入 UI15 回放门面测试。
- 归档旧 127 全覆盖测试，重写当前 `tests/full_coverage.test.cjs`。
- `check:all` 纳入 UI、full、ops、browser 检查。
- `check_browser_player_flow.cjs` 加入真实 UI 点击路径、API fallback 和 fetch/CDP 超时保护。
- 更新 README、AI 入口、UI 入口、adapter 入口与 MANIFEST。

## 当前验收

```bash
npm run check:all
npm run test:coverage
```
