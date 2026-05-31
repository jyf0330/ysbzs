#!/usr/bin/env node
/** 生成 recordings/day1_fire_sample.json */
const fs = require('fs');
const path = require('path');

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
global.setTimeout = fn => { try { fn(); } catch (e) { throw e; } };
global.__TEST__ = true;

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
eval(html.match(/<script>([\s\S]+?)<\/script>/)[1].replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var')); // eslint-disable-line no-eval
render = () => {};
renderShop = () => {};
glog = () => {};

initGame();
startReplayCapture();
dispatchGameAction({ type: 'USE_SLOT', slotId: 0 });
dispatchGameAction({ type: 'USE_SLOT', slotId: 1 });
dispatchGameAction({ type: 'USE_SLOT', slotId: 2 });
const rep = exportReplay();
stopReplayCapture();

const outDir = path.join(__dirname, '..', 'recordings');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'day1_fire_sample.json');
fs.writeFileSync(outPath, JSON.stringify(rep, null, 2));
console.log('✅', outPath, rep.finalResult.hash);
