# AI Game Evaluation Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable AI game evaluation harness that runs ysbzs scenarios through `GameAdapter -> Agent -> TraceRecorder -> Evaluator -> Report` without changing the core gameplay rules.

**Architecture:** Add a new `ai-eval/` directory beside the existing tests. The first implementation uses a Node core adapter that loads `index.html` in a VM sandbox and reuses existing replay/action hooks; browser evidence remains a later task after the core protocol is stable.

**Tech Stack:** Node.js CommonJS modules, built-in `assert`, built-in `fs/path/vm`, existing Playwright dependency for later browser adapter, existing ysbzs `index.html` replay/action functions.

---

## File Structure

- Create `ai-eval/core/game-script-loader.js`: Loads `index.html` script into an isolated VM context with DOM stubs.
- Create `ai-eval/core/runner.js`: Runs one scenario episode with adapter, agent, recorder, and evaluators.
- Create `ai-eval/core/trace-recorder.js`: Stores step records and writes JSONL.
- Create `ai-eval/core/report-writer.js`: Writes Markdown summary reports.
- Create `ai-eval/adapters/ysbzs-core-adapter.js`: Implements `GameAdapter` for ysbzs pure logic execution.
- Create `ai-eval/agents/script-agent.js`: Deterministic policy agent for stable walkthrough scenarios.
- Create `ai-eval/agents/random-legal-agent.js`: Seeded legal-action fuzzer agent.
- Create `ai-eval/evaluators/invariant-evaluator.js`: Per-step state invariant checks.
- Create `ai-eval/evaluators/goal-evaluator.js`: Scenario goal checks.
- Create `ai-eval/scenarios/ysbzs-day1.json`: Day1 summon/heal scenario.
- Create `ai-eval/scenarios/ysbzs-random-smoke.json`: Random legal action smoke scenario.
- Create `ai-eval/tests/run-tests.js`: Minimal Node test runner for the harness.
- Create `ai-eval/run.js`: CLI entrypoint.
- Modify `package.json`: Add `eval:day1`, `eval:random`, and `eval:test` scripts.
- Modify `docs/10_CHANGELOG.md`: Add implementation record.
- Modify `tasks/doing/当前任务.md`: Track RED/GREEN evidence and completion notes.

---

### Task 1: Loader Foundation

**Files:**
- Create: `ai-eval/core/game-script-loader.js`
- Create: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Write failing loader tests**

Create `ai-eval/tests/run-tests.js`:

```js
#!/usr/bin/env node
const assert = require('assert');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('loader exposes ysbzs replay and action hooks', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const game = loadYsbzsGame();
  assert.strictEqual(typeof game.context.initGame, 'function');
  assert.strictEqual(typeof game.context.dispatchGameAction, 'function');
  assert.strictEqual(typeof game.context.snapshotCoreStateForReplay, 'function');
  assert.strictEqual(typeof game.context.applyReplaySnapshot, 'function');
  assert.strictEqual(typeof game.context.buildReplayFinalResult, 'function');
});

test('loader starts a fresh game and computes a replay result', () => {
  const { loadYsbzsGame } = require('../core/game-script-loader');
  const game = loadYsbzsGame();
  game.context.initGame();
  const result = game.context.buildReplayFinalResult();
  assert.strictEqual(result.phase, 'PLAYER');
  assert.strictEqual(result.day, 1);
  assert.ok(result.hash);
});

async function main() {
  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    try {
      await t.fn();
      pass++;
      console.log(`ok - ${t.name}`);
    } catch (e) {
      fail++;
      console.error(`not ok - ${t.name}`);
      console.error(e.stack || e.message);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with `Cannot find module '../core/game-script-loader'`.

- [ ] **Step 3: Implement loader**

Create `ai-eval/core/game-script-loader.js`:

```js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl() {
  return {
    innerHTML: '',
    textContent: '',
    style: { display: '' },
    children: [],
    disabled: false,
    scrollTop: 0,
    scrollHeight: 0,
    classList: { add() {}, remove() {}, has: () => false },
    appendChild(c) { this.children.push(c); },
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
    },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0 }; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    onclick: null,
    title: '',
  };
}

function createDomStub() {
  const els = {};
  return {
    getElementById(id) {
      if (!els[id]) els[id] = makeEl();
      return els[id];
    },
    createElement() {
      return makeEl();
    },
    addEventListener() {},
    _els: els,
  };
}

function extractGameScript(html) {
  const scriptTag = html.match(/<script>([\s\S]+?)<\/script>/);
  if (!scriptTag) throw new Error('Cannot find inline game <script>');
  return scriptTag[1].replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
}

function loadYsbzsGame(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const htmlPath = options.htmlPath || path.join(rootDir, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const context = {
    console,
    document: createDomStub(),
    window: { innerWidth: 1920 },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: { search: '' },
    setTimeout(fn) {
      try { fn(); } catch (e) { throw e; }
      return 0;
    },
    clearTimeout() {},
    __TEST__: true,
    __DEBUG__: false,
  };
  context.global = context;
  vm.createContext(context);
  vm.runInContext(extractGameScript(html), context, { filename: htmlPath });

  context.render = () => {};
  context.renderShop = () => {};
  context.glog = () => {};
  context.showMsg = () => {};
  if (typeof context.buildRunEndVM === 'function') {
    context.showRunEnd = () => context.buildRunEndVM().title;
  }

  return { context, rootDir, htmlPath };
}

module.exports = { loadYsbzsGame, extractGameScript };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ai-eval/tests/run-tests.js`

Expected: PASS with `2 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add ai-eval/core/game-script-loader.js ai-eval/tests/run-tests.js
git commit -m "test: add ysbzs eval loader"
```

---

### Task 2: Trace Recorder and Report Writer

**Files:**
- Create: `ai-eval/core/trace-recorder.js`
- Create: `ai-eval/core/report-writer.js`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing recorder/report tests**

Append these tests before `main()` in `ai-eval/tests/run-tests.js`:

```js
test('trace recorder stores steps and serializes jsonl', () => {
  const { TraceRecorder } = require('../core/trace-recorder');
  const recorder = new TraceRecorder('case-a');
  recorder.record({ step: 0, action: { type: 'USE_SLOT', slotId: 0 }, result: { phase: 'PLAYER' }, errors: [] });
  recorder.record({ step: 1, action: { type: 'END_PLAYER_TURN' }, result: { phase: 'MONSTER' }, errors: [] });
  const jsonl = recorder.toJSONL();
  const lines = jsonl.trim().split('\n').map(line => JSON.parse(line));
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0].scenarioId, 'case-a');
  assert.strictEqual(lines[1].action.type, 'END_PLAYER_TURN');
});

test('report writer renders scenario verdict and metrics', () => {
  const { renderMarkdownReport } = require('../core/report-writer');
  const md = renderMarkdownReport({
    scenario: { id: 'case-a', agent: 'script-day1' },
    verdict: 'PASS',
    steps: [{}, {}],
    evaluatorResults: [{ name: 'GoalEvaluator', verdict: 'PASS', messages: ['phaseIs SHOP'] }],
    outputFiles: { trace: 'ai-eval/reports/case-a.trace.jsonl' },
  });
  assert.ok(md.includes('# Evaluation Report: case-a'));
  assert.ok(md.includes('Verdict: PASS'));
  assert.ok(md.includes('GoalEvaluator'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with missing `trace-recorder` and `report-writer` modules.

- [ ] **Step 3: Implement recorder**

Create `ai-eval/core/trace-recorder.js`:

```js
class TraceRecorder {
  constructor(scenarioId) {
    this.scenarioId = scenarioId;
    this.steps = [];
  }

  record(step) {
    this.steps.push({
      scenarioId: this.scenarioId,
      recordedAt: new Date().toISOString(),
      ...step,
    });
  }

  toJSONL() {
    return this.steps.map(step => JSON.stringify(step)).join('\n') + (this.steps.length ? '\n' : '');
  }
}

module.exports = { TraceRecorder };
```

- [ ] **Step 4: Implement report writer**

Create `ai-eval/core/report-writer.js`:

```js
function renderMarkdownReport(result) {
  const lines = [];
  lines.push(`# Evaluation Report: ${result.scenario.id}`);
  lines.push('');
  lines.push(`- Verdict: ${result.verdict}`);
  lines.push(`- Agent: ${result.scenario.agent}`);
  lines.push(`- Steps: ${result.steps.length}`);
  if (result.outputFiles && result.outputFiles.trace) {
    lines.push(`- Trace: ${result.outputFiles.trace}`);
  }
  lines.push('');
  lines.push('## Evaluators');
  for (const ev of result.evaluatorResults) {
    lines.push('');
    lines.push(`### ${ev.name}: ${ev.verdict}`);
    for (const msg of ev.messages || []) lines.push(`- ${msg}`);
  }
  return lines.join('\n') + '\n';
}

module.exports = { renderMarkdownReport };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ai-eval/tests/run-tests.js`

Expected: PASS with recorder/report tests included.

- [ ] **Step 6: Commit**

```bash
git add ai-eval/core/trace-recorder.js ai-eval/core/report-writer.js ai-eval/tests/run-tests.js
git commit -m "test: add eval trace reporting"
```

---

### Task 3: Core Runner

**Files:**
- Create: `ai-eval/core/runner.js`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing runner test**

Append this test before `main()`:

```js
test('runner executes adapter and agent until goal passes', async () => {
  const { runScenario } = require('../core/runner');
  const calls = [];
  const adapter = {
    async reset() { calls.push('reset'); },
    async observe() { return { phase: calls.includes('step') ? 'SHOP' : 'PLAYER' }; },
    async legalActions() { return [{ type: 'END_PLAYER_TURN' }]; },
    async step(action) { calls.push('step'); return { accepted: true, action, observation: { phase: 'SHOP' } }; },
    async close() { calls.push('close'); },
  };
  const agent = {
    async act({ legalActions }) { return legalActions[0]; },
  };
  const evaluator = {
    name: 'FakeGoal',
    onStep() {},
    final({ finalObservation }) {
      return { name: this.name, verdict: finalObservation.phase === 'SHOP' ? 'PASS' : 'FAIL', messages: [] };
    },
  };
  const result = await runScenario({
    scenario: { id: 'runner-case', maxSteps: 4, agent: 'fake' },
    adapter,
    agent,
    evaluators: [evaluator],
  });
  assert.strictEqual(result.verdict, 'PASS');
  assert.strictEqual(result.steps.length, 1);
  assert.deepStrictEqual(calls, ['reset', 'step', 'close']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with missing `runner` module.

- [ ] **Step 3: Implement runner**

Create `ai-eval/core/runner.js`:

```js
const { TraceRecorder } = require('./trace-recorder');

function worstVerdict(results) {
  return results.some(r => r.verdict === 'FAIL') ? 'FAIL' : 'PASS';
}

function sameAction(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function runScenario({ scenario, adapter, agent, evaluators }) {
  const recorder = new TraceRecorder(scenario.id);
  const steps = [];
  let finalObservation = null;
  await adapter.reset(scenario);

  try {
    for (let i = 0; i < scenario.maxSteps; i++) {
      const observation = await adapter.observe();
      finalObservation = observation;
      const legalActions = await adapter.legalActions(observation);
      if (legalActions.length === 0) break;

      const action = await agent.act({ observation, legalActions, history: steps });
      const isLegal = legalActions.some(candidate => sameAction(candidate, action));
      if (!isLegal) {
        const invalidStep = { step: i, observation, action, accepted: false, result: observation, errors: ['INVALID_ACTION'] };
        steps.push(invalidStep);
        recorder.record(invalidStep);
        for (const ev of evaluators) if (ev.onStep) ev.onStep(invalidStep);
        break;
      }

      const stepResult = await adapter.step(action);
      const nextObservation = stepResult.observation || await adapter.observe();
      finalObservation = nextObservation;
      const traceStep = {
        step: i,
        observation,
        legalActionCount: legalActions.length,
        action,
        accepted: !!stepResult.accepted,
        result: nextObservation,
        errors: stepResult.errors || [],
      };
      steps.push(traceStep);
      recorder.record(traceStep);
      for (const ev of evaluators) if (ev.onStep) ev.onStep(traceStep);

      if (nextObservation.phase === 'OVER') break;
    }
  } finally {
    if (adapter.close) await adapter.close();
  }

  const evaluatorResults = evaluators.map(ev => ev.final({ scenario, steps, finalObservation }));
  return {
    scenario,
    verdict: worstVerdict(evaluatorResults),
    steps,
    traceJSONL: recorder.toJSONL(),
    evaluatorResults,
    finalObservation,
  };
}

module.exports = { runScenario, sameAction };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ai-eval/tests/run-tests.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ai-eval/core/runner.js ai-eval/tests/run-tests.js
git commit -m "test: add eval scenario runner"
```

---

### Task 4: ysbzs Core Adapter

**Files:**
- Create: `ai-eval/adapters/ysbzs-core-adapter.js`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing adapter tests**

Append these tests before `main()`:

```js
test('ysbzs core adapter resets and observes initial state', async () => {
  const { YsbzsCoreAdapter } = require('../adapters/ysbzs-core-adapter');
  const adapter = new YsbzsCoreAdapter();
  await adapter.reset({ initial: { mode: 'freshGame' } });
  const obs = await adapter.observe();
  assert.strictEqual(obs.phase, 'PLAYER');
  assert.strictEqual(obs.day, 1);
  assert.ok(obs.hash);
  assert.ok(Array.isArray(obs.slots));
});

test('ysbzs core adapter exposes player legal actions and steps use slot', async () => {
  const { YsbzsCoreAdapter } = require('../adapters/ysbzs-core-adapter');
  const adapter = new YsbzsCoreAdapter();
  await adapter.reset({ initial: { mode: 'freshGame' } });
  const obs = await adapter.observe();
  const actions = await adapter.legalActions(obs);
  assert.ok(actions.some(a => a.type === 'USE_SLOT'));
  const action = actions.find(a => a.type === 'USE_SLOT');
  const result = await adapter.step(action);
  assert.strictEqual(result.accepted, true);
  assert.ok(result.observation.hash);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with missing `ysbzs-core-adapter`.

- [ ] **Step 3: Implement adapter**

Create `ai-eval/adapters/ysbzs-core-adapter.js`:

```js
const { loadYsbzsGame } = require('../core/game-script-loader');

const PHASES = new Set(['PLAYER', 'MONSTER', 'SHOP', 'OVER']);

class YsbzsCoreAdapter {
  constructor(options = {}) {
    this.game = loadYsbzsGame(options);
    this.context = this.game.context;
  }

  async reset(scenario) {
    const initial = scenario.initial || { mode: 'freshGame' };
    if (initial.mode === 'replaySnapshot') {
      this.context.applyReplaySnapshot(initial.snapshot);
    } else {
      this.context.initGame();
    }
    if (Array.isArray(initial.ownedUnits)) {
      this.context.G.ownedUnits = [];
      for (const unit of initial.ownedUnits) {
        this.context.addOwnedUnit(unit.defId, unit.pos);
      }
      this.context.syncUnitsToHeroes();
    }
    this.context.recomputeCorePreview();
  }

  async observe() {
    const c = this.context;
    const result = c.buildReplayFinalResult();
    return {
      phase: c.G.phase,
      day: c.G.day,
      dayHalf: c.G.dayHalf,
      round: c.G.round,
      maxRound: c.G.maxRound,
      gold: c.G.gold,
      hash: result.hash,
      playerCastleHp: result.playerCastleHp,
      enemyCastleHp: result.enemyCastleHp,
      monstersAlive: result.monstersAlive,
      engineStats: result.engineStats || {},
      growth: result.growth || {},
      heroes: Object.entries(c.G.heroes || {}).map(([id, h]) => ({ id, hp: h.hp, maxHp: h.maxHp, pos: h.pos, acted: !!h._acted })),
      slots: (c.G.slots || []).map((s, slotId) => ({ slotId, used: !!s.used, skill: s.skill || null, heroId: s.hid, element: s.el, shape: s.sn, direction: s.dir })),
    };
  }

  async legalActions(observation) {
    const c = this.context;
    if (!PHASES.has(observation.phase)) return [];
    if (observation.phase === 'PLAYER') {
      const actions = [];
      for (const slot of observation.slots) {
        if (!slot.used) actions.push({ type: 'USE_SLOT', slotId: slot.slotId });
      }
      actions.push({ type: 'END_PLAYER_TURN' });
      return actions;
    }
    if (observation.phase === 'SHOP') return [{ type: 'CLOSE_SHOP' }];
    return [];
  }

  async step(action) {
    const before = await this.observe();
    const errors = [];
    try {
      if (action.type === 'END_PLAYER_TURN') this.context.endPlayerTurn();
      else if (action.type === 'CLOSE_SHOP') this.context.closeShop();
      else this.context.dispatchGameAction(action);
    } catch (e) {
      errors.push(e.message);
    }
    const observation = await this.observe();
    const accepted = errors.length === 0 && (
      before.hash !== observation.hash ||
      before.phase !== observation.phase ||
      before.round !== observation.round ||
      before.day !== observation.day ||
      before.dayHalf !== observation.dayHalf
    );
    return { accepted, observation, errors };
  }

  async snapshot() {
    return this.context.snapshotCoreStateForReplay();
  }

  async restore(snapshot) {
    this.context.applyReplaySnapshot(snapshot);
  }

  async close() {}
}

module.exports = { YsbzsCoreAdapter };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ai-eval/tests/run-tests.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ai-eval/adapters/ysbzs-core-adapter.js ai-eval/tests/run-tests.js
git commit -m "test: add ysbzs core eval adapter"
```

---

### Task 5: Agents and Day1 Scenario

**Files:**
- Create: `ai-eval/agents/script-agent.js`
- Create: `ai-eval/agents/random-legal-agent.js`
- Create: `ai-eval/scenarios/ysbzs-day1.json`
- Create: `ai-eval/scenarios/ysbzs-random-smoke.json`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing agent/scenario tests**

Append these tests before `main()`:

```js
test('script agent prefers usable slots before ending turn', async () => {
  const { ScriptAgent } = require('../agents/script-agent');
  const agent = new ScriptAgent();
  const action = await agent.act({
    observation: { phase: 'PLAYER' },
    legalActions: [{ type: 'END_PLAYER_TURN' }, { type: 'USE_SLOT', slotId: 2 }],
    history: [],
  });
  assert.deepStrictEqual(action, { type: 'USE_SLOT', slotId: 2 });
});

test('random legal agent is deterministic for the same seed', async () => {
  const { RandomLegalAgent } = require('../agents/random-legal-agent');
  const legalActions = [{ type: 'A' }, { type: 'B' }, { type: 'C' }];
  const a = new RandomLegalAgent({ seed: 7 });
  const b = new RandomLegalAgent({ seed: 7 });
  assert.deepStrictEqual(await a.act({ legalActions }), await b.act({ legalActions }));
});

test('day1 scenario can be loaded from json', () => {
  const scenario = require('../scenarios/ysbzs-day1.json');
  assert.strictEqual(scenario.id, 'ysbzs-day1-summon');
  assert.strictEqual(scenario.agent, 'script-day1');
  assert.ok(scenario.goals.some(g => g.type === 'phaseIs'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with missing agent and scenario files.

- [ ] **Step 3: Implement ScriptAgent**

Create `ai-eval/agents/script-agent.js`:

```js
class ScriptAgent {
  async act({ legalActions }) {
    const useSlot = legalActions.find(a => a.type === 'USE_SLOT');
    if (useSlot) return useSlot;
    const closeShop = legalActions.find(a => a.type === 'CLOSE_SHOP');
    if (closeShop) return closeShop;
    const endTurn = legalActions.find(a => a.type === 'END_PLAYER_TURN');
    if (endTurn) return endTurn;
    return legalActions[0];
  }
}

module.exports = { ScriptAgent };
```

- [ ] **Step 4: Implement RandomLegalAgent**

Create `ai-eval/agents/random-legal-agent.js`:

```js
class RandomLegalAgent {
  constructor(options = {}) {
    this.state = options.seed || 1;
  }

  next() {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  async act({ legalActions }) {
    if (!legalActions.length) throw new Error('RandomLegalAgent received no legal actions');
    const idx = Math.floor(this.next() * legalActions.length);
    return legalActions[idx];
  }
}

module.exports = { RandomLegalAgent };
```

- [ ] **Step 5: Add scenarios**

Create `ai-eval/scenarios/ysbzs-day1.json`:

```json
{
  "id": "ysbzs-day1-summon",
  "game": "ysbzs",
  "adapter": "ysbzs-core",
  "agent": "script-day1",
  "seed": 1,
  "maxSteps": 30,
  "initial": {
    "mode": "freshGame",
    "ownedUnits": [
      { "defId": "sprout_summoner", "pos": { "r": 10, "c": 1 } },
      { "defId": "spring_sprite", "pos": { "r": 11, "c": 1 } }
    ]
  },
  "goals": [
    { "type": "phaseIs", "value": "SHOP" },
    { "type": "engineStatAtLeast", "key": "summonCount", "value": 1 },
    { "type": "engineStatAtLeast", "key": "healCount", "value": 1 }
  ]
}
```

Create `ai-eval/scenarios/ysbzs-random-smoke.json`:

```json
{
  "id": "ysbzs-random-smoke",
  "game": "ysbzs",
  "adapter": "ysbzs-core",
  "agent": "random-legal",
  "seed": 11,
  "maxSteps": 20,
  "initial": { "mode": "freshGame" },
  "goals": [
    { "type": "noAdapterErrors" }
  ]
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node ai-eval/tests/run-tests.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add ai-eval/agents/script-agent.js ai-eval/agents/random-legal-agent.js ai-eval/scenarios/ysbzs-day1.json ai-eval/scenarios/ysbzs-random-smoke.json ai-eval/tests/run-tests.js
git commit -m "test: add eval agents and scenarios"
```

---

### Task 6: Evaluators

**Files:**
- Create: `ai-eval/evaluators/invariant-evaluator.js`
- Create: `ai-eval/evaluators/goal-evaluator.js`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing evaluator tests**

Append these tests before `main()`:

```js
test('invariant evaluator fails invalid phase and negative hp', () => {
  const { InvariantEvaluator } = require('../evaluators/invariant-evaluator');
  const ev = new InvariantEvaluator();
  ev.onStep({ result: { phase: 'BAD', playerCastleHp: -1, heroes: [], monstersAlive: 0 } });
  const result = ev.final();
  assert.strictEqual(result.verdict, 'FAIL');
  assert.ok(result.messages.some(m => m.includes('invalid phase')));
  assert.ok(result.messages.some(m => m.includes('negative playerCastleHp')));
});

test('goal evaluator passes phase and engine stat goals', () => {
  const { GoalEvaluator } = require('../evaluators/goal-evaluator');
  const ev = new GoalEvaluator();
  const result = ev.final({
    scenario: {
      goals: [
        { type: 'phaseIs', value: 'SHOP' },
        { type: 'engineStatAtLeast', key: 'summonCount', value: 1 }
      ]
    },
    steps: [],
    finalObservation: { phase: 'SHOP', engineStats: { summonCount: 2 } }
  });
  assert.strictEqual(result.verdict, 'PASS');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with missing evaluator modules.

- [ ] **Step 3: Implement InvariantEvaluator**

Create `ai-eval/evaluators/invariant-evaluator.js`:

```js
const VALID_PHASES = new Set(['PLAYER', 'MONSTER', 'SHOP', 'OVER']);

class InvariantEvaluator {
  constructor() {
    this.messages = [];
  }

  onStep(step) {
    const obs = step.result || {};
    if (!VALID_PHASES.has(obs.phase)) this.messages.push(`invalid phase: ${obs.phase}`);
    if (typeof obs.playerCastleHp === 'number' && obs.playerCastleHp < 0) this.messages.push(`negative playerCastleHp: ${obs.playerCastleHp}`);
    if (typeof obs.enemyCastleHp === 'number' && obs.enemyCastleHp < 0) this.messages.push(`negative enemyCastleHp: ${obs.enemyCastleHp}`);
    for (const hero of obs.heroes || []) {
      if (typeof hero.hp === 'number' && hero.hp < 0) this.messages.push(`negative hero hp: ${hero.id}`);
    }
    if (step.errors && step.errors.length) {
      for (const err of step.errors) this.messages.push(`step error: ${err}`);
    }
  }

  final() {
    return {
      name: 'InvariantEvaluator',
      verdict: this.messages.length ? 'FAIL' : 'PASS',
      messages: this.messages.length ? this.messages : ['all invariants passed'],
    };
  }
}

module.exports = { InvariantEvaluator };
```

- [ ] **Step 4: Implement GoalEvaluator**

Create `ai-eval/evaluators/goal-evaluator.js`:

```js
class GoalEvaluator {
  final({ scenario, steps, finalObservation }) {
    const messages = [];
    let pass = true;
    for (const goal of scenario.goals || []) {
      if (goal.type === 'phaseIs') {
        const ok = finalObservation && finalObservation.phase === goal.value;
        messages.push(`phaseIs ${goal.value}: ${ok ? 'PASS' : 'FAIL'}`);
        pass = pass && ok;
      } else if (goal.type === 'engineStatAtLeast') {
        const actual = finalObservation && finalObservation.engineStats ? finalObservation.engineStats[goal.key] || 0 : 0;
        const ok = actual >= goal.value;
        messages.push(`engineStatAtLeast ${goal.key} >= ${goal.value}: actual ${actual} ${ok ? 'PASS' : 'FAIL'}`);
        pass = pass && ok;
      } else if (goal.type === 'noAdapterErrors') {
        const errorCount = steps.reduce((sum, step) => sum + (step.errors ? step.errors.length : 0), 0);
        const ok = errorCount === 0;
        messages.push(`noAdapterErrors: ${ok ? 'PASS' : 'FAIL'} (${errorCount})`);
        pass = pass && ok;
      } else {
        messages.push(`unknown goal type: ${goal.type}`);
        pass = false;
      }
    }
    return { name: 'GoalEvaluator', verdict: pass ? 'PASS' : 'FAIL', messages };
  }
}

module.exports = { GoalEvaluator };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ai-eval/tests/run-tests.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ai-eval/evaluators/invariant-evaluator.js ai-eval/evaluators/goal-evaluator.js ai-eval/tests/run-tests.js
git commit -m "test: add eval goal and invariant checks"
```

---

### Task 7: CLI Runner and Reports

**Files:**
- Create: `ai-eval/run.js`
- Modify: `package.json`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing CLI smoke test**

Append this test before `main()`:

```js
test('cli dependencies can construct day1 scenario components', () => {
  const { createComponents } = require('../run');
  const scenario = require('../scenarios/ysbzs-day1.json');
  const components = createComponents(scenario);
  assert.strictEqual(typeof components.adapter.reset, 'function');
  assert.strictEqual(typeof components.agent.act, 'function');
  assert.strictEqual(components.evaluators.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ai-eval/tests/run-tests.js`

Expected: FAIL with missing `../run`.

- [ ] **Step 3: Implement CLI**

Create `ai-eval/run.js`:

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { runScenario } = require('./core/runner');
const { renderMarkdownReport } = require('./core/report-writer');
const { YsbzsCoreAdapter } = require('./adapters/ysbzs-core-adapter');
const { ScriptAgent } = require('./agents/script-agent');
const { RandomLegalAgent } = require('./agents/random-legal-agent');
const { InvariantEvaluator } = require('./evaluators/invariant-evaluator');
const { GoalEvaluator } = require('./evaluators/goal-evaluator');

function loadScenario(scenarioPath) {
  return JSON.parse(fs.readFileSync(path.resolve(scenarioPath), 'utf8'));
}

function createComponents(scenario) {
  const adapter = new YsbzsCoreAdapter();
  const agent = scenario.agent === 'random-legal'
    ? new RandomLegalAgent({ seed: scenario.seed })
    : new ScriptAgent();
  const evaluators = [new InvariantEvaluator(), new GoalEvaluator()];
  return { adapter, agent, evaluators };
}

async function main(argv = process.argv.slice(2)) {
  const scenarioPath = argv[0] || path.join(__dirname, 'scenarios', 'ysbzs-day1.json');
  const scenario = loadScenario(scenarioPath);
  const { adapter, agent, evaluators } = createComponents(scenario);
  const result = await runScenario({ scenario, adapter, agent, evaluators });

  const outDir = path.join(__dirname, 'reports', scenario.id);
  fs.mkdirSync(outDir, { recursive: true });
  const tracePath = path.join(outDir, 'trace.jsonl');
  const reportPath = path.join(outDir, 'summary.md');
  fs.writeFileSync(tracePath, result.traceJSONL, 'utf8');
  fs.writeFileSync(reportPath, renderMarkdownReport({
    ...result,
    outputFiles: { trace: tracePath },
  }), 'utf8');

  console.log(`${result.verdict} ${scenario.id}`);
  console.log(`trace: ${tracePath}`);
  console.log(`report: ${reportPath}`);
  return result.verdict === 'PASS' ? 0 : 1;
}

if (require.main === module) {
  main().then(code => process.exit(code)).catch(e => {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}

module.exports = { createComponents, loadScenario, main };
```

- [ ] **Step 4: Add package scripts**

Modify `package.json` scripts to:

```json
{
  "benchmark:smoke": "node benchmarks/ysbzs/run-benchmark.mjs --smoke",
  "benchmark": "node benchmarks/ysbzs/run-benchmark.mjs",
  "eval:test": "node ai-eval/tests/run-tests.js",
  "eval:day1": "node ai-eval/run.js ai-eval/scenarios/ysbzs-day1.json",
  "eval:random": "node ai-eval/run.js ai-eval/scenarios/ysbzs-random-smoke.json"
}
```

- [ ] **Step 5: Run tests and scenarios**

Run: `npm run eval:test`

Expected: PASS.

Run: `npm run eval:day1`

Expected: PASS and files written under `ai-eval/reports/ysbzs-day1-summon/`.

Run: `npm run eval:random`

Expected: PASS and files written under `ai-eval/reports/ysbzs-random-smoke/`.

- [ ] **Step 6: Commit**

```bash
git add ai-eval/run.js ai-eval/tests/run-tests.js package.json package-lock.json ai-eval/reports/ysbzs-day1-summon/summary.md ai-eval/reports/ysbzs-day1-summon/trace.jsonl ai-eval/reports/ysbzs-random-smoke/summary.md ai-eval/reports/ysbzs-random-smoke/trace.jsonl
git commit -m "feat: add ai eval cli reports"
```

---

### Task 8: Multi-Seed Random Smoke

**Files:**
- Create: `ai-eval/scenarios/ysbzs-random-20.json`
- Modify: `ai-eval/run.js`
- Modify: `package.json`
- Modify: `ai-eval/tests/run-tests.js`

- [ ] **Step 1: Add failing multi-run test**

Append this test before `main()`:

```js
test('multi scenario expands seeds into child scenarios', () => {
  const { expandScenarios } = require('../run');
  const scenario = { id: 'multi', seeds: [1, 2, 3], agent: 'random-legal', maxSteps: 5, goals: [] };
  const expanded = expandScenarios(scenario);
  assert.deepStrictEqual(expanded.map(s => s.id), ['multi-seed-1', 'multi-seed-2', 'multi-seed-3']);
  assert.deepStrictEqual(expanded.map(s => s.seed), [1, 2, 3]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run eval:test`

Expected: FAIL with `expandScenarios is not a function`.

- [ ] **Step 3: Implement scenario expansion**

In `ai-eval/run.js`, add:

```js
function expandScenarios(scenario) {
  if (!Array.isArray(scenario.seeds)) return [scenario];
  return scenario.seeds.map(seed => ({
    ...scenario,
    id: `${scenario.id}-seed-${seed}`,
    seed,
    seeds: undefined,
  }));
}
```

Replace `const result = await runScenario(...)` in `main()` with:

```js
const scenarios = expandScenarios(scenario);
let finalCode = 0;
for (const childScenario of scenarios) {
  const { adapter, agent, evaluators } = createComponents(childScenario);
  const result = await runScenario({ scenario: childScenario, adapter, agent, evaluators });
  const outDir = path.join(__dirname, 'reports', childScenario.id);
  fs.mkdirSync(outDir, { recursive: true });
  const tracePath = path.join(outDir, 'trace.jsonl');
  const reportPath = path.join(outDir, 'summary.md');
  fs.writeFileSync(tracePath, result.traceJSONL, 'utf8');
  fs.writeFileSync(reportPath, renderMarkdownReport({
    ...result,
    outputFiles: { trace: tracePath },
  }), 'utf8');
  console.log(`${result.verdict} ${childScenario.id}`);
  console.log(`trace: ${tracePath}`);
  console.log(`report: ${reportPath}`);
  if (result.verdict !== 'PASS') finalCode = 1;
}
return finalCode;
```

Update module exports:

```js
module.exports = { createComponents, expandScenarios, loadScenario, main };
```

- [ ] **Step 4: Add 20-seed scenario**

Create `ai-eval/scenarios/ysbzs-random-20.json`:

```json
{
  "id": "ysbzs-random-20",
  "game": "ysbzs",
  "adapter": "ysbzs-core",
  "agent": "random-legal",
  "seeds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  "maxSteps": 20,
  "initial": { "mode": "freshGame" },
  "goals": [
    { "type": "noAdapterErrors" }
  ]
}
```

- [ ] **Step 5: Add package script**

Modify `package.json` scripts to add:

```json
"eval:random20": "node ai-eval/run.js ai-eval/scenarios/ysbzs-random-20.json"
```

- [ ] **Step 6: Run verification**

Run: `npm run eval:test`

Expected: PASS.

Run: `npm run eval:random20`

Expected: all 20 child scenarios print `PASS`.

- [ ] **Step 7: Commit**

```bash
git add ai-eval/run.js ai-eval/scenarios/ysbzs-random-20.json ai-eval/tests/run-tests.js package.json package-lock.json ai-eval/reports/
git commit -m "feat: add multi-seed eval smoke"
```

---

### Task 9: Documentation and Final Verification

**Files:**
- Create: `ai-eval/README.md`
- Modify: `docs/10_CHANGELOG.md`
- Modify: `tasks/doing/当前任务.md`

- [ ] **Step 1: Write eval README**

Create `ai-eval/README.md`:

````md
# AI Eval Harness

This directory contains a generic game evaluation harness. It is separate from `test.js` and `benchmarks/ysbzs/`.

## Responsibilities

- `test.js`: deterministic ysbzs logic regression.
- `benchmarks/ysbzs/`: document, fixture, and implementation consistency.
- `ai-eval/`: scenario-driven agent evaluation with traces, reports, and evaluators.

## Commands

```bash
npm run eval:test
npm run eval:day1
npm run eval:random
npm run eval:random20
```

## Output

Each scenario writes:

- `ai-eval/reports/<scenario-id>/trace.jsonl`
- `ai-eval/reports/<scenario-id>/summary.md`

## Adapter Contract

Adapters expose:

- `reset(scenario)`
- `observe()`
- `legalActions(observation)`
- `step(action)`
- `snapshot()`
- `restore(snapshot)`
- `close()`

Agents only receive `observation`, `legalActions`, and `history`. They must return one action from `legalActions`.
````

- [ ] **Step 2: Update changelog**

Add an `## 未发布` row:

```md
| 2026-06-01 | feat | 新增 AI 游戏评测台第一版：`ai-eval` 核心 runner、ysbzs core adapter、ScriptAgent、RandomLegalAgent、Invariant/Goal evaluator、Day1 与随机多 seed 场景、JSONL trace 与 Markdown report。 | ai-eval/* / package.json | npm run eval:test / npm run eval:day1 / npm run eval:random20 / node test.js |
```

- [ ] **Step 3: Update task card evidence**

Append to `tasks/doing/当前任务.md`:

```md
## 实施结果

- 新增 `ai-eval/` 通用评测台第一版。
- 未修改 `index.html` 核心游戏规则。
- `test.js`、`benchmarks/ysbzs/`、`e2e/smoke.js` 职责保持不变。

## GREEN 证据

- `npm run eval:test`
- `npm run eval:day1`
- `npm run eval:random20`
- `node test.js`
```

- [ ] **Step 4: Run final verification**

Run: `npm run eval:test`

Expected: PASS.

Run: `npm run eval:day1`

Expected: PASS.

Run: `npm run eval:random20`

Expected: all 20 child scenarios PASS.

Run: `node test.js`

Expected: current full logic baseline passes.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add ai-eval/README.md docs/10_CHANGELOG.md tasks/doing/当前任务.md
git commit -m "docs: document ai eval harness"
```

---

## Final Notes

- Do not modify `index.html` unless a test proves the existing test hooks are inaccessible. If a hook is needed, add the smallest possible `__TEST__`-guarded export and document it in the task card.
- Do not stage unrelated files. Use explicit `git add` paths for each task.
- Browser adapter and LLM agent should be separate follow-up plans after this core harness is passing.
