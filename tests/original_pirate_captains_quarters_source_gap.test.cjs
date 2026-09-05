const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const verifier = path.join(repo, 'tools/verify_original_pirate_captains_quarters_source_gap.py');
const artifact = path.join(repo, 'data/candidates/original_pirate/captains_quarters_source_gap/source-gap.json');
const currentDb = process.env.THE_BAZAAR_GAMEDATA_DB || '/Users/ywh/Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db';
const archivedDb = process.env.THE_BAZAAR_ARCHIVED_GAMEDATA_DB || '/Users/ywh/Documents/Codex/2026-08-28/ve/work/thebazaar_inspection/db/GameData.db';

function run(target, current = currentDb, archived = archivedDb) {
  return spawnSync('python3', [verifier, '--current-db', current, '--archived-db', archived, '--artifact', target], {
    cwd: repo, encoding: 'utf8', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
}

test("Captain's Quarters two v5 gaps and v2 predecessor are locked without promotion", () => {
  const result = run(artifact);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    v5IndependentSourcesVerified: 2,
    historicalV2PredecessorLocked: true,
    sourceGapStatus: 'BLOCKED_SOURCE_REFERENCE_MISSING',
    formalPromotionAllowed: false,
    battleLogsAllowed: false,
    originalRulesAccepted: false,
    errors: [],
  });
});

test("Captain's Quarters remains absent from the formal runtime package", () => {
  const result = spawnSync('python3', ['-c', String.raw`
import hashlib,json,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import verify_original_pirate_captains_quarters_source_gap as gap
root=pathlib.Path('.')
package,_=formal.build_exports(root/'data/csv')
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()=='edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd'
assert all(item.get('sourceBinding',{}).get('sourceObjectUuid')!=gap.SOURCE_UUID for item in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=gap.SOURCE_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
`], {cwd: repo, encoding: 'utf8', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('cross-version promotion, historical mutation, missing second source, and duplicate keys fail closed', () => {
  const mutations = [
    (value) => { value.formalPromotionAllowed = true; },
    (value) => { value.fixedGithubHistoricalPredecessor.cardVersion = '5.0.0'; },
    (value) => { value.v5SourceObservations[1].missingAbilityIds = []; },
  ];
  for (const mutate of mutations) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'captains-gap-'));
    try {
      const forged = JSON.parse(fs.readFileSync(artifact, 'utf8'));
      mutate(forged);
      const target = path.join(directory, 'gap.json');
      fs.writeFileSync(target, JSON.stringify(forged));
      assert.equal(run(target).status, 1);
    } finally { fs.rmSync(directory, {recursive: true, force: true}); }
  }

  const noArchived = spawnSync('python3', ['-c', `
import pathlib,sys
sys.path.insert(0,'tools')
import verify_original_pirate_captains_quarters_source_gap as gap
r=gap.verify(pathlib.Path(${JSON.stringify(currentDb)}),pathlib.Path(${JSON.stringify(artifact)}))
assert not r['ok'] and 'CAPTAINS_QUARTERS_ARCHIVED_SOURCE_REQUIRED' in r['errors']
`], {cwd: repo, encoding: 'utf8', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
  assert.equal(noArchived.status, 0, noArchived.stderr || noArchived.stdout);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'captains-gap-'));
  try {
    const target = path.join(directory, 'duplicate.json');
    fs.writeFileSync(target, fs.readFileSync(artifact, 'utf8').replace(
      '{', '{"formalPromotionAllowed":true,', 1));
    const result = run(target);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /GAP_ARTIFACT_DUPLICATE_JSON_KEY:formalPromotionAllowed/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
