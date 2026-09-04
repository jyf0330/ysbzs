const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('explicit passive CSV/profile contract, pure aura and response fixtures, fail closed', () => {
  const code = String.raw`
import csv, copy, pathlib, shutil, sys, tempfile
sys.path.insert(0, 'tools')
from export_original_pirate_content import build_exports, ExportError, validate_package

def read(directory, file):
    with open(directory / file, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames), list(reader)

def edit(directory, file, change):
    fields, rows = read(directory, file)
    rows = change(rows)
    with open(directory / file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fields); writer.writeheader(); writer.writerows(rows)

def passive(directory, item_id, keep_event=None):
    def items(rows):
        for row in rows:
            if row['item_id'] == item_id:
                row['activation_mode'] = 'passive'; row['cooldown_ticks'] = ''
        return rows
    edit(directory, '46_bz_items.csv', items)
    _, effects = read(directory, '47_bz_item_effects.csv')
    kept = [r for r in effects if r['item_id'] == item_id and r['trigger_event'] == keep_event]
    edit(directory, '47_bz_item_effects.csv', lambda rows: [r for r in rows if r['item_id'] != item_id] + kept)
    _, items = read(directory, '46_bz_items.csv')
    skill_id = next(r['item_skill_id'] for r in items if r['item_id'] == item_id)
    def skills(rows):
        for r in rows:
            if r['item_skill_id'] == skill_id:
                r['trigger_events'] = keep_event or ''
                r['effect_ids'] = ','.join(r['effect_id'] for r in kept)
        return rows
    edit(directory, '48_bz_item_skills.csv', skills)
    edit(directory, '58_bz_enchantments.csv', lambda rows: [r for r in rows if r['item_id'] != item_id])
    edit(directory, '68_bz_item_source_bindings.csv', lambda rows: [r for r in rows if r['item_id'] != item_id or r['enchantment_id'] == 'none'])

def export(directory):
    return build_exports(directory)

def reject(directory, mutate):
    with tempfile.TemporaryDirectory(prefix='passive-negative-') as tmp:
        target = pathlib.Path(tmp); shutil.copytree(directory, target, dirs_exist_ok=True)
        mutate(target)
        try: export(target)
        except ExportError: return
        raise AssertionError('invalid CSV accepted')

def cell(directory, item_id, field, value, first=False):
    def change(rows):
        done = False
        for row in rows:
            if row['item_id'] == item_id and (not first or not done):
                row[field] = value; done = True
        return rows
    edit(directory, '46_bz_items.csv', change)

with tempfile.TemporaryDirectory(prefix='passive-data-') as tmp:
    directory = pathlib.Path(tmp)
    shutil.copytree('data/csv', directory, dirs_exist_ok=True)
    baseline = export(directory)
    assert all(p['activationMode']=='cooldown' for i in baseline[0]['items'] for p in i['qualityProfiles'].values())
    passive(directory, 'item_mistkelp_remedy_kit')
    passive(directory, 'item_homeglow_beacon', 'another_friendly_item_applied_slow')
    passive(directory, 'item_dawntide_timer', 'battle_start')
    package, display = export(directory)
    for item in package['items']:
        if item['itemId'] in ('item_mistkelp_remedy_kit','item_homeglow_beacon','item_dawntide_timer'):
            assert all(p['activationMode']=='passive' and p['baseCooldownTicks']==0 for p in item['qualityProfiles'].values())
    aura = next(i for i in package['items'] if i['itemId']=='item_mistkelp_remedy_kit')
    assert all(not p['effects'] and p['auras'] for p in aura['qualityProfiles'].values())
    for field,value in [('activation_mode',''),('activation_mode','unknown'),('cooldown_ticks','0'),('cooldown_ticks','1'),('ammo_enabled','true')]:
        reject(directory, lambda d,f=field,v=value: cell(d,'item_mistkelp_remedy_kit',f,v))
    reject(directory, lambda d: cell(d,'item_mistkelp_remedy_kit','activation_mode','cooldown',True))
    reject(directory, lambda d: cell(d,'item_reef_hook','cooldown_ticks',''))
    reject(directory, lambda d: edit(d,'66_bz_item_auras.csv',lambda rows:[r for r in rows if r['item_id']!='item_mistkelp_remedy_kit']))
    # Keep ready effects and their directories intact: mode alone must reject.
    def ready_passive(d):
        cell(d,'item_reef_hook','activation_mode','passive')
        cell(d,'item_reef_hook','cooldown_ticks','')
    reject(directory, ready_passive)
    # The response is otherwise valid, but a passive source has no self clock.
    reject(directory, lambda d: passive(d,'item_wake_echo_drum','another_friendly_item_applied_burn'))
    for operation,params in [('charge',{'ticks':1})]:
        forged=copy.deepcopy(package)
        p=next(i for i in forged['items'] if i['itemId']=='item_dawntide_timer')['qualityProfiles']['bronze']
        p['effects'][0]['trigger']={'event':'another_friendly_item_used','conditions':[{'type':'source_item_has_any_tag','params':{'tags':['weapon']}}]}
        p['effects'][0]['operation']={'type':operation,'params':params}
        p['effects'][0]['target']={'type':'self_item','params':{}}
        try: validate_package(forged)
        except ExportError as e: assert 'PASSIVE_SELF_CLOCK_FORBIDDEN' in str(e),str(e)
        else: raise AssertionError('passive self clock accepted')
    # A complete synchronized empty shell cannot hide behind directory checks.
    def empty_shell(d):
        edit(d,'66_bz_item_auras.csv',lambda rows:[r for r in rows if r['item_id']!='item_mistkelp_remedy_kit'])
        _, rows=read(d,'46_bz_items.csv')
        skill=next(r['item_skill_id'] for r in rows if r['item_id']=='item_mistkelp_remedy_kit')
        def remove(rows):
            for row in rows:
                if row['item_skill_id']==skill: row['aura_ids']=''
            return rows
        edit(d,'48_bz_item_skills.csv',remove)
    reject(directory, empty_shell)
    for field,value in [('cooldown_delta_ticks','1'),('ammo_delta','1')]:
        def enchant(d,field=field,value=value):
            def change(rows):
                for row in rows:
                    if row['item_id']=='item_brine_cannon':
                        row['item_id']='item_dawntide_timer'
                        row['cooldown_delta_ticks']='0';row['damage_delta']='1';row['ammo_delta']='0'
                        row[field]=value
                return rows
            edit(d,'58_bz_enchantments.csv',change)
        reject(directory,enchant)
    # Forged package validations run before hash checks. Use the expected error family.
    for mode,cooldown in [('passive',1),('cooldown',0),('unknown',0)]:
        forged=copy.deepcopy(package); p=next(i for i in forged['items'] if i['itemId']=='item_mistkelp_remedy_kit')['qualityProfiles']['bronze']
        p['activationMode']=mode;p['baseCooldownTicks']=cooldown
        try: validate_package(forged)
        except ExportError as e: assert 'ACTIVATION' in str(e),str(e)
        else: raise AssertionError('forged mode accepted')
print('PASS passive fixture contracts (not player or original-rule acceptance)')
`;
  const result = spawnSync('python3', ['-c', code], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
