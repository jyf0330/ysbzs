import { chromium } from 'playwright';
import { setTimeout as wait } from 'timers/promises';

const browser = await chromium.launch({ headless: false, args: ['--window-size=1400,900'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

page.on('console', msg => {
  const t = msg.text();
  if (t.includes('error') && !t.includes('EnvHttpProxy'))
    console.log('  [CONSOLE]', t.slice(0, 200));
});

await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
await wait(2000);

// 开始战斗
const startBtn = page.locator('button:has-text("开始战斗")');
await startBtn.click();
console.log('✅ 开始战斗');
await wait(2000);

// 检查 AI 按钮状态
const aiBtn = page.locator('#exa');
console.log('AI按钮 disabled:', await aiBtn.isDisabled());
console.log('AI按钮 visible:', await aiBtn.isVisible());

// 尝试点英雄
await page.locator('.hero-sel, [class*="hero"]').first().click({timeout: 2000}).catch(() => {});
await wait(500);

// 检查是否有方向按钮
const dirBtns = page.locator('.dir-btn, [class*="dir"]');
console.log('方向按钮数量:', await dirBtns.count());

// 检查棋盘可点击格
const boardCells = page.locator('#board td, #board .cell, .b-cell');
const cellCount = await boardCells.count();
console.log('棋盘格数量:', cellCount);

// 点第一个棋盘格试试
if (cellCount > 0) {
  await boardCells.first().click();
  await wait(300);
}

// 重新检查 AI 按钮
console.log('AI按钮 disabled 重新检查:', await aiBtn.isDisabled());

// 如果 AI 还是 disabled，尝试用 JS 调用 AI
if (await aiBtn.isDisabled()) {
  console.log('AI 按钮禁用，尝试 JS 执行...');
  const canAi = await page.evaluate(() => {
    if (typeof runAiBattleTurn === 'function') {
      try { runAiBattleTurn(); return 'called'; } catch(e) { return 'error: ' + e.message; }
    }
    return 'no function';
  });
  console.log('runAiBattleTurn:', canAi);
  await wait(3000);
}

// 检查是否进入商店
for (let i = 0; i < 15; i++) {
  await wait(1000);
  const text = await page.textContent('body');
  if (text.includes('商店') && text.includes('购买')) {
    console.log(`✅ 商店可见 (第${i+1}s)`);
    break;
  }
}

// 最终截图
await page.screenshot({ path: '/tmp/ysbzs-final.png' });
console.log('📸 最终截图');
await browser.close();
