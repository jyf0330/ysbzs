const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('Run C listener mapping locks Medium Cannonade before Lowest Grapeshot',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import copy,sys
sys.path.insert(0,'tools')
import export_original_pirate_run_c_listener_mapping_candidate as c
rows=c.read_candidate();mapping,provenance=c.build_artifacts(rows)
assert mapping['compositionId']=='run_c_cannonade_medium_then_grapeshot_lowest_on_ammo_weapon_use'
gold_c=next(x for x in mapping['entries'] if x['sourceInternalName']=='Cannonade' and x['quality']=='gold')
diamond_g=next(x for x in mapping['entries'] if x['sourceInternalName']=='Grapeshot' and x['quality']=='diamond')
assert (gold_c['triggerPriority'],gold_c['operation'])==('Medium',{'type':'charge_self','ticks':40})
assert gold_c['sourceFilter']=={'owner':'self','excludeSelf':True,'any':[{'kind':'tag','value':'Weapon'},{'kind':'hiddenTag','value':'Burn'}]}
assert (diamond_g['triggerPriority'],diamond_g['operation'])==('Lowest',{'type':'reload_self','amount':1})
assert diamond_g['sourceFilter']=={'owner':'self','excludeSelf':True,'attribute':'AmmoMax','operator':'GreaterThan','value':0}
assert provenance['mappingSha256'] and provenance['notValidatedAs']=='ysbzs.original-pirate-content.v1'
bad=copy.deepcopy(rows);bad[0]['trigger_priority']='Low'
try:c.build_artifacts(bad)
except ValueError:pass
else:raise AssertionError('priority drift accepted')
print('PASS Run C source event listener mapping candidate')
`],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
