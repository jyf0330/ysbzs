const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('Rifle source mapping exports only locked Ability priority and quality values',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_rifle_source_mapping_candidate as c
tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['sourceObjectUuid']==c.SOURCE_UUID
assert [p['quality'] for p in mapping['qualityProfiles']]==['bronze','silver','gold','diamond']
assert [[(x['sourceAbilityId'],x['triggerPriority'],x['effectOrder'],x['operation']['type'],x['operation']['amount']) for x in p['effects']] for p in mapping['qualityProfiles']]==[
 [('0','Medium',0,'deal_damage',20),('1','Low',0,'gain_damage_for_fight',10)],
 [('0','Medium',0,'deal_damage',40),('1','Low',0,'gain_damage_for_fight',20)],
 [('0','Medium',0,'deal_damage',80),('1','Low',0,'gain_damage_for_fight',40)],
 [('0','Medium',0,'deal_damage',160),('1','Low',0,'gain_damage_for_fight',80)],
]
text=repr(mapping['qualityProfiles']).lower()
assert 'ammoinitial' not in text and 'critchance' not in text
assert mapping['unknownSourceFields']==['initialAmmo','baseCritChance']
assert provenance['acceptance']==mapping['acceptance']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'
def reject(field,value,index=0):
 bad=copy.deepcopy(tables);bad[c.CSV_NAME][index][field]=value
 try:c.build_artifacts(bad)
 except ValueError:return
 raise AssertionError((field,value))
reject('trigger_priority','High');reject('effect_order','1');reject('amount','21')
bad=copy.deepcopy(tables);bad[c.CSV_NAME].append(copy.deepcopy(bad[c.CSV_NAME][0]))
try:c.build_artifacts(bad)
except ValueError:pass
else:raise AssertionError('duplicate source effect accepted')
package,_=formal.build_exports(pathlib.Path('data/csv'))
assert package['runtimeBundle']['bundleHash']==c.BASE_HASH
print('PASS Rifle source mapping candidate')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
