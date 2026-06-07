#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const visibleRoots = ['web', 'src/render'].map(p => path.join(root, p));
const blocked = ['敌方城堡', '我方城堡'];
const exts = new Set(['.html', '.js', '.cjs', '.css']);
const hits = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (exts.has(path.extname(full))) scan(full);
  }
}

function scan(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const term of blocked) {
      if (lines[i].includes(term)) hits.push(`${path.relative(root, file)}:${i + 1}: ${term}`);
    }
  }
}

for (const dir of visibleRoots) if (fs.existsSync(dir)) walk(dir);

if (hits.length) {
  console.error('玩家可见文本含禁用口径：');
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log('PASS visible text uses 我方英雄 / 敌方Boss wording');
