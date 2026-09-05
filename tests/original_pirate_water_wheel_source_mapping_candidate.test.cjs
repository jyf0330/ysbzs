const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('Water Wheel mapping locks inherited attributes, both abilities, targets and priorities',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_water_wheel_source_mapping_candidate as c
tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['sourceObjectUuid']==c.SOURCE_UUID and mapping['sourceInternalName']=='Water Wheel'
assert [(p['quality'],p['sourceAttributes']['cooldownMaxMilliseconds'],p['sourceAttributes']['hasteAmountMilliseconds'],p['sourceAttributes']['chargeAmountMilliseconds']) for p in mapping['qualityProfiles']]==[('silver',8000,2000,2000),('gold',7000,2000,2000),('diamond',6000,2000,2000)]
for p in mapping['qualityProfiles']:
 assert p['sourceAttributes']['multicast']==1 and p['sourceAttributes']['chargeTargets']==1
 assert p['effects'][0]=={'sourceAbilityId':'0','sourceTriggerType':'TTriggerOnCardFired','mappedTriggerEvent':'item_ready','triggerPriority':'High','effectOrder':0,'target':{'type':'self_hand_section','excludeSelf':True,'condition':{'attribute':'CooldownMax','operator':'GreaterThan','value':0}},'operation':{'type':'apply_status','status':'haste','ticks':40}}
 assert p['effects'][1]=={'sourceAbilityId':'1','sourceTriggerType':'TTriggerOnItemUsed','mappedTriggerEvent':'another_friendly_item_used','triggerPriority':'Medium','effectOrder':0,'subject':{'type':'self_positional','targetMode':'Neighbor','includeOrigin':False},'target':{'type':'self'},'operation':{'type':'charge','ticks':40}}
assert mapping['unknownSourceFields']==['initialCooldownProgress','hasteReapplicationPolicy','same_priority_tie_break']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'
for field,value in [('trigger_priority','Lowest'),('ticks','41'),('target_type','selected_enemy'),('condition_source_relation','any')]:
 bad=copy.deepcopy(tables);bad[c.CSV_NAME][1 if field=='condition_source_relation' else 0][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((field,value))
package,_=formal.build_exports(pathlib.Path('data/csv'))
assert package['runtimeBundle']['bundleHash']==c.BASE_HASH
print('PASS Water Wheel source mapping candidate')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
