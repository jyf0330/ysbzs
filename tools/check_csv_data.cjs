#!/usr/bin/env node
const path = require('path');
const { loadGameData, loadSourceTablesFromCsv, csvSourceAvailable } = require('../src/core/csvData.cjs');
const { validateData } = require('../src/core/data.cjs');
const { createGameState } = require('../src/core/state.cjs');

const root = path.resolve(__dirname, '..');
const csvDir = path.join(root, 'data', 'csv');
if (!csvSourceAvailable(csvDir)) {
  console.error('FAIL CSV source missing:', csvDir);
  process.exit(1);
}
const tables = loadSourceTablesFromCsv(csvDir);
const data = loadGameData({ csvDir });
const v = validateData(data);
const state = createGameState({ data });
const heroes = state.units.filter(u => u.side === 'hero').map(u => `${u.petId}:${u.name}@${u.position ? `${u.position.r},${u.position.c}` : 'auto'}`);
console.log('PASS CSV source available:', csvDir);
console.log('source rows:', JSON.stringify({
  pets: tables.pets.length,
  monsters: tables.monsters.length,
  waves: tables.waves.length,
  mechanisms: tables.mechanisms.length,
  events: tables.events.length,
  shop: tables.shop.length,
  relics: tables.relics.length,
  shapes: tables.shapes.length,
  validation: tables.validation.length,
  initialSetup: tables.initialSetup.length
}));
console.log('normalized counts:', JSON.stringify(v.counts));
console.log('initial heroes:', heroes.join(' | '));
if (!v.ok) {
  console.error(v.issues.join('\n'));
  process.exit(1);
}
console.log('PASS CSV data validation');
