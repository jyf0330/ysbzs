const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test('Nesting Doll candidate locks base tiers and Fiery overlay without granting execution acceptance', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,pathlib,sys,tempfile
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_nesting_doll_source_mapping_candidate as c
import add_original_pirate_nesting_doll_source_mapping_candidate as add
add.verify_source(pathlib.Path('/Users/ywh/Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db'))
rows=c.workbook_rows();c.export_csv(check=True);c.validate_artifacts();m,p=c.build_artifacts(rows)
assert m['sourceObjectUuid']==c.SOURCE_UUID and m['sourceInternalName']=='Nesting Doll'
assert m['originalRulesAccepted'] is False and p['originalRulesAccepted'] is False
assert [x['quality'] for x in m['qualityProfiles']]==['silver','gold','diamond']
assert [x['shieldPerCurrentAmmo'] for x in m['qualityProfiles']]==[5,10,15]
assert m['sourceAbilityDirectoryOrderObserved']==['0','1']
assert m['sourceAuraDirectoryOrderObserved']==['2','3','4','9']
assert [a['sourceAuraId'] for a in m['baseAuras']]==['2','3','4','9']
assert m['baseAuras'][3]=={'sourceAuraId':'9','quality':'all_source_directory_only','attribute':'Custom_2','operation':'Add','target':'self_card','value':{'attribute':'Custom_1','target':'self_card','multiplier':1,'shouldRound':True}}
assert m['fieryOverlay']['ability']=={'sourceAbilityId':'e1','priority':'Medium','trigger':'TTriggerOnCardFired','action':'TActionPlayerBurnApply','target':'opponent_player','referenceValue':None}
assert m['fieryOverlay']['aura']['value']=={'attribute':'ShieldApplyAmount','target':'self_card','multiplier':0.1,'shouldRound':True}
assert json.loads((c.CSV_DIR/'source-effect-mapping.json').read_text())==m
assert json.loads((c.CSV_DIR/'provenance.json').read_text())==p
for field in ['initialAmmo','ammoSpendRelativeToShieldSnapshot','nullReferenceValueRuntimeBinding','baseAndFierySameMediumAbilityOrder','fieryBurnRoundingAndApplicationTiming']:
 assert field in m['unknownSourceFields']
bad=copy.deepcopy(rows);bad[0]['value_expression']='{}'
try:c.build_artifacts(bad)
except ValueError:pass
else:raise AssertionError('mutated mapping passed')
with tempfile.TemporaryDirectory() as raw:
 out=pathlib.Path(raw);c.export_csv(c.WORKBOOK,out);c.write_artifacts(out)
 artifact=out/'source-effect-mapping.json';forged=json.loads(artifact.read_text())
 forged['originalRulesAccepted']=True;artifact.write_text(json.dumps(forged))
 try:c.validate_artifacts(out)
 except ValueError as error:assert str(error)=='NESTING_DOLL_ARTIFACT_STALE:source-effect-mapping.json'
 else:raise AssertionError('tampered checked artifact passed')
package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()=='8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366'
assert all(i['itemId']!='item_bazaar_nesting_doll' for i in package['items'])
print('PASS Nesting Doll mapping-only candidate')
`], {cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
       env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
