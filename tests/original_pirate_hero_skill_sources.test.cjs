const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
test('definition skill sources bind exact real Run identities without asserting original rules',()=>{
 const code=String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
import original_pirate_source_binding as s
directory=pathlib.Path('data/csv');tables=e._read_domains(directory)
p,_=e.build_exports(directory)
def skills(p):return p['runtimeBundle']['executableCatalogs']['heroSkills']
assert all('sourceBinding' in k for k in skills(p)), 'hero skill binding missing'
assert p['schemaVersion']==41 and p['runtimeBundle']['schemaVersion']==39
assert p['runtimeBundle']['executableCatalogs']['schemaVersion']==27
for k in skills(p):
 assert k['sourceBinding']['objectId']==k['heroSkillId']
 assert k['sourceBinding']['declaredScopes']==[{'quality':q,'scopeId':'hero_skill_profile'} for q in s.QUALITIES if q in k['qualityProfiles']]
# Aggressive has all four actual DB qualities. Existing original effects are
# retained solely to exercise identity/hash paths; NOT an original skill mapping.
sid=skills(p)[0]['heroSkillId']
for r in tables['71_bz_hero_skill_source_bindings.csv']:
 if r['hero_skill_id']==sid:r.update(source_snapshot_id='view_ammo_tool_run_866a4939',source_object_id='756024f8-ad19-4f9b-a3c1-3a93c285b5d1')
external=e.ContentAssembler(tables,directory).build();e.validate_package(external)
def ext(p):return next(x for x in p['runtimeBundle']['sourceCatalog']['snapshots'] if x['originKind']=='external_run_view')
snapshot=ext(external);assert len(snapshot['members'])==15
assert len(external['runtimeBundle']['sourceCatalog']['snapshots'])==3
assert snapshot['metadata']['parentSnapshotId']=='snapshot_vanessa_local_cache_25079259_db8914ab'
assert snapshot['metadata']['parentSnapshotId'] in [x['snapshotId'] for x in external['runtimeBundle']['sourceCatalog']['snapshots']]
assert snapshot['metadata']['artifactMetadata']['game_patch'] is None
def bound(p):return next(k for k in skills(p) if k['heroSkillId']==sid)['sourceBinding']
def reject(change):
 f=copy.deepcopy(external);change(f);ss=ext(f);ss['snapshotDigest']=s.snapshot_digest(ss)
 for k in skills(f):
  if k['sourceBinding']['snapshotId']==ss['snapshotId']:k['sourceBinding']['snapshotDigest']=ss['snapshotDigest']
 f['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(f['runtimeBundle'],f['items'])
 try:e.validate_package(f)
 except e.ExportError:return
 raise AssertionError('forged skill source accepted')
reject(lambda f:bound(f).__setitem__('objectId','c05828f1-39e6-47aa-9041-216dfa60d83d'))
reject(lambda f:bound(f).__setitem__('objectId','0beccea0-bb9b-444b-b063-bf6aeadaddc8'))
reject(lambda f:bound(f)['declaredScopes'].pop())
reject(lambda f:bound(f)['declaredScopes'].append(copy.deepcopy(bound(f)['declaredScopes'][0])))
reject(lambda f:bound(f)['declaredScopes'][0].__setitem__('enchantmentId','none'))
reject(lambda f:bound(f).__setitem__('verifiedScopes',[]))
reject(lambda f:ext(f)['members'].pop())
reject(lambda f:ext(f)['members'][0].__setitem__('sourceType','skill'))
reject(lambda f:ext(f)['metadata']['artifactMetadata'].__setitem__('game_patch','18.0'))
reject(lambda f:ext(f)['metadata'].__setitem__('memberCount',True))
reject(lambda f:ext(f)['metadata'].__setitem__('evidenceUrl','https://example.com'))
ordered=copy.deepcopy(external)
for k in skills(ordered):k['sourceBinding']['declaredScopes'].reverse()
ext(ordered)['members'].reverse()
assert e._runtime_bundle_hash(ordered['runtimeBundle'],ordered['items'])==external['runtimeBundle']['bundleHash']
e.validate_package(ordered)
assert external['runtimeBundle']['bundleHash']!=p['runtimeBundle']['bundleHash']
for change in (lambda t:t['71_bz_hero_skill_source_bindings.csv'].pop(),
               lambda t:t['71_bz_hero_skill_source_bindings.csv'].append(copy.deepcopy(t['71_bz_hero_skill_source_bindings.csv'][0])),
               lambda t:t['71_bz_hero_skill_source_bindings.csv'][0].update(source_object_id='fake'),
               lambda t:t['71_bz_hero_skill_source_bindings.csv'][0].update(scope_id='battle_profile'),
               lambda t:t['71_bz_hero_skill_source_bindings.csv'][0].update(source_snapshot_id='unknown')):
 t=copy.deepcopy(tables);change(t)
 try:e.ContentAssembler(t,directory).build()
 except (e.ExportError,ValueError):pass
 else:raise AssertionError('forged CSV skill declaration accepted')
for change in (lambda f:skills(f)[0].pop('sourceBinding'),
               lambda f:skills(f)[0]['sourceBinding'].update(objectId='fake')):
 f=copy.deepcopy(p);change(f)
 try:e.validate_package(f)
 except e.ExportError:pass
 else:raise AssertionError('missing or invalid local skill binding accepted')
print('PASS local and real external skill identity only; not original effects')
`;
 const r=spawnSync('python3',['-c',code],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
