#!/usr/bin/env python3
"""Export a source-locked Revolver Ability mapping, never a complete Run."""
import argparse, csv, hashlib, io, json, tempfile
from pathlib import Path
import openpyxl
import export_original_pirate_content as formal

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_revolver_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/revolver_source_mapping"
CSV_NAME = "47_bz_item_effects.csv"
SHEET = "BZ_ITEM_EFFECTS"
SOURCE_UUID = "92e7ab18-a035-43c7-a53c-965aeecbe357"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
BASE_HASH = "53b65f2034c8fa1b3a4e67361ec2be06f0d7cc5ab2631af089b6d0a3f462bd04"
ITEM_ID = "item_bazaar_revolver"
SKILL_ID = "skill_bazaar_revolver"
QUALITIES = ("bronze", "silver", "gold", "diamond")
DAMAGE = (8, 16, 32, 64)

def expected_rows():
    rows=[]
    for quality, damage in zip(QUALITIES, DAMAGE):
        value=dict(item_id=ITEM_ID, quality=quality, item_skill_id=SKILL_ID,
                   effect_id=f"effect_bazaar_revolver_{quality}_damage", priority="",
                   trigger_event="item_ready", condition_type="always",
                   condition_source_relation="any", target_type="selected_enemy",
                   operation_type="deal_damage", amount=str(damage), source_ability_id="0",
                   trigger_priority="Medium", effect_order="0", catalog_status="candidate_reference")
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
        raise ValueError("REVOLVER_MAPPING_FIELDS_INVALID")
    if rows!=expected_rows(): raise ValueError("REVOLVER_MAPPING_SOURCE_LOCK_MISMATCH")

def workbook_rows(path=WORKBOOK):
    workbook=openpyxl.load_workbook(path,read_only=True,data_only=False)
    try:
        if workbook.sheetnames!=[SHEET]: raise ValueError("REVOLVER_MAPPING_WORKBOOK_SHEETS_INVALID")
        values=list(workbook[SHEET].values)
        if not values or list(values[0])!=formal.DOMAIN_HEADERS[CSV_NAME]: raise ValueError("REVOLVER_MAPPING_WORKBOOK_HEADERS_INVALID")
        rows=[]
        for raw in values[1:]:
            if any(isinstance(v,str) and v.startswith("=") for v in raw): raise ValueError("REVOLVER_MAPPING_FORMULA_FORBIDDEN")
            padded=list(raw)+[None]*(len(values[0])-len(raw))
            rows.append({key:"" if value is None else str(value) for key,value in zip(values[0],padded)})
        validate_rows(rows); return rows
    finally: workbook.close()

def export_csv(workbook=WORKBOOK,csv_dir=CSV_DIR,check=False):
    expected=_csv_text(workbook_rows(workbook)); target=csv_dir/CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8")!=expected: raise ValueError("REVOLVER_MAPPING_CSV_STALE")
    else: _atomic_write(target,expected)

def read_candidate(workbook=WORKBOOK,csv_dir=CSV_DIR):
    export_csv(workbook,csv_dir,check=True)
    with (csv_dir/CSV_NAME).open(encoding="utf-8",newline="") as stream: rows=list(csv.DictReader(stream))
    validate_rows(rows); return {CSV_NAME:rows}

def build_artifacts(tables):
    if not isinstance(tables,dict) or set(tables)!={CSV_NAME}: raise ValueError("REVOLVER_MAPPING_DOMAINS_INVALID")
    rows=tables[CSV_NAME]; validate_rows(rows); profiles=[]
    for quality,row in zip(QUALITIES,rows):
        profiles.append({"quality":quality,"sourceAttributes":{"cooldownMaxMilliseconds":3000,"multicast":1,"ammoMaximum":6,"damageAmount":int(row["amount"])},"effects":[{"sourceAbilityId":"0","sourceTriggerType":"TTriggerOnCardFired","mappedTriggerEvent":"item_ready","triggerPriority":"Medium","effectOrder":0,"target":"selected_enemy","operation":{"type":"deal_damage","amount":int(row["amount"])}}]})
    mapping={"schema":"ysbzs.original-pirate-source-effect-mapping-candidate.v1","schemaVersion":1,"acceptance":"source_effect_mapping_only_not_complete_item","sourceDbSha256":SOURCE_DB_SHA256,"sourceObjectUuid":SOURCE_UUID,"sourceInternalName":"Revolver","itemId":ITEM_ID,"qualityProfiles":profiles,"unknownSourceFields":["initialAmmo","baseCritChance","damageCritEligibility","emptyAmmoCooldownPolicy"],"excludedScopes":["enchantments","economy","acquisition","complete_initial_state","card_fired_to_item_used_phase_order","same_priority_tie_break","complete_run_state","top_three_identity"]}
    digest=hashlib.sha256(json.dumps(mapping,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    provenance={"schema":"ysbzs.original-pirate-revolver-source-mapping-provenance.v1","acceptance":mapping["acceptance"],"notValidatedAs":formal.CONTENT_SCHEMA,"mappingSha256":digest,"sourceDbSha256":SOURCE_DB_SHA256,"sourceObjectUuid":SOURCE_UUID,"sourceScope":"Ability 0 plus resolved tier attributes only","limitations":["This is not a complete Revolver item or Run C.","Initial Ammo, base Crit chance, damage Crit eligibility and empty-Ammo cooldown behavior remain unverified.","CardFired to ItemUsed phase ordering and same-priority tie breaking are not asserted.","No enchantment, price, acquisition, top-build or original-game acceptance claim is included."]}
    return mapping,provenance

def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--workbook",type=Path,default=WORKBOOK); parser.add_argument("--csv-dir",type=Path,default=CSV_DIR); parser.add_argument("--out-dir",type=Path,required=True); args=parser.parse_args()
    resolved=args.out_dir.resolve()
    if resolved==formal.DEFAULT_CSV_DIR.resolve() or "gameplay" in resolved.parts or "generated" in resolved.parts: raise ValueError("REVOLVER_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping,provenance=build_artifacts(read_candidate(args.workbook,args.csv_dir))
    for name,value in {"source-effect-mapping.json":mapping,"provenance.json":provenance}.items():
        text=json.dumps(value,ensure_ascii=False,indent=2)+"\n"; target=args.out_dir/name
        if target.exists() and target.read_text(encoding="utf-8")!=text: raise ValueError("REVOLVER_MAPPING_OUTPUT_EXISTS_DIFFERENT:"+name)
        _atomic_write(target,text)
    print(json.dumps({"output":str(args.out_dir),"mappingSha256":provenance["mappingSha256"],"acceptance":mapping["acceptance"]}))

if __name__=="__main__": main()
