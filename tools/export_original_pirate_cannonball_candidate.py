"""Isolated, source-locked Cannonball none overlay through the normal assembler.

No production writes; no alternate runtime rules; source identity is not review.
The workbook and its matching CSV contain only appended candidate rows.
"""
import argparse
import copy
import csv
import hashlib
import io
import json
from pathlib import Path
import tempfile

import openpyxl
import export_original_pirate_content as e

ROOT = Path(__file__).resolve().parents[1]
BASE_DIR = ROOT / 'data/csv'
WORKBOOK = ROOT / 'xlsx/candidates/original_pirate_cannonball_none.xlsx'
CSV_DIR = ROOT / 'data/candidates/original_pirate/cannonball_none'
ITEM_ID = 'item_bazaar_cannonball'
SOURCE_UUID = '55377bdf-359b-495c-895c-c7852511c915'
SOURCE_SNAPSHOT = 'snapshot_vanessa_local_cache_25079259_db8914ab'
DB_SHA = '7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9'
BASE_HASH = 'b162fe122a23e099f2128a2d7338784058f769f46f74e4e3946114b6456a39fc'
BASE_CSV_SHA = 'c939ae3344d8b83dbba7cf38928711d5a790a94bb4b88b8fabacf36e1a07236f'
QUALITIES = ('silver', 'gold', 'diamond')
SHEETS = {
    'BZ_ITEMS': '46_bz_items.csv', 'BZ_ITEM_SKILLS': '48_bz_item_skills.csv',
    'BZ_ITEM_UPGRADES': '57_bz_item_upgrades.csv', 'BZ_ITEM_AURAS': '66_bz_item_auras.csv',
    'BZ_ITEM_SOURCE_BINDINGS': '68_bz_item_source_bindings.csv',
}


def expected_rows():
    """Reviewed translation lock, not a generic authoring override or DB payload."""
    result = {n: [] for n in SHEETS.values()}
    def row(filename, **values):
        if set(values) - set(e.DOMAIN_HEADERS[filename]):
            raise ValueError('CANDIDATE_UNEXPECTED_COLUMN')
        result[filename].append({k: str(values.get(k, '')) for k in e.DOMAIN_HEADERS[filename]})
    skill = 'skill_bazaar_cannonball'
    for index, quality in enumerate(QUALITIES, 1):
        row('46_bz_items.csv', item_id=ITEM_ID, name_zh='炮弹（原版未附魔候选）',
            tags='', slot_width=1, availability='run_acquirable',
            base_quality='silver', quality=quality,
            buy_price=index+1, sell_price=1, activation_mode='passive',
            crit_chance_bps=0, ammo_enabled='false', ammo_initial=0, ammo_maximum=0,
            item_skill_id=skill,
            starter_instance_id='candidate_cannonball_silver' if index==1 else '',
            starter_location='stash' if index==1 else '', catalog_status='formal')
        row('66_bz_item_auras.csv', aura_id='aura_bazaar_cannonball_'+quality,
            item_id=ITEM_ID, quality=quality, item_skill_id=skill, priority=0,
            target_type='friendly_ammo_items', target_exclude_self='false',
            operation_type='grant_max_ammo', amount=index, catalog_status='formal')
        row('68_bz_item_source_bindings.csv', item_id=ITEM_ID, quality=quality,
            enchantment_id='none', scope_id='battle_profile',
            source_snapshot_id=SOURCE_SNAPSHOT, source_object_id=SOURCE_UUID)
    row('48_bz_item_skills.csv', item_skill_id=skill, name_zh='炮弹容量增益',
        description_zh='装备时，己方最大弹药大于零的物品增加最大弹药；不补充当前弹药。仅未附魔候选。',
        aura_ids=','.join('aura_bazaar_cannonball_'+q for q in QUALITIES), catalog_status='formal')
    for before,after in zip(QUALITIES,QUALITIES[1:]):
        row('57_bz_item_upgrades.csv', upgrade_id='upgrade_bazaar_cannonball_'+before+'_'+after,
            item_id=ITEM_ID, from_quality=before,to_quality=after,price=1,
            source_stall_id='stall_mistwake',catalog_status='formal')
    return result


def canonical_rows(tables):
    if not isinstance(tables,dict) or set(tables)!=set(SHEETS.values()):
        raise ValueError('CANDIDATE_DOMAINS_INVALID')
    result={}
    for filename,rows in tables.items():
        if not isinstance(rows,list) or any(not isinstance(r,dict) or set(r)!=set(e.DOMAIN_HEADERS[filename]) or any(not isinstance(v,str) for v in r.values()) for r in rows):
            raise ValueError('CANDIDATE_ROW_FIELDS_INVALID:'+filename)
        result[filename]=sorted(rows,key=lambda r:tuple(r[k] for k in e.DOMAIN_HEADERS[filename]))
    return result


def validate_translation(tables):
    if canonical_rows(tables)!=canonical_rows(expected_rows()):
        raise ValueError('CANDIDATE_TRANSLATION_LOCK_MISMATCH')


def workbook_rows(path):
    book=openpyxl.load_workbook(path,read_only=True,data_only=False)
    try:
        if set(book.sheetnames)!=set(SHEETS):raise ValueError('CANDIDATE_WORKSHEETS_INVALID')
        tables={}
        for sheet,filename in SHEETS.items():
            values=list(book[sheet].values)
            if not values or list(values[0])!=e.DOMAIN_HEADERS[filename]:raise ValueError('CANDIDATE_HEADERS_INVALID')
            rows=[]
            for values_row in values[1:]:
                if any(isinstance(v,str) and v.startswith('=') for v in values_row):raise ValueError('CANDIDATE_FORMULA_FORBIDDEN')
                rows.append(dict(zip(e.DOMAIN_HEADERS[filename],['' if v is None else str(v) for v in values_row])))
            tables[filename]=rows
        validate_translation(tables)
        return canonical_rows(tables)
    finally:book.close()


def csv_text(filename,rows):
    stream=io.StringIO(newline='')
    writer=csv.DictWriter(stream,fieldnames=e.DOMAIN_HEADERS[filename],lineterminator='\n')
    writer.writeheader();writer.writerows(rows)
    return stream.getvalue()


def atomic_write(path,text):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=path.parent,prefix=path.name+'.',delete=False) as stream:
        stream.write(text);temporary=Path(stream.name)
    temporary.replace(path)


def export_csv(workbook,csv_dir,check=False):
    tables=workbook_rows(workbook)
    for filename,rows in tables.items():
        path=csv_dir/filename;expected=csv_text(filename,rows)
        if check:
            if not path.is_file() or path.read_text(encoding='utf-8')!=expected:raise ValueError('CANDIDATE_CSV_STALE:'+filename)
        else:atomic_write(path,expected)
    return tables


def read_candidate(workbook=WORKBOOK,csv_dir=CSV_DIR):
    # Check exact CSV headers/bytes against workbook projection before assembly.
    export_csv(workbook,csv_dir,check=True)
    tables={}
    for filename in SHEETS.values():
        with (csv_dir/filename).open(encoding='utf-8',newline='') as stream:
            tables[filename]=list(csv.DictReader(stream))
    validate_translation(tables)
    return tables


def build_candidate(tables,base_dir=BASE_DIR):
    validate_translation(tables)
    base_sha=hashlib.sha256(json.dumps({n:hashlib.sha256((base_dir/n).read_bytes()).hexdigest() for n in e.DOMAIN_HEADERS},sort_keys=True,separators=(',',':')).encode()).hexdigest()
    if base_sha!=BASE_CSV_SHA:raise ValueError('CANDIDATE_BASE_CSV_LOCK_MISMATCH')
    base,_=e.build_exports(base_dir)
    if base['runtimeBundle']['bundleHash']!=BASE_HASH:raise ValueError('CANDIDATE_BASE_BUNDLE_LOCK_MISMATCH')
    merged=e._read_domains(base_dir)
    for filename,rows in canonical_rows(tables).items():merged[filename].extend(copy.deepcopy(rows))
    package=e.ContentAssembler(merged,base_dir).build()
    package=json.loads(e._canonical_json(package));e.validate_package(package)
    display=json.loads(e._canonical_json(e._build_display_directory(merged,package)))
    provenance={
        'schema':'ysbzs.original-pirate-cannonball-candidate.v1',
        'acceptance':'not_original_game_acceptance','baseBundleHash':BASE_HASH,
        'baseCsvSetSha256':BASE_CSV_SHA,'bundleHash':package['runtimeBundle']['bundleHash'],
        'sourceDbSha256':DB_SHA,'sourceUuid':SOURCE_UUID,'itemId':ITEM_ID,
        'publicCrossCheck':{'url':'https://bazaardb.gg/card/fc1y26n2vlf7p25ykxyzq2l341/Cannonball',
            'pageVersion':'18.0 (Hotfix Sep 3)','scope':'global AmmoMax > 0, silver/gold/diamond +1/+2/+3; not a Run version lock'},
        'declaredRange':{'qualities':list(QUALITIES),'enchantmentId':'none','scopeId':'battle_profile'},
        'verifiedSourceMechanics':{'size':'Small','tags':[], 'hiddenTags':['AmmoReference'],
            'activeAbilities':0,'auraActiveIn':'HandOnly','auraWorksIn':'Anywhere',
            'targetSection':'SelfHand','excludeSelf':False,'predicate':'AmmoMax > 0',
            'attribute':'AmmoMax','operation':'Add','amounts':[1,2,3]},
        'syntheticHostFields':['buyPrice','sellPrice','upgradePrice','starterStashInstance',
            'inactiveCritChanceBpsZero','disabledAmmoZeroPlaceholder','auraPriorityZero'],
        'unresolved':['13 enchantments excluded','Aura removal/transformation lifecycle excluded',
            'original initial/current Ammo not established','original default Crit not established',
            'source legacy prose says adjacent but structured SelfHand selector is global',
            'remaining 22 host items and battle rules are project original; not an original Run'],
    }
    return package,display,provenance


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workbook',type=Path,default=WORKBOOK)
    parser.add_argument('--csv-dir',type=Path,default=CSV_DIR)
    parser.add_argument('--out-dir',type=Path,required=True)
    args=parser.parse_args()
    # Output must be isolated, never the production source or Godot content path.
    resolved=args.out_dir.resolve()
    if resolved==BASE_DIR.resolve() or 'generated' in resolved.parts or 'gameplay' in resolved.parts:
        raise ValueError('CANDIDATE_OUTPUT_MUST_BE_ISOLATED')
    package,display,provenance=build_candidate(read_candidate(args.workbook,args.csv_dir))
    outputs={name:json.dumps(value,ensure_ascii=False,indent=2)+'\n' for name,value in [('content.json',package),('display.zh-CN.json',display),('provenance.json',provenance)]}
    for name,text in outputs.items():
        path=args.out_dir/name
        if path.exists() and path.read_text(encoding='utf-8')!=text:
            raise ValueError('CANDIDATE_OUTPUT_EXISTS_DIFFERENT:'+name)
    for name,text in outputs.items():atomic_write(args.out_dir/name,text)
    print(json.dumps({'output':str(args.out_dir),'bundleHash':package['runtimeBundle']['bundleHash'],'acceptance':provenance['acceptance']}))


if __name__=='__main__':main()
