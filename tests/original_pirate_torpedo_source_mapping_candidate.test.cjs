const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test('Torpedo candidate locks OR/AND listeners and Radiant without execution claims', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,os,pathlib,shutil,sys,tempfile
sys.path.insert(0,'tools')
import add_original_pirate_torpedo_source_mapping_candidate as add
import export_original_pirate_content as formal
import export_original_pirate_torpedo_source_mapping_candidate as c
EXPECTED_DB='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
EXPECTED_UUID='9778f31c-87b0-4d8d-8289-50e90dd7edc5'
EXPECTED_FORMAL_SHA='8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366'
db=pathlib.Path(os.environ.get('THE_BAZAAR_GAMEDATA_DB', pathlib.Path.home()/'Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db')).expanduser()
assert c.SOURCE_DB_SHA256==EXPECTED_DB and c.SOURCE_UUID==EXPECTED_UUID
add.verify_source(db);c.export_csv(check=True);c.validate_artifacts()
rows=c.workbook_rows();m,p=c.build_artifacts(rows)
assert json.loads((c.CSV_DIR/'source-effect-mapping.json').read_text())==m
assert json.loads((c.CSV_DIR/'provenance.json').read_text())==p
assert m['originalRulesAccepted'] is False and p['originalRulesAccepted'] is False
assert [q['quality'] for q in m['qualityProfiles']]==['silver','gold','diamond']
assert [q['sourceAttributes']['damageAmountBase'] for q in m['qualityProfiles']]==[100,100,100]
assert [q['sourceAttributes']['custom0SourceValue'] for q in m['qualityProfiles']]==[40,80,160]
assert [a['sourceAbilityId'] for a in m['sourceAbilities']]==['0','1','2'] and m['sourceAuras']==[]
a1=m['sourceAbilities'][1];a2=m['sourceAbilities'][2]
assert a1['priority']==a2['priority']=='Medium'
assert a1['trigger']['Subject']['ExcludeSelf'] is True
assert a1['trigger']['Subject']['Conditions']['$type']=='TCardConditionalOr'
assert [x['$type'] for x in a1['trigger']['Subject']['Conditions']['Conditions']]==['TCardConditionalTag','TCardConditionalAttribute']
assert a2['trigger']['Subject']['Conditions']['$type']=='TCardConditionalAnd'
assert [x['$type'] for x in a2['trigger']['Subject']['Conditions']['Conditions']]==['TCardConditionalSize','TCardConditionalOr']
assert a2['trigger']['Subject']['Conditions']['Conditions'][0]=={'$type':'TCardConditionalSize','Sizes':['Large'],'IsNot':False}
assert a1['action']==a2['action']
assert m['radiantOverlay']['attributes']=={'DestroyImmunity':1,'PercentFreezeReduction':100,'PercentSlowReduction':100}
assert m['candidateBuildUsage']=={'buildRank':3,'quality':'diamond','enchantmentId':'Radiant','claimScope':'task_locked_membership_only_not_popularity_or_rules_proof'}
assert m['ability2SourceDescriptionConflict']['resolution']=='STRUCTURED_SOURCE_RECORDED_EXECUTION_FAIL_CLOSED'
for field in ['ability1AndAbility2SameMediumStackingOrder','nestedItemUsedReentrancy','dynamicCustom0EvaluationTime','ability2DescriptionActionConflictRuntimeBehavior']:
 assert field in m['unknownSourceFields']
for index in [0,3,4,7,8]:
 bad=copy.deepcopy(rows);bad[index]['payload_json']='{}'
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError(index)
package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()==EXPECTED_FORMAL_SHA
assert all(i['itemId']!='item_bazaar_torpedo' for i in package['items'])
assert all(e.get('mapping',{}).get('sourceObjectUuid')!=EXPECTED_UUID for e in package['runtimeBundle']['sourceEffectMappings']['entries'])
with tempfile.TemporaryDirectory() as raw:
 out=pathlib.Path(raw)
 for name in ('source-effect-mapping.json','provenance.json'):
  shutil.copyfile(c.CSV_DIR/name,out/name)
 original=(out/'source-effect-mapping.json').read_text();original_provenance=(out/'provenance.json').read_text()
 attacks=[
  ('source-effect-mapping.json',original.replace('"originalRulesAccepted": false,','"originalRulesAccepted": false, "\\u006friginalRulesAccepted": true,',1)),
  ('source-effect-mapping.json',original.replace('"resolution": "STRUCTURED_SOURCE_RECORDED_EXECUTION_FAIL_CLOSED"','"resolutio\\u006e": "FORGED", "resolution": "STRUCTURED_SOURCE_RECORDED_EXECUTION_FAIL_CLOSED"',1)),
  ('source-effect-mapping.json',original.replace('"structuredActionObserved": "add_Custom_0_to_self_DamageAmount_until_end_of_combat"','"structuredActio\\u006eObserved": "FORGED", "structuredActionObserved": "add_Custom_0_to_self_DamageAmount_until_end_of_combat"',1)),
  ('provenance.json',original_provenance.replace('"originalRulesAccepted": false,','"originalRulesAccepted": false, "\\u006friginalRulesAccepted": true,',1)),
 ]
 for filename,forged in attacks:
  assert forged!=(original if filename=='source-effect-mapping.json' else original_provenance)
  (out/'source-effect-mapping.json').write_text(original);(out/'provenance.json').write_text(original_provenance)
  (out/filename).write_text(forged)
  try:c.validate_artifacts(out)
  except ValueError as error:assert str(error)=='TORPEDO_MAPPING_ARTIFACT_UNREADABLE:'+filename
  else:raise AssertionError('duplicate-key artifact accepted')
 type_attacks=[
  original.replace('"originalRulesAccepted": false','"originalRulesAccepted": 0',1),
  original.replace('"schemaVersion": 1','"schemaVersion": true',1),
  original.replace('"sourceAbilityDirectoryIndex": 2','"sourceAbilityDirectoryIndex": 2.0',1),
 ]
 for forged in type_attacks:
  assert forged!=original
  (out/'source-effect-mapping.json').write_text(forged);(out/'provenance.json').write_text(original_provenance)
  try:c.validate_artifacts(out)
  except ValueError as error:assert str(error)=='TORPEDO_MAPPING_ARTIFACT_STALE:source-effect-mapping.json'
  else:raise AssertionError('type-confused artifact accepted')
print('PASS Torpedo source mapping candidate')
`], {cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
