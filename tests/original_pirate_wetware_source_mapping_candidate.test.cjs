const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test('Wetware candidate locks source directories and fails closed on dynamic execution', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,os,pathlib,sys
sys.path.insert(0,'tools')
import add_original_pirate_wetware_source_mapping_candidate as add
import export_original_pirate_content as formal
import export_original_pirate_wetware_source_mapping_candidate as c

EXPECTED_DB='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
EXPECTED_UUID='dd913d79-7509-4c8a-b68a-5bf364dc521e'
EXPECTED_FORMAL_SHA='8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366'
db=pathlib.Path(os.environ.get('THE_BAZAAR_GAMEDATA_DB', pathlib.Path.home()/'Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db')).expanduser()
assert c.SOURCE_DB_SHA256==EXPECTED_DB and c.SOURCE_UUID==EXPECTED_UUID
add.verify_source(db)
c.export_csv(check=True);c.validate_artifacts()
tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert json.loads((c.CSV_DIR/'source-effect-mapping.json').read_text())==mapping
assert json.loads((c.CSV_DIR/'provenance.json').read_text())==provenance
assert mapping['originalRulesAccepted'] is False and provenance['originalRulesAccepted'] is False
assert mapping['sourceDirectoryLocks']=={'tiersSha256':c.SOURCE_TIERS_SHA256,'abilitiesSha256':c.SOURCE_ABILITIES_SHA256,'aurasSha256':c.SOURCE_AURAS_SHA256}
assert [p['quality'] for p in mapping['qualityProfiles']]==['silver','gold','diamond']
assert [p['sourceTier']['resolvedAttributes']['ShieldApplyAmount'] for p in mapping['qualityProfiles']]==[20,40,80]
assert [p['sourceTier']['resolvedAttributes']['Custom_0'] for p in mapping['qualityProfiles']]==[15,25,35]
assert [a['sourceAbilityId'] for a in mapping['sourceAbilities']]==['0','1']
assert mapping['sourceAbilities'][0]['priority']=='Medium'
assert mapping['sourceAbilities'][1]['priority']=='Medium'
assert mapping['sourceAbilities'][1]['trigger']['$type']=='TTriggerOnCardPerformedShield'
assert mapping['sourceAbilities'][1]['action']['Value']['$type']=='TReferenceValueCardAttribute'
assert mapping['sourceAbilities'][1]['action']['Target']['$type']=='TTargetCardRandom'
assert mapping['sourceAuras']==[] and mapping['sourceAuraDirectoryOrderObserved']==[]
assert mapping['referenceBuildAppearances']==[
 {'rank':1,'quality':'diamond','enchantment':None,'evidenceScope':'task_locked_reference_build_observation'},
 {'rank':2,'quality':'diamond','enchantment':None,'evidenceScope':'task_locked_reference_build_observation'},
]
assert mapping['executionStatus']=='static_source_mapping_only_dynamic_expression_and_timing_fail_closed'
for field in ['dynamic_expression_execution','event_timing','enchantment_directory_and_execution','original_game_acceptance']:
 assert field in mapping['excludedScopes']
for field in ['performedShieldEventEmissionTiming','shieldToDamageBuffReentrancy','randomWeaponSelectionRngAndSnapshotPolicy','dynamicReferenceValueEvaluationTime','untilEndOfCombatStackingAndExpiry']:
 assert field in mapping['unknownSourceFields']
for domain,row,field,value in [
 (c.TIER_CSV,0,'declared_attributes_json','{}'),
 (c.ABILITY_CSV,0,'priority','Low'),
 (c.ABILITY_CSV,1,'action_json','{}'),
 (c.APPEARANCE_CSV,0,'quality','gold'),
 (c.APPEARANCE_CSV,1,'enchantment','Fiery'),
]:
 bad=copy.deepcopy(tables);bad[domain][row][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((domain,row,field,value))
package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()==EXPECTED_FORMAL_SHA
assert all(item['itemId']!='item_bazaar_wetware' for item in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=EXPECTED_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
print('PASS Wetware source mapping candidate')
`], {cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
       env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
