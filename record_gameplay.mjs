/**
 * 元素背包史 · Playwright 手操录制
 * 运行: node record_gameplay.mjs
 * 输出: recordings/ 目录下 .webm 视频 + 截图
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECORD_DIR = join(__dirname, 'recordings');
mkdirSync(RECORD_DIR, { recursive: true });

const GAME_URL = 'http://localhost:8899/index.html';

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);
}

async function ss(page, name) {
  await page.screenshot({ path: join(RECORD_DIR, name), fullPage: true });
  log(`📸 ${name}`);
}

async function main() {
  log('启动浏览器...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: RECORD_DIR, size: { width: 1280, height: 900 } }
  });
  const page = await context.newPage();

  log('加载游戏...');
  await page.goto(GAME_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await ss(page, '01_init.png');

  // 检查当前界面状态
  const shopVisible = await page.locator('#shop').isVisible().catch(() => false);
  const boardVisible = await page.locator('#board').isVisible().catch(() => false);
  const phaseText = await page.locator('body').textContent();
  log(`Shop可见:${shopVisible} Board可见:${boardVisible}`);

  // 判断阶段
  const hasShopClose = await page.locator('button:has-text("完成购买")').isVisible().catch(() => false);

  // ======== 如果初始在商店阶段 ========
  if (hasShopClose || shopVisible) {
    log('=== 商店阶段 ===');
    await ss(page, '02_shop_phase.png');

    // 刷新商店
    const rollBtn = page.locator('#shop button:has-text("刷新")');
    const goldText = await page.locator('#gold').textContent();
    const gold = parseInt(goldText) || 0;
    log(`金币: ${gold}`);

    if (gold >= 1 && await rollBtn.isVisible()) {
      log('刷新商店...');
      await rollBtn.click();
      await page.waitForTimeout(500);
    }

    // 购买单位 - 用更精确的选择器
    const buyUnitBtns = page.locator('#shop button.bb:has-text("购买")');
    const unitCount = await buyUnitBtns.count();
    log(`可购买单位按钮: ${unitCount}`);
    for (let i = 0; i < unitCount; i++) {
      const btn = buyUnitBtns.nth(i);
      if (!(await btn.isDisabled())) {
        log(`购买单位 ${i}...`);
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    await ss(page, '03_after_buy.png');

    // 关闭商店，开始战斗
    const closeBtn = page.locator('button.csb:has-text("完成购买")');
    if (await closeBtn.isVisible()) {
      log('关闭商店，开始战斗...');
      await closeBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  await ss(page, '04_battle_start.png');

  // ======== 战斗阶段 ========
  log('=== 战斗阶段 ===');

  // 先尝试一键执行
  const execBtn = page.locator('#exa');
  if (await execBtn.isVisible()) {
    log('⚡ 一键执行...');
    await execBtn.click();
    await page.waitForTimeout(1200);
  }
  await ss(page, '05_after_exec.png');

  // 点击棋盘上的敌方格子
  const board = page.locator('#board');
  const allCells = board.locator('> div');
  const cellCount = await allCells.count();
  log(`棋盘格子: ${cellCount}`);

  let attacked = 0;
  for (let i = 0; i < cellCount && attacked < 10; i++) {
    const cell = allCells.nth(i);
    const text = (await cell.textContent()) || '';
    // 查找有怪物的格子 (含HP数字的)
    if (/\d+\/\d+/.test(text) && !text.includes('A') && !text.includes('B')) {
      log(`攻击格子${i}: ${text.slice(0,40)}`);
      await cell.click();
      await page.waitForTimeout(400);
      attacked++;
    }
  }

  // 如果有英雄格子，点击选中英雄再点目标
  if (attacked === 0) {
    log('没有找到可攻击目标，尝试选中英雄...');
    for (let i = 0; i < cellCount; i++) {
      const cell = allCells.nth(i);
      const text = (await cell.textContent()) || '';
      if (text.includes('HP:') && (text.includes('英雄') || /\d+/.test(text))) {
        log(`尝试与英雄格子${i}交互: ${text.slice(0,40)}`);
        await cell.click();
        await page.waitForTimeout(300);
        break;
      }
    }
  }

  await ss(page, '06_after_attacks.png');

  // 结束回合
  const endBtn = page.locator('#etb');
  if (await endBtn.isVisible()) {
    log('结束回合 →');
    await endBtn.click();
    await page.waitForTimeout(2000);
  }
  await ss(page, '07_end_turn.png');

  // ======== 第2天商店 ========
  const shop2Visible = await page.locator('button:has-text("完成购买")').isVisible().catch(() => false);

  if (shop2Visible) {
    log('=== 第2天商店 ===');
    await ss(page, '08_day2_shop.png');

    const gold2 = parseInt(await page.locator('#gold').textContent()) || 0;
    log(`金币: ${gold2}`);

    // 刷新
    const rollBtn2 = page.locator('#shop button:has-text("刷新")');
    if (gold2 >= 1 && await rollBtn2.isVisible()) {
      await rollBtn2.click();
      await page.waitForTimeout(500);
    }

    // 购买
    const buyBtns2 = page.locator('#shop button.bb:has-text("购买")');
    const cnt2 = await buyBtns2.count();
    for (let i = 0; i < cnt2; i++) {
      const btn = buyBtns2.nth(i);
      if (!(await btn.isDisabled())) {
        log(`购买 ${i}...`);
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    // 使用背包物品（如果有）
    const useBtns = page.locator('#shop button:has-text("使用")');
    const useCnt = await useBtns.count();
    for (let i = 0; i < useCnt; i++) {
      if (!(await useBtns.nth(i).isDisabled())) {
        log(`使用物品 ${i}...`);
        await useBtns.nth(i).click();
        await page.waitForTimeout(300);
      }
    }

    await ss(page, '09_day2_after_buy.png');

    // 关闭商店
    const close2 = page.locator('button:has-text("完成购买")');
    if (await close2.isVisible()) {
      await close2.click();
      await page.waitForTimeout(1500);
    }
  }

  await ss(page, '10_day2_battle.png');

  // ======== 第2天战斗 ========
  log('=== 第2天战斗 ===');
  const execBtn2 = page.locator('#exa');
  if (await execBtn2.isVisible()) {
    log('⚡ 一键执行...');
    await execBtn2.click();
    await page.waitForTimeout(1200);
  }
  await ss(page, '11_final.png');

  // ======== 录制结束 ========
  log('关闭浏览器，保存视频...');
  await context.close();
  
  const video = page.video();
  if (video) {
    // 等待视频写入完成
    await video.saveAs(join(RECORD_DIR, 'gameplay.webm'));
    log('视频保存: recordings/gameplay.webm');
  }

  await browser.close();
  log('✅ 录制完成！');
}

main().catch(err => {
  console.error('录制失败:', err.message);
  process.exit(1);
});
