const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const verifier = path.join(repo, 'tools/verify_original_pirate_top3_github_gap.py');
const artifact = path.join(repo, 'data/candidates/original_pirate/top3_metrics_github_gap/audit.json');

function run(target) {
  return spawnSync('python3', [verifier, '--artifact', target], {
    cwd: repo, encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
}

test('immutable GitHub evidence keeps rows 222, 180, and 219 candidate-only', () => {
  const result = run(artifact);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    githubEvidenceLocked: true,
    candidateRows: [222, 180, 219],
    candidateRowsAcceptedAsExactTop3: false,
    battleLogsAllowed: false,
    originalRulesAccepted: false,
    errors: [],
  });
});

test('acceptance, row, source-hash, and duplicate-key forgeries fail closed', () => {
  const mutations = [
    (value) => { value.candidateRowsAcceptedAsExactTop3 = true; },
    (value) => { value.candidateRows[0].snapshotArrayIndex = 0; },
    (value) => { value.immutableGithubEvidence.tenWinBuildCorpus.rawSha256 = '0'.repeat(64); },
    (value) => { value.missingAcceptanceEvidence = []; },
  ];
  for (const mutate of mutations) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'top3-github-gap-'));
    try {
      const forged = JSON.parse(fs.readFileSync(artifact, 'utf8'));
      mutate(forged);
      const target = path.join(directory, 'audit.json');
      fs.writeFileSync(target, JSON.stringify(forged));
      assert.equal(run(target).status, 1);
    } finally { fs.rmSync(directory, {recursive: true, force: true}); }
  }

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'top3-github-gap-'));
  try {
    const target = path.join(directory, 'duplicate.json');
    const payload = fs.readFileSync(artifact, 'utf8').replace(
      '{', '{"candidateRowsAcceptedAsExactTop3":true,', 1);
    fs.writeFileSync(target, payload);
    const result = run(target);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /TOP3_GITHUB_GAP_DUPLICATE_JSON_KEY:candidateRowsAcceptedAsExactTop3/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
