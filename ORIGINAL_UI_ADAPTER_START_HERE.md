# 原包 UI + 新核心运行时适配版

运行：

```bash
npm run ui
```

打开：

```text
http://127.0.0.1:4173
```

本版重点：

- `web/index.html` 保持参考项目原文件。
- `web/ui.js` 保持参考项目原文件。
- 服务器返回页面时运行时注入 `web/original-ui-compat-adapter.js`。
- 原 UI 的按钮/函数名继续存在，例如 `endPlayerTurn/openShop/rollShop/buyUnit/freezeShopItem/closeShop`。
- 这些函数会被兼容层转成新核心 command。
- CSV 仍是数据真源：`data/csv/*.csv`。
- 核心仍然无 DOM，UI 仍通过 API / ViewModel 获取展示数据。

验收：

```bash
npm run check:all
```

结果见：

- `CHECK_RESULT_original_ui_runtime_adapter.txt`
- `UI_CONTRACT_SCAN.txt`
- `玩家行为测试说明_原UI运行时适配版_20260607.txt`
- `MD5_ORIGINAL_UI_CHECK.txt`
