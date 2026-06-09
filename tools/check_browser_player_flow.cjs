#!/usr/bin/env node
// 严格真人链路：必须打开真实浏览器页面并通过鼠标事件点击 UI。
// 不允许 API fallback；如果浏览器策略阻止 localhost，本检查必须失败。
require('child_process').spawnSync(process.execPath, [require('path').join(__dirname, 'record_browser_player_flow.cjs'), '--check'], {
  stdio: 'inherit',
  cwd: require('path').resolve(__dirname, '..'),
  env: process.env
}).status === 0 || process.exit(1);
