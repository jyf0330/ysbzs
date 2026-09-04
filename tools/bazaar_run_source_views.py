"""Strict reference-only candidate identity view; not a spawn pool or rule mapping."""
import hashlib
import json
import re

VIEW_FILE = '69_bazaar_run_source_views.csv'
MEMBER_FILE = '70_bazaar_run_source_members.csv'
VIEW_SHEET = 'BAZAAR_RUN_SOURCE_VIEWS'
MEMBER_SHEET = 'BAZAAR_RUN_SOURCE_MEMBERS'
VIEW_HEADERS = ['view_id','parent_source_snapshot_id','selection_scope','evidence_url','usage_scope','member_count','members_sha256']
MEMBER_HEADERS = ['view_id','source_type','source_uuid','source_heroes','spawning_eligibility','source_qualities']
VIEW_ID = 'view_ammo_tool_run_866a4939'
MEMBERS_SHA256 = '04aaf9676efff60f370c1400168390909715d975e702c87f021737c72cb3b6a5'
RUN_URL = 'https://bazaardb.gg/run/tracker/866a4939-d497-45a1-9726-4a0874a5340b'
QUALITIES = ['bronze','silver','gold','diamond']
HEROES = {'common','pygmalien','vanessa','dooley','jules','mak','stelle','karnok','hero8'}

def view_row(parent_id):
    return dict(zip(VIEW_HEADERS,[VIEW_ID,parent_id,'single_run_observed_supplement_not_spawn_pool',RUN_URL,'reference_only','15',MEMBERS_SHA256]))

def member_digest(rows):
    ordered = sorted(rows,key=lambda r:(r['source_type'],r['source_uuid']))
    values = [[r[k] for k in MEMBER_HEADERS] for r in ordered]
    return hashlib.sha256(json.dumps(values,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def validate(tables):
    # The parent owns whole-DB artifact/build identity. Its historical Vanessa
    # hero_scope describes the old catalog, not membership of this Run view.
    import export_master_to_csv as source
    source.validate_bazaar_reference_members(tables)
    for filename,headers in [(VIEW_FILE,VIEW_HEADERS),(MEMBER_FILE,MEMBER_HEADERS)]:
        if filename not in tables or tables[filename][1] != headers:
            raise ValueError('RUN_SOURCE_SCHEMA_INVALID:'+filename)
        if any(set(r)!=set(headers) or any(not isinstance(r[k],str) for k in headers) for r in tables[filename][0]):
            raise ValueError('RUN_SOURCE_ROW_FIELDS_INVALID:'+filename)
    views=tables[VIEW_FILE][0]
    if views != [view_row(source.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID)]:
        raise ValueError('RUN_SOURCE_VIEW_LOCK_INVALID')
    rows=tables[MEMBER_FILE][0]
    if len(rows)!=15:raise ValueError('RUN_SOURCE_MEMBER_COUNT_INVALID')
    seen=set()
    for r in rows:
        uid=r['source_uuid'];heroes=r['source_heroes'].split('|');qualities=r['source_qualities'].split('|')
        if r['view_id']!=VIEW_ID or r['source_type'] not in ('item','skill') \
                or not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',uid) \
                or uid in seen:raise ValueError('RUN_SOURCE_MEMBER_ID_INVALID')
        seen.add(uid)
        if not set(heroes)<=HEROES or heroes!=sorted(set(heroes)) \
                or not set(qualities)<=set(QUALITIES) \
                or qualities!=[q for q in QUALITIES if q in qualities] \
                or r['spawning_eligibility'] not in ('Always','GuidOnly'):
            raise ValueError('RUN_SOURCE_MEMBER_ATTRIBUTES_INVALID')
    if sum(r['source_type']=='item' for r in rows)!=1 or member_digest(rows)!=MEMBERS_SHA256:
        raise ValueError('RUN_SOURCE_MEMBER_SET_HASH_INVALID')

def canonicalize(tables):
    """Caller owns the result map; validation itself does not mutate inputs."""
    rows,headers=tables[MEMBER_FILE]
    tables[MEMBER_FILE]=(sorted(rows,key=lambda r:(r['source_type'],r['source_uuid'])),headers)
