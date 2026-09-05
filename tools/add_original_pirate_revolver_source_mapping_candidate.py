#!/usr/bin/env python3
"""Verify locked Revolver data and create its isolated mapping workbook."""
import argparse, hashlib, json, sqlite3, tempfile
from pathlib import Path
import openpyxl
import export_original_pirate_revolver_source_mapping_candidate as candidate

def verify_source(db:Path):
    with db.open("rb") as stream:
        if hashlib.file_digest(stream,"sha256").hexdigest()!=candidate.SOURCE_DB_SHA256: raise ValueError("REVOLVER_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri()+"?mode=ro",uri=True) as connection: row=connection.execute("SELECT Data FROM cards WHERE Id=?",(candidate.SOURCE_UUID,)).fetchone()
    if row is None: raise ValueError("REVOLVER_SOURCE_UUID_MISSING")
    card=json.loads(row[0])
    if {k:card.get(k) for k in ("Id","InternalName","Type","Size","StartingTier","Heroes","Tags","HiddenTags","SpawningEligibility") }!={"Id":candidate.SOURCE_UUID,"InternalName":"Revolver","Type":"Item","Size":"Small","StartingTier":"Bronze","Heroes":["Vanessa"],"Tags":["Weapon"],"HiddenTags":["Damage","Ammo"],"SpawningEligibility":"Always"}: raise ValueError("REVOLVER_SOURCE_IDENTITY_MISMATCH")
    resolved={}
    for quality,damage in zip(("Bronze","Silver","Gold","Diamond"),candidate.DAMAGE):
        tier=card["Tiers"][quality]; resolved.update(tier.get("Attributes",{}))
        if tier.get("AbilityIds")!=["0"] or tier.get("AuraIds")!=[] or tier.get("TooltipIds")!=[0] or resolved!={"CooldownMax":3000,"Multicast":1,"AmmoMax":6,"DamageAmount":damage}: raise ValueError("REVOLVER_SOURCE_TIER_MISMATCH:"+quality)
    ability=card["Abilities"]["0"]
    if ability.get("Priority")!="Medium" or ability.get("Prerequisites") is not None or ability.get("ActiveIn")!="HandOnly" or ability.get("WorksIn")!="Anywhere" or ability.get("Trigger")!={"$type":"TTriggerOnCardFired"} or ability.get("Action")!={"$type":"TActionPlayerDamage","ReferenceValue":None,"Target":{"$type":"TTargetPlayerRelative","TargetMode":"Opponent","Conditions":None},"Cost":None}: raise ValueError("REVOLVER_SOURCE_ABILITY_MISMATCH")

def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--db",type=Path,required=True); parser.add_argument("--workbook",type=Path,default=candidate.WORKBOOK); parser.add_argument("--csv-dir",type=Path,default=candidate.CSV_DIR); args=parser.parse_args(); verify_source(args.db)
    rows=candidate.expected_rows()
    if args.workbook.exists():
        if candidate.workbook_rows(args.workbook)!=rows: raise ValueError("REVOLVER_MAPPING_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook=openpyxl.Workbook(); sheet=workbook.active; sheet.title=candidate.SHEET; headers=candidate.formal.DOMAIN_HEADERS[candidate.CSV_NAME]; sheet.append(headers)
        for row in rows: sheet.append([row[key] for key in headers])
        args.workbook.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=args.workbook.stem+".",suffix=".xlsx",dir=args.workbook.parent,delete=False) as stream: temporary=Path(stream.name)
        workbook.save(temporary); workbook.close(); candidate.workbook_rows(temporary); temporary.replace(args.workbook)
    candidate.export_csv(args.workbook,args.csv_dir); print("PASS Revolver source verified; mapping-only workbook and CSV generated")

if __name__=="__main__": main()
