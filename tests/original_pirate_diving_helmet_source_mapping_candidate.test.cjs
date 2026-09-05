const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');


test('Diving Helmet candidate locks two tiers, Aquatic listener and tag Aura', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,os,pathlib,sys
sys.path.insert(0,'tools')
import add_original_pirate_diving_helmet_source_mapping_candidate as add
import export_original_pirate_content as formal
import export_original_pirate_diving_helmet_source_mapping_candidate as c

EXPECTED_SOURCE_DB_SHA256='7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
EXPECTED_SOURCE_UUID='fb6e6b16-d6d0-4493-ac3f-46c26afe6c51'
source_db=pathlib.Path(os.environ.get(
 'THE_BAZAAR_GAMEDATA_DB',
 pathlib.Path.home()/'Library/Application Support/com.TempoStorm.TheBazaar/prod/cache/GameData.db',
)).expanduser()
assert source_db.is_file(), f'Diving Helmet locked source DB missing: {source_db}'
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
assert mapping['sourceObjectUuid']==c.SOURCE_UUID and mapping['sourceInternalName']=='Diving Helmet'
assert mapping['sourceIdentity']=={'type':'Item','size':'Medium','startingTier':'Gold','heroes':['Vanessa'],'tags':['Aquatic','Tool','Apparel'],'hiddenTags':['Shield'],'spawningEligibility':'Always'}
assert mapping['activationEvidence']=='no_source_cooldown_attributes_listener_and_aura_only'
assert mapping['sourceAbilityDirectoryOrderObserved']==['0'] and mapping['sourceAuraDirectoryOrderObserved']==['2']
assert [p['quality'] for p in mapping['qualityProfiles']]==['gold','diamond']
assert [p['sourceTier']['declaredAttributes'] for p in mapping['qualityProfiles']]==[{'ShieldApplyAmount':50},{'ShieldApplyAmount':100}]
for p,shield in zip(mapping['qualityProfiles'],[50,100]):
 assert p['sourceTier']['abilityIds']==['0'] and p['sourceTier']['auraIds']==['2'] and p['sourceTier']['tooltipIds']==[0,1]
 assert p['sourceAttributes']=={'shieldApplyAmount':shield}
 effect=p['effects'][0]
 assert effect=={'sourceAbilityId':'0','sourceAbilityDirectoryIndex':0,'sourceValueAttribute':'ShieldApplyAmount','sourceTriggerType':'TTriggerOnItemUsed','mappedTriggerEvent':'friendly_item_used','triggerPriority':'Medium','effectOrder':0,'subject':{'type':'card_section','section':'self_hand','excludeSelf':False,'condition':{'type':'card_tag','tags':['Aquatic'],'operator':'Any'}},'target':{'type':'self_player'},'operation':{'type':'gain_shield','amount':shield}}
assert mapping['sourceAuras']==[{'sourceAuraId':'2','sourceAuraDirectoryIndex':0,'activeIn':'HandAndStash','worksIn':'CombatOnly','prerequisites':None,'action':{'type':'TAuraActionCardAddTagsList','tags':['Aquatic'],'target':{'type':'TTargetCardPositional','origin':'Self','targetMode':'Neighbor','includeOrigin':False,'conditions':None}}}]
assert mapping['unknownSourceFields']==['dynamicTagAuraApplicationTiming','dynamicTagAuraRemovalTiming','overlappingTagAuraReferenceCounting','sourceEventTagSnapshotPolicy','adjacencySnapshotAndMovementPolicy','disabledDestroyedTransformedAuraLifecycle','samePriorityCrossItemOrder','shieldResolutionOrder']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'

for domain,row_index,field,value in [(c.EFFECT_CSV,0,'amount','51'),(c.EFFECT_CSV,0,'trigger_priority','High'),(c.TIER_CSV,0,'aura_ids',''),(c.AURA_CSV,0,'target_mode','LeftCard'),(c.AURA_CSV,0,'works_in','Anywhere')]:
 bad=copy.deepcopy(tables);bad[domain][row_index][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((domain,row_index,field,value))

package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert c.FORMAL_CONTENT_SHA256=='edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd'
assert hashlib.sha256(payload).hexdigest()==c.FORMAL_CONTENT_SHA256
item=next(item for item in package['items'] if item['itemId']==c.ITEM_ID)
entry=next(entry for entry in package['runtimeBundle']['sourceEffectMappings']['entries'] if entry['mappingId']=='diving_helmet')
assert item['availability']=='reference_battle_only'
assert entry['mapping']==mapping
assert entry['mappingSha256']==formal.DIVING_HELMET_MAPPING_SHA256
assert entry['provenanceSha256']==formal.DIVING_HELMET_PROVENANCE_SHA256
print('PASS Diving Helmet source mapping candidate')
`], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
