# boardgame.io-main 基础接入报告

## 本次完成

- 已使用用户上传的 `boardgame.io-main.zip` 解压为 `upstream/boardgame.io-main`。
- 已生成上游文件 SHA256 清单：`upstream/BOARDGAME_IO_MAIN_FILE_MANIFEST.sha256`。
- 已保留 `upstream/boardgame.io-0.50.2.tgz` 作为适配层离线运行时依赖。
- 已放入最新 ysbzs 游戏代码到 `apps/ysbzs`。
- 已保留 `boardgameio-adapter` 作为唯一接入层。
- 已新增校验脚本，防止上游 boardgame.io 被改。

## 运行结果

已在打包前运行：

```bash
cd apps/ysbzs && npm test
cd apps/ysbzs && npm run check:csv
cd apps/ysbzs && npm run check:day7
cd apps/ysbzs && npm run check:dom
cd apps/ysbzs && npm run check:all
cd boardgameio-adapter && npm run check:adapter
bash scripts/verify_no_upstream_edits.sh
```

结果：全部通过。

## 当前接入边界

当前不是把 ysbzs 代码写进 boardgame.io 上游源码，而是：

```txt
boardgame.io-style moves
→ boardgameio-adapter
→ ysbzs reducer / dispatch
→ ysbzs core
```

这个方式满足“基于 boardgame.io，但不改它”的要求。
