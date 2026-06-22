#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg){ console.error(`FAIL ${msg}`); process.exitCode = 1; }
function pass(msg){ console.log(`PASS ${msg}`); }
function assert(cond, msg){ cond ? pass(msg) : fail(msg); }
function grep(rel, re){ return re.test(read(rel)); }

const coreFiles = [];
(function walk(dir){ for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const rel = path.join(dir, ent.name); if (ent.isDirectory()) walk(rel); else if (/\.cjs$/.test(ent.name)) coreFiles.push(rel); } })('src/core');
const coreText = coreFiles.map(read).join('\n');
assert(!/state\.selected\.[a-zA-Z_]+\s*=/.test(coreText), 'core does not write player UI selection fields');
assert(!/Math\.random\(\)/.test(coreText), 'core does not call Math.random directly');
assert(!/Date\.now\(\)/.test(coreText), 'core does not call Date.now directly');
assert(grep('src/storage/saveCodec.cjs', /SAVE_SCHEMA_VERSION/), 'save codec exists');
assert(grep('src/core/eventProjection.cjs', /canonicalEventLog/), 'canonical event projection exists');
assert(grep('src/core/mechanicGate.cjs', /unsupportedMechanicsForUnit/), 'mechanic gate exists');
assert(grep('src/core/battle/actions.cjs', /actionApSpent/), 'AP allocation is consumed by battle action core');
assert(grep('tools/run_ui_server.cjs', /\/api\/save/) && grep('tools/run_ui_server.cjs', /\/api\/load/), 'server exposes save/load endpoints');
assert(grep('web/index.html', /save-game-btn/) && grep('web/js/main.js', /localStorage\.setItem\('ysbzs\.save\.slot1'/), 'browser UI exposes local save/load');
assert(grep('web/index.html', /js\/local-engine\.js/) && grep('web/js/runtime-client.js', /__YSBZS_LOCAL_ENGINE_FACTORY__/) && grep('web/js/runtime-client.js', /runtime=http/), 'browser UI defaults to bundled pure singleplayer runtime with explicit http fallback');
assert(grep('tools/build_local_engine_bundle.cjs', /createBrowserLocalEngine/) && grep('web/js/local-engine.js', /__YSBZS_LOCAL_ENGINE_FACTORY__/), 'local engine bundle is generated from core adapter entry');
assert(read('src/uiAdapter.cjs').split(/\r?\n/).length < 820, 'uiAdapter remains under round5 size guard');
if (process.exitCode) process.exit(process.exitCode);
