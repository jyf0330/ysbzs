#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadGameData } = require('../src/core/csvData.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'data', 'normalized_data.from_csv.json');
const data = loadGameData({ csvDir: path.join(root, 'data', 'csv') });
fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf8');
console.log('wrote', out);
