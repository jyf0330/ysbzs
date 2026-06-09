const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createGameState } = require('../../src/core/state.cjs');
const battle = require('../../src/core/battle.cjs');
const { pushEvent, filterEvents, EVENT_LEVEL } = require('../../src/core/events.cjs');

function firstEmptyCell(state, except = null) {
  battle.syncDerivedBoard(state);
  for (const cell of state.board.cells) {
    if (!cell.unitId && (!except || cell.r !== except.r || cell.c !== except.c)) return { r: cell.r, c: cell.c };
  }
  throw new Error('no empty cell');
}

test('AO01 movement no longer depends on moveMode/infinite special-case', () => {
  const sources = ['src/core/battle.cjs', 'src/core/state.cjs', 'src/core/mechanics.cjs'].map(f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8')).join('\n');
  assert.equal(/hasInfiniteMove|moveMode/.test(sources), false);

  const state = createGameState({ day: 1, period: '上午', gold: 8 });
  battle.startBattle(state);
  const hero = state.units.find(u => u.side === 'hero');
  assert.ok(hero.moveRange >= 14, 'player unit should get explicit board-covering moveRange');
  const target = firstEmptyCell(state, hero.position);
  assert.equal(battle.moveHero(state, hero.id, target), true);
  assert.deepEqual(hero.position, target);
});

test('AO02 movement range is a normal unit field and can block movement without faction flags', () => {
  const state = createGameState({ day: 1, period: '上午', gold: 8 });
  battle.startBattle(state);
  const hero = state.units.find(u => u.side === 'hero');
  hero.position = { r: 7, c: 0 };
  hero.moveRange = 1;
  battle.syncDerivedBoard(state);
  assert.equal(battle.moveHero(state, hero.id, { r: 0, c: 0 }), false);
  const last = state.events.at(-1);
  assert.equal(last.type, 'MOVE_HERO_BLOCKED');
  assert.equal(last.moveRange, 1);
});

test('AO03 event system supports levels and filters without adding nondeterministic time to core events', () => {
  const state = createGameState({ day: 1 });
  pushEvent(state, 'CUSTOM_INFO', { text: 'a' });
  pushEvent(state, 'CUSTOM_BLOCKED', { text: 'b' });
  assert.equal(filterEvents(state, { level: EVENT_LEVEL.INFO }).some(e => e.type === 'CUSTOM_INFO'), true);
  assert.equal(filterEvents(state, { level: EVENT_LEVEL.WARNING }).some(e => e.type === 'CUSTOM_BLOCKED'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(state.events.at(-1), 'timestamp'), false);
});

test('AO04 ux-app uses delegated dynamic-list events and does not do a second full render in finally', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'web/ux-app.js'), 'utf8');
  assert.equal(/qsa\('\.cell'[^\n]+addEventListener/.test(src), false);
  assert.equal(/qsa\('\.hero-card'[^\n]+addEventListener/.test(src), false);
  assert.equal(/qsa\('\[data-slot\]'[^\n]+addEventListener/.test(src), false);
  assert.match(src, /\$\('board'\)\.addEventListener\('click'/);
  assert.match(src, /\$\('slot-list'\)\.addEventListener\('click'/);
  assert.equal(/finally \{[\s\S]{0,80}render\(\);/.test(src), false);
});
