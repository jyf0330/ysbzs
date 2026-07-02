const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameState } = require('../../src/core/state.cjs');
const { dispatch } = require('../../src/core/reducer.cjs');
const { createViewModel } = require('../../src/uiAdapter.cjs');
const { renderPlayerReport } = require('../../src/render/textReport.cjs');

function fillActiveRoster(state) {
  const ids = ['pal_001', 'pal_002', 'pal_003', 'pal_004'];
  state.inventory = [];
  state.units = [];
  state.nextUnit = 1;
  ids.forEach((petId, index) => {
    const position = { r: 4 + index, c: 1 };
    const unit = require('../../src/core/state.cjs').makeUnit(state, 'hero', petId, { position });
    state.units.push(unit);
    state.inventory.push({ petId, count: 1, active: true, instanceId: unit.id, slot: index + 1, quality: unit.quality });
  });
}

test('duplicate shop purchase merges same pet into next quality instead of Lv2', () => {
  const state = createGameState({ gold: 99, activePets: [] });
  fillActiveRoster(state);
  state.inventory.push({ petId: 'pal_005', count: 1, active: false, instanceId: 'bench_pal_005_existing', quality: '青铜' });

  dispatch(state, { type: 'ENTER_SHOP', poolId: 'elem_火', slots: 6 });
  const offer = state.shop.offers[0];
  Object.assign(offer, { petId: 'pal_005', name: '火绒狐', quality: '青铜', price: 1 });

  dispatch(state, { type: 'BUY_OFFER', offerId: offer.offerId });

  const merged = state.inventory.find(item => item.petId === 'pal_005' && item.active === false);
  assert.equal(merged.quality, '白银');
  assert.equal(merged.count, 1);
  assert.equal(merged.level, undefined);
  const buyEvent = state.events.find(event => event.type === 'SHOP_BUY' && event.petId === 'pal_005');
  assert.match(buyEvent.text, /同名合成到白银/);
  assert.doesNotMatch(buyEvent.text, /Lv2/);
});

test('construction upgrade event raises owned active pet quality and synced unit progression', () => {
  const state = createGameState({ day: 4, gold: 20, activePets: ['pal_005'] });

  dispatch(state, { type: 'ENTER_SHOP', poolId: 'night_base', slots: 3 });
  dispatch(state, { type: 'APPLY_SHOP_EVENT', eventId: 'evt_upgrade_offer' });

  const inventory = state.inventory.find(item => item.petId === 'pal_005');
  const unit = state.units.find(item => item.petId === 'pal_005');
  assert.equal(inventory.quality, '白银');
  assert.equal(inventory.level, undefined);
  assert.equal(unit.quality, '白银');
  assert.equal(unit.qualityProgression.quality, 'silver');

  const effectEvent = state.events.find(event => event.type === 'CONSTRUCTION_EVENT_APPLY' && event.eventId === 'evt_upgrade_offer');
  assert.equal(effectEvent.qualityFrom, '青铜');
  assert.equal(effectEvent.qualityTo, '白银');
  assert.equal(effectEvent.levelFrom, undefined);
  assert.match(effectEvent.text, /青铜→白银/);
  assert.doesNotMatch(effectEvent.text, /Lv/);
});

test('bench quality is preserved when the pet is activated later', () => {
  const state = createGameState({ activePets: [] });
  state.inventory.push({ petId: 'pal_005', count: 1, active: false, instanceId: 'bench_pal_005_silver', quality: '白银' });

  dispatch(state, { type: 'TOGGLE_UNIT_ACTIVE', instanceId: 'bench_pal_005_silver' });

  const inventory = state.inventory.find(item => item.petId === 'pal_005');
  const unit = state.units.find(item => item.petId === 'pal_005');
  assert.equal(inventory.active, true);
  assert.equal(inventory.quality, '白银');
  assert.equal(unit.quality, '白银');

  const vmItem = createViewModel(state).inventory.active.find(item => item.petId === 'pal_005');
  assert.equal(vmItem.quality, '白银');
  assert.equal(vmItem.sellValue, 4);
  assert.equal(vmItem.level, undefined);
  assert.match(renderPlayerReport(state), /pal_005x1\(白银\)/);
});
