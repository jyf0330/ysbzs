const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('max ammo Aura has an exact capacity target and preserves legacy Auras', () => {
  const script = String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
directory=pathlib.Path('data/csv')
tables=e._read_domains(directory)
aid='aura_mistkelp_remedy_kit_bronze_weapon_damage'
def row(t):return next(r for r in t['66_bz_item_auras.csv'] if r['aura_id']==aid)
def aura(p):return next(a for i in p['items'] for q in i['qualityProfiles'].values() for a in q['auras'] if a['auraId']==aid)
original=e.ContentAssembler(copy.deepcopy(tables),directory).build()
e.validate_package(original)
# Capability-only fixture: existing original item, not a Cannonball mapping.
fixture=copy.deepcopy(tables)
row(fixture).update(target_type='friendly_ammo_items',target_tags='',target_exclude_self='false',operation_type='grant_max_ammo',amount='2',lifesteal_bps='')
package=e.ContentAssembler(fixture,directory).build()
e.validate_package(package)
assert aura(package)['target']=={'type':'friendly_ammo_items','params':{}}
assert aura(package)['operation']=={'type':'grant_max_ammo','params':{'amount':2}}
for before,after in zip(original['items'],package['items']):
    for quality in before['qualityProfiles']:
        assert before['qualityProfiles'][quality]['ammo']==after['qualityProfiles'][quality]['ammo']
        assert [a for a in before['qualityProfiles'][quality]['auras'] if a['auraId']!=aid]==[a for a in after['qualityProfiles'][quality]['auras'] if a['auraId']!=aid]
assert {'grant_damage','grant_lifesteal_bps'} <= {a['operation']['type'] for i in original['items'] for q in i['qualityProfiles'].values() for a in q['auras']}
def reject_csv(**changes):
    bad=copy.deepcopy(fixture);row(bad).update(changes)
    try:e.ContentAssembler(bad,directory).build()
    except e.ExportError:return
    raise AssertionError(('invalid CSV accepted',changes))
def reject_json(change):
    bad=copy.deepcopy(package);change(aura(bad))
    # Hash canonicalizer requires structural dictionaries. Malformed params must
    # fail at schema validation before hash validation; all structured vectors
    # are re-signed so a stale hash cannot mask the semantic rejection.
    if isinstance(aura(bad)['target']['params'],dict):
        bad['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(bad['runtimeBundle'],bad['items'])
    try:e.validate_package(bad)
    except e.ExportError as error:
        assert 'HASH' not in str(error),str(error)
        return
    raise AssertionError('invalid re-signed package accepted')
for target in ('friendly_items_with_any_tag','left_adjacent_item','self_item','selected_enemy'):
    reject_csv(target_type=target)
    reject_json(lambda a:a['target'].update(type=target))
for tags in ('ammo','weapon','ammo|weapon'):reject_csv(target_tags=tags)
for value in ('true','', '0'):reject_csv(target_exclude_self=value)
for params in ({'tags':['ammo']},{'excludeSelf':False},{'count':1},[],None):
    reject_json(lambda a:a['target'].update(params=params))
for amount in ('0','-1','1.5','true',''):
    reject_csv(amount=amount)
for amount in (0,-1,True,1.5,'2',None):
    reject_json(lambda a:a['operation']['params'].update(amount=amount))
reject_csv(lifesteal_bps='100')
reject_json(lambda a:a['operation']['params'].update(lifestealBps=100))
reject_json(lambda a:a['operation']['params'].update(initialAmmo=2))
reject_json(lambda a:a['operation'].update(params={}))
for operation in ('grant_damage','grant_lifesteal_bps','reload'):
    reject_csv(operation_type=operation)
    reject_json(lambda a:a['operation'].update(type=operation))
assert e.ContentAssembler(tables,directory).build()==original
print('PASS exact max-ammo capability; production Ammo unchanged; not source acceptance')
`;
  const result = spawnSync('python3', ['-c', script], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
