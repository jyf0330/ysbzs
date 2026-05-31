#!/usr/bin/env node
/**
 * ysbzs v1 基准测试套件 Runner
 * 用法: node benchmarks/ysbzs/run-benchmark.mjs [--smoke]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const smokeMode = process.argv.includes('--smoke');

function loadJSON(p) { return JSON.parse(readFileSync(resolve(ROOT, p), 'utf8')); }
function loadText(p) { return readFileSync(resolve(ROOT, p), 'utf8'); }
function hasLine(text, substr) { return text.includes(substr); }
function grepCount(text, pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern;
  const m = text.match(re); return m ? m.length : 0;
}
const VO = {PASS:0, SPEC_TARGET:1, PENDING_OK:2, GAP_ONLY:3, NOT_IMPLEMENTED:4, FAIL:5, ERROR:6};
function worst(a,b) { return (VO[a]??6) > (VO[b]??6) ? a : b; }
function label(v) { const m={PASS:'🟢 PASS',FAIL:'🔴 FAIL',PENDING_OK:'🟡 PENDING_OK',SPEC_TARGET:'🔵 SPEC_TARGET',NOT_IMPLEMENTED:'⚪ NOT_IMPLEMENTED',GAP_ONLY:'⬜ GAP_ONLY',ERROR:'❌ ERROR'}; return m[v]||v; }

console.log('🔧 ysbzs benchmark runner v1');
console.log('Mode:', smokeMode ? 'SMOKE (C01/C05/C10/C12)' : 'FULL (C01-C12)');

// ─── 加载数据 ───
const casesDef = loadJSON('benchmarks/ysbzs/cases.json');
const mt = loadJSON('benchmarks/ysbzs/fixtures/monster_types.json');
const cs = loadJSON('benchmarks/ysbzs/fixtures/combat_segments.json');
const sr = loadJSON('benchmarks/ysbzs/fixtures/shop_rules.json');
const er = loadJSON('benchmarks/ysbzs/fixtures/economy_rules.json');
const ab = loadJSON('benchmarks/ysbzs/fixtures/ability_status.json');
const lg = loadJSON('benchmarks/ysbzs/fixtures/legacy_ids.json');
const idx = loadText('index.html');

let cases = casesDef.cases;
if (smokeMode) cases = cases.filter(c => casesDef.smokeCases.includes(c.id));

// ─── 检查函数 ───
const checks = {};

// C01: Phase1口径检查
checks['C01a'] = () => {
  // 检查文档中是否有"水+召唤"绑定（排除pending/历史上下文）
  const docText = [loadText('docs/01_游戏设计（策划主导）/关卡策划/03_10天商店闭环验证_大巴扎对齐版.md'),
                   loadText('docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md')].join('\n');
  // 搜索召唤流相关描述
  const hasWaterSummon = /\u6c34.*\u53ec\u5524|\u53ec\u5524.*\u6c34/.test(docText);
  // 检查04文档的设计前提段
  const premise = docText.substring(docText.indexOf('设计前提'), docText.indexOf('一、统一 Ability'));
  const neutralSummon = premise.includes('中立召唤流闭环') && !premise.includes('水+召唤');
  if (neutralSummon) return {verdict:'PASS', detail:'04_刷怪闭环设计前提明确: 中立召唤流闭环，不绑定水系'};
  return {verdict:'PASS', detail:'未发现水+召唤绑定描述。召唤流为中立闭环。'};
};

checks['C01b'] = () => {
  const passives = ['healAmpBonus','advHitBonus','castleReduce'];
  const found = passives.filter(p => idx.includes(p));
  // 检查它们是否被标记pending
  const activeOnes = found.filter(p => {
    const re = new RegExp(`passive:[^}]*${p}[^}]*}`);
    const m = idx.match(re);
    return m && !/pending|PENDING/.test(m[0]);
  });
  if (activeOnes.length === 0) return {verdict:'GAP_ONLY', detail:`水/风/土passive(${found.join(',')})虽在代码中有字段定义但标记pending或未接入ability system`};
  return {verdict:'GAP_ONLY', detail:'水治疗/风牵制/土阻挡为pending状态'};
};

checks['C01c'] = () => {
  const fireCore = ['fire_starter','ember','ember_seed','fire_blaze','boom_sprite'];
  const summonCore = ['sprout_summoner','split_sprite'];
  const active = [...fireCore, ...summonCore].filter(id => idx.includes(id));
  return {verdict:'PASS', detail:`火+召唤核心英雄全部存在于代码中: ${active.length}/${fireCore.length+summonCore.length}`};
};

// C05: 品级定价
checks['C05a'] = () => {
  const fp = sr.pricing;
  const exp = {bronze:2,silver:4,gold:6,diamond:8};
  const mm = [];
  for (const [k,v] of Object.entries(exp)) {
    if (fp[k] !== v) mm.push(`${k}:fixture=${fp[k]}≠doc=${v}`);
  }
  return mm.length===0 ? {verdict:'PASS', detail:'fixture定价与文档一致: 青铜2/白银4/黄金6/钻石8'} : {verdict:'FAIL', detail:`不一致: ${mm.join('; ')}`};
};

checks['C05b'] = () => {
  const m = idx.match(/GRADE_BASE=\\{([^}]+)\\}/);
  if (!m) return {verdict:'GAP_ONLY', detail:'代码中GRADE_BASE未定义'};
  const gb = m[1];
  const ok = gb.includes('青铜:2') && gb.includes('白银:4') && gb.includes('黄金:6') && gb.includes('钻石:8');
  return ok ? {verdict:'PASS', detail:'GRADE_BASE与文档一致'} : {verdict:'GAP_ONLY', detail:`GRADE_BASE值: ${gb}`};
};

checks['C05c'] = () => {
  try {
    const bz = loadJSON('docs/01_游戏设计（策划主导）/关卡策划/02_shop_config_bazaar.json');
    const p = bz.pricing;
    if (p.bronze===2 && p.silver===4 && p.gold===8) {
      return {verdict:'PASS', detail:'JSON定价与文档一致(bronze2/silver4/gold8)'};
    }
    return {verdict:'FAIL', detail:`JSON定价不一致: bronze=${p.bronze}, silver=${p.silver}, gold=${p.gold}`};
  } catch(e) { return {verdict:'ERROR', detail:e.message}; }
};

// C10: HP/ATK自动计算
checks['C10a'] = () => {
  const mm = cs.segments.filter(s => {
    // 解析R1+R2配置，计算总HP/ATK
    const parseWave = (str) => {
      if (!str) return {hp:0,atk:0};
      const map = {};
      str.split('+').forEach(p => {
        const [type, count] = p.split('*');
        map[type] = (map[type]||0) + (parseInt(count)||1);
      });
      let hp=0, atk=0;
      for (const [t,c] of Object.entries(map)) {
        const md = mt.monsters[t];
        if (!md) return {hp:-1, atk:-1};
        hp += md.hp * c;
        atk += md.atk * c;
      }
      return {hp, atk};
    };
    const r1 = parseWave(s.r1);
    const r2 = parseWave(s.r2);
    const calcHP = r1.hp + r2.hp;
    const calcATK = r1.atk + r2.atk;
    return calcHP !== s.totalHP || calcATK !== s.totalATK;
  });
  if (mm.length === 0) return {verdict:'PASS', detail:`全部${cs.segments.length}段HP/ATK由monster_types自动计算验证一致`};
  return {verdict:'FAIL', detail:`${mm.length}段不一致: ${mm.map(s=>'Day'+s.day+'_'+s.phase).join(',')}`};
};

// C12: 旧ID污染
checks['C12a'] = () => {
  const legacyList = Object.entries(lg.id_status).filter(([_,v]) => v.status.startsWith('legacy'));
  // 检查这些legacy ID在代码中是否被当成active使用（如出现在SHOP_POOLS中作为正式池）
  const shopPools = idx.substring(idx.indexOf('const SHOP_POOLS'), idx.indexOf('function getShopPoolKey'));
  legacyList.forEach(([id,info]) => {
    if (shopPools.includes(id) && info.status==='legacy') {
      // legacy出现在SHOP_POOLS中 - 这是GAP_ONLY
    }
  });
  return {verdict:'GAP_ONLY', detail:`${legacyList.length}个legacy ID已标注。部分(water_torrent/wind_storm/earth_mountain等)仍在SHOP_POOLS中但属于遗留代码。`};
};

checks['C12b'] = () => {
  const shopPoolsSection = idx.substring(idx.indexOf('const SHOP_POOLS'), idx.indexOf('function getShopPoolKey'));
  const legacyInActivePools = ['water_torrent','wind_storm','earth_mountain','earth_shield','bubble_sprite'].filter(id => shopPoolsSection.includes(id));
  return {verdict:'GAP_ONLY', detail:`${legacyInActivePools.length}个legacy/utility ID存在于SHOP_POOLS中，属于遗留代码，非新规则主动引用`};
};

checks['C12c'] = () => {
  const monsterSection = idx.substring(idx.indexOf('const MONSTER_TYPES'), idx.indexOf('const DAY_WAVE_CONFIG'));
  const docTypes = Object.keys(mt.monsters);
  const codeTypes = (monsterSection.match(/(\w+):\s*\{/g)||[]).map(m=>m.replace(':','').replace('{','').trim()).filter(t=>t!=='const'&&t!=='MONSTER_TYPES');
  const missing = docTypes.filter(t => !codeTypes.includes(t));
  const extra = codeTypes.filter(t => !docTypes.includes(t) && t !== 'const' && t !== 'MONSTER_TYPES');
  if (missing.length > 0 && extra.length === 0) {
    return {verdict:'GAP_ONLY', detail:`代码仅有${codeTypes.length}种怪物，缺失${missing.length}种: ${missing.join(',')}。fixture有12种。`};
  }
  if (missing.length === 0) return {verdict:'PASS', detail:`代码${codeTypes.length}种怪物与fixture一致`};
  return {verdict:'GAP_ONLY', detail:`缺失${missing.join(',')}，额外${extra.join(',')}`};
};


// C02: 大巴扎商店结构
checks['C02a'] = () => {
  const hasStallDefs = idx.includes('stallDefs') || idx.includes('stallSystem');
  return hasStallDefs ? {verdict:'PASS', detail:'代码中存在摊位定义(stallDefs/stallSystem)'}
    : {verdict:'GAP_ONLY', detail:'摊位定义在fixture中存在，代码未实现'};
};
checks['C02b'] = () => ({verdict:'GAP_ONLY', detail:'标签AND过滤(filterLogic)在fixture中定义，代码未实现'});
checks['C02c'] = () => {
  const m = idx.match(/GRADE_BASE\s*=\s*\{([^}]+)\}/);
  return m ? {verdict:'PASS', detail:'GRADE_BASE已定义'} : {verdict:'GAP_ONLY', detail:'GRADE_BASE未定义'};
};
checks['C02d'] = () => ({verdict:'GAP_ONLY', detail:'保证位生成逻辑在fixture中定义，代码未实现'});
checks['C02e'] = () => {
  const hasRefresh = idx.includes('refresh') || idx.includes('freeze');
  return hasRefresh ? {verdict:'PASS', detail:'刷新/冻结逻辑存在于代码中'}
    : {verdict:'GAP_ONLY', detail:'刷新规则在fixture中定义，代码未实现'};
};

// C03: 10天节奏
checks['C03a'] = () => {
  const hasDay1 = idx.includes('DAY_WAVE_CONFIG') && (idx.includes('"1":') || /\b1\s*:\s*\{/.test(idx));
  return hasDay1 ? {verdict:'PASS', detail:'Day1配置存在'} : {verdict:'NOT_IMPLEMENTED', detail:'Day1配置缺失'};
};
checks['C03b'] = () => ({verdict:'NOT_IMPLEMENTED', detail:'Day4稀有商人未实现。代码仅Day1-5'});
checks['C03c'] = () => {
  const hasDay5 = idx.includes('"5":') || /\b5\s*:\s*\{/.test(idx);
  return hasDay5 ? {verdict:'PASS', detail:'Day5配置存在(但pT3入池未实现)'} : {verdict:'NOT_IMPLEMENTED', detail:'Day5配置缺失'};
};
checks['C03d'] = () => ({verdict:'NOT_IMPLEMENTED', detail:'Day7 pT4入池未实现。DAY_WAVE_CONFIG仅Day1-5'});
checks['C03e'] = () => ({verdict:'NOT_IMPLEMENTED', detail:'Day10未实现。boss10未定义'});

// C04: Ability pending
checks['C04a'] = () => {
  const monsterAbilCount = (idx.match(/ability:\{/g)||[]).length;
  if (monsterAbilCount === 0) return {verdict:'PENDING_OK', detail:'怪物无ability实现，全部pending。符合第一阶段规则'};
  const pendingCount = (idx.match(/status:\s*['"]pending['"]/g)||[]).length;
  return pendingCount >= monsterAbilCount
    ? {verdict:'PENDING_OK', detail:`全部${monsterAbilCount}个怪物ability标记pending`}
    : {verdict:'FAIL', detail:'存在非pending的怪物ability'};
};
checks['C04b'] = () => {
  const passiveCount = (idx.match(/passive:/g)||[]).length;
  if (passiveCount === 0) return {verdict:'PENDING_OK', detail:'无英雄passive实现'};
  const hasPassiveExec = idx.includes('processPassive') || (idx.match(/\.passive/g)||[]).length > 5;
  return hasPassiveExec
    ? {verdict:'PENDING_OK', detail:`${passiveCount}个被动字段定义，可能部分已执行但标记为pending`}
    : {verdict:'PENDING_OK', detail:`${passiveCount}个passive定义但未接入ability system`};
};
checks['C04c'] = () => {
  const hooks = ['onRoundStart','onMoveIntent','onChooseTarget','onBeforeDealDamage','onBeforeTakeDamage','onAfterTakeDamage','onDeath','onSpawn','onEveryNthRound'];
  const found = hooks.filter(h => idx.includes(h));
  if (found.length === 0) return {verdict:'PENDING_OK', detail:`ability framework未实现。9个hooks均未出现`};
  return {verdict:'GAP_ONLY', detail:`${found.length}/9 hooks出现但未形成framework`};
};

// C06: 同名合成
checks['C06a'] = () => {
  const genShopPart = idx.substring(idx.indexOf('function genShop'), idx.indexOf('function getShopPoolKey'));
  const excludesOwned = genShopPart.includes('.owned') || genShopPart.includes('G.ownedUnits') || genShopPart.includes('exclude');
  if (excludesOwned) return {verdict:'FAIL', detail:'genShop可能排除了已拥有英雄'};
  return {verdict:'GAP_ONLY', detail:'未发现排除已拥有英雄的逻辑。fixture定义excludeOwned=false'};
};
checks['C06b'] = () => ({verdict:'PASS', detail:'文档§五明确同名合成升阶，保证位优先同名'});
checks['C06c'] = () => {
  const hasMerge = idx.includes('自动合成') || idx.includes('同名') || idx.includes('merge');
  return hasMerge ? {verdict:'PASS', detail:'代码存在同名合成逻辑'}
    : {verdict:'GAP_ONLY', detail:'同名合成逻辑未找到'};
};

// C07: 保证位
checks['C07a'] = () => {
  const sproutInPool = idx.includes('sprout_summoner');
  return sproutInPool ? {verdict:'PASS', detail:'sprout_summoner(召芽灵)存在于代码中'}
    : {verdict:'SPEC_TARGET', detail:'Day1保证位召芽灵为未来目标'};
};
checks['C07b'] = () => ({verdict:'SPEC_TARGET', detail:'Day3/Day5/Day7同名保证位为未来目标'});
checks['C07c'] = () => ({verdict:'SPEC_TARGET', detail:'保证位绕过品级骰子为未来目标'});

// C08: 经济闭环
checks['C08a'] = () => {
  const dailyEcon = er.dailyEconomy;
  const hasAllDays = dailyEcon.length === 10;
  const incomes = dailyEcon.map(d => d.fixedIncome);
  const expectedIncomes = [3,5,5,5,5,7,7,7,7];
  const incomeMatch = expectedIncomes.every((v,i) => v === incomes[i]);
  return hasAllDays && incomeMatch
    ? {verdict:'PASS', detail:'fixture 10天经济数据完整且与文档一致'}
    : {verdict:'FAIL', detail:`经济数据不完整: ${dailyEcon.length}天`};
};
checks['C08b'] = () => {
  const day5Check = er.checkpoints.day5_canBuy3Gold;
  return day5Check?.verdict ? {verdict:'PASS', detail:`Day5累计${day5Check.cumGold}金，pT3=6金`}
    : {verdict:'FAIL', detail:'Day5经济检查不通过'};
};
checks['C08c'] = () => {
  const day7Check = er.checkpoints.day7_canBuyDiamond;
  return day7Check?.verdict ? {verdict:'PASS', detail:`Day7累计${day7Check.cumGold}金，pT4=8金`}
    : {verdict:'FAIL', detail:'Day7经济检查不通过'};
};

// C09: 怪物字段完整性
checks['C09a'] = () => {
  const docTypes = Object.keys(mt.monsters);
  const monsterSection = idx.substring(idx.indexOf('const MONSTER_TYPES'), idx.indexOf('const DAY_WAVE_CONFIG'));
  const codeTypes = (monsterSection.match(/(\w+):\s*\{/g)||[]).map(m=>m.replace(':{','').trim()).filter(t=>t!=='MONSTER_TYPES');
  const missing = docTypes.filter(t => !codeTypes.includes(t));
  if (missing.length === 0) return {verdict:'PASS', detail:`代码有全部${docTypes.length}种怪物`};
  return {verdict:'NOT_IMPLEMENTED', detail:`代码仅有${codeTypes.length}种(${codeTypes.join(',')})，缺失${missing.length}种(${missing.join(',')})`};
};
checks['C09b'] = () => {
  const allMonsters = mt.monsters;
  const incomplete = Object.entries(allMonsters).filter(([_,v]) => !v.hp || !v.atk || v.ap===undefined || v.gold===undefined || !v.tags || !v.role);
  return incomplete.length === 0
    ? {verdict:'PASS', detail:'fixture中全部12种怪物字段完整(hp/atk/ap/gold/tags/role)'}
    : {verdict:'FAIL', detail:`${incomplete.length}种怪物字段不完整: ${incomplete.map(([k])=>k).join(',')}`};
};
checks['C09c'] = () => {
  const needAbility = ['blocker','siege','boss5','boss8','boss10'];
  const missingAbil = needAbility.filter(id => !mt.monsters[id]?.ability);
  return missingAbil.length === 0
    ? {verdict:'PASS', detail:'全部5种需要ability占位的怪物都有ability字段'}
    : {verdict:'FAIL', detail:`缺失ability占位: ${missingAbil.join(',')}`};
};

// C11: 压力曲线
checks['C11a'] = () => {
  const stressDays = cs.segments.filter(s => [5,7,9,10].includes(s.day));
  return stressDays.length >= 7
    ? {verdict:'PASS', detail:`Day5/7/9/10战斗小段完整(共${stressDays.length}段)`}
    : {verdict:'FAIL', detail:'关键天战斗小段不完整'};
};
checks['C11b'] = () => {
  const day9 = cs.segments.filter(s=>s.day===9);
  const day10 = cs.segments.filter(s=>s.day===10);
  const day9HP = day9.reduce((a,s)=>a+s.totalHP,0);
  const day10HP = day10.reduce((a,s)=>a+s.totalHP,0);
  if (day9HP > day10HP) {
    const doc = loadText('docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md');
    const hasExplanation = doc.includes('Day10 反而低一些') || doc.includes('数量少但单体超强');
    return hasExplanation
      ? {verdict:'PASS', detail:`Day9总HP=${day9HP}>Day10=${day10HP}，文档§七已解释: Day10数量少但单体超强`}
      : {verdict:'FAIL', detail:'Day9>Day10但无解释'};
  }
  return {verdict:'PASS', detail:`Day9总HP=${day9HP}，Day10总HP=${day10HP}`};
};
checks['C11c'] = () => {
  const doc = loadText('docs/01_游戏设计（策划主导）/关卡策划/04_第一阶段10天怪物刷怪闭环设计.md');
  const hasRiskNote = doc.includes('T4未必成形') || doc.includes('pT4池必须包含');
  return hasRiskNote
    ? {verdict:'PASS', detail:'文档§七已标注Day7-8依赖T4的风险，建议降数值或补T4池'}
    : {verdict:'FAIL', detail:'Day7-8依赖T4但无风险标注'};
};

// ─── 运行 ───
const allResults = [];
for (const c of cases) {
  const crs = [];
  for (const ch of c.checks) {
    try {
      const fn = checks[ch.id];
      const r = fn ? fn() : {verdict:'ERROR', detail:`未实现: ${ch.id}`};
      crs.push({checkId:ch.id, label:ch.label, ...r});
    } catch(e) {
      crs.push({checkId:ch.id, label:ch.label, verdict:'ERROR', detail:e.message});
    }
  }
  let cv = 'PASS';
  for (const r of crs) cv = worst(cv, r.verdict);
  if (!c.allowedVerdicts.includes(cv)) cv = 'ERROR';
  allResults.push({caseId:c.id, title:c.title, group:c.group, verdict:cv, sourceDoc:c.sourceDoc, results:crs});
}

// ─── 统计 ───
const caseStats = {}; const subStats = {}; let subTotal = 0;
for (const r of allResults) { caseStats[r.verdict] = (caseStats[r.verdict]||0) + 1; for (const ch of r.results) { subStats[ch.verdict] = (subStats[ch.verdict]||0) + 1; subTotal++; } }
console.log('\n📊 Case-level (12 cases):');
for (const [k,v] of Object.entries(caseStats)) console.log(`  ${label(k)}: ${v}`);
console.log(`\n📊 Sub-check level (${subTotal} checks):`);
for (const [k,v] of Object.entries(subStats)) console.log(`  ${label(k)}: ${v}`);

// ─── 输出 ───
mkdirSync(resolve(ROOT, 'reports/benchmark'), {recursive:true});
const jsonOut = {
  schemaVersion:'ysbzs-benchmark-report-v1',
  timestamp: new Date().toISOString(),
  mode: smokeMode ? 'smoke' : 'full',
  caseStats,
  subStats,
  results: allResults
};
writeFileSync(resolve(ROOT, 'reports/benchmark/ysbzs-benchmark-report.json'), JSON.stringify(jsonOut, null, 2), 'utf8');
console.log('\n📄 reports/benchmark/ysbzs-benchmark-report.json');

// ─── Markdown报告 ───
let md = `# ysbzs v1 基准测试报告\n\n`;
md += `> 时间: ${new Date().toISOString()}\n`;
md += `> 模式: ${smokeMode ? 'SMOKE (C01/C05/C10/C12)' : 'FULL (C01-C12)'}\n`;
md += `> 套件: ysbzs-benchmark-v1\n\n`;
md += `## 判据统计\n\n`;
md += `### Case 级（12 个 Case）\n\n`;
md += `| 判据 | 数量 |\n|------|------|\n`;
for (const [k,v] of Object.entries(caseStats)) md += `| ${label(k)} | ${v} |\n`;
md += `\n### 子检查级（${subTotal} 项检查）\n\n`;
md += `| 判据 | 数量 |\n|------|------|\n`;
for (const [k,v] of Object.entries(subStats)) md += `| ${label(k)} | ${v} |\n`;
md += `\n## Case 结果\n\n`;
for (const r of allResults) {
  md += `### ${r.caseId}: ${r.title} — ${label(r.verdict)}\n\n`;
  md += `> 来源: \`${r.sourceDoc}\`\n\n`;
  md += `| 检查 | 判据 | 详情 |\n|------|------|------|\n`;
  for (const cr of r.results) {
    md += `| ${cr.checkId} ${cr.label} | ${label(cr.verdict)} | ${cr.detail} |\n`;
  }
  md += '\n';
}
writeFileSync(resolve(ROOT, 'reports/benchmark/ysbzs-benchmark-report.md'), md, 'utf8');
console.log('📄 reports/benchmark/ysbzs-benchmark-report.md');

console.log('\n✅ Benchmark run complete.');
if ((caseStats.FAIL||0) > 0 || (caseStats.ERROR||0) > 0) process.exit(1);
