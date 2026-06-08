# boardgame.io 不可修改上游接入规则

## 结论

本包按用户强制要求处理：直接使用上传的 `boardgame.io-main.zip` 解压出的官方上游源码作为基础，不修改上游任何文件。

## 目录约束

```txt
upstream/boardgame.io-main/      # 上游原码，不允许改
apps/ysbzs/                      # 元素背包史游戏代码
boardgameio-adapter/             # 接入层，唯一允许映射 boardgame.io 与 ysbzs 的地方
scripts/verify_no_upstream_edits.sh
```

## 禁止事项

- 不要在 `upstream/boardgame.io-main` 里添加 ysbzs 代码。
- 不要修改 boardgame.io 的 core/client/server/multiplayer 等源码。
- 不要把 ysbzs 规则塞进 boardgame.io 源码。
- 不要为了跑通测试改上游文件。

## 正确做法

- boardgame.io 保持原样。
- ysbzs 规则在 `apps/ysbzs` 中演进。
- 接入只通过 `boardgameio-adapter` 完成。
- 适配层把 boardgame.io 的概念映射到 ysbzs：

```txt
G        -> ysbzs gameState
ctx      -> day/round/phase/seed
moves    -> dispatchGameAction
phases   -> battle/reward/shop/trial
plugins  -> elements/modifier/trigger/changeLog/replay
```

## 校验

```bash
bash scripts/verify_no_upstream_edits.sh
bash scripts/run_all_checks.sh
```

`verify_no_upstream_edits.sh` 会用 `upstream/BOARDGAME_IO_MAIN_FILE_MANIFEST.sha256` 检查上游文件内容是否被改。
