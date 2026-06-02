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
  await page.waitForSelector('#board .cell');
  const title = await page.locator('title').textContent();
  if (!title.includes('元素背包史')) throw new Error('标题不对: ' + title);

  const cellCount = await page.locator('#board .cell').count();
  if (cellCount !== 8 * 8) throw new Error(`棋盘格数 ${cellCount} !== 64`);

  await page.goto(indexUrl + '?debug=1');
  await page.waitForSelector('#debug-panel', { state: 'attached' });
  const dbg = page.locator('#debug-panel');
  if ((await dbg.count()) !== 1) throw new Error('debug 面板节点缺失');

  const fatal = errors.filter(e => !/UNDICI|favicon/i.test(e));
  if (fatal.length) throw new Error('console errors: ' + fatal.join('; '));

  await browser.close();
  console.log('✅ Playwright smoke PASS · 64 格 · debug 面板可见');
})().catch(e => {
  console.error('❌ Playwright smoke FAIL —', e.message);
  process.exit(1);
});
