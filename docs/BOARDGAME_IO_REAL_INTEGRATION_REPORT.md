# boardgame.io 真接入报告

## 结论

本版不是把 boardgame.io 放在旁边，也不是只做 adapter 烟测；新增了真正的 `apps/ysbzs-boardgameio` 应用，把 ysbzs 包成 boardgame.io `Game`。

上游 `upstream/boardgame.io-main` 保持原样不改，通过 `scripts/verify_no_upstream_edits.sh` 校验。

## 新增结构

```txt
upstream/boardgame.io-main/      # 官方源码，原样不改
apps/ysbzs/                      # 元素背包史规则内核
apps/ysbzs-boardgameio/          # 真正 boardgame.io Game 接入层
boardgameio-adapter/             # 旧适配器烟测保留
```

## 真实接入链路

```txt
boardgame.io InitializeGame / Client
→ YSBZSGame.setup
→ boardgame.io MAKE_MOVE / client.moves
→ YSBZSGame.moves
→ apps/ysbzs reducer/core
→ 更新 boardgame.io G
→ boardgame.io deltalog 记录 move
→ 浏览器渲染 G 摘要
```

## 关键文件

```txt
apps/ysbzs-boardgameio/src/YSBZSGame.cjs
apps/ysbzs-boardgameio/tests/check_bgio_game_reducer.cjs
apps/ysbzs-boardgameio/tests/check_bgio_client_moves.cjs
apps/ysbzs-boardgameio/tests/check_bgio_browser.cjs
```

## 说明

由于 ysbzs 旧 state 内含 `Map` 和 `undefined` 字段，不满足 boardgame.io 对 `G` 的 JSON 可序列化要求，接入层做了两件事：

1. `sanitizeForBoardgameIO`：进入 boardgame.io G 前转为 JSON 安全对象。
2. `hydrateForYSBZS`：调用 ysbzs reducer 前临时重建 `data.index / indexes` 里的 Map。

这不是修改 boardgame.io 上游，也不修改 ysbzs 规则内核，只是在接入层做序列化边界适配。

## 验收

- `apps/ysbzs-boardgameio npm run check:game`：真实 boardgame.io `InitializeGame + CreateGameReducer + MAKE_MOVE`。
- `apps/ysbzs-boardgameio npm run check:client`：真实 boardgame.io `Client + client.moves`。
- `apps/ysbzs-boardgameio npm run check:browser`：Chromium DOM 渲染 boardgame.io Client 产出的 G 摘要。

注意：当前执行环境会阻止 Chromium 直接打开 `127.0.0.1` 页面，所以 browser 检查使用 CDP 把 boardgame.io Client 状态渲染进 DOM。核心 boardgame.io Client lifecycle 已真实执行。
