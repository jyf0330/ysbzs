先看 README_RUN.md。

当前包：30宠 CSV 单源数据 + 完全重构的 web UI + uiAdapter/API 单入口。

运行：
  npm install
  npm run ui

验收：
  npm run check:all
  npm run test:coverage

不要恢复旧 web/ui.js、game.js、board.js、battle.js、shop.js。
浏览器层只走 /api/view、/api/action、/api/report。
