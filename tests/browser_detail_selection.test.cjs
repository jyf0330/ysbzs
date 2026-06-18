const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function startUiServer(port) {
  const child = spawn(process.execPath, ['tools/run_ui_server.cjs'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const ready = new Promise((resolve, reject) => {
    let output = '';
    const onData = chunk => {
      output += String(chunk);
      if (output.includes(`http://127.0.0.1:${port}`)) resolve();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', code => reject(new Error(`UI server exited early with code ${code}: ${output}`)));
    setTimeout(() => reject(new Error(`UI server did not become ready: ${output}`)), 10000).unref();
  });
  return { child, ready };
}

async function boardUnits(page) {
  return page.locator('#board [data-r][data-c]').evaluateAll(cells => cells.map(cell => ({
    r: cell.dataset.r,
    c: cell.dataset.c,
    unitClass: cell.querySelector('.unit-token')?.className || '',
    unitText: cell.querySelector('.unit-token')?.innerText.trim() || ''
  })).filter(x => x.unitText));
}

async function clickCell(page, cell) {
  await page.locator(`#board [data-r="${cell.r}"][data-c="${cell.c}"]`).click();
  await page.waitForTimeout(250);
  return {
    summary: await page.locator('#detail-summary').innerText(),
    detail: await page.locator('#cell-detail').innerText()
  };
}

test('board pet detail updates when switching from enemy back to hero', { timeout: 30000 }, async () => {
  const port = await getFreePort();
  const { child, ready } = startUiServer(port);
  let browser;
  try {
    await ready;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`http://127.0.0.1:${port}/index.html?runtime=local&detailSelectionTest=1`, { waitUntil: 'domcontentloaded' });
    await page.locator('#day7-btn').click();
    await page.waitForTimeout(300);

    const units = await boardUnits(page);
    const heroCell = units.find(x => x.unitClass.includes('hero') && !x.unitClass.includes('leader'));
    const enemyCell = units.find(x => x.unitClass.includes('enemy'));
    assert.ok(heroCell, 'expected a hero pet on the board');
    assert.ok(enemyCell, 'expected an enemy pet on the board');

    const heroName = heroCell.unitText.split('\n').at(-1);
    const enemyName = enemyCell.unitText.split('\n').at(-1);

    const firstHero = await clickCell(page, heroCell);
    assert.match(firstHero.detail, new RegExp(heroName));

    const enemy = await clickCell(page, enemyCell);
    assert.match(enemy.detail, new RegExp(enemyName));

    const secondHero = await clickCell(page, heroCell);
    assert.match(secondHero.detail, new RegExp(heroName));
    assert.doesNotMatch(secondHero.detail, new RegExp(enemyName));
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    child.kill('SIGTERM');
  }
});
