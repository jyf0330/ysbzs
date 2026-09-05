const test=require('node:test');const assert=require('node:assert/strict');const{spawnSync}=require('node:child_process');const path=require('node:path');
test('Flagship candidate locks five Auras and Shielded while execution stays closed',()=>{
 const result=spawnSync('python3',['-c',String.raw`
import copy,hashlib,json,os,pathlib,shutil,sys,tempfile
sys.path.insert(0,'tools')
import add_original_pirate_flagship_source_mapping_candidate as add
import export_original_pirate_flagship_source_mapping_candidate as c
import export_original_pirate_content as formal
DB='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9';UUID='865a673a-beae-4f5c-b04a-dd3fd026bc6d';FORMAL='8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366'
db=pathlib.Path(os.environ.get('THE_BAZAAR_GAMEDATA_DB',pathlib.Path.home()/'Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db')).expanduser();assert c.SOURCE_DB_SHA256==DB and c.SOURCE_UUID==UUID;add.verify_source(db)
c.export_csv(check=True);c.validate_artifacts();rows=c.workbook_rows();m,p=c.build_artifacts(rows)
assert c.strict_json_loads((c.CSV_DIR/'source-effect-mapping.json').read_text())==m
assert c.strict_json_loads((c.CSV_DIR/'provenance.json').read_text())==p
assert m['originalRulesAccepted'] is False and p['originalRulesAccepted'] is False
assert [q['sourceTier']['resolvedAttributes']['DamageAmount'] for q in m['qualityProfiles']]==[35,70,140]
assert [a['sourceAuraId'] for a in m['sourceAuras']]==['1','2','3','4','5']
assert [a['activeIn'] for a in m['sourceAuras']]==['HandOnly','HandAndStash','HandAndStash','HandAndStash','HandAndStash']
assert all(a['prerequisites'][0]['subject']['excludeSelf'] is False for a in m['sourceAuras'])
assert [a['prerequisites'][0]['subject']['condition'].get('tags',[None])[0] for a in m['sourceAuras']]==['Property','Tool','Friend',None,'Relic']
assert m['sourceAuras'][3]['prerequisites'][0]['subject']['condition']=={'type':'TCardConditionalAttribute','attribute':'AmmoMax','comparison':'GreaterThan','value':0.0}
assert m['shieldedOverlay']['ability']['priority']=='Medium' and m['shieldedOverlay']['ability']['action']['referenceValue'] is None
assert m['shieldedOverlay']['aura']['action']['value']=={'type':'TReferenceValueCardAttribute','attribute':'DamageAmount','target':'SelfCard','defaultValue':0.0,'modifier':{'mode':'Multiply','value':1.0,'shouldRound':True}}
assert m['candidateBuildUsage']=={'buildRank':3,'quality':'diamond','enchantmentId':'Shielded','claimScope':'task_locked_membership_only_not_popularity_or_rules_proof'}
for field in ['dynamicAuraActivationAndRemovalTiming','multipleAuraStackingAndRefreshPolicy','multicastEventBundleConstructionAndDispatch','baseDamageAndShieldedSameMediumOrder','nullReferenceValueRuntimeBinding']:assert field in m['unknownSourceFields']
for index in [0,3,4,7,9,10]:
 bad=copy.deepcopy(rows);bad[index]['payload_json']='{}'
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError(index)
with tempfile.TemporaryDirectory() as raw:
 out=pathlib.Path(raw)
 for name in ('source-effect-mapping.json','provenance.json'):shutil.copyfile(c.CSV_DIR/name,out/name)
 original=(out/'source-effect-mapping.json').read_text();provenance=(out/'provenance.json').read_text()
 attacks=[
  ('source-effect-mapping.json',original.replace('"originalRulesAccepted": false,','"originalRulesAccepted": false, "\\u006friginalRulesAccepted": true,',1)),
  ('source-effect-mapping.json',original.replace('"excludeSelf": false,','"excludeSelf": false, "exclude\\u0053elf": true,',1)),
  ('provenance.json',provenance.replace('"originalRulesAccepted": false,','"originalRulesAccepted": false, "\\u006friginalRulesAccepted": true,',1)),
 ]
 for filename,forged in attacks:
  (out/'source-effect-mapping.json').write_text(original);(out/'provenance.json').write_text(provenance);(out/filename).write_text(forged)
  try:c.validate_artifacts(out)
  except ValueError as e:assert str(e)=='FLAGSHIP_ARTIFACT_INVALID:'+filename
  else:raise AssertionError('duplicate-key artifact accepted')
 (out/'source-effect-mapping.json').write_text(original.replace('"originalRulesAccepted": false','"originalRulesAccepted": 0',1))
 try:c.validate_artifacts(out)
 except ValueError as e:assert str(e)=='FLAGSHIP_ARTIFACT_STALE:source-effect-mapping.json'
 else:raise AssertionError('type-confused artifact accepted')
package,_=formal.build_exports(pathlib.Path('data/csv'));payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode();assert hashlib.sha256(payload).hexdigest()==FORMAL
assert all(i['itemId']!='item_bazaar_flagship' for i in package['items']);assert all(e.get('mapping',{}).get('sourceObjectUuid')!=UUID for e in package['runtimeBundle']['sourceEffectMappings']['entries'])
print('PASS Flagship source mapping candidate')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});assert.equal(result.status,0,result.stderr||result.stdout);
});
