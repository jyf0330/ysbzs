const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_SEEDS,
  buildEpisodePreview,
  battleRowsForCsv,
  renderPlannerFlowDoc,
  parseDays
} = require('../../tools/build_seed_episode_preview.cjs');
const { createYSBZSUIAdapter } = require('../../src/uiAdapter.cjs');

function previewStep(payload, predicate) {
  const row = payload.tables.steps.find(predicate);
  assert.ok(row, 'expected preview step row');
  return row;
}

function previewPetIds(payload, step) {
  return payload.tables.petSources
    .filter(row => row.seed === step.seed && Number(row.day) === Number(step.day) && Number(row.step) === Number(step.step) && row.optionId === step.choiceId)
    .map(row => row.petId);
}

test('seed episode preview exports three default seeds with route, pet, and battle tables', () => {
  const payload = buildEpisodePreview({ writeFiles: false, generatedAt: '2026-07-02T00:00:00.000Z', days: [1, 2] });
  assert.deepEqual(payload.meta.seeds, DEFAULT_SEEDS);
  assert.equal(payload.previews.length, 3);
  assert.ok(payload.tables.steps.length > 0);
  assert.ok(payload.tables.petSources.length > 0);
  assert.ok(battleRowsForCsv(payload.tables.battles).length > 0);
  assert.ok(payload.tables.steps.some(row => row.kind === 'node_choice' && row.optionIndex === 3));
	const battleSteps = payload.tables.steps.filter(row => row.kind === 'battle_choice');
	assert.ok(battleSteps.some(row => /只/.test(row.battleSummary)));
	for (const seed of DEFAULT_SEEDS) {
		for (const day of [1, 2]) {
			for (const step of [3, 6]) {
				const choices = battleSteps.filter(row => row.seed === seed && Number(row.day) === day && Number(row.step) === step);
				assert.equal(choices.length, 3, `${seed} day ${day} step ${step} should preview three encounters`);
				assert.equal(new Set(choices.map(row => row.choiceId)).size, 3);
			}
		}
	}
  assert.ok(payload.tables.petSources.every(row => row.seed && row.petId && row.name));
  assert.match(payload.meta.boundary, /not formal runtime storage/);
});

test('seed episode preview is deterministic for the same seed and day range', () => {
  const opts = { writeFiles: false, generatedAt: '2026-07-02T00:00:00.000Z', seeds: ['fixed-a'], days: [1, 2, 3] };
  const a = buildEpisodePreview(opts);
  const b = buildEpisodePreview(opts);
  assert.deepEqual(a.tables.steps, b.tables.steps);
  assert.deepEqual(a.tables.petSources, b.tables.petSources);
  assert.deepEqual(battleRowsForCsv(a.tables.battles), battleRowsForCsv(b.tables.battles));
});

test('seed episode preview route choices match the actual adapter node options', () => {
  const seed = 'seed-preview-actual-route';
  const payload = buildEpisodePreview({ writeFiles: false, generatedAt: '2026-07-02T00:00:00.000Z', seeds: [seed], days: [1] });
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed });
  const vm = adapter.generateNodeOptions({ scheduleStep: 1 }).viewModel;
  const actual = vm.dayRoute.options.map(option => option.nodeId);
  const expected = payload.tables.steps
    .filter(row => row.seed === seed && Number(row.day) === 1 && Number(row.step) === 1 && row.kind === 'node_choice')
    .map(row => row.choiceId);
  assert.deepEqual(expected, actual);
});

test('seed episode preview shop pet sources match actual route shop offers', () => {
  const seed = 'seed-preview-actual-shop';
  const payload = buildEpisodePreview({ writeFiles: false, generatedAt: '2026-07-02T00:00:00.000Z', seeds: [seed], days: [1] });
  const shopStep = previewStep(payload, row => row.seed === seed && Number(row.day) === 1 && row.kind === 'node_choice' && row.nodeType === 'shop');
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed });
  adapter.generateNodeOptions({ scheduleStep: shopStep.step });
  const option = adapter.getViewModel().dayRoute.options.find(row => row.nodeId === shopStep.choiceId);
  assert.ok(option, 'actual route options should include preview shop node');
  adapter.pickNode(option.optionId);
  const actual = adapter.getViewModel().shop.offers.map(offer => offer.petId);
  assert.deepEqual(previewPetIds(payload, shopStep), actual);
});

test('seed episode preview reward pet sources match actual route reward options', () => {
  const seed = 'seed-preview-actual-reward';
  const payload = buildEpisodePreview({ writeFiles: false, generatedAt: '2026-07-02T00:00:00.000Z', seeds: [seed], days: [1] });
  const rewardStep = previewStep(payload, row => row.seed === seed && Number(row.day) === 1 && row.kind === 'node_choice' && row.nodeType === 'reward');
  const adapter = createYSBZSUIAdapter({ day: 1, gold: 999, seed });
  adapter.generateNodeOptions({ scheduleStep: rewardStep.step });
  const option = adapter.getViewModel().dayRoute.options.find(row => row.nodeId === rewardStep.choiceId);
  assert.ok(option, 'actual route options should include preview reward node');
  adapter.pickNode(option.optionId);
  const actual = adapter.getViewModel().rewards.filter(reward => reward.type === 'pet').map(reward => reward.petId);
  assert.deepEqual(previewPetIds(payload, rewardStep), actual);
});

test('seed episode preview writes json and csv artifacts', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysbzs-seed-preview-'));
  const payload = buildEpisodePreview({
    outDir,
    generatedAt: '2026-07-02T00:00:00.000Z',
    seeds: ['write-a', 'write-b', 'write-c'],
    days: [1]
  });
  for (const name of ['seed_episode_preview.json', 'seed_episode_steps.csv', 'seed_episode_pet_sources.csv', 'seed_episode_battle_enemies.csv', 'seed_episode_planner_flow.md', 'README.md']) {
    const file = path.join(outDir, name);
    assert.ok(fs.existsSync(file), `${name} should exist`);
    assert.ok(fs.statSync(file).size > 20, `${name} should have content`);
  }
  const json = JSON.parse(fs.readFileSync(path.join(outDir, 'seed_episode_preview.json'), 'utf8'));
  assert.equal(json.tables.steps.length, payload.tables.steps.length);
  assert.match(fs.readFileSync(path.join(outDir, 'README.md'), 'utf8'), /策划\/平衡快照/);
  const plannerFlow = fs.readFileSync(path.join(outDir, 'seed_episode_planner_flow.md'), 'utf8');
  assert.match(plannerFlow, /# 元素背包史 Seed 全流程策划预览/);
  assert.match(plannerFlow, /## Seed：write-a/);
  assert.match(plannerFlow, /### 第 1 天/);
  assert.match(plannerFlow, /\| 选项 \| 类型 \| 名称 \| 策划内容 \| 备注 \|/);
  assert.match(plannerFlow, /\| 战斗 \| 名称 \| 敌人\/波次预览 \| 备注 \|/);
});

test('seed episode planner flow document is human readable and current node types are enterable', () => {
  const payload = buildEpisodePreview({
    writeFiles: false,
    generatedAt: '2026-07-02T00:00:00.000Z',
    seeds: ['doc-seed'],
    days: [1]
  });
  const doc = renderPlannerFlowDoc(payload);
  assert.match(doc, /Seed：doc-seed/);
  assert.match(doc, /宠物奖励|夜市商人|火系补货商人/);
  assert.match(doc, /\| event \|/);
  assert.match(doc, /\| rest \|/);
  assert.match(doc, /当前内容包含 `shop` \/ `reward` \/ `event` \/ `rest`/);
});

test('parseDays accepts ranges and comma lists', () => {
  assert.deepEqual(parseDays('1-3'), [1, 2, 3]);
  assert.deepEqual(parseDays('1,3,10'), [1, 3, 10]);
});
