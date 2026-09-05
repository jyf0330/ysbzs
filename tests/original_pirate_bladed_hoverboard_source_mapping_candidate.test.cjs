const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test('Bladed Hoverboard candidate locks Gold Toxic source without execution acceptance', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,pathlib,sys,tempfile
sys.path.insert(0,'tools')
import add_original_pirate_bladed_hoverboard_source_mapping_candidate as add
import export_original_pirate_bladed_hoverboard_source_mapping_candidate as c
import export_original_pirate_content as formal
EXPECTED_FORMAL_SHA='edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd'
db=pathlib.Path('/Users/ywh/Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db')
add.verify_source(db)
rows=c.workbook_rows();c.export_csv(check=True);c.validate_artifacts();m,p=c.build_artifacts(rows)
assert m['sourceObjectUuid']==c.SOURCE_UUID and m['sourceInternalName']=='Bladed Hoverboard'
assert m['originalRulesAccepted'] is False and p['originalRulesAccepted'] is False
assert m['requestedRankProfile']=={'rank':2,'quality':'gold','enchantment':'Toxic','status':'requested_candidate_only_not_source_popularity_evidence'}
assert [x['quality'] for x in m['qualityProfiles']]==['silver','gold','diamond']
assert [x['damageAmount'] for x in m['qualityProfiles']]==[20,40,60]
assert [x['flyingTargets'] for x in m['qualityProfiles']]==[1,1,1]
assert m['sourceAbilityDirectoryOrderObserved']==['0','1']
assert m['sourceBaseAuraDirectoryObserved']==[]
assert [a['sourceAbilityId'] for a in m['baseAbilities']]==['0','1']
assert all(a['declaredPriority']=='Medium' for a in m['baseAbilities'])
assert m['baseAbilities'][0]['referenceValue'] is None
assert m['toxicOverlay']['ability']['referenceValue'] is None
assert m['toxicOverlay']['ability']['declaredPriority']=='Medium'
assert m['toxicOverlay']['aura']['value']=={'attribute':'DamageAmount','target':'self_card','multiplier':0.1,'shouldRound':True}
assert json.loads((c.CSV_DIR/'source-effect-mapping.json').read_text())==m
assert json.loads((c.CSV_DIR/'provenance.json').read_text())==p
for field in ['nullReferenceValueRuntimeBinding','runtimePriorityTierOrdering','base0Base1ToxicE1SameMediumExecutionOrder','nestedTriggerQueueTiming','rngSeedAndConsumptionForRank2CompleteBuild']:
 assert field in m['unknownSourceFields']
bad=copy.deepcopy(rows);bad[0]['value_expression']='{}'
try:c.build_artifacts(bad)
except ValueError:pass
else:raise AssertionError('mutated mapping passed')
with tempfile.TemporaryDirectory() as raw:
 out=pathlib.Path(raw);c.export_csv(c.WORKBOOK,out);c.write_artifacts(c.WORKBOOK,out)
 artifact=out/'source-effect-mapping.json';forged=json.loads(artifact.read_text())
 forged['originalRulesAccepted']=True;artifact.write_text(json.dumps(forged))
 try:c.validate_artifacts(c.WORKBOOK,out)
 except ValueError as error:assert str(error)=='BLADED_HOVERBOARD_ARTIFACT_STALE:source-effect-mapping.json'
 else:raise AssertionError('tampered checked artifact passed')
 for name,path_parts,value in [
  ('source-effect-mapping.json',['originalRulesAccepted'],0),
  ('source-effect-mapping.json',['schemaVersion'],True),
  ('source-effect-mapping.json',['requestedRankProfile','rank'],2.0),
  ('provenance.json',['originalRulesAccepted'],0),
 ]:
  c.write_artifacts(c.WORKBOOK,out);artifact=out/name;forged=json.loads(artifact.read_text())
  target=forged
  for part in path_parts[:-1]:target=target[part]
  target[path_parts[-1]]=value;artifact.write_text(json.dumps(forged))
  try:c.validate_artifacts(c.WORKBOOK,out)
  except ValueError as error:assert str(error)==f'BLADED_HOVERBOARD_ARTIFACT_STALE:{name}',(path_parts,error)
  else:raise AssertionError(('strict type attack passed',name,path_parts,value))
 c.write_artifacts(c.WORKBOOK,out);artifact=out/'source-effect-mapping.json'
 forged=json.loads(artifact.read_text());forged=dict(reversed(list(forged.items())))
 artifact.write_text(json.dumps(forged))
 try:c.validate_artifacts(c.WORKBOOK,out)
 except ValueError as error:assert str(error)=='BLADED_HOVERBOARD_ARTIFACT_STALE:source-effect-mapping.json'
 else:raise AssertionError('dictionary key order attack passed')
 c.write_artifacts(c.WORKBOOK,out);artifact=out/'source-effect-mapping.json'
 forged=json.loads(artifact.read_text());forged['sourceIdentity']['tags'].reverse()
 artifact.write_text(json.dumps(forged))
 try:c.validate_artifacts(c.WORKBOOK,out)
 except ValueError as error:assert str(error)=='BLADED_HOVERBOARD_ARTIFACT_STALE:source-effect-mapping.json'
 else:raise AssertionError('list order attack passed')
 for label,forge,key in [
  ('escaped_top_level',lambda text:'{'+chr(34)+'originalRules'+chr(92)+'u0041ccepted'+chr(34)+':true,'+text[1:],'originalRulesAccepted'),
  ('nested',lambda text:text.replace(chr(34)+'requestedRankProfile'+chr(34)+': {',chr(34)+'requestedRankProfile'+chr(34)+': {'+chr(34)+'rank'+chr(34)+':999,',1),'rank'),
 ]:
  c.write_artifacts(c.WORKBOOK,out);artifact=out/'source-effect-mapping.json'
  artifact.write_text(forge(artifact.read_text()))
  try:c.validate_artifacts(c.WORKBOOK,out)
  except ValueError as error:assert str(error)==f'BLADED_HOVERBOARD_ARTIFACT_DUPLICATE_KEY:source-effect-mapping.json:{key}',(label,error)
  else:raise AssertionError(label+' duplicate-key artifact passed')
package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()==EXPECTED_FORMAL_SHA
assert all(c.SOURCE_UUID not in json.dumps(i) and 'Bladed Hoverboard' not in json.dumps(i) for i in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=c.SOURCE_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
print('PASS Bladed Hoverboard mapping-only candidate')
`], {cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
       env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
