const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('Powder Horn source mapping locks Lowest right-card reload without inferring Rifle state',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_powder_horn_source_mapping_candidate as c
tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['sourceObjectUuid']==c.SOURCE_UUID
assert [p['quality'] for p in mapping['qualityProfiles']]==['bronze','silver','gold','diamond']
assert [(p['sourceAttributes']['reloadAmount'],p['effects'][0]['triggerPriority'],p['effects'][0]['effectOrder'],p['effects'][0]['operation']['amount']) for p in mapping['qualityProfiles']]==[(1,'Lowest',0,1),(2,'Lowest',0,2),(3,'Lowest',0,3),(4,'Lowest',0,4)]
for p in mapping['qualityProfiles']:
 e=p['effects'][0]
 assert e['sourceAbilityId']=='0' and e['sourceTriggerType']=='TTriggerOnCardFired'
 assert e['target']=={'type':'adjacent_right_ammo_item','origin':'self','targetMode':'right_card','includeOrigin':False,'condition':'AmmoMax > 0'}
assert 'initialAmmo' not in repr(mapping)
assert mapping['unknownSourceFields']==['baseCritChance','emptyAmmoCooldownPolicy','reloadWakePolicy']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'
def reject(field,value):
 bad=copy.deepcopy(tables);bad[c.CSV_NAME][0][field]=value
 try:c.build_artifacts(bad)
 except ValueError:return
 raise AssertionError((field,value))
reject('trigger_priority','Low');reject('target_type','selected_friendly');reject('amount','2')
package,_=formal.build_exports(pathlib.Path('data/csv'))
assert package['runtimeBundle']['bundleHash']==c.BASE_HASH
print('PASS Powder Horn source mapping candidate')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
