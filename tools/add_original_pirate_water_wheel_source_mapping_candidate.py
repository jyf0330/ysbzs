#!/usr/bin/env python3
"""Verify locked Water Wheel data and create its isolated mapping workbook."""
import argparse, hashlib, json, sqlite3, tempfile
from pathlib import Path
import openpyxl
import export_original_pirate_water_wheel_source_mapping_candidate as candidate

def verify_source(db:Path):
    with db.open("rb") as stream:
        if hashlib.file_digest(stream,"sha256").hexdigest()!=candidate.SOURCE_DB_SHA256: raise ValueError("WATER_WHEEL_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri()+"?mode=ro",uri=True) as connection: row=connection.execute("SELECT Data FROM cards WHERE Id=?",(candidate.SOURCE_UUID,)).fetchone()
    if row is None: raise ValueError("WATER_WHEEL_SOURCE_UUID_MISSING")
    card=json.loads(row[0])
    identity={k:card.get(k) for k in ("Id","InternalName","Type","Size","StartingTier","Heroes","Tags","HiddenTags","SpawningEligibility")}
    expected={"Id":candidate.SOURCE_UUID,"InternalName":"Water Wheel","Type":"Item","Size":"Large","StartingTier":"Silver","Heroes":["Vanessa"],"Tags":["Aquatic","Property"],"HiddenTags":["Haste"],"SpawningEligibility":"Always"}
    if identity!=expected: raise ValueError("WATER_WHEEL_SOURCE_IDENTITY_MISMATCH")
    resolved={}
    expected_attributes=(
        {"CooldownMax":8000,"Multicast":1,"HasteAmount":2000,"ChargeAmount":2000,"ChargeTargets":1},
        {"CooldownMax":7000,"Multicast":1,"HasteAmount":2000,"ChargeAmount":2000,"ChargeTargets":1},
        {"CooldownMax":6000,"Multicast":1,"HasteAmount":2000,"ChargeAmount":2000,"ChargeTargets":1},
    )
    for quality,expected_attrs in zip(("Silver","Gold","Diamond"),expected_attributes):
        tier=card["Tiers"][quality]; resolved.update(tier.get("Attributes",{}))
        if tier.get("AbilityIds")!=["0","1"] or tier.get("AuraIds")!=[] or tier.get("TooltipIds")!=[0,1] or resolved!=expected_attrs: raise ValueError("WATER_WHEEL_SOURCE_TIER_MISMATCH:"+quality)
    ability0=card["Abilities"]["0"]
    expected0={"Id":"0","Trigger":{"$type":"TTriggerOnCardFired"},"ActiveIn":"HandOnly","Action":{"$type":"TActionCardHaste","Value":None,"TargetCount":None,"Target":{"$type":"TTargetCardSection","TargetSection":"SelfHand","ExcludeSelf":True,"Conditions":{"$type":"TCardConditionalAttribute","Attribute":"CooldownMax","ComparisonOperator":"GreaterThan","ComparisonValue":{"$type":"TFixedValue","Value":0.0}}},"Cost":None},"Prerequisites":None,"Priority":"High","InternalName":"Water Wheel 1","InternalDescription":"Haste your other items {ability.0} second(s)","MigrationData":"","VFXConfig":{"VFXOverrideKey":None,"VFXShouldPlay":True,"VFXIsTakeover":False},"TranslationKey":"42a178d19545a9e1ab47788faa8e3331","WorksIn":"Anywhere"}
    ability1=card["Abilities"]["1"]
    expected1={"Id":"1","Trigger":{"$type":"TTriggerOnItemUsed","Subject":{"$type":"TTargetCardPositional","Origin":"Self","TargetMode":"Neighbor","IncludeOrigin":False,"Conditions":None}},"ActiveIn":"HandOnly","Action":{"$type":"TActionCardCharge","Value":None,"TargetCount":None,"Target":{"$type":"TTargetCardSelf","Conditions":None},"Cost":None},"Prerequisites":None,"Priority":"Medium","InternalName":"Water Wheel 2","InternalDescription":"When you use an adjacent item","MigrationData":"","VFXConfig":{"VFXOverrideKey":None,"VFXShouldPlay":True,"VFXIsTakeover":False},"TranslationKey":"4b4cf2264f5bc49b80dc743ab5ab2b37","WorksIn":"Anywhere"}
    if ability0!=expected0: raise ValueError("WATER_WHEEL_SOURCE_ABILITY_0_MISMATCH")
    if ability1!=expected1: raise ValueError("WATER_WHEEL_SOURCE_ABILITY_1_MISMATCH")

def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--db",type=Path,required=True); parser.add_argument("--workbook",type=Path,default=candidate.WORKBOOK); parser.add_argument("--csv-dir",type=Path,default=candidate.CSV_DIR); args=parser.parse_args(); verify_source(args.db)
    rows=candidate.expected_rows()
    if args.workbook.exists():
        if candidate.workbook_rows(args.workbook)!=rows: raise ValueError("WATER_WHEEL_MAPPING_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook=openpyxl.Workbook(); sheet=workbook.active; sheet.title=candidate.SHEET; headers=candidate.formal.DOMAIN_HEADERS[candidate.CSV_NAME]; sheet.append(headers)
        for row in rows: sheet.append([row[key] for key in headers])
        args.workbook.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=args.workbook.stem+".",suffix=".xlsx",dir=args.workbook.parent,delete=False) as stream: temporary=Path(stream.name)
        workbook.save(temporary); workbook.close(); candidate.workbook_rows(temporary); temporary.replace(args.workbook)
    candidate.export_csv(args.workbook,args.csv_dir); print("PASS Water Wheel source verified; mapping-only workbook and CSV generated")

if __name__=="__main__": main()
