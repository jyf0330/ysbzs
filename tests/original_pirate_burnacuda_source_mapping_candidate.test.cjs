const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');


test('Burnacuda candidate locks all tiers, inheritance, abilities, no auras, and unknowns', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_burnacuda_source_mapping_candidate as c

tables=c.read_candidate()
mapping,provenance=c.build_artifacts(tables)
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['originalRulesAccepted'] is False and provenance['originalRulesAccepted'] is False
assert mapping['sourceObjectUuid']==c.SOURCE_UUID and mapping['sourceInternalName']=='Burnacuda'
assert mapping['sourceIdentity']=={'type':'Item','size':'Small','startingTier':'Bronze','heroes':['Vanessa'],'tags':['Aquatic','Friend'],'hiddenTags':['Burn','Ammo','Haste'],'spawningEligibility':'Always'}
assert mapping['sourceAbilityDirectoryOrderObserved']==['0','1'] and mapping['sourceAuraDirectory']==[]
assert mapping['samePriorityAbilityExecutionOrderStatus']=='UNVERIFIED_FAIL_CLOSED'
assert [(p['quality'],p['sourceAttributes']['ammoMaximum']) for p in mapping['qualityProfiles']]==[('bronze',1),('silver',2),('gold',3),('diamond',4)]
for index,p in enumerate(mapping['qualityProfiles']):
 assert p['sourceTier']['abilityIds']==['0','1'] and p['sourceTier']['auraIds']==[] and p['sourceTier']['tooltipIds']==[0,1]
 assert p['sourceAttributes']=={'cooldownMaxMilliseconds':3000,'multicast':1,'ammoMaximum':index+1,'burnApplyAmount':3,'hasteAmountMilliseconds':1000,'hasteTargets':1}
 assert p['effects'][0]=={'sourceAbilityId':'0','sourceAbilityDirectoryIndex':0,'sourceValueAttribute':'BurnApplyAmount','sourceTriggerType':'TTriggerOnCardFired','mappedTriggerEvent':'item_ready','triggerPriority':'Medium','effectOrder':0,'target':{'type':'opponent_player'},'operation':{'type':'apply_burn','stacks':3}}
 assert p['effects'][1]=={'sourceAbilityId':'1','sourceAbilityDirectoryIndex':1,'sourceValueAttribute':'HasteAmount','sourceTargetCountAttribute':'HasteTargets','sourceTriggerType':'TTriggerOnCardFired','mappedTriggerEvent':'item_ready','triggerPriority':'Medium','effectOrder':0,'target':{'type':'random_card','section':'self_neighbors','excludeSelf':False,'count':1,'condition':{'attribute':'CooldownMax','operator':'GreaterThan','value':0}},'operation':{'type':'apply_status','status':'haste','ticks':20}}
assert mapping['unknownSourceFields']==['initialAmmo','initialCooldownProgress','zeroAmmoCooldownPolicy','ammoSpendRelativeToAbilityExecution','samePriorityAbilityExecutionOrder','randomTargetRngAndSnapshotPolicy','emptyRandomTargetPolicy','hasteReapplicationPolicy','burnResolutionAndReapplicationPolicy']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'

for row_index,field,value in [(0,'stacks','4'),(0,'trigger_priority','High'),(1,'target_type','random_friendly_item_with_any_tag'),(1,'ticks','21'),(1,'effect_order','1')]:
 bad=copy.deepcopy(tables);bad[c.CSV_NAME][row_index][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((row_index,field,value))

package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()==c.FORMAL_CONTENT_SHA256
assert all(item['itemId']!=c.ITEM_ID for item in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=c.SOURCE_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
print('PASS Burnacuda source mapping candidate')
`], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
