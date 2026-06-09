#!/usr/bin/env node
// 严格真人链路：必须打开真实浏览器页面并通过鼠标事件点击 UI。
// 不允许 API fallback；如果页面打不开、按钮点不动、状态没变化，直接失败。
const path = require('path');
const { spawnSync } = require('child_process');

const result = spawnSync(process.execPath, [path.join(__dirname, 'record_browser_player_flow.cjs'), '--check'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  timeout: Number(process.env.YSBZS_BROWSER_CHECK_TIMEOUT_MS || 120000)
});

if (result.error) {
  console.error(result.error.message || String(result.error));
  process.exit(1);
}
process.exit(result.status === 0 ? 0 : 1);
