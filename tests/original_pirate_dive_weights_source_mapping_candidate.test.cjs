const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');


test('Dive Weights candidate locks three tiers, Ability 0 and all three Auras', () => {
  const result = spawnSync('python3', ['-c', String.raw`
import copy,hashlib,json,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as formal
import export_original_pirate_dive_weights_source_mapping_candidate as c

tables=c.read_candidate();mapping,provenance=c.build_artifacts(tables)
assert mapping['acceptance']=='source_effect_mapping_only_not_complete_item'
assert mapping['originalRulesAccepted'] is False and provenance['originalRulesAccepted'] is False
assert mapping['sourceObjectUuid']==c.SOURCE_UUID and mapping['sourceInternalName']=='Dive Weights'
assert mapping['sourceIdentity']=={'type':'Item','size':'Small','startingTier':'Silver','heroes':['Vanessa'],'tags':['Aquatic','Tool','Apparel'],'hiddenTags':['Haste','Ammo'],'spawningEligibility':'Always'}
assert mapping['sourceAbilityDirectoryOrderObserved']==['0']
assert mapping['sourceAuraDirectoryOrderObserved']==['1','2','3']
assert [p['quality'] for p in mapping['qualityProfiles']]==['silver','gold','diamond']
assert [p['sourceTier']['declaredAttributes'] for p in mapping['qualityProfiles']]==[{'AmmoMax':4,'CooldownMax':8000,'Custom_0':1000,'HasteAmount':1000,'HasteTargets':1,'Multicast':1},{'HasteAmount':2000},{'HasteAmount':3000}]
for index,p in enumerate(mapping['qualityProfiles']):
 assert p['sourceTier']['abilityIds']==['0'] and p['sourceTier']['auraIds']==['1','2','3'] and p['sourceTier']['tooltipIds']==[0,1,2]
 assert p['sourceAttributes']=={'cooldownMaxMilliseconds':8000,'multicastBase':1,'ammoMaximum':4,'hasteTargets':1,'hasteAmountMilliseconds':(index+1)*1000,'adjacentAquaticCooldownReductionMilliseconds':1000}
 effect=p['effects'][0]
 assert effect['sourceAbilityId']=='0' and effect['triggerPriority']=='Medium' and effect['effectOrder']==0
 assert effect['target']=={'type':'random_card','section':'self_hand','excludeSelf':False,'count':1,'condition':{'attribute':'CooldownMax','operator':'GreaterThan','value':0}}
 assert effect['operation']=={'type':'apply_status','status':'haste','ticks':(index+1)*20}
assert len(mapping['sourceAuras'])==3
for aura,target_mode in zip(mapping['sourceAuras'][:2],['LeftCard','RightCard']):
 assert aura['action']['attribute']=='FlatCooldownReduction'
 assert aura['action']['value']=={'type':'TReferenceValueCardAttribute','attribute':'Custom_0','target':'self','default':0,'modifier':{'mode':'Multiply','value':1,'shouldRound':True}}
 assert aura['prerequisite']=={'type':'TPrerequisiteCardCount','comparison':'Equal','amount':1,'subject':{'type':'TTargetCardPositional','origin':'Self','targetMode':target_mode,'includeOrigin':False,'condition':{'type':'TCardConditionalTag','tags':['Aquatic'],'operator':'Any'}}}
assert mapping['sourceAuras'][2]['action']=={'type':'TAuraActionCardModifyAttribute','attribute':'Multicast','operation':'Add','value':{'type':'TReferenceValueCardAttribute','attribute':'Ammo','target':'self','default':0},'target':'self'}
assert 'initialAmmo' in mapping['unknownSourceFields'] and 'ammoSpendRelativeToMulticastSnapshot' in mapping['unknownSourceFields'] and 'randomTargetRngAndSnapshotPolicy' in mapping['unknownSourceFields']
assert provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'

for domain,row_index,field,value in [(c.EFFECT_CSV,0,'ticks','21'),(c.EFFECT_CSV,0,'trigger_priority','High'),(c.TIER_CSV,0,'aura_ids','1,2'),(c.AURA_CSV,0,'subject_target_mode','Neighbor'),(c.AURA_CSV,2,'value_attribute','AmmoMax')]:
 bad=copy.deepcopy(tables);bad[domain][row_index][field]=value
 try:c.build_artifacts(bad)
 except ValueError:pass
 else:raise AssertionError((domain,row_index,field,value))

package,_=formal.build_exports(pathlib.Path('data/csv'))
payload=(json.dumps(package,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
assert hashlib.sha256(payload).hexdigest()==c.FORMAL_CONTENT_SHA256
assert all(item['itemId']!=c.ITEM_ID for item in package['items'])
assert all(entry.get('mapping',{}).get('sourceObjectUuid')!=c.SOURCE_UUID for entry in package['runtimeBundle']['sourceEffectMappings']['entries'])
print('PASS Dive Weights source mapping candidate')
`], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
