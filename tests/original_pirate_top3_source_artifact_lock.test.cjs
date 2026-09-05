const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const verifier = path.join(repo, 'tools/verify_original_pirate_top3_source_artifact_lock.py');
const candidateDirs = [
  'bladed_hoverboard_source_mapping', 'burnacuda_source_mapping',
  'captains_quarters_source_gap', 'dive_weights_source_mapping',
  'diving_helmet_source_mapping', 'flagship_source_mapping',
  'nesting_doll_source_mapping', 'pearl_source_mapping',
  'pistol_sword_source_mapping', 'torpedo_source_mapping',
  'top3_metrics_github_gap',
  'wetware_source_mapping',
];
const workbookStems = [
  'bladed_hoverboard', 'burnacuda', 'dive_weights', 'diving_helmet',
  'flagship', 'nesting_doll', 'pearl', 'pistol_sword', 'torpedo', 'wetware',
];

function run(root) {
  return spawnSync('python3', [verifier, '--root', root], {
    cwd: repo,
    encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'top3-artifact-lock-'));
  for (const name of candidateDirs) {
    const relative = path.join('data/candidates/original_pirate', name);
    fs.cpSync(path.join(repo, relative), path.join(root, relative), {recursive: true});
  }
  for (const stem of workbookStems) {
    const relative = path.join('xlsx/candidates', `original_pirate_${stem}_source_mapping.xlsx`);
    fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
    fs.copyFileSync(path.join(repo, relative), path.join(root, relative));
  }
  return root;
}

test('top-three candidate source bytes are exact and remain non-acceptance evidence', () => {
  const result = run(repo);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.artifactLockVerified, true);
  assert.equal(payload.fileCount, 65);
  assert.equal(payload.scope, 'candidate_source_artifact_integrity_only');
  assert.equal(payload.completeBuildsAccepted, false);
  assert.equal(payload.originalRulesAccepted, false);
});

test('byte mutation fails the aggregate lock', () => {
  const root = makeFixture();
  try {
    const target = path.join(root, 'data/candidates/original_pirate/pearl_source_mapping/README.md');
    fs.appendFileSync(target, '\nforged\n');
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^TOP3_ARTIFACT_AGGREGATE_SHA256:/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('unexpected or missing candidate files fail closed', () => {
  for (const mode of ['extra', 'missing']) {
    const root = makeFixture();
    try {
      const directory = path.join(root, 'data/candidates/original_pirate/burnacuda_source_mapping');
      if (mode === 'extra') fs.writeFileSync(path.join(directory, 'forged.json'), '{}');
      else fs.rmSync(path.join(directory, 'README.md'));
      const result = run(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /^TOP3_ARTIFACT_FILE_COUNT:/);
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
  }
});

test('symlink substitution fails before hashing', () => {
  const root = makeFixture();
  try {
    const target = path.join(root, 'data/candidates/original_pirate/pearl_source_mapping/README.md');
    const backing = path.join(root, 'backing-readme.md');
    fs.copyFileSync(target, backing);
    fs.rmSync(target);
    fs.symlinkSync(backing, target);
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^TOP3_ARTIFACT_SYMLINK:/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
