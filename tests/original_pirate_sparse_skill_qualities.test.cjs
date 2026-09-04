const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('sparse skill qualities retain exact references, adjacent upgrades and reachability', () => {
  const script = String.raw`
import copy,pathlib,sys
sys.path.insert(0,'tools')
import export_original_pirate_content as e
directory=pathlib.Path('data/csv');tables=e._read_domains(directory)
sid='hero_skill_tailwind_return'
def fixture(qualities,skill=sid):
    t=copy.deepcopy(tables)
    t['62_bz_hero_skills.csv']=[r for r in t['62_bz_hero_skills.csv'] if r['hero_skill_id']!=skill or r['quality'] in qualities]
    for r in t['63_bz_hero_skill_loadouts.csv']:
        if r['hero_skill_id']==skill:r['quality']=qualities[0]
    offers=[]
    for r in t['65_bz_hero_skill_offers.csv']:
        if r['hero_skill_id']==skill:
            if r['action_type']=='learn':r['to_quality']=qualities[0]
            elif r['from_quality'] not in qualities or r['to_quality'] not in qualities:continue
        offers.append(r)
    # Orders are contiguous per trainer, independent from discarded profiles.
    counts={}
    for r in offers:
        k=r['trainer_id'];counts[k]=counts.get(k,0)+1;r['offer_order']=str(counts[k])
    t['65_bz_hero_skill_offers.csv']=offers
    return t
def build(t):
    p=e.ContentAssembler(t,directory).build();e.validate_package(p);return p
def skill(p,s=sid):return next(x for x in p['runtimeBundle']['executableCatalogs']['heroSkills'] if x['heroSkillId']==s)
original=build(copy.deepcopy(tables))
for qualities in (['gold'],['diamond'],['silver','gold'],['gold','diamond'],['silver','gold','diamond']):
    p=build(fixture(qualities));assert list(skill(p)['qualityProfiles'])==qualities
    q=copy.deepcopy(p);q['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(q['runtimeBundle'],q['items']);e.validate_package(q)
# Explicit starting gold quality, while another skill retains a trainer offer.
build(fixture(['gold','diamond'],'hero_skill_mist_salvo'))
base=fixture(['gold','diamond']);package=build(base)
def reject_csv(change):
    t=copy.deepcopy(base);change(t)
    try:build(t)
    except e.ExportError:return
    raise AssertionError('invalid CSV accepted')
def reject_json(change):
    p=copy.deepcopy(package);change(p)
    p['runtimeBundle']['bundleHash']=e._runtime_bundle_hash(p['runtimeBundle'],p['items'])
    try:e.validate_package(p)
    except e.ExportError as error:
        assert 'HASH' not in str(error),str(error)
        return
    raise AssertionError('invalid JSON accepted')
def offer(t,action):return next(r for r in t['65_bz_hero_skill_offers.csv'] if r['hero_skill_id']==sid and r['action_type']==action)
def joffer(p,action):return next(r for r in p['runtimeBundle']['executableCatalogs']['heroSkillOffers'] if r['heroSkillId']==sid and r['action']['type']==action)
reject_csv(lambda t:offer(t,'learn').update(to_quality='bronze'))
reject_csv(lambda t:offer(t,'upgrade').update(from_quality='silver'))
reject_csv(lambda t:next(r for r in t['63_bz_hero_skill_loadouts.csv'] if r['hero_skill_id']==sid).update(quality='bronze'))
reject_json(lambda p:joffer(p,'learn')['action'].update(toQuality='bronze'))
reject_json(lambda p:joffer(p,'upgrade')['action'].update(fromQuality='silver'))
reject_json(lambda p:skill(p).update(qualityProfiles={}))
reject_json(lambda p:skill(p)['qualityProfiles'].update(legendary=copy.deepcopy(skill(p)['qualityProfiles']['gold'])))
reject_csv(lambda t:next(r for r in t['62_bz_hero_skills.csv'] if r['hero_skill_id']==sid).update(quality='legendary'))
reject_csv(lambda t:t.__setitem__('62_bz_hero_skills.csv',[r for r in t['62_bz_hero_skills.csv'] if r['hero_skill_id']!=sid]))
# A valid but higher acquisition tier cannot strand the lower declared tier.
reject_csv(lambda t:offer(t,'learn').update(to_quality='diamond'))
reject_json(lambda p:joffer(p,'learn')['action'].update(toQuality='diamond'))
reject_json(lambda p:joffer(p,'learn')['action'].update(toQuality=[]))
reject_json(lambda p:joffer(p,'upgrade')['action'].update(fromQuality={}))
reject_json(lambda p:next(r for r in p['runtimeBundle']['executableCatalogs']['heroSkillOffers'] if r['heroSkillId']=='hero_skill_mist_salvo' and r['action'].get('fromQuality')=='bronze')['action'].update(toQuality='gold'))
reject_json(lambda p:p['runtimeBundle']['executableCatalogs']['heroes'][0]['startingHeroSkills'][0].update(quality='legendary'))
reject_json(lambda p:next(x for x in p['runtimeBundle']['generation']['battle']['ghostSnapshots'][0]['build']['heroSkills'] if x['heroSkillId']==sid).update(quality='bronze'))
# Known, nonadjacent endpoints still cannot upgrade across the missing tier.
gap=fixture(['bronze','diamond'])
try:build(gap)
except e.ExportError:pass
else:raise AssertionError('unreachable gapped profile set accepted')
skip=fixture(['bronze','gold','diamond'])
first=next(r for r in skip['65_bz_hero_skill_offers.csv'] if r['hero_skill_id']==sid and r['action_type']=='upgrade')
first.update(from_quality='bronze',to_quality='gold')
try:build(skip)
except e.ExportError:pass
else:raise AssertionError('nonadjacent upgrade accepted')
assert build(tables)==original
print('PASS sparse qualities are explicit; no source-binding or production changes')
`;
  const result = spawnSync('python3', ['-c', script], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
