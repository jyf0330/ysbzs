const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('Revolver mapping locks source identity priority and inherited profiles',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_revolver_source_mapping_candidate as c
tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['sourceObjectUuid']==c.SOURCE_UUID and mapping['sourceInternalName']=='Revolver'
assert [(p['quality'],p['sourceAttributes']['damageAmount'],p['sourceAttributes']['cooldownMaxMilliseconds'],p['sourceAttributes']['ammoMaximum'],p['sourceAttributes']['multicast']) for p in mapping['qualityProfiles']]==[('bronze',8,3000,6,1),('silver',16,3000,6,1),('gold',32,3000,6,1),('diamond',64,3000,6,1)]
assert [[(e['sourceAbilityId'],e['sourceTriggerType'],e['triggerPriority'],e['effectOrder'],e['operation']) for e in p['effects']] for p in mapping['qualityProfiles']]==[[('0','TTriggerOnCardFired','Medium',0,{'type':'deal_damage','amount':d})] for d in (8,16,32,64)]
assert mapping['unknownSourceFields']==['initialAmmo','baseCritChance','emptyAmmoCooldownPolicy']
assert 'card_fired_to_item_used_phase_order' in mapping['excludedScopes'] and 'same_priority_tie_break' in mapping['excludedScopes']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'
for field,value in [('trigger_priority','High'),('effect_order','1'),('amount','33')]:
 bad=copy.deepcopy(tables);bad[c.CSV_NAME][2][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((field,value))
package,_=formal.build_exports(pathlib.Path('data/csv'))
assert package['runtimeBundle']['bundleHash']==c.BASE_HASH
print('PASS Revolver source mapping candidate')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
