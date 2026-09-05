const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Diving Helmet is source-locked fail-closed natural-Aquatic reference content', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,json,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e

package,_=e.build_exports(pathlib.Path('data/csv'))
e.validate_package(package)
item=next(value for value in package['items'] if value['itemId']=='item_bazaar_diving_helmet')
assert item['availability']=='reference_battle_only'
assert item['baseQuality']=='gold' and item['slotWidth']==2
assert item['tags']==['apparel','aquatic','tool']
assert list(item['qualityProfiles'])==['diamond','gold']
assert all('buyPrice' not in profile and 'sellPrice' not in profile for profile in item['qualityProfiles'].values())
for quality,shield in {'gold':50,'diamond':100}.items():
 profile=item['qualityProfiles'][quality]
 assert profile['activationMode']=='passive' and profile['baseCooldownTicks']==0
 assert profile['effects']==[{
  'effectId':f'effect_bazaar_diving_helmet_{quality}_0','priority':20,
  'sourceAbilityId':'0','triggerPriority':'Medium','effectOrder':0,
  'trigger':{'event':'another_friendly_item_used','conditions':[{'type':'source_item_has_any_tag','params':{'tags':['aquatic']}}]},
  'target':{'type':'owner_hero','params':{}},
  'operation':{'type':'gain_shield','params':{'amount':shield}},
 }]
 assert profile['auras']==[]
assert item['sourceBinding']['objectId']=='fb6e6b16-d6d0-4493-ac3f-46c26afe6c51'
assert item['sourceBinding']['declaredScopes']==[
 {'quality':quality,'enchantmentId':'none','scopeId':'battle_profile'}
 for quality in ('gold','diamond')
]
entry=next(value for value in package['runtimeBundle']['sourceEffectMappings']['entries'] if value['mappingId']=='diving_helmet')
candidate=json.loads(pathlib.Path('data/candidates/original_pirate/diving_helmet_source_mapping/source-effect-mapping.json').read_text(encoding='utf-8'))
assert entry['mapping']==candidate
assert entry['mappingSha256']==e.DIVING_HELMET_MAPPING_SHA256
assert entry['provenanceSha256']==e.DIVING_HELMET_PROVENANCE_SHA256
assert entry['sourceDataCommit']==e.DIVING_HELMET_SOURCE_DATA_COMMIT
assert entry['executionStatus']=='reference_battle_only_dynamic_tag_aura_and_same_timestamp_fail_closed'
assert entry['mapping']['originalRulesAccepted'] is False

tables=e._read_domains(pathlib.Path('data/csv'))
for field,value in [('shield_apply_amount','51'),('trigger_priority','Low'),('target_condition_attribute','Tool')]:
 bad=copy.deepcopy(tables)
 row=next(row for row in bad['73_bz_source_effect_mappings.csv'] if row['mapping_id']=='diving_helmet')
 row[field]=value
 try:e.ContentAssembler(bad,pathlib.Path('data/csv')).build()
 except e.ExportError as exc:assert 'SOURCE_EFFECT_MAPPING' in str(exc) or 'GLOBAL_FIELD_INCONSISTENT' in str(exc)
 else:raise AssertionError((field,value))
print('PASS Diving Helmet formal reference contract')
`], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
