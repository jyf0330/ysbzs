const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Pearl is exact source-locked fail-closed reference battle content', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,json,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e

package,_=e.build_exports(pathlib.Path('data/csv'))
e.validate_package(package)
item=next(value for value in package['items'] if value['itemId']=='item_bazaar_pearl')
assert item['availability']=='reference_battle_only'
assert item['baseQuality']=='bronze' and item['slotWidth']==1 and item['tags']==['aquatic']
assert list(item['qualityProfiles'])==['bronze','diamond','gold','silver']
assert all('buyPrice' not in profile and 'sellPrice' not in profile for profile in item['qualityProfiles'].values())
for quality,shield in {'bronze':10,'silver':20,'gold':40,'diamond':80}.items():
 profile=item['qualityProfiles'][quality]
 assert profile['baseCooldownTicks']==100
 assert profile['effects'][0]['operation']=={'type':'gain_shield','params':{'amount':shield}}
 assert profile['effects'][0]['triggerPriority']=='Low' and profile['effects'][0]['sourceAbilityId']=='0'
 assert profile['effects'][1]['operation']=={'type':'charge','params':{'ticks':20}}
 assert profile['effects'][1]['triggerPriority']=='Low' and profile['effects'][1]['sourceAbilityId']=='1'
 assert profile['effects'][1]['trigger']['conditions']==[{'type':'source_item_has_any_tag','params':{'tags':['aquatic']}}]
assert item['sourceBinding']['objectId']=='1312cf29-3dbb-446f-88b2-0d4999e68d78'
assert item['sourceBinding']['declaredScopes']==[
 {'quality':quality,'enchantmentId':'none','scopeId':'battle_profile'}
 for quality in ('bronze','silver','gold','diamond')
]
entry=next(value for value in package['runtimeBundle']['sourceEffectMappings']['entries'] if value['mappingId']=='pearl')
candidate_mapping=json.loads(pathlib.Path('data/candidates/original_pirate/pearl_source_mapping/source-effect-mapping.json').read_text(encoding='utf-8'))
assert entry['mapping']==candidate_mapping
assert entry['mappingSha256']==e.PEARL_MAPPING_SHA256
assert entry['provenanceSha256']==e.PEARL_PROVENANCE_SHA256
assert entry['sourceDataCommit']==e.PEARL_SOURCE_DATA_COMMIT
assert entry['executionStatus']=='reference_battle_only_phase_reentry_same_timestamp_fail_closed'
assert entry['mapping']['originalRulesAccepted'] is False

tables=e._read_domains(pathlib.Path('data/csv'))
for field,value in [('shield_apply_amount','11'),('trigger_priority','Medium'),('ticks','21')]:
 bad=copy.deepcopy(tables)
 row=next(row for row in bad['73_bz_source_effect_mappings.csv'] if row['mapping_id']=='pearl' and row['source_ability_id']==('0' if field=='shield_apply_amount' else '1'))
 row[field]=value
 try:e.ContentAssembler(bad,pathlib.Path('data/csv')).build()
 except e.ExportError as exc:assert 'SOURCE_EFFECT_MAPPING' in str(exc)
 else:raise AssertionError((field,value))
print('PASS Pearl formal reference contract')
`], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
