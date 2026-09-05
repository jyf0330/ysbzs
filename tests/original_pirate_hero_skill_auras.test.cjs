const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
test('hero skill profiles support pure and reactive Auras without item carriers',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
t=e._read_domains(pathlib.Path('data/csv'))
p,d=e.build_exports(pathlib.Path('data/csv'))
assert p['schemaVersion']==40
assert all(q['auras']==[] for s in p['runtimeBundle']['executableCatalogs']['heroSkills'] for q in s['qualityProfiles'].values())
sid='hero_skill_mist_salvo'
fixture=copy.deepcopy(t)
for row in fixture['62_bz_hero_skills.csv']:
 if row['hero_skill_id']!=sid:continue
 aid='test_aura_'+row['quality'];row['aura_ids']=aid
 fixture['72_bz_hero_skill_auras.csv'].append(dict(aura_id=aid,hero_skill_id=sid,quality=row['quality'],priority='0',target_type='leftmost_friendly_item_with_any_tag',target_tags='weapon',operation_type='grant_lifesteal_bps',lifesteal_bps='10000',catalog_status='formal'))
def build(t):
 p=e.ContentAssembler(t,pathlib.Path('data/csv')).build();e.validate_package(p);return p
mixed=build(copy.deepcopy(fixture))
# JSON preserves the runtime's nonempty multi-effect domain; CSV remains one row/operation.
multi=copy.deepcopy(mixed)
profile=next(s for s in multi['runtimeBundle']['executableCatalogs']['heroSkills'] if s['heroSkillId']==sid)['qualityProfiles']['bronze']
second=copy.deepcopy(profile['effects'][0]);second['effectId']='hero_effect_second_test';profile['effects'].append(second)
multi['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(multi['runtimeBundle'],multi['items']);e.validate_package(multi)
for row in fixture['62_bz_hero_skills.csv']:
 if row['hero_skill_id']==sid:row.update(trigger_event='none',max_triggers_per_battle='0',effect_id='',target_type='',operation_type='',amount='',ticks='')
pure=build(copy.deepcopy(fixture))
s=next(s for s in pure['runtimeBundle']['executableCatalogs']['heroSkills'] if s['heroSkillId']==sid)
assert s['triggerEvent']=='none'
assert all(q['effects']==[] and q['maxTriggersPerBattle']==0 and len(q['auras'])==1 for q in s['qualityProfiles'].values())
def reject_json(change):
 bad=copy.deepcopy(pure);skill=next(s for s in bad['runtimeBundle']['executableCatalogs']['heroSkills'] if s['heroSkillId']==sid)
 change(skill)
 try:
  bad['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(bad['runtimeBundle'],bad['items']);e.validate_package(bad)
 except e.ExportError as error:
  assert 'HASH' not in str(error),str(error)
  return
 raise AssertionError('invalid signed JSON accepted')
for value in (0,10001,True,1.5,'10000'):
 reject_json(lambda s:s['qualityProfiles']['bronze']['auras'][0]['operation']['params'].update(lifestealBps=value))
reject_json(lambda s:s['qualityProfiles']['bronze'].pop('auras'))
reject_json(lambda s:s['qualityProfiles']['bronze'].update(auras=[]))
reject_json(lambda s:s.update(triggerEvent=None))
reject_json(lambda s:s.update(triggerEvent='friendly_item_used'))
reject_json(lambda s:s['qualityProfiles']['bronze'].update(maxTriggersPerBattle=1))
reject_json(lambda s:s['qualityProfiles']['bronze']['auras'][0]['target']['params'].update(tags=[]))
reject_json(lambda s:s['qualityProfiles']['bronze']['auras'][0]['target']['params'].update(excludeSelf=True))
changed=copy.deepcopy(pure);q=next(s for s in changed['runtimeBundle']['executableCatalogs']['heroSkills'] if s['heroSkillId']==sid)['qualityProfiles']['bronze'];q['auras'][0]['operation']['params']['lifestealBps']=9999
assert e._runtime_bundle_hash(changed['runtimeBundle'],changed['items'])!=pure['runtimeBundle']['bundleHash']
def reject(t):
 try:build(t)
 except (e.ExportError,ValueError):return
 raise AssertionError('invalid CSV accepted')
for field,value in [('lifesteal_bps','0'),('lifesteal_bps','10001'),('lifesteal_bps','1.5'),('target_tags',''),('target_type','leftmost_friendly_item'),('operation_type','grant_damage'),('hero_skill_id','missing'),('quality','bronze_bad')]:
 bad=copy.deepcopy(fixture);bad['72_bz_hero_skill_auras.csv'][0][field]=value;reject(bad)
bad=copy.deepcopy(fixture);bad['72_bz_hero_skill_auras.csv'].pop();reject(bad)
bad=copy.deepcopy(fixture);bad['72_bz_hero_skill_auras.csv'].append(copy.deepcopy(bad['72_bz_hero_skill_auras.csv'][0]));reject(bad)
for qfield,value in [('trigger_event','friendly_item_used'),('max_triggers_per_battle','1'),('aura_ids',''),('amount','0')]:
 bad=copy.deepcopy(fixture);next(r for r in bad['62_bz_hero_skills.csv'] if r['hero_skill_id']==sid)[qfield]=value;reject(bad)
for old in [39,38]:
 bad=copy.deepcopy(p);bad['schemaVersion']=old
 try:e.validate_package(bad)
 except e.ExportError:pass
 else:raise AssertionError('old schema accepted')
print('PASS skill Aura CSV and JSON contract')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});

test('Circle of Life real diamond candidate uses skill identity and synthetic learn path',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,sys
sys.path.insert(0,'tools')
import export_original_pirate_circle_of_life_candidate as c
import export_original_pirate_content as e
import export_master_to_csv as m
import bazaar_run_source_views as v
p,d,meta=c.build_candidate();e.validate_package(p)
base,_=e.build_exports(e.DEFAULT_CSV_DIR)
s=next(s for s in p['runtimeBundle']['executableCatalogs']['heroSkills'] if s['heroSkillId']==c.SKILL_ID)
assert s['sourceBinding']['objectId']==c.UUID and set(s['qualityProfiles'])=={'diamond'}
assert s['qualityProfiles']['diamond']['auras'][0]['operation']['params']=={'lifestealBps':10000}
assert p['items']==base['items'] and meta['acceptance']=='not_original_game_acceptance'
assert s['sourceBinding']['declaredScopes']==[{'quality':'diamond','scopeId':'hero_skill_profile'}]
assert next(o for o in p['runtimeBundle']['executableCatalogs']['heroSkillOffers'] if o['heroSkillId']==c.SKILL_ID)['action']=={'type':'learn','toQuality':'diamond'}
tables=m.generated_reference_source_tables(m.DEFAULT_MASTER)
for field,value in [('source_uuid','00000000-0000-4000-8000-000000000001'),('source_type','item'),('source_qualities','gold|diamond')]:
 bad=copy.deepcopy(tables);r=next(r for r in bad[v.MEMBER_FILE][0] if r['view_id']==v.CIRCLE_VIEW_ID);r[field]=value
 vr=next(r for r in bad[v.VIEW_FILE][0] if r['view_id']==v.CIRCLE_VIEW_ID);vr['members_sha256']=v.member_digest([r])
 try:v.validate(bad)
 except ValueError:pass
 else:raise AssertionError('re-signed forged Circle identity accepted')
print('PASS Circle actual identity, diamond-only Aura, synthetic acquisition')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
