const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('source catalog and exact item declaration bindings are identity evidence, never review PASS', () => {
  const code = String.raw`
import copy, pathlib, sys, csv, shutil, tempfile
sys.path.insert(0,'tools')
import export_original_pirate_content as e
p,_ = e.build_exports(pathlib.Path('data/csv'))
assert 'sourceCatalog' in p['runtimeBundle'], 'source catalog missing'
from original_pirate_source_binding import snapshot_digest, validate_sources
import export_master_to_csv as master
c = p['runtimeBundle']['sourceCatalog']
assert len(c['snapshots']) == 1
s = c['snapshots'][0]
assert s['originKind']=='local_original' and s['members']==[]
assert s['snapshotDigest']==snapshot_digest(s)
assert all(i['sourceBinding']['objectId']==i['itemId'] for i in p['items'])
validate_sources(p['items'],p['runtimeBundle'])
def reject(change):
    f=copy.deepcopy(p);change(f)
    try: validate_sources(f['items'],f['runtimeBundle'])
    except ValueError: return
    raise AssertionError('forged source accepted')
reject(lambda f:f['runtimeBundle'].pop('sourceCatalog'))
reject(lambda f:f['items'][0].pop('sourceBinding'))
reject(lambda f:f['items'][0]['sourceBinding'].__setitem__('objectId','fake'))
reject(lambda f:f['items'][0]['sourceBinding'].__setitem__('snapshotDigest','0'*64))
reject(lambda f:f['items'][0]['sourceBinding']['declaredScopes'].pop())
reject(lambda f:f['items'][0]['sourceBinding']['declaredScopes'].append(copy.deepcopy(f['items'][0]['sourceBinding']['declaredScopes'][0])))
reject(lambda f:f['items'][0]['sourceBinding'].__setitem__('verifiedScopes',[]))
reject(lambda f:f['runtimeBundle']['sourceCatalog']['snapshots'][0]['metadata'].__setitem__('source_revision','forged'))
reject(lambda f:f['runtimeBundle']['sourceCatalog']['snapshots'].append(copy.deepcopy(f['runtimeBundle']['sourceCatalog']['snapshots'][0])))
reject(lambda f:f['items'][0]['sourceBinding']['declaredScopes'][0].__setitem__('enchantmentId','unknown_enchantment'))
fixture=copy.deepcopy(p)
ss=fixture['runtimeBundle']['sourceCatalog']['snapshots'][0]
ss['originKind']='synthetic_fixture';ss['metadata']={'fixtureId':ss['snapshotId']}
ss['snapshotDigest']=snapshot_digest(ss)
for item in fixture['items']:item['sourceBinding']['snapshotDigest']=ss['snapshotDigest']
for skill in fixture['runtimeBundle']['executableCatalogs']['heroSkills']:skill['sourceBinding']['snapshotDigest']=ss['snapshotDigest']
validate_sources(fixture['items'],fixture['runtimeBundle'])
before=copy.deepcopy(p);validate_sources(p['items'],p['runtimeBundle']);assert p==before
# Use a real identity but retain original test-item rules: this is NOT an original item mapping.
tables=e._read_domains(pathlib.Path('data/csv'))
uid=master.read_csv(pathlib.Path('data/csv/67_bazaar_reference_members.csv'))[0][0]['source_uuid']
chosen=tables['68_bz_item_source_bindings.csv'][0]['item_id']
for row in tables['68_bz_item_source_bindings.csv']:
    if row['item_id']==chosen:
        row['source_snapshot_id']=master.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID
        row['source_object_id']=uid
external=e.ContentAssembler(tables,pathlib.Path('data/csv')).build()
e.validate_package(external)
reordered=copy.deepcopy(external)
reordered['runtimeBundle']['sourceCatalog']['snapshots'].reverse()
for ss in reordered['runtimeBundle']['sourceCatalog']['snapshots']:ss['members'].reverse()
for item in reordered['items']:item['sourceBinding']['declaredScopes'].reverse()
assert e._runtime_bundle_hash(reordered['runtimeBundle'],reordered['items']) == external['runtimeBundle']['bundleHash']
def reject_external(change):
    f=copy.deepcopy(external)
    ss=next(s for s in f['runtimeBundle']['sourceCatalog']['snapshots'] if s['originKind']=='external_reference')
    change(f,ss)
    # Re-sign identity digests so tests reach member/metadata validation, not stale hash rejection.
    ss['snapshotDigest']=snapshot_digest(ss)
    for item in f['items']:
        if item['sourceBinding']['snapshotId']==ss['snapshotId']:item['sourceBinding']['snapshotDigest']=ss['snapshotDigest']
    try:validate_sources(f['items'],f['runtimeBundle'])
    except ValueError:return
    raise AssertionError('forged external identity accepted')
reject_external(lambda f,s:s['members'].pop())
reject_external(lambda f,s:s['members'][0].__setitem__('sourceUuid','00000000-0000-4000-8000-000000000001'))
reject_external(lambda f,s:s['members'][0].__setitem__('sourceUuid',s['members'][1]['sourceUuid']))
reject_external(lambda f,s:s['metadata'].__setitem__('game_patch','18.0'))
reject_external(lambda f,s:s['metadata'].__setitem__('game_patch',''))
reject_external(lambda f,s:next(i for i in f['items'] if i['itemId']==chosen)['sourceBinding'].__setitem__('objectId','00000000-0000-4000-8000-000000000001'))
for mutate in [lambda t:t['68_bz_item_source_bindings.csv'].pop(),
               lambda t:t['68_bz_item_source_bindings.csv'].append(copy.deepcopy(t['68_bz_item_source_bindings.csv'][0])),
               lambda t:t['68_bz_item_source_bindings.csv'][0].__setitem__('source_object_id','fake'),
               lambda t:t['68_bz_item_source_bindings.csv'][0].__setitem__('source_snapshot_id','fixture_fake')]:
    t=copy.deepcopy(tables);mutate(t)
    try:e.ContentAssembler(t,pathlib.Path('data/csv')).build()
    except ValueError:pass
    else:raise AssertionError('forged source row accepted')
# Move every scope together: announcement snapshots are not item inventories.
announcement=copy.deepcopy(tables)
for row in announcement['68_bz_item_source_bindings.csv']:
    if row['item_id']==chosen:
        row['source_snapshot_id']=master.CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID
try:e.ContentAssembler(announcement,pathlib.Path('data/csv')).build()
except ValueError as exc:assert 'SOURCE_ROW_REFERENCE_UNKNOWN' in str(exc),str(exc)
else:raise AssertionError('announcement snapshot accepted as item inventory')
# A changed actual CSV snapshot must fail before constants can substitute metadata.
with tempfile.TemporaryDirectory(prefix='source-binding-forged-lock-') as tmp:
    directory=pathlib.Path(tmp);shutil.copytree('data/csv',directory,dirs_exist_ok=True)
    path=directory/'66_bazaar_reference_snapshots.csv'
    with path.open(newline='',encoding='utf-8-sig') as stream:
        reader=csv.DictReader(stream);fields=reader.fieldnames;rows=list(reader)
    rows[-1]['game_build']='forged'
    with path.open('w',newline='',encoding='utf-8') as stream:
        writer=csv.DictWriter(stream,fields);writer.writeheader();writer.writerows(rows)
    try:e.ContentAssembler(copy.deepcopy(tables),directory).build()
    except ValueError as exc:assert 'SNAPSHOT_FIELDS_INVALID' in str(exc),str(exc)
    else:raise AssertionError('forged source CSV was masked')
print('PASS source binding identity, no rule acceptance')
`;
  const result = spawnSync('python3', ['-c', code], {cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(result.status,0,result.stderr || result.stdout);
});
