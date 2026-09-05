const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');


test('Pistol Sword candidate locks source, artifacts, Rank 1 scope and formal isolation', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,os,pathlib,sys
sys.path.insert(0,'tools')
import add_original_pirate_pistol_sword_source_mapping_candidate as add
import export_original_pirate_content as formal
import export_original_pirate_pistol_sword_source_mapping_candidate as c

EXPECTED_SOURCE_DB_SHA256='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
EXPECTED_SOURCE_UUID='65527be1-b100-4a4c-98d1-4f8975368b5b'
EXPECTED_FORMAL_CONTENT_SHA256='8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366'
source_db=pathlib.Path(os.environ.get(
 'THE_BAZAAR_GAMEDATA_DB',
 pathlib.Path.home()/'Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db',
)).expanduser()
assert source_db.is_file(), f'Pistol Sword locked source DB missing: {source_db}'
assert c.SOURCE_DB_SHA256==EXPECTED_SOURCE_DB_SHA256 and c.SOURCE_UUID==EXPECTED_SOURCE_UUID
add.verify_source(source_db)

tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert json.loads((c.CSV_DIR/'source-effect-mapping.json').read_text(encoding='utf-8'))==mapping
assert json.loads((c.CSV_DIR/'provenance.json').read_text(encoding='utf-8'))==provenance
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['originalRulesAccepted'] is False and provenance['originalRulesAccepted'] is False
assert mapping['sourceObjectUuid']==EXPECTED_SOURCE_UUID and mapping['sourceInternalName']=='Pistol Sword'
assert mapping['sourceIdentity']=={'type':'Item','size':'Medium','startingTier':'Gold','heroes':['Vanessa'],'tags':['Weapon'],'hiddenTags':['Damage','Ammo'],'spawningEligibility':'Always'}
assert mapping['candidateBuildUsage']=={'buildRank':1,'quality':'diamond','enchantmentId':'none','claimScope':'provided_candidate_membership_only_not_popularity_or_rules_proof'}
assert mapping['sourceDirectoryLocks']=={'tiersSha256':c.SOURCE_TIERS_SHA256,'abilitiesSha256':c.SOURCE_ABILITIES_SHA256,'aurasSha256':c.SOURCE_AURAS_SHA256,'enchantmentsSha256':c.SOURCE_ENCHANTMENTS_SHA256}
assert mapping['sourceAbilityDirectoryOrderObserved']==['0','1']
assert mapping['sourceAuraDirectoryOrderObserved']==[] and mapping['sourceAuras']==[]
assert [p['quality'] for p in mapping['qualityProfiles']]==['gold','diamond']
assert [p['sourceTier']['declaredAttributes'] for p in mapping['qualityProfiles']]==[{'AmmoMax':3,'CooldownMax':5000,'DamageAmount':15,'Multicast':1},{'DamageAmount':30}]
for p,damage in zip(mapping['qualityProfiles'],[15,30]):
 assert p['sourceTier']['resolvedAttributes']=={'AmmoMax':3,'CooldownMax':5000,'DamageAmount':damage,'Multicast':1}
 assert p['sourceAttributes']=={'cooldownMaxMilliseconds':5000,'multicast':1,'ammoMaximum':3,'damageAmount':damage}
 assert p['effects'][0]=={'sourceAbilityId':'0','sourceAbilityDirectoryIndex':0,'sourceValueAttribute':'DamageAmount','sourceTriggerType':'TTriggerOnCardFired','mappedTriggerEvent':'item_ready','triggerPriority':'Medium','effectOrder':0,'target':{'type':'opponent_player'},'operation':{'type':'deal_damage','amount':damage}}
 assert p['effects'][1]=={'sourceAbilityId':'1','sourceAbilityDirectoryIndex':1,'sourceValueAttribute':'DamageAmount','sourceTriggerType':'TTriggerOnItemUsed','mappedTriggerEvent':'friendly_item_used','triggerPriority':'Medium','effectOrder':0,'subject':{'type':'card_section','section':'self_hand','excludeSelf':False,'condition':{'type':'card_attribute','attribute':'AmmoMax','operator':'GreaterThan','value':0}},'target':{'type':'opponent_player'},'operation':{'type':'deal_damage','amount':damage}}
assert mapping['executionStatus']=='static_source_mapping_only_all_timing_fail_closed'
assert 'selfAmmoItemUseReentrancy' in mapping['unknownSourceFields']
assert 'enchantment_execution' in mapping['excludedScopes']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'

for domain,row_index,field,value in [
 (c.EFFECT_CSV,0,'amount','16'),
 (c.EFFECT_CSV,1,'condition_type','always'),
 (c.EFFECT_CSV,1,'trigger_priority','Low'),
 (c.TIER_CSV,1,'declared_attributes_json','{}'),
 (c.TIER_CSV,0,'aura_ids','2'),
]:
 bad=copy.deepcopy(tables);bad[domain][row_index][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((domain,row_index,field,value))

package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert c.FORMAL_CONTENT_SHA256==EXPECTED_FORMAL_CONTENT_SHA256
assert hashlib.sha256(payload).hexdigest()==EXPECTED_FORMAL_CONTENT_SHA256
assert all(item['itemId']!=c.ITEM_ID for item in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=c.SOURCE_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
print('PASS Pistol Sword source mapping candidate')
`], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
