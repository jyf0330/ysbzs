#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadGameData } = require('../src/core/csvData.cjs');
const { rng, pickWeighted } = require('../src/core/rng.cjs');
const { selectPetIdsForWave, pickQualityForWave } = require('../src/core/waveRules.cjs');
const { routeChoiceSeedContext, seededRouteOptions } = require('../src/core/dayRoute.cjs');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT_DIR = path.join(ROOT, 'outputs', 'seed-episode-preview-20260702');
const DEFAULT_SEEDS = Object.freeze(['ysbzs-local', 'ysbzs-local-2', 'ysbzs-local-3']);
const DEFAULT_DAYS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const QUALITIES = Object.freeze(['青铜', '白银', '黄金', '钻石']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, headers) {
  const text = `${headers.join(',')}\n${rows.map(row => headers.map(h => csvEscape(row[h])).join(',')).join('\n')}\n`;
  fs.writeFileSync(filePath, text, 'utf8');
}

function activeRows(rows, day, statusField = 'status', activeStatus = '正式') {
  return (rows || []).filter(row => row[statusField] === activeStatus && Number(row.unlockDay || 1) <= Number(day || 1));
}

function scheduleRows(data, day) {
  return (data.nodeSchedule || [])
    .filter(row => Number(row.day || 0) === Number(day || 0) && row.status === '正式')
    .sort((a, b) => Number(a.step || 0) - Number(b.step || 0));
}

function weightOf(row) {
  const n = Number(row.weight ?? row.weights?.night ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function sampleWeightedWithoutReplacement(rows, count, seed) {
  const random = rng(seed);
  const pool = rows.slice();
  const out = [];
  while (pool.length && out.length < count) {
    const picked = pickWeighted(pool, weightOf, random);
    if (!picked) break;
    out.push(picked);
    pool.splice(pool.indexOf(picked), 1);
  }
  return out;
}

function firstN(rows, count) {
  return rows.slice()
    .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0) || String(a.nodeId || a.encounterId).localeCompare(String(b.nodeId || b.encounterId)))
    .slice(0, count);
}

function itemWeight(item, poolId) {
  if (poolId === 'night_base') return Number(item.weights?.night || 0);
  if (String(poolId).startsWith('elem_')) return Number(item.weights?.element || 0);
  if (String(poolId).startsWith('role_')) return Number(item.weights?.role || 0);
  if (String(poolId).startsWith('tier_')) return Number(item.weights?.tier || 0);
  return Number(item.weights?.night || 1);
}

function petName(data, petId) {
  return (data.pets || []).find(p => p.id === petId)?.name || petId || '';
}

function petElement(data, petId) {
  return (data.pets || []).find(p => p.id === petId)?.element || '';
}

function shapeCells(data, petId) {
  const shape = (data.shapes || []).find(s => s.petId === petId);
  const n = Number(shape?.hitCells || 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function shopCandidates(data, poolId, day) {
  return (data.shop || []).filter(item => (
    item.status === '启用'
    && Number(item.unlockDay || 1) <= Number(day || 1)
    && (item.shopPools || []).includes(poolId)
  ));
}

function rewardCandidates(data, poolId, day) {
  return (data.shop || []).filter(item => (
    Number(item.unlockDay || 1) <= Number(day || 1)
    && (item.rewardPools || []).includes(poolId)
  ));
}

function sampleShopOffers(data, seed, day, step, option, poolId, slots = 10) {
  const seedContext = routeChoiceSeedContext(day, step, option.nodeId);
  const random = rng(`shop:v2:${seed}:${seedContext}:0:${poolId}`);
  const pool = shopCandidates(data, poolId, day);
  const offers = [];
  let used = 0;
  let guard = 0;
  while (used < slots && pool.length && guard < slots * 5) {
    guard += 1;
    const remaining = slots - used;
    const candidates = pool.filter(item => shapeCells(data, item.petId) <= remaining);
    if (!candidates.length) break;
    const picked = pickWeighted(candidates, item => itemWeight(item, poolId), random);
    if (!picked) break;
    const cells = shapeCells(data, picked.petId);
    used += cells;
    offers.push({
      sourceType: 'shop_offer',
      poolId,
      petId: picked.petId,
      name: picked.name || petName(data, picked.petId),
      element: picked.element || petElement(data, picked.petId),
      quality: picked.quality || '',
      price: Math.max(1, cells) * 2,
      cells,
      weight: itemWeight(picked, poolId),
      tags: (picked.tags || []).join('、')
    });
  }
  return offers;
}

function sampleRewardOptions(data, seed, day, step, optionIndex, poolId, count = 3) {
  const seedContext = routeChoiceSeedContext(day, step, optionIndex.nodeId || optionIndex);
  const random = rng(`reward:${seed}:${seedContext}:${poolId}`);
  const pool = rewardCandidates(data, poolId, day);
  const relics = (data.relics || []).filter(r => Number(r.unlockDay || 1) <= Number(day || 1) && r.rewardPoolId === poolId && r.status === '正式');
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const source = i === count - 1 && relics.length ? 'relic' : 'pet';
    if (source === 'relic') {
      pickWeighted(relics, item => Number(item.weight || 1), random);
      continue;
    }
    const picked = pickWeighted(pool, item => Number(item.weights?.reward || 1), random);
    if (!picked) break;
    out.push({
      sourceType: 'reward_pet',
      poolId,
      petId: picked.petId,
      name: picked.name || petName(data, picked.petId),
      element: picked.element || petElement(data, picked.petId),
      quality: picked.quality || '',
      price: '',
      cells: shapeCells(data, picked.petId),
      weight: Number(picked.weights?.reward || 1),
      tags: (picked.tags || []).join('、')
    });
  }
  return out;
}

function sampleWaveEnemies(data, seed, day, period, waveId = null) {
  const rows = (data.waves || [])
    .filter(row => waveId
      ? row.waveId === waveId
      : Number(row.day || 0) === Number(day || 0) && row.period === period && !/_enc_/.test(String(row.waveId || '')))
    .sort((a, b) => Number(a.round || 0) - Number(b.round || 0) || String(a.waveId).localeCompare(String(b.waveId)));
  const spawns = [];
  for (const row of rows) {
    const random = rng(`wave:${seed}:${day}:${period}:${row.round}:${row.waveId}:0`);
    const petIds = selectPetIdsForWave(row, random);
    for (const petId of petIds) {
      const quality = pickQualityForWave(row, random);
      spawns.push({
        round: row.round,
        waveId: row.waveId,
        petId,
        name: petName(data, petId),
        element: petElement(data, petId),
        quality: quality || '',
        threat: row.threat,
        pool: (row.petPool || []).join('|'),
        qualityWeights: QUALITIES.map(q => `${q}${Number(row.qualityWeights?.[q] || 0)}`).join('/')
      });
    }
  }
  return spawns;
}

function summarizePets(list, max = 8) {
  const names = (list || []).map(x => `${x.name || x.petId}${x.quality ? `(${x.quality})` : ''}`);
  const head = names.slice(0, max).join('、');
  return names.length > max ? `${head} 等${names.length}个` : head;
}

function battlePreview(data, seed, day, schedule, encounter) {
  const period = encounter?.wavePeriod || schedule.wavePeriod || '上午';
  const waveId = encounter?.waveId || null;
  const enemies = sampleWaveEnemies(data, seed, day, period, waveId);
  const rounds = new Set(enemies.map(x => x.round)).size;
  const threat = (data.waves || [])
    .filter(row => waveId
      ? row.waveId === waveId
      : Number(row.day || 0) === Number(day || 0) && row.period === period && !/_enc_/.test(String(row.waveId || '')))
    .reduce((sum, row) => sum + Number(row.threat || 0), 0);
  return {
    period,
    rounds,
    enemyCount: enemies.length,
    totalThreat: Math.round(threat * 10) / 10,
    enemies,
    summary: `${period} ${rounds}回合 ${enemies.length}只：${summarizePets(enemies, 10)}`
  };
}

function sourcesForNodeOption(data, seed, day, schedule, option, optionIndex) {
  if (option.nodeType === 'shop') {
    return sampleShopOffers(data, seed, day, schedule.step, option, option.shopPoolId || 'night_base', 10);
  }
  if (option.nodeType === 'reward') {
    return sampleRewardOptions(data, seed, day, schedule.step, option, option.rewardPoolId || 'reward_pT1', Number(option.slots || 3));
  }
  return [];
}

function buildSeedPreview(data, seed, days = DEFAULT_DAYS) {
  const steps = [];
  const petSources = [];
  const battles = [];
  for (const day of days) {
    for (const schedule of scheduleRows(data, day)) {
      if (schedule.kind === 'node_choice') {
        const candidates = activeRows(data.nodePool, day).filter(x => x.nodePoolId === schedule.poolId);
        const options = seededRouteOptions(candidates, Number(schedule.choiceCount || 3), seed, schedule, 'node');
        options.forEach((option, index) => {
          const sources = sourcesForNodeOption(data, seed, day, schedule, option, index + 1);
          sources.forEach(source => petSources.push(Object.assign({
            seed,
            day,
            step: schedule.step,
            stepLabel: schedule.label,
            optionIndex: index + 1,
            optionId: option.nodeId,
            optionName: option.name,
            sourceName: option.name
          }, source)));
          steps.push({
            seed,
            day,
            step: schedule.step,
            kind: 'node_choice',
            label: schedule.label,
            optionIndex: index + 1,
            choiceId: option.nodeId,
            choiceName: option.name,
            poolId: schedule.poolId,
            nodeType: option.nodeType,
            weight: option.weight,
            petSourceSummary: summarizePets(sources, 10),
            battleSummary: '',
            note: option.note || ''
          });
        });
        continue;
      }
      if (schedule.kind === 'battle_choice') {
        const candidates = activeRows(data.encounterPool, day).filter(x => x.encounterPoolId === schedule.encounterPoolId);
        const options = seededRouteOptions(candidates, Number(schedule.choiceCount || 3), seed, schedule, 'encounter');
        options.forEach((encounter, index) => {
          const battle = battlePreview(data, seed, day, schedule, encounter);
          battles.push(Object.assign({ seed, day, step: schedule.step, optionIndex: index + 1, encounterId: encounter.encounterId, encounterName: encounter.name }, battle));
          steps.push({
            seed,
            day,
            step: schedule.step,
            kind: 'battle_choice',
            label: schedule.label || schedule.phaseLabel,
            optionIndex: index + 1,
            choiceId: encounter.encounterId,
            choiceName: encounter.name,
            poolId: schedule.encounterPoolId,
            nodeType: 'battle',
            weight: encounter.weight,
            petSourceSummary: '',
            battleSummary: battle.summary,
            note: encounter.note || ''
          });
        });
        continue;
      }
      if (schedule.kind === 'fixed_battle') {
        const encounter = (data.encounterPool || []).find(x => x.encounterId === schedule.encounterId) || {
          encounterId: schedule.encounterId,
          name: schedule.label || schedule.encounterId,
          wavePeriod: schedule.phaseLabel && /晚/.test(schedule.phaseLabel) ? '下午' : '上午',
          weight: 1,
          note: schedule.note || ''
        };
        const battle = battlePreview(data, seed, day, schedule, encounter);
        battles.push(Object.assign({ seed, day, step: schedule.step, optionIndex: 1, encounterId: encounter.encounterId, encounterName: encounter.name }, battle));
        steps.push({
          seed,
          day,
          step: schedule.step,
          kind: 'fixed_battle',
          label: schedule.label || schedule.phaseLabel,
          optionIndex: 1,
          choiceId: encounter.encounterId,
          choiceName: encounter.name,
          poolId: '',
          nodeType: 'battle',
          weight: encounter.weight || '',
          petSourceSummary: '',
          battleSummary: battle.summary,
          note: encounter.note || schedule.note || ''
        });
      }
    }
  }
  return { seed, steps, petSources, battles };
}

function buildEpisodePreview(options = {}) {
  const root = options.root || ROOT;
  const seeds = options.seeds && options.seeds.length ? options.seeds : DEFAULT_SEEDS;
  const days = options.days && options.days.length ? options.days.map(Number) : DEFAULT_DAYS;
  const data = options.data || loadGameData({ cache: false });
  const previews = seeds.map(seed => buildSeedPreview(data, seed, days));
  const steps = previews.flatMap(x => x.steps);
  const petSources = previews.flatMap(x => x.petSources);
  const battles = previews.flatMap(x => x.battles);
  const payload = {
    meta: {
      schema: 'ysbzs.seed-episode-preview.v1',
      generatedAt: options.generatedAt || new Date().toISOString(),
      source: data.meta?.sourcePackage || 'data/csv/*.csv',
      seeds,
      days,
      boundary: 'seed-generated preview snapshot for planning/balancing; not formal runtime storage',
      algorithm: 'route and encounter choices use core seeded weighted sampling without replacement; route shop/reward sources and battle waves use the same seed contexts as core runtime'
    },
    previews,
    tables: { steps, petSources, battles }
  };
  if (options.writeFiles !== false) writeEpisodePreviewFiles(payload, { root, outDir: options.outDir || DEFAULT_OUT_DIR });
  return payload;
}

function battleRowsForCsv(battles) {
  const rows = [];
  for (const battle of battles || []) {
    for (const enemy of battle.enemies || []) {
      rows.push({
        seed: battle.seed,
        day: battle.day,
        step: battle.step,
        optionIndex: battle.optionIndex,
        encounterId: battle.encounterId,
        encounterName: battle.encounterName,
        period: battle.period,
        round: enemy.round,
        waveId: enemy.waveId,
        petId: enemy.petId,
        name: enemy.name,
        element: enemy.element,
        quality: enemy.quality,
        threat: enemy.threat,
        pool: enemy.pool,
        qualityWeights: enemy.qualityWeights
      });
    }
  }
  return rows;
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items || []) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function md(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function sourceSummaryForStep(payload, step) {
  const rows = (payload.tables.petSources || []).filter(row => (
    row.seed === step.seed
    && Number(row.day) === Number(step.day)
    && Number(row.step) === Number(step.step)
    && Number(row.optionIndex) === Number(step.optionIndex)
    && row.optionId === step.choiceId
  ));
  if (!rows.length) return step.petSourceSummary || '无直接宠物来源';
  return rows
    .slice(0, 8)
    .map(row => {
      const price = row.price !== '' && row.price !== undefined ? `/${row.price}金` : '';
      const cells = row.cells ? `/${row.cells}格` : '';
      return `${row.name}${row.quality ? `(${row.quality})` : ''}${price}${cells}`;
    })
    .join('、') + (rows.length > 8 ? ` 等${rows.length}项` : '');
}

function battleSummaryForStep(payload, step) {
  const battle = (payload.tables.battles || []).find(row => (
    row.seed === step.seed
    && Number(row.day) === Number(step.day)
    && Number(row.step) === Number(step.step)
    && Number(row.optionIndex) === Number(step.optionIndex)
    && row.encounterId === step.choiceId
  ));
  if (!battle) return step.battleSummary || '';
  return `${battle.summary}；总威胁 ${battle.totalThreat}，敌人 ${battle.enemyCount} 只`;
}

function renderNodeChoiceTable(payload, steps) {
  const lines = [
    '| 选项 | 类型 | 名称 | 策划内容 | 备注 |',
    '|---|---|---|---|---|'
  ];
  for (const step of steps) {
    lines.push(`| ${step.optionIndex} | ${md(step.nodeType)} | ${md(step.choiceName)} | ${md(sourceSummaryForStep(payload, step))} | ${md(step.note || '')} |`);
  }
  return lines.join('\n');
}

function renderBattleTable(payload, steps) {
  const lines = [
    '| 战斗 | 名称 | 敌人/波次预览 | 备注 |',
    '|---|---|---|---|'
  ];
  for (const step of steps) {
    lines.push(`| ${step.label || `步骤${step.step}`} | ${md(step.choiceName)} | ${md(battleSummaryForStep(payload, step))} | ${md(step.note || '')} |`);
  }
  return lines.join('\n');
}

function renderPlannerFlowDoc(payload) {
  const generatedAt = payload.meta.generatedAt;
  const seeds = payload.meta.seeds;
  const days = payload.meta.days;
  const lines = [
    '# 元素背包史 Seed 全流程策划预览',
    '',
    `生成时间：${generatedAt}`,
    '',
    `覆盖 seed：${seeds.join(' / ')}`,
    '',
    `覆盖天数：D${Math.min(...days)}-D${Math.max(...days)}`,
    '',
    '用途：给策划快速阅读某个 seed 在 10 天内会看到的路线节点、商店/奖励来源和战斗压力。',
    '',
    '边界：这是 seed 生成的策划/平衡快照，不是玩家存档，也不替代正式 runtime 的命令日志。',
    '',
    '## 阅读说明',
    '',
    '- 每天按当前排程展示：节点1、节点2、第一场战斗、节点3、节点4、第二场战斗。',
    '- 节点三选一只列当前正式启用节点；当前内容包含 `shop` / `reward` / `event` / `rest`。',
    '- 商店条目显示预期售卖宠物、品质、价格和占格；奖励条目显示候选宠物和占格。',
    '- 战斗条目显示回合数、敌人数量、主要敌人和总威胁。',
    ''
  ];
  const stepsBySeed = groupBy(payload.tables.steps, row => row.seed);
  for (const seed of seeds) {
    lines.push(`## Seed：${seed}`, '');
    const seedSteps = stepsBySeed.get(seed) || [];
    const stepsByDay = groupBy(seedSteps, row => Number(row.day));
    for (const day of days) {
      const daySteps = (stepsByDay.get(Number(day)) || []).slice().sort((a, b) => Number(a.step) - Number(b.step) || Number(a.optionIndex) - Number(b.optionIndex));
      if (!daySteps.length) continue;
      lines.push(`### 第 ${day} 天`, '');
      const stepsByIndex = groupBy(daySteps, row => Number(row.step));
      for (const stepNo of Array.from(stepsByIndex.keys()).sort((a, b) => a - b)) {
        const sameStep = stepsByIndex.get(stepNo) || [];
        const first = sameStep[0] || {};
        if (first.kind === 'node_choice') {
          lines.push(`#### 节点 ${stepNo}：${first.label || '三选一'}`, '');
          lines.push(renderNodeChoiceTable(payload, sameStep));
          lines.push('');
        } else if (first.kind === 'fixed_battle' || first.kind === 'battle_choice') {
          lines.push(`#### 步骤 ${stepNo}：${first.label || '战斗'}`, '');
          lines.push(renderBattleTable(payload, sameStep));
          lines.push('');
        }
      }
    }
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

function writeEpisodePreviewFiles(payload, options = {}) {
  const outDir = options.outDir || DEFAULT_OUT_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'seed_episode_preview.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  writeCsv(path.join(outDir, 'seed_episode_steps.csv'), payload.tables.steps, [
    'seed', 'day', 'step', 'kind', 'label', 'optionIndex', 'choiceId', 'choiceName', 'poolId', 'nodeType', 'weight', 'petSourceSummary', 'battleSummary', 'note'
  ]);
  writeCsv(path.join(outDir, 'seed_episode_pet_sources.csv'), payload.tables.petSources, [
    'seed', 'day', 'step', 'stepLabel', 'optionIndex', 'optionId', 'optionName', 'sourceType', 'sourceName', 'poolId', 'petId', 'name', 'element', 'quality', 'price', 'cells', 'weight', 'tags'
  ]);
  writeCsv(path.join(outDir, 'seed_episode_battle_enemies.csv'), battleRowsForCsv(payload.tables.battles), [
    'seed', 'day', 'step', 'optionIndex', 'encounterId', 'encounterName', 'period', 'round', 'waveId', 'petId', 'name', 'element', 'quality', 'threat', 'pool', 'qualityWeights'
  ]);
  fs.writeFileSync(path.join(outDir, 'seed_episode_planner_flow.md'), renderPlannerFlowDoc(payload), 'utf8');
  fs.writeFileSync(path.join(outDir, 'README.md'), renderReadme(payload), 'utf8');
}

function renderReadme(payload) {
  const seeds = payload.meta.seeds.join(' / ');
  const days = `${Math.min(...payload.meta.days)}-${Math.max(...payload.meta.days)}`;
  return `# 种子整集预览表\n\n`
    + `生成时间：${payload.meta.generatedAt}\n\n`
    + `覆盖 seed：${seeds}\n\n`
    + `覆盖天数：D${days}\n\n`
    + `边界：这是 seed 生成的策划/平衡快照，不是正式 runtime 存储真相。正式游戏仍应保存配置、seed、玩家命令和必要状态。\n\n`
    + `## 文件\n\n`
    + `- seed_episode_preview.json：完整结构化数据。\n`
    + `- seed_episode_steps.csv：每个 seed 每天每步的节点 3 选 1 / 固定战预览。\n`
    + `- seed_episode_pet_sources.csv：每个节点选项可能给到的宠物来源，包含商店和奖励。\n`
    + `- seed_episode_battle_enemies.csv：每场战斗按 seed 展开的敌人/品质/波次。\n\n`
    + `- seed_episode_planner_flow.md：按 seed / 天 / 步骤排版的策划可读全流程文档。\n\n`
    + `## 当前实现口径\n\n`
    + `节点、遭遇、商店、奖励和波次都从当前 data/csv 归一化数据读取。路线和遭遇候选使用当前核心 seed 加权不放回抽样规则；路线商店、路线奖励和战斗波次使用与核心 runtime 相同的 seed 上下文，方便提前看同一个 seed 在正式游玩入口会出现什么。\n`;
}

function parseArgs(argv) {
  const out = { seeds: DEFAULT_SEEDS.slice(), days: DEFAULT_DAYS.slice(), outDir: DEFAULT_OUT_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seeds') out.seeds = String(argv[++i] || '').split(',').map(x => x.trim()).filter(Boolean);
    else if (arg.startsWith('--seeds=')) out.seeds = arg.slice('--seeds='.length).split(',').map(x => x.trim()).filter(Boolean);
    else if (arg === '--days') out.days = parseDays(argv[++i]);
    else if (arg.startsWith('--days=')) out.days = parseDays(arg.slice('--days='.length));
    else if (arg === '--out') out.outDir = path.resolve(argv[++i]);
    else if (arg.startsWith('--out=')) out.outDir = path.resolve(arg.slice('--out='.length));
    else if (arg === '--help' || arg === '-h') out.help = true;
  }
  return out;
}

function parseDays(text) {
  const raw = String(text || '').trim();
  if (!raw) return DEFAULT_DAYS.slice();
  const range = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    const out = [];
    for (let d = start; d <= end; d += 1) out.push(d);
    return out;
  }
  return raw.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node tools/build_seed_episode_preview.cjs [--seeds a,b,c] [--days 1-10] [--out outputs/seed-episode-preview-20260702]');
    return;
  }
  const payload = buildEpisodePreview(args);
  console.log(`Wrote seed episode preview: ${path.relative(ROOT, args.outDir)}`);
  console.log(`Seeds: ${payload.meta.seeds.join(', ')}`);
  console.log(`Rows: steps=${payload.tables.steps.length}, petSources=${payload.tables.petSources.length}, battles=${battleRowsForCsv(payload.tables.battles).length}`);
}

if (require.main === module) main();

module.exports = {
  DEFAULT_SEEDS,
  buildEpisodePreview,
  battleRowsForCsv,
  renderPlannerFlowDoc,
  firstN,
  sampleWeightedWithoutReplacement,
  parseArgs,
  parseDays
};
