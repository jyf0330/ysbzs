const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Water Wheel is formal reference_battle_only, locked to the candidate mapping, and rejected by acquisition paths', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
import export_original_pirate_water_wheel_source_mapping_candidate as candidate

base=pathlib.Path('data/csv')
package,_=e.build_exports(base)
e.validate_package(package)
item=next(value for value in package['items'] if value['itemId']=='item_bazaar_water_wheel')
assert item['availability']=='reference_battle_only'
assert item['baseQuality']=='silver' and list(item['qualityProfiles'])==['diamond','gold','silver']
assert all('buyPrice' not in profile and 'sellPrice' not in profile for profile in item['qualityProfiles'].values())
assert [item['qualityProfiles'][quality]['baseCooldownTicks'] for quality in ('silver','gold','diamond')]==[160,140,120]
assert item['sourceBinding']['snapshotId']=='snapshot_vanessa_local_cache_25079259_db8914ab'
assert item['sourceBinding']['objectId']=='d8106a24-647f-40c6-8587-22f977931d76'
assert item['sourceBinding']['declaredScopes']==[
 {'quality':quality,'enchantmentId':'none','scopeId':'battle_profile'}
 for quality in ('silver','gold','diamond')
]
catalog=package['runtimeBundle']['sourceEffectMappings']
entry=catalog['entries'][0]
candidate_mapping,_=candidate.build_artifacts(candidate.read_candidate())
assert entry['mapping']==candidate_mapping
assert entry['sourceDataCommit']=='21d57c2415690992631c6c4e1607e10ddcf06a24'
assert entry['mappingSha256']=='d1b8812853d4eb182d781fef683bf8c89a384848196123f2e92560b25727c8de'
assert entry['executionStatus']=='reference_battle_only_haste_reapplication_fail_closed'
skills={value['itemSkillId']:value for value in package['runtimeBundle']['executableCatalogs']['itemSkills']}
assert {'skill_bazaar_water_wheel_haste','skill_bazaar_water_wheel_charge'} <= set(skills)
assert all(value['availability']=='run_acquirable' for value in package['items'] if value['itemId']!=item['itemId'])
assert all('buyPrice' in profile and 'sellPrice' in profile for value in package['items'] if value['itemId']!=item['itemId'] for profile in value['qualityProfiles'].values())

def rejected(mutator, expected):
 forged=copy.deepcopy(package)
 mutator(forged)
 forged['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(forged['runtimeBundle'],forged['items'])
 try:e.validate_package(forged)
 except e.ExportError as exc:
  assert expected in str(exc),(expected,str(exc))
  return
 raise AssertionError(expected)

rejected(lambda value: value['runtimeBundle']['generation']['shop']['templates'][0].update(
 itemId=item['itemId'],quality='silver'), 'REFERENCE_BATTLE_ITEM_SHOP_FORBIDDEN')
rejected(lambda value: value['runtimeBundle']['executableCatalogs']['upgrades'][0].update(
 itemId=item['itemId'],fromQuality='silver',toQuality='gold'), 'REFERENCE_BATTLE_ITEM_UPGRADE_FORBIDDEN')
rejected(lambda value: value['runtimeBundle']['executableCatalogs']['enchantments'][0]['profiles'][0].update(
 itemId=item['itemId'],quality='silver'), 'REFERENCE_BATTLE_ITEM_ENCHANTMENT_FORBIDDEN')
def forge_new_run(value):
 instance=next(entry for entry in value['runtimeBundle']['newRunTemplate']['itemInstances'] if entry['instanceId']=='starter_patchwork_ram')
 instance.update(itemId=item['itemId'],quality='silver')
rejected(forge_new_run,'REFERENCE_BATTLE_ITEM_NEW_RUN_FORBIDDEN')
def forge_reward(value):
 reward=next(entry for entry in value['runtimeBundle']['executableCatalogs']['rewards'] if entry['effects'][0]['type']=='grant_item')
 reward['effects'][0].update(itemId=item['itemId'],quality='silver')
rejected(forge_reward,'REFERENCE_BATTLE_ITEM_REWARD_FORBIDDEN')
def forge_progression(value):
 option=next(entry for entry in value['runtimeBundle']['progressionRules']['options'] if entry['effect']['type']=='grant_item')
 option['effect'].update(itemId=item['itemId'],quality='silver')
rejected(forge_progression,'REFERENCE_BATTLE_ITEM_PROGRESSION_FORBIDDEN')

tables=e._read_domains(base)
bad=copy.deepcopy(tables)
bad['73_bz_source_effect_mappings.csv'][0]['ticks']='41'
try:e.ContentAssembler(bad,base).build()
except e.ExportError as exc:assert 'SOURCE_EFFECT_MAPPING' in str(exc)
else:raise AssertionError('tampered mapping accepted')
print('PASS Water Wheel formal reference-only contract')
`], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
