const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('source Ability priority is closed, separate from runtime priority, and source-effect scoped',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,json,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
base=pathlib.Path('data/csv')
source=json.loads(pathlib.Path('tests/support/original_pirate_source_ability_priority_fixture.json').read_text())
assert source['sourceDbSha256']=='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
assert {x['triggerPriority'] for x in source['priorityExamples']}==e.SOURCE_TRIGGER_PRIORITIES
assert source['rifle']['sourceObjectUuid']=='1dcc7604-4f84-46e9-bbd1-2456317ec0ed'
assert [(x['sourceAbilityId'],x['triggerPriority'],x['effectOrder']) for x in source['rifle']['abilities']]==[('0','Medium',0),('1','Low',0)]
tables=e._read_domains(base)
legacy,_=e.build_exports(base)
formal_source_effects=[effect for item in legacy['items'] for profile in item['qualityProfiles'].values() for effect in profile['effects'] if e.SOURCE_ABILITY_EFFECT_FIELDS.intersection(effect)]
assert len(formal_source_effects)==16
assert all(effect['effectId'].startswith(('effect_bazaar_diving_helmet_','effect_bazaar_water_wheel_','effect_bazaar_pearl_')) and e.SOURCE_ABILITY_EFFECT_FIELDS.issubset(effect) for effect in formal_source_effects)
assert all(not e.SOURCE_ABILITY_EFFECT_FIELDS.intersection(effect) for item in legacy['items'] if item['itemId'] not in {'item_bazaar_diving_helmet','item_bazaar_water_wheel','item_bazaar_pearl'} for profile in item['qualityProfiles'].values() for effect in profile['effects'])
fixture=copy.deepcopy(tables);rows=fixture['47_bz_item_effects.csv']
pair=[r for r in rows if r['item_id']=='item_patchwork_ram' and r['quality']=='bronze']
assert len(pair)>=2
selected=[pair[0]];seen_items={pair[0]['item_id']}
for row in rows:
 if row['quality']=='bronze' and row['item_id'] not in seen_items:
  selected.append(row);seen_items.add(row['item_id'])
 if len(selected)==6:break
assert len(selected)==6
for row,identity in zip(selected,source['priorityExamples']):
 row.update(source_ability_id=identity['sourceAbilityId'],trigger_priority=identity['triggerPriority'],effect_order='0')
package=e.ContentAssembler(fixture,base).build();e.validate_package(package)
for row,identity in zip(selected,source['priorityExamples']):
 profile=next(i for i in package['items'] if i['itemId']==row['item_id'])['qualityProfiles']['bronze']
 mapped=next(x for x in profile['effects'] if x['effectId']==row['effect_id'])
 assert (mapped['sourceAbilityId'],mapped['triggerPriority'],mapped['effectOrder'])==(identity['sourceAbilityId'],identity['triggerPriority'],0)
 assert mapped['priority']==int(row['priority'])
def reject(field,value,row_index=0):
 bad=copy.deepcopy(fixture);bad['47_bz_item_effects.csv'][rows.index(selected[row_index])][field]=value
 try:e.ContentAssembler(bad,base).build()
 except e.ExportError:return
 raise AssertionError((field,value))
for value in ['immediate','Normal','0',' Immediate']:
 reject('trigger_priority',value)
for value in ['-1','1','1.5','x']:
 reject('effect_order',value)
for field in ['source_ability_id','trigger_priority','effect_order']:
 reject(field,'')
# The locked source has no top-level multi-Action Ability; do not fabricate a split mapping.
bad=copy.deepcopy(fixture);target=bad['47_bz_item_effects.csv'][rows.index(pair[1])]
target.update(source_ability_id=selected[0]['source_ability_id'],trigger_priority=selected[0]['trigger_priority'],effect_order='0')
try:e.ContentAssembler(bad,base).build()
except e.ExportError:pass
else:raise AssertionError('multi-effect source Ability accepted')
# Reusing an Ability key across quality profiles cannot alter its trigger contract.
bad=copy.deepcopy(tables);bronze=bad['47_bz_item_effects.csv'][rows.index(pair[0])]
silver=next(x for x in bad['47_bz_item_effects.csv'] if x['item_id']==bronze['item_id'] and x['quality']=='silver')
bronze.update(source_ability_id='0',trigger_priority='Medium',effect_order='0')
silver.update(source_ability_id='0',trigger_priority='Low',effect_order='0')
try:e.ContentAssembler(bad,base).build()
except e.ExportError:pass
else:raise AssertionError('mixed source Ability contract accepted')
mapped=next(x for i in package['items'] for p in i['qualityProfiles'].values() for x in p['effects'] if 'sourceAbilityId' in x)
partial=copy.deepcopy(mapped);partial.pop('effectOrder')
try:e._validate_executable_item_effect(partial,'fixture')
except e.ExportError:pass
else:raise AssertionError('partial executable source metadata accepted')
print('PASS source Ability priority contract')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
