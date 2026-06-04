#!/usr/bin/env node
/**
 * 战斗 replay 回放 CLI
 * 用法: node replay.js [recordings/xxx.json]
 * 退出码 0 = hash 与录制一致
 */
const fs = require('fs');
const path = require('path');

const replayPath = process.argv[2] || path.join(__dirname, 'recordings', 'day1_fire_sample.json');
if (!fs.existsSync(replayPath)) {
  console.error('找不到 replay 文件:', replayPath);
  process.exit(2);
}

const makeEl = () => ({
  innerHTML: '', textContent: '', style: { display: '' }, children: [], disabled: false,
  scrollTop: 0, scrollHeight: 0,
  classList: { add() {}, remove() {}, has: () => false },
  appendChild(c) { this.children.push(c); },
  removeChild() {},
  getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0 }; },
  onclick: null, title: '',
});
const _els = {};
global.document = {
  getElementById(id) { if (!_els[id]) _els[id] = makeEl(); return _els[id]; },
  createElement() { return makeEl(); },
};
global.window = { innerWidth: 1920 };
global.__TEST__ = true;

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const gameScript = html.match(/<script>([\s\S]+?)<\/script>/)[1].replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
eval(gameScript); // eslint-disable-line no-eval

render = () => {};
renderShop = () => {};
glog = () => {};

const replay = JSON.parse(fs.readFileSync(replayPath, 'utf8'));
console.log('▶ replay', path.basename(replayPath), `· ${replay.steps?.length || 0} 步`);
const result = runReplay(replay);
const expected = replay.finalResult?.hash;
const ok = !expected || result.hash === expected;
console.log(`  hash ${result.hash}${expected ? (ok ? ' ✓ 匹配' : ` ✗ 期望 ${expected}`) : ''}`);
console.log(`  phase ${result.phase} · monsters ${result.monstersAlive} · 城堡 ${result.playerCastleHp}`);
process.exit(ok ? 0 : 1);
