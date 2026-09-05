const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test("Captain's Quarters dangling Ability 3 is locked and blocks formal promotion", () => {
  const result = spawnSync('python3', ['-c', String.raw`
import hashlib,json,os,pathlib,sys,tempfile
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import verify_original_pirate_captains_quarters_source_gap as gap
root=pathlib.Path('.')
db=pathlib.Path(os.environ.get('THE_BAZAAR_GAMEDATA_DB','/Users/ywh/Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db'))
artifact=root/'data/candidates/original_pirate/captains_quarters_source_gap/source-gap.json'
r=gap.verify(db,artifact)
assert r=={'ok':True,'sourceGapVerified':True,'sourceGapStatus':'BLOCKED_SOURCE_REFERENCE_MISSING','formalPromotionAllowed':False,'originalRulesAccepted':False,'errors':[]}
assert json.loads(artifact.read_text())==gap.expected_artifact()
with tempfile.TemporaryDirectory() as raw:
 forged=pathlib.Path(raw)/'gap.json';d=gap.expected_artifact();d['formalPromotionAllowed']=True
 forged.write_text(json.dumps(d));bad=gap.verify(db,forged)
 assert not bad['ok'] and 'CAPTAINS_QUARTERS_GAP_ARTIFACT_MISMATCH' in bad['errors']
 duplicate=pathlib.Path(raw)/'duplicate.json'
 payload=artifact.read_text().replace('{','{"formalPromotionAllowed":true,',1)
 duplicate.write_text(payload);bad=gap.verify(db,duplicate)
 assert not bad['ok'] and any('GAP_ARTIFACT_DUPLICATE_JSON_KEY:formalPromotionAllowed' in e for e in bad['errors'])
package,_=formal.build_exports(root/'data/csv')
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()=='8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366'
assert all(item.get('sourceBinding',{}).get('sourceObjectUuid')!=gap.SOURCE_UUID for item in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=gap.SOURCE_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
`], {cwd:path.resolve(__dirname,'..'), encoding:'utf8', env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
