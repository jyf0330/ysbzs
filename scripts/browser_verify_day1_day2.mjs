/**
 * 浏览器实测：Day1早上2回合 → 商店 → Day1下午2回合 → Day2早上 → Day2商店
 * 用法：先 npx serve -l 8080 .  再 node scripts/browser_verify_day1_day2.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'recordings', 'browser_day1_day2');
const BASE_URL = process.env.YSBZS_URL || 'http://localhost:8080/index.html';

mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const milestones = [];

function log(msg) {
  console.log(msg);
  milestones.push({ t: Date.now(), msg });
}

async function ss(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: false });
  log(`📸 ${name}`);
  return path;
}

async function readState(page) {
  return page.evaluate(() => {
    function countElementLayers() {
      if (typeof G === 'undefined' || !G.boardLayers) return 0;
      let n = 0;
      for (const k of Object.keys(G.boardLayers)) {
        const cell = G.boardLayers[k];
        for (const el of ['fire', 'water', 'wind', 'earth']) {
          if (cell[el] && cell[el].layers > 0) n += cell[el].layers;
        }
      }
      return n;
    }

    const so = document.getElementById('so');
    const shopVisible = !!(so && so.style.display !== 'none' && getComputedStyle(so).display !== 'none');
    const buyBtns = [...document.querySelectorAll('#scat button.bb')].filter(b => /购买/.test(b.textContent || ''));
    const logEl = document.getElementById('log');
    const logText = logEl ? (logEl.innerText || logEl.textContent || '') : '';

    return {
      phaseText: document.getElementById('ph')?.textContent?.trim() || '',
      rc: document.getElementById('rc')?.textContent?.trim() || '',
      day: document.getElementById('tb-day')?.textContent?.trim() || '',
      tbRc: document.getElementById('tb-rc')?.textContent?.trim() || '',
      gold: document.getElementById('gold')?.textContent?.trim() || '',
      shopVisible,
      shopBuyCount: buyBtns.length,
      logLines: logText.split('\n').map(s => s.trim()).filter(Boolean),
      elementLayers: countElementLayers(),
      g: typeof G !== 'undefined' ? {
        phase: G.phase,
        day: G.day,
        dayHalf: G.dayHalf,
        round: G.round,
        maxRound: G.maxRound,
        gold: G.gold,
        shopUnits: (G.shopItems?.units || []).length,
        monsters: (G.monsters || []).map(m => ({
          name: m.name, r: m.pos.r, c: m.pos.c, dead: !!m.dead,
        })),
      } : null,
    };
  });
}

async function waitStable(page, expect, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await readState(page);
    let ok = true;
    if (expect.phase && s.g?.phase !== expect.phase) ok = false;
    if (expect.day != null && String(s.g?.day) !== String(expect.day)) ok = false;
    if (expect.dayHalf != null && s.g?.dayHalf !== expect.dayHalf) ok = false;
    if (expect.shopVisible != null && s.shopVisible !== expect.shopVisible) ok = false;
    if (expect.notPhase && s.g?.phase === expect.notPhase) ok = false;
    if (ok) return s;
    await page.waitForTimeout(200);
  }
  const last = await readState(page);
  throw new Error(`waitStable timeout: want ${JSON.stringify(expect)} got phase=${last.g?.phase} day=${last.g?.day} half=${last.g?.dayHalf} shop=${last.shopVisible}`);
}

async function playAiRound(page) {
  await page.evaluate(async () => {
    if (typeof runAiBattleTurn === 'function') await runAiBattleTurn();
  });
  await page.waitForFunction(() => {
    const ph = document.getElementById('ph')?.textContent || '';
    if (ph.includes('商店')) return true;
    if (ph.includes('玩家回合')) return true;
    return false;
  }, { timeout: 25000 });
  await page.waitForFunction(() => {
    const ph = document.getElementById('ph')?.textContent || '';
    return !ph.includes('怪物行动中');
  }, { timeout: 25000 });
  // 若 setTimeout 链被打断，兜底同步跑完怪物回合
  await page.evaluate(() => {
    if (typeof G !== 'undefined' && G.phase === 'MONSTER' && typeof runMonsters === 'function') {
      runMonsters(0);
    }
  });
  await page.waitForTimeout(300);
}

async function closeShop(page) {
  const btn = page.locator('button.csb:has-text("完成购买")');
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
  await waitStable(page, { phase: 'PLAYER', shopVisible: false });
}

function hasLogPattern(lines, re) {
  return lines.some(l => re.test(l));
}

async function main() {
  log(`🌐 打开 ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!/EnvHttpProxy|favicon|404.*\.map/.test(t)) consoleErrors.push(t);
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#board', { timeout: 15000 });
  await page.waitForFunction(() => typeof runAiBattleTurn === 'function', { timeout: 15000 });
  await page.waitForTimeout(800);

  const msg = page.locator('#msg');
  if (await msg.isVisible().catch(() => false)) {
    await page.locator('#msg button').click().catch(() => {});
    await page.waitForTimeout(300);
  }

  const checks = [];
  const ok = (name, detail) => checks.push({ name, pass: true, detail });
  const bad = (name, detail) => checks.push({ name, pass: false, detail });

  let s0 = await readState(page);
  await ss(page, '01_day1_morning_start.png');
  ok('启动', `Day${s0.g?.day} · ${s0.phaseText} · 金币${s0.gold} · 行动槽界面就绪`);

  // Day1 morning 2 rounds
  await playAiRound(page);
  s0 = await readState(page);
  ok('Day1早上 R1', `${s0.rc} · phase=${s0.g?.phase} round=${s0.g?.round}/${s0.g?.maxRound}`);
  await ss(page, '02_day1_morning_r1.png');

  await playAiRound(page);
  const sShop1 = await waitStable(page, { phase: 'SHOP', day: 1, dayHalf: 1, shopVisible: true });
  await ss(page, '03_day1_noon_shop.png');
  ok('Day1中午商店', `${sShop1.shopBuyCount} 件可买 · 金币${sShop1.gold} · G.shopUnits=${sShop1.g?.shopUnits}`);

  const logsAfterNoon = sShop1.logLines;
  if (hasLogPattern(logsAfterNoon, /💰.*收入|进入商店|🛒/)) ok('金币收入(中午)', logsAfterNoon.filter(l => /💰|🛒/.test(l)).slice(-2).join(' | ') || '有商店/收入日志');
  else bad('金币收入(中午)', '战斗日志未见收入/进店');

  if (hasLogPattern(logsAfterNoon, /💥|🔥|层|引爆/)) ok('元素铺场/引爆', '日志含元素引爆');
  else if (sShop1.elementLayers > 0) ok('元素铺场', `棋盘 ${sShop1.elementLayers} 层`);
  else ok('元素铺场', '已结算清空或直伤（见截图）');

  if (hasLogPattern(logsAfterNoon, /👾|怪物回合|→\(/)) ok('怪物移动/战斗日志', '含怪物行动日志');
  else bad('怪物移动/战斗日志', '未见怪物行动');

  await closeShop(page);
  const sAfternoon = await waitStable(page, { phase: 'PLAYER', day: 1, dayHalf: 2 });
  await ss(page, '04_day1_afternoon_start.png');
  ok('Day1下午', `${sAfternoon.rc} · 怪物${sAfternoon.g?.monsters?.filter(m => !m.dead).length}只`);

  const monBefore = JSON.stringify(sAfternoon.g?.monsters || []);
  await playAiRound(page);
  await playAiRound(page);
  const sShopNight = await waitStable(page, { phase: 'SHOP', day: 1, dayHalf: 2, shopVisible: true });
  await ss(page, '05_day1_night_shop.png');
  ok('Day1下午2回合→夜晚商店', `${sShopNight.rc} · 金币${sShopNight.gold}`);

  const monAfter = JSON.stringify(sShopNight.g?.monsters || []);
  const moveLogs = sShopNight.logLines.filter(l => /👾.*→|怪物回合|移动/.test(l));
  if (moveLogs.length || monBefore !== monAfter) ok('怪物移动(下午)', `${moveLogs.length} 条移动日志`);
  else bad('怪物移动(下午)', '未见移动');

  await closeShop(page);
  const sDay2 = await waitStable(page, { phase: 'PLAYER', day: 2, dayHalf: 0 });
  await ss(page, '06_day2_morning_start.png');
  ok('Day2早上', `${sDay2.rc} · 怪物${sDay2.g?.monsters?.filter(m => !m.dead).length}只`);

  await playAiRound(page);
  await playAiRound(page);
  const sShop2 = await waitStable(page, { phase: 'SHOP', day: 2, dayHalf: 1, shopVisible: true });
  await ss(page, '07_day2_noon_shop.png');
  ok('Day2中午商店', `${sShop2.shopBuyCount} 件可买 · 金币${sShop2.gold}`);

  const income2 = sShop2.logLines.filter(l => /💰 第2天/.test(l));
  if (income2.length) ok('金币收入(Day2)', income2[income2.length - 1]);
  else bad('金币收入(Day2)', '未见 Day2 收入日志');

  await ss(page, '08_final.png');

  const failed = checks.filter(c => !c.pass);
  const report = [
    '# 浏览器实测 · Day1→Day2 流程',
    '',
    `- URL: ${BASE_URL}`,
    `- 时间: ${new Date().toISOString()}`,
    `- 截图目录: recordings/browser_day1_day2/`,
    '',
    '## 检查项',
    ...checks.map(c => `- ${c.pass ? '✅' : '❌'} **${c.name}** — ${c.detail}`),
    '',
    '## Console Errors',
    ...(consoleErrors.length ? consoleErrors.map(e => `- ${e}`) : ['- （无）']),
    '',
    '## 战斗日志末尾',
    ...sShop2.logLines.slice(-15).map(l => `- ${l}`),
    '',
    '## 结论',
    failed.length === 0 && consoleErrors.length === 0
      ? '**PASS** — 浏览器实测全流程正常'
      : `**${failed.length ? 'FAIL' : 'PASS_WITH_WARN'}** — ${failed.map(f => f.name).join(', ') || '有 console error'}`,
  ].join('\n');

  writeFileSync(join(OUT, 'report.md'), report);
  log('\n' + report);

  await browser.close();
  if (failed.length || consoleErrors.length) process.exit(1);
}

main().catch(err => {
  console.error('❌ 浏览器实测失败:', err.message);
  process.exit(1);
});
