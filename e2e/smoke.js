#!/usr/bin/env node
/**
 * Playwright smoke（无 @playwright/test 依赖）
 * 运行: node e2e/smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

const indexUrl = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(indexUrl);
  const title = await page.locator('h1').textContent();
  if (!title.includes('元素背包史')) throw new Error('标题不对: ' + title);

  const cellCount = await page.locator('#board .cell').count();
  if (cellCount !== 13 * 13) throw new Error(`棋盘格数 ${cellCount} !== 169`);

  await page.goto(indexUrl + '?debug=1');
  const dbg = page.locator('#debug-panel');
  if (!(await dbg.isVisible())) throw new Error('debug 面板未显示');

  const fatal = errors.filter(e => !/UNDICI|favicon/i.test(e));
  if (fatal.length) throw new Error('console errors: ' + fatal.join('; '));

  await browser.close();
  console.log('✅ Playwright smoke PASS · 169 格 · debug 面板可见');
})().catch(e => {
  console.error('❌ Playwright smoke FAIL —', e.message);
  process.exit(1);
});
