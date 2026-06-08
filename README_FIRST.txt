# 先看这里

本包已经按“boardgame.io 上游不改，元素背包史在其基础上接入”的要求重做。

核心目录：

```txt
upstream/boardgame.io-main/      # 你上传的 boardgame.io-main，上游源码，不改
apps/ysbzs/                      # 元素背包史规则内核
apps/ysbzs-boardgameio/          # 真正的 boardgame.io Game 接入层
boardgameio-adapter/             # 旧 adapter 烟测，保留作对照
```

真正接入看这个：

```txt
apps/ysbzs-boardgameio/src/YSBZSGame.cjs
```

它定义了真正的 boardgame.io Game：

```txt
setup / moves / phases / turn / endIf
```

验收命令：

```bash
bash scripts/run_all_checks.sh
```

关键验证：

```txt
boardgame.io InitializeGame + CreateGameReducer + MAKE_MOVE
→ YSBZSGame.moves
→ ysbzs reducer/core
→ boardgame.io G 更新
→ boardgame.io deltalog 记录 move
```

说明：Chromium 在当前执行环境不能直接打开 127.0.0.1 页面，所以浏览器验收用 CDP 渲染 boardgame.io Client 产出的 G 摘要到 DOM。boardgame.io Client 生命周期已真实执行。
