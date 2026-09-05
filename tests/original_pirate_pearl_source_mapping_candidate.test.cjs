const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');


test('Pearl candidate locks four-tier inheritance and complete base Ability/Aura directories', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,os,pathlib,sys
sys.path.insert(0,'tools')
import add_original_pirate_pearl_source_mapping_candidate as add
import export_original_pirate_content as formal
import export_original_pirate_pearl_source_mapping_candidate as c

EXPECTED_SOURCE_DB_SHA256='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
EXPECTED_SOURCE_UUID='1312cf29-3dbb-446f-88b2-0d4999e68d78'
source_db=pathlib.Path(os.environ.get(
 'THE_BAZAAR_GAMEDATA_DB',
 pathlib.Path.home()/'Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db',
)).expanduser()
assert source_db.is_file(), f'Pearl locked source DB missing: {source_db}'
assert c.SOURCE_DB_SHA256==EXPECTED_SOURCE_DB_SHA256
assert c.SOURCE_UUID==EXPECTED_SOURCE_UUID
add.verify_source(source_db)

tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
checked_mapping=json.loads((c.CSV_DIR/'source-effect-mapping.json').read_text(encoding='utf-8'))
checked_provenance=json.loads((c.CSV_DIR/'provenance.json').read_text(encoding='utf-8'))
assert checked_mapping==mapping
assert checked_provenance==provenance
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['originalRulesAccepted'] is False and provenance['originalRulesAccepted'] is False
assert mapping['sourceObjectUuid']==c.SOURCE_UUID and mapping['sourceInternalName']=='Pearl'
assert mapping['sourceIdentity']=={'type':'Item','size':'Small','startingTier':'Bronze','heroes':['Vanessa'],'tags':['Aquatic'],'hiddenTags':['Shield'],'spawningEligibility':'Always'}
assert mapping['sourceDirectoryLocks']=={'tiersSha256':c.SOURCE_TIERS_SHA256,'abilitiesSha256':c.SOURCE_ABILITIES_SHA256,'aurasSha256':c.SOURCE_AURAS_SHA256,'enchantmentsSha256':c.SOURCE_ENCHANTMENTS_SHA256}
assert mapping['sourceAbilityDirectoryOrderObserved']==['0','1']
assert mapping['sourceAuraDirectoryOrderObserved']==[] and mapping['sourceAuras']==[]
assert [p['quality'] for p in mapping['qualityProfiles']]==['bronze','silver','gold','diamond']
declared=[{'ChargeAmount':1000,'ChargeTargets':1,'CooldownMax':5000,'Multicast':1,'ShieldApplyAmount':10},{'ShieldApplyAmount':20},{'ShieldApplyAmount':40},{'ShieldApplyAmount':80}]
assert [p['sourceTier']['declaredAttributes'] for p in mapping['qualityProfiles']]==declared
for p,shield in zip(mapping['qualityProfiles'],[10,20,40,80]):
 assert p['sourceTier']['abilityIds']==['0','1'] and p['sourceTier']['auraIds']==[] and p['sourceTier']['tooltipIds']==[0,1]
 assert p['sourceAttributes']=={'cooldownMaxMilliseconds':5000,'multicast':1,'shieldApplyAmount':shield,'chargeAmountMilliseconds':1000,'chargeTargets':1}
 assert p['effects'][0]=={'sourceAbilityId':'0','sourceAbilityDirectoryIndex':0,'sourceValueAttribute':'ShieldApplyAmount','sourceTriggerType':'TTriggerOnCardFired','mappedTriggerEvent':'item_ready','triggerPriority':'Low','effectOrder':0,'target':{'type':'self_player'},'operation':{'type':'gain_shield','amount':shield}}
 assert p['effects'][1]=={'sourceAbilityId':'1','sourceAbilityDirectoryIndex':1,'sourceValueAttribute':'ChargeAmount','sourceTargetCountAttribute':'ChargeTargets','sourceTriggerType':'TTriggerOnItemUsed','mappedTriggerEvent':'another_friendly_item_used','triggerPriority':'Low','effectOrder':0,'subject':{'type':'self_hand_section','excludeSelf':True,'condition':{'tag':'Aquatic','operator':'Any'}},'target':{'type':'self'},'operation':{'type':'charge','ticks':20}}
assert mapping['executionStatus']=='static_source_mapping_only_all_timing_fail_closed'
assert 'samePriorityAbilityOrder' in mapping['unknownSourceFields'] and 'chargeCausedReadyReentrancy' in mapping['unknownSourceFields']
assert 'enchantment_execution' in mapping['excludedScopes']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'

for domain,row_index,field,value in [
 (c.EFFECT_CSV,0,'amount','11'),
 (c.EFFECT_CSV,1,'ticks','21'),
 (c.EFFECT_CSV,1,'condition_tags','weapon'),
 (c.EFFECT_CSV,1,'trigger_priority','Medium'),
 (c.TIER_CSV,2,'declared_attributes_json','{}'),
]:
 bad=copy.deepcopy(tables);bad[domain][row_index][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((domain,row_index,field,value))

package,_=formal.build_exports(pathlib.Path('data/csv'))
item=next(item for item in package['items'] if item['itemId']==c.ITEM_ID)
entry=next(entry for entry in package['runtimeBundle']['sourceEffectMappings']['entries'] if entry['mappingId']=='pearl')
assert item['availability']=='reference_battle_only'
assert entry['mapping']==mapping and entry['mappingSha256']==formal.PEARL_MAPPING_SHA256
print('PASS Pearl source mapping candidate')
`], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
