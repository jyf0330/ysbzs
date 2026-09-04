const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('candidate Run source view is a strict 15-object reference-only set', () => {
 const code=String.raw`
import copy,pathlib,sys,tempfile
sys.path.insert(0,'tools')
import export_master_to_csv as e
assert callable(getattr(e,'validate_bazaar_run_source_views',None)), 'source view validator missing'
import bazaar_run_source_views as v
root=pathlib.Path('.')
tables=e.generated_reference_source_tables(root/'xlsx/ysbzs_master.xlsx')
v.validate(tables)
for name in (v.VIEW_FILE,v.MEMBER_FILE):assert tables[name]==e.read_csv(root/'data/csv'/name)
before=copy.deepcopy(tables);v.validate(tables);assert before==tables
def reject(change):
 t=copy.deepcopy(tables);change(t)
 try:v.validate(t)
 except ValueError:return
 raise AssertionError('forged reference view accepted')
reject(lambda t:t[v.MEMBER_FILE][0].pop())
reject(lambda t:t[v.MEMBER_FILE][0].append(copy.deepcopy(t[v.MEMBER_FILE][0][0])))
for field,value in [('source_uuid','00000000-0000-4000-8000-000000000001'),('source_type','skill'),('source_heroes','Pygmalien'),('source_heroes',''),('source_heroes','pygmalien|pygmalien'),('source_qualities','diamond|gold'),('source_qualities','gold|gold'),('source_qualities','legendary'),('spawning_eligibility','always'),('view_id','unknown')]:
 reject(lambda t:t[v.MEMBER_FILE][0][0].__setitem__(field,value))
reject(lambda t:t[v.MEMBER_FILE][0][0].__setitem__('verified',True))
reject(lambda t:t[v.VIEW_FILE][0][0].__setitem__('PASS','true'))
def resigned(t,field,value):
 t[v.MEMBER_FILE][0][0][field]=value
 t[v.VIEW_FILE][0][0]['members_sha256']=v.member_digest(t[v.MEMBER_FILE][0])
for field,value in [('source_uuid','00000000-0000-4000-8000-000000000001'),('source_type','skill'),('source_qualities','diamond')]:
 reject(lambda t:resigned(t,field,value))
for field,value in [('usage_scope','executable'),('parent_source_snapshot_id','unknown'),('member_count','14'),('members_sha256','0'*64),('evidence_url','https://example.com'),('selection_scope','natural_pool')]:
 reject(lambda t:t[v.VIEW_FILE][0][0].__setitem__(field,value))
reject(lambda t:t['66_bazaar_reference_snapshots.csv'][0][-1].__setitem__('raw_content_sha256','0'*64))
import openpyxl
with tempfile.TemporaryDirectory(prefix='run-source-view-') as tmp:
 w=openpyxl.load_workbook(root/'xlsx/ysbzs_master.xlsx');s=w[v.MEMBER_SHEET]
 rows=list(s.values);s.delete_rows(2,s.max_row)
 for row in reversed(rows[1:]):s.append(row)
 p=pathlib.Path(tmp)/'master.xlsx';w.save(p)
 assert e.generated_reference_source_tables(p)[v.MEMBER_FILE]==tables[v.MEMBER_FILE]
 s['C2']='00000000-0000-4000-8000-000000000001';w.save(p)
 for generate in (lambda:e.generated_reference_source_tables(p),lambda:e.generated_tables(p,root/'data/csv')):
  try:generate()
  except ValueError as ex:assert 'RUN_SOURCE' in str(ex),str(ex)
  else:raise AssertionError('workbook forged member accepted')
print('PASS source identity only; no runtime or rules acceptance')
`;
 const r=spawnSync('python3',['-c',code],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
