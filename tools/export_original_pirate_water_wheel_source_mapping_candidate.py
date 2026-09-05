#!/usr/bin/env python3
"""Export a source-locked Water Wheel mapping without claiming a complete item or Run."""
import argparse, csv, hashlib, io, json, tempfile
from pathlib import Path
import openpyxl
import export_original_pirate_content as formal

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_water_wheel_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/water_wheel_source_mapping"
CSV_NAME = "47_bz_item_effects.csv"
SHEET = "BZ_ITEM_EFFECTS"
SOURCE_UUID = "d8106a24-647f-40c6-8587-22f977931d76"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
BASE_HASH = "53b65f2034c8fa1b3a4e67361ec2be06f0d7cc5ab2631af089b6d0a3f462bd04"
ITEM_ID = "item_bazaar_water_wheel"
SKILL_IDS = ("skill_bazaar_water_wheel_haste", "skill_bazaar_water_wheel_charge")
QUALITIES = ("silver", "gold", "diamond")
COOLDOWNS_MS = (8000, 7000, 6000)
EFFECTS = (
    dict(source_ability_id="0", trigger_event="item_ready", trigger_priority="High",
         condition_type="always", condition_source_relation="any",
         target_type="all_other_friendly_active_clock_items", target_exclude_self="true",
         operation_type="apply_status", status="haste", ticks="40"),
    dict(source_ability_id="1", trigger_event="another_friendly_item_used", trigger_priority="Medium",
         condition_type="always", condition_source_relation="adjacent",
         target_type="self", operation_type="charge", ticks="40"),
)

def expected_rows():
    rows=[]
    for quality in QUALITIES:
        for effect in EFFECTS:
            ability_id=effect["source_ability_id"]
            value=dict(item_id=ITEM_ID, quality=quality,
                       item_skill_id=SKILL_IDS[int(ability_id)],
                       effect_id=f"effect_bazaar_water_wheel_{quality}_{ability_id}", priority="",
                       catalog_status="candidate_reference", effect_order="0", **effect)
            rows.append({key:str(value.get(key,"")) for key in formal.DOMAIN_HEADERS[CSV_NAME]})
    return rows

def _csv_text(rows):
    stream=io.StringIO(newline=""); writer=csv.DictWriter(stream,fieldnames=formal.DOMAIN_HEADERS[CSV_NAME],lineterminator="\n")
    writer.writeheader(); writer.writerows(rows); return stream.getvalue()

def _atomic_write(path,text):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w",encoding="utf-8",dir=path.parent,prefix=path.name+".",delete=False) as stream:
        stream.write(text); temporary=Path(stream.name)
    temporary.replace(path)

def validate_rows(rows):
    headers=set(formal.DOMAIN_HEADERS[CSV_NAME])
    if not isinstance(rows,list) or any(not isinstance(row,dict) or set(row)!=headers or any(not isinstance(v,str) for v in row.values()) for row in rows):
        raise ValueError("WATER_WHEEL_MAPPING_FIELDS_INVALID")
    if rows!=expected_rows(): raise ValueError("WATER_WHEEL_MAPPING_SOURCE_LOCK_MISMATCH")

def workbook_rows(path=WORKBOOK):
    workbook=openpyxl.load_workbook(path,read_only=True,data_only=False)
    try:
        if workbook.sheetnames!=[SHEET]: raise ValueError("WATER_WHEEL_MAPPING_WORKBOOK_SHEETS_INVALID")
        values=list(workbook[SHEET].values)
        if not values or list(values[0])!=formal.DOMAIN_HEADERS[CSV_NAME]: raise ValueError("WATER_WHEEL_MAPPING_WORKBOOK_HEADERS_INVALID")
        rows=[]
        for raw in values[1:]:
            if any(isinstance(v,str) and v.startswith("=") for v in raw): raise ValueError("WATER_WHEEL_MAPPING_FORMULA_FORBIDDEN")
            padded=list(raw)+[None]*(len(values[0])-len(raw))
            rows.append({key:"" if value is None else str(value) for key,value in zip(values[0],padded)})
        validate_rows(rows); return rows
    finally: workbook.close()

def export_csv(workbook=WORKBOOK,csv_dir=CSV_DIR,check=False):
    expected=_csv_text(workbook_rows(workbook)); target=csv_dir/CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8")!=expected: raise ValueError("WATER_WHEEL_MAPPING_CSV_STALE")
    else: _atomic_write(target,expected)

def read_candidate(workbook=WORKBOOK,csv_dir=CSV_DIR):
    export_csv(workbook,csv_dir,check=True)
    with (csv_dir/CSV_NAME).open(encoding="utf-8",newline="") as stream: rows=list(csv.DictReader(stream))
    validate_rows(rows); return {CSV_NAME:rows}

def build_artifacts(tables):
    if not isinstance(tables,dict) or set(tables)!={CSV_NAME}: raise ValueError("WATER_WHEEL_MAPPING_DOMAINS_INVALID")
    rows=tables[CSV_NAME]; validate_rows(rows); profiles=[]
    for quality,cooldown_ms in zip(QUALITIES,COOLDOWNS_MS):
        pair=[row for row in rows if row["quality"]==quality]
        profiles.append({"quality":quality,"sourceAttributes":{"cooldownMaxMilliseconds":cooldown_ms,"multicast":1,"hasteAmountMilliseconds":2000,"chargeAmountMilliseconds":2000,"chargeTargets":1},"effects":[
            {"sourceAbilityId":"0","sourceTriggerType":"TTriggerOnCardFired","mappedTriggerEvent":"item_ready","triggerPriority":"High","effectOrder":0,"target":{"type":"self_hand_section","excludeSelf":True,"condition":{"attribute":"CooldownMax","operator":"GreaterThan","value":0}},"operation":{"type":"apply_status","status":"haste","ticks":40}},
            {"sourceAbilityId":"1","sourceTriggerType":"TTriggerOnItemUsed","mappedTriggerEvent":"another_friendly_item_used","triggerPriority":"Medium","effectOrder":0,"subject":{"type":"self_positional","targetMode":"Neighbor","includeOrigin":False},"target":{"type":"self"},"operation":{"type":"charge","ticks":40}},
        ]})
    mapping={"schema":"ysbzs.original-pirate-source-effect-mapping-candidate.v1","schemaVersion":1,"acceptance":"source_effect_mapping_only_not_complete_item","sourceDbSha256":SOURCE_DB_SHA256,"sourceObjectUuid":SOURCE_UUID,"sourceInternalName":"Water Wheel","itemId":ITEM_ID,"qualityProfiles":profiles,"unknownSourceFields":["initialCooldownProgress","hasteReapplicationPolicy","same_priority_tie_break"],"excludedScopes":["enchantments","economy","acquisition","complete_initial_state","simultaneous_ready_order","complete_run_state","top_three_identity"]}
    digest=hashlib.sha256(json.dumps(mapping,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    provenance={"schema":"ysbzs.original-pirate-water-wheel-source-mapping-provenance.v1","acceptance":mapping["acceptance"],"notValidatedAs":formal.CONTENT_SCHEMA,"mappingSha256":digest,"sourceDbSha256":SOURCE_DB_SHA256,"sourceObjectUuid":SOURCE_UUID,"sourceScope":"Tier inheritance plus Ability 0 and Ability 1","limitations":["This is not a complete Water Wheel item or Run A.","Haste reapplication, simultaneous-ready ordering and initial cooldown progress remain unverified.","No enchantment, economy, acquisition, top-build or original-game acceptance claim is included."]}
    return mapping,provenance

def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--workbook",type=Path,default=WORKBOOK); parser.add_argument("--csv-dir",type=Path,default=CSV_DIR); parser.add_argument("--out-dir",type=Path,required=True); args=parser.parse_args()
    resolved=args.out_dir.resolve()
    if resolved==formal.DEFAULT_CSV_DIR.resolve() or "gameplay" in resolved.parts or "generated" in resolved.parts: raise ValueError("WATER_WHEEL_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping,provenance=build_artifacts(read_candidate(args.workbook,args.csv_dir))
    for name,value in {"source-effect-mapping.json":mapping,"provenance.json":provenance}.items():
        text=json.dumps(value,ensure_ascii=False,indent=2)+"\n"; target=args.out_dir/name
        if target.exists() and target.read_text(encoding="utf-8")!=text: raise ValueError("WATER_WHEEL_MAPPING_OUTPUT_EXISTS_DIFFERENT:"+name)
        _atomic_write(target,text)
    print(json.dumps({"output":str(args.out_dir),"mappingSha256":provenance["mappingSha256"],"acceptance":mapping["acceptance"]}))

if __name__=="__main__": main()
