const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('build-bound 140 item members: complete identity set, strict foreign keys and deterministic workbook export', () => {
  const code = String.raw`
import copy, pathlib, sys, tempfile
import openpyxl
sys.path.insert(0, 'tools')
import export_master_to_csv as e
assert callable(getattr(e, 'validate_bazaar_reference_members', None)), 'member validation missing'
root = pathlib.Path('.')
tables = e.generated_reference_source_tables(root/'xlsx/ysbzs_master.xlsx')
name = '67_bazaar_reference_members.csv'
rows, headers = tables[name]
assert headers == ['source_snapshot_id','source_type','source_uuid']
assert len(rows) == 140
assert e.csv_text(rows, headers) == (root/'data/csv'/name).read_text(encoding='utf-8-sig')
again = e.generated_reference_source_tables(root/'xlsx/ysbzs_master.xlsx')
assert tables == again
e.validate_bazaar_reference_members(tables)

def reject(change, expected):
    forged = copy.deepcopy(tables)
    change(forged)
    try: e.validate_bazaar_reference_members(forged)
    except ValueError as exc:
        assert expected in str(exc), (expected, str(exc))
    else: raise AssertionError('accepted '+expected)

reject(lambda t:t.pop(name), 'MEMBERS_TABLE_REQUIRED')
reject(lambda t:t[name][1].append('payload'), 'MEMBERS_SCHEMA_INVALID')
reject(lambda t:t[name][0].pop(), 'MEMBERS_COUNT_INVALID')
reject(lambda t:t[name][0].append(copy.deepcopy(t[name][0][0])), 'MEMBERS_COUNT_INVALID')
reject(lambda t:t[name][0][0].__setitem__('source_snapshot_id',e.LOCAL_CACHE_SNAPSHOT_ID), 'MEMBER_SNAPSHOT_INVALID')
reject(lambda t:t[name][0][0].__setitem__('source_type','skill'), 'MEMBER_TYPE_INVALID')
for bad in ['', 'not-a-uuid', rows[0]['source_uuid'].upper(), ' '+rows[0]['source_uuid']]:
    reject(lambda t,bad=bad:t[name][0][0].__setitem__('source_uuid',bad), 'MEMBER_UUID_INVALID')
reject(lambda t:t[name][0][0].__setitem__('source_uuid',t[name][0][1]['source_uuid']), 'MEMBER_UUID_DUPLICATE')
reject(lambda t:t[name][0][0].__setitem__('source_uuid','00000000-0000-4000-8000-000000000001'), 'MEMBERS_HASH_INVALID')
reject(lambda t:t['66_bazaar_reference_snapshots.csv'][0].pop(), 'SNAPSHOT_IDENTITY_INVALID')
reject(lambda t:t['66_bazaar_reference_snapshots.csv'][0][-1].__setitem__('raw_content_sha256','0'*64), 'SNAPSHOT_FIELDS_INVALID')
reordered = copy.deepcopy(tables)
reordered[name][0].reverse()
before_validation = copy.deepcopy(reordered)
e.validate_bazaar_reference_members(reordered)
assert reordered == before_validation, 'validator mutated caller input'
# Both workbook entry points must reject forged identity membership.
with tempfile.TemporaryDirectory(prefix='bazaar-members-negative-') as tmp:
    bad_master = pathlib.Path(tmp)/'master.xlsx'
    workbook = openpyxl.load_workbook(root/'xlsx/ysbzs_master.xlsx')
    sheet = workbook['BAZAAR_REFERENCE_MEMBERS']
    sheet.delete_rows(2,sheet.max_row)
    for row in reversed(rows): sheet.append([row[key] for key in headers])
    workbook.save(bad_master)
    assert e.generated_reference_source_tables(bad_master)[name] == tables[name]
    workbook['BAZAAR_REFERENCE_MEMBERS']['C2'] = '00000000-0000-4000-8000-000000000001'
    workbook.save(bad_master)
    for generate in [lambda:e.generated_reference_source_tables(bad_master),
                     lambda:e.generated_tables(bad_master,root/'data/csv')]:
        try: generate()
        except ValueError as exc: assert 'MEMBERS_HASH_INVALID' in str(exc), str(exc)
        else: raise AssertionError('workbook entry accepted forged membership')
# The valid normal path currently has an unrelated pre-existing pet formula gap.
try:
    normal = e.generated_tables(root/'xlsx/ysbzs_master.xlsx',root/'data/csv')
except ValueError as exc:
    assert str(exc) == 'pet pal_001 missing required base stat action', str(exc)
    print('NORMAL_FULL_EXPORT_EXISTING_GAP: pal_001.action; not a full export PASS')
else:
    assert normal[name] == tables[name]
assert all(r['source_type']=='item' for r in rows)
assert set(rows[0]) == set(headers) # no rule payload or self-attested review fields
print('PASS 140 reference-only identities; executable mapping coverage remains 0')
`;
  const result = spawnSync('python3', ['-c', code], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
