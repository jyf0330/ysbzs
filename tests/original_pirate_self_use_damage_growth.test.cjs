const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('self-use damage growth accepts only ready/always/self and retains reactive growth', () => {
  const script = String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
directory=pathlib.Path('data/csv')
tables=e._read_domains(directory)
row_id='effect_tidescar_matchlock_bronze_growth'
def row(t):return next(r for r in t['47_bz_item_effects.csv'] if r['effect_id']==row_id)
def effect(p):return next(x for i in p['items'] if i['itemId']=='item_tidescar_matchlock' for x in i['qualityProfiles']['bronze']['effects'] if x['effectId']==row_id)
original=e.ContentAssembler(copy.deepcopy(tables),directory).build()
e.validate_package(original)
# This is an isolated capability fixture, not a Rifle import or source-rule PASS.
ready=copy.deepcopy(tables)
row(ready).update(trigger_event='item_ready',condition_type='always',condition_tags='',condition_source_relation='any',target_type='self_item')
package=e.ContentAssembler(ready,directory).build()
e.validate_package(package)
growth=effect(package)
assert growth['trigger']=={'event':'item_ready','conditions':[{'type':'always','params':{}}]}
assert growth['target']=={'type':'self_item','params':{}}
assert growth['operation']==effect(original)['operation']
assert growth['priority']==effect(original)['priority']
assert package['runtimeBundle']['bundleHash']!=original['runtimeBundle']['bundleHash']
# Other-item response and both existing destinations remain accepted.
for target in ('self_item','trigger_source_item'):
    reactive=copy.deepcopy(tables);row(reactive)['target_type']=target
    e.validate_package(e.ContentAssembler(reactive,directory).build())
def rejected_csv(change):
    invalid=copy.deepcopy(ready);change(row(invalid))
    try:e.ContentAssembler(invalid,directory).build()
    except e.ExportError:return
    raise AssertionError('invalid CSV growth accepted')
def rejected_json(change):
    invalid=copy.deepcopy(growth);change(invalid)
    try:e._validate_executable_item_effect(invalid,'self-use-negative')
    except e.ExportError:return
    raise AssertionError('invalid executable growth accepted')
for target in ('trigger_source_item','selected_enemy','owner_hero','first_enemy_item'):
    rejected_csv(lambda r:r.update(target_type=target))
    rejected_json(lambda x:x['target'].update(type=target))
for event in ('battle_start','another_friendly_item_used'):
    rejected_csv(lambda r:r.update(trigger_event=event))
    rejected_json(lambda x:x['trigger'].update(event=event))
for condition in ('source_item_ammo_depleted','source_item_can_crit'):
    rejected_csv(lambda r:r.update(condition_type=condition))
    rejected_json(lambda x:x['trigger'].update(conditions=[{'type':condition,'params':{}}]))
rejected_csv(lambda r:r.update(condition_type='source_item_has_any_tag',condition_tags='ammo'))
rejected_json(lambda x:x['trigger'].update(conditions=[{'type':'source_item_has_any_tag','params':{'tags':['ammo']}}]))
for amount in (0,-1):
    rejected_csv(lambda r:r.update(amount=str(amount)))
    rejected_json(lambda x:x['operation']['params'].update(amount=amount))
for amount in (True,1.5):rejected_json(lambda x:x['operation']['params'].update(amount=amount))
rejected_json(lambda x:x['operation']['params'].update(ticks=1))
assert e.ContentAssembler(tables,directory).build()==original
print('PASS narrow self-use capability; no production data or source acceptance change')
`;
  const result = spawnSync('python3', ['-c', script], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
