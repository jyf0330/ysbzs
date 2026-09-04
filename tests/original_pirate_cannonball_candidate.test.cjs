const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test('real Cannonball none candidate comes from workbook overlay, not an original carrier', () => {
  const script = String.raw`
import copy,pathlib,sys,tempfile
sys.path.insert(0,'tools')
import export_original_pirate_cannonball_candidate as c
import export_original_pirate_content as e
base,base_display=e.build_exports(c.BASE_DIR)
tables=c.read_candidate(c.WORKBOOK,c.CSV_DIR)
p,d,provenance=c.build_candidate(tables)
e.validate_package(p)
item=next(i for i in p['items'] if i['itemId']==c.ITEM_ID)
assert item['tags']==[] and item['slotWidth']==1 and item['baseQuality']=='silver'
assert item['sourceBinding']['objectId']==c.SOURCE_UUID
assert item['sourceBinding']['declaredScopes']==[{'quality':q,'enchantmentId':'none','scopeId':'battle_profile'} for q in c.QUALITIES]
for q,n in zip(c.QUALITIES,(1,2,3)):
    profile=item['qualityProfiles'][q]
    assert profile['activationMode']=='passive' and profile['effects']==[]
    assert profile['auras']==[{'auraId':'aura_bazaar_cannonball_'+q,'priority':0,'target':{'type':'friendly_ammo_items','params':{}},'operation':{'type':'grant_max_ammo','params':{'amount':n}}}]
assert [i for i in p['items'] if i['itemId']!=c.ITEM_ID]==base['items']
assert provenance['acceptance']=='not_original_game_acceptance'
assert provenance['baseBundleHash']==base['runtimeBundle']['bundleHash']
assert c.build_candidate({k:list(reversed(v)) for k,v in tables.items()})== (p,d,provenance)
assert e.build_exports(c.BASE_DIR)==(base,base_display)
# Workbook -> CSV is independently reconstructed, and stale CSV is rejected.
with tempfile.TemporaryDirectory() as td:
    directory=pathlib.Path(td)
    c.export_csv(c.WORKBOOK,directory)
    assert c.read_candidate(c.WORKBOOK,directory)==tables
    (directory/'46_bz_items.csv').write_text('forged headers\n',encoding='utf-8')
    try:c.read_candidate(c.WORKBOOK,directory)
    except ValueError:pass
    else:raise AssertionError('stale CSV accepted')
for fn,key,value in [('46_bz_items.csv','tags','ammo'),('46_bz_items.csv','crit_chance_bps','1'),('66_bz_item_auras.csv','amount','99'),('68_bz_item_source_bindings.csv','source_object_id','item_brine_cannon'),('68_bz_item_source_bindings.csv','enchantment_id','enchant_tailwind')]:
    bad=copy.deepcopy(tables);bad[fn][0][key]=value
    try:c.build_candidate(bad)
    except ValueError:pass
    else:raise AssertionError(('forged source candidate accepted',fn,key))
for value in (None,'', ['ammo','ammo'], ['unknown'], ['weapon','ammo']):
    bad=copy.deepcopy(p);next(i for i in bad['items'] if i['itemId']==c.ITEM_ID)['tags']=value
    try:e.validate_package(bad)
    except e.ExportError:pass
    else:raise AssertionError(('bad item tags',value))
# Empty tags are legal only for the item definition, not a selector/condition.
for fn in (lambda:e._item_tags('test',{'tags':''},'tags'),lambda:e._expect_canonical_item_tags([],'selector')):
    try:fn()
    except e.ExportError:pass
    else:raise AssertionError('empty selector tags accepted')
for tags in (',', ',,', 'unknown', 'ammo,ammo', 'weapon,ammo'):
    try:e._item_tags('test',{'tags':tags},'tags',allow_empty=True)
    except e.ExportError:pass
    else:raise AssertionError(('noncanonical CSV item tags',tags))
# Re-signed malformed selectors reject on semantics, not hash drift.
bad=copy.deepcopy(p)
target=next(a['target'] for i in bad['items'] for profile in i['qualityProfiles'].values() for a in profile['auras'] if a['target']['type']=='friendly_items_with_any_tag')
target['params']['tags']=[]
bad['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(bad['runtimeBundle'],bad['items'])
try:e.validate_package(bad)
except e.ExportError as error:assert 'HASH' not in str(error)
else:raise AssertionError('empty Aura selector accepted')
print('PASS real identity; 3 none profiles; synthetic host; no full-rule acceptance')
`;
  const r=spawnSync('python3',['-c',script],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(r.status,0,r.stderr||r.stdout);
});
