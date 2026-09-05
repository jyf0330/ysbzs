#!/usr/bin/env python3
"""Verify locked Flagship source and create only its candidate workbook."""

import argparse, hashlib, json, sqlite3, tempfile
from pathlib import Path
import openpyxl
import export_original_pirate_flagship_source_mapping_candidate as candidate


def _sha(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256: raise ValueError("FLAGSHIP_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None: raise ValueError("FLAGSHIP_UUID_MISSING")
    card = json.loads(row[0])
    if {k: card.get(k) for k in ("Id","Version","InternalName","Type","Size","StartingTier","Heroes","Tags","HiddenTags","SpawningEligibility")} != {
        "Id":candidate.SOURCE_UUID,"Version":"5.0.0","InternalName":"Flagship","Type":"Item","Size":"Large","StartingTier":"Silver","Heroes":["Vanessa"],"Tags":["Aquatic","Vehicle","Weapon"],"HiddenTags":["Damage","AmmoReference"],"SpawningEligibility":"Always"}: raise ValueError("FLAGSHIP_IDENTITY_MISMATCH")
    for field, expected in (("Tiers",candidate.SOURCE_TIERS_SHA256),("Abilities",candidate.SOURCE_ABILITIES_SHA256),("Auras",candidate.SOURCE_AURAS_SHA256),("Enchantments",candidate.SOURCE_ENCHANTMENTS_SHA256)):
        if _sha(card.get(field)) != expected: raise ValueError("FLAGSHIP_DIRECTORY_MISMATCH:"+field)
    if _sha(card) != candidate.SOURCE_CARD_SHA256: raise ValueError("FLAGSHIP_CARD_MISMATCH")
    rows = candidate.expected_rows()
    for index, quality in enumerate(("Silver","Gold","Diamond")):
        expected = json.loads(rows[index]["payload_json"]); tier = card["Tiers"][quality]
        if tier != {"Attributes":expected["attributes"],"AbilityIds":expected["abilityIds"],"AuraIds":expected["auraIds"],"TooltipIds":expected["tooltipIds"]}: raise ValueError("FLAGSHIP_TIER_MISMATCH:"+quality)
    if list(card["Abilities"]) != ["0"] or list(card["Auras"]) != ["1","2","3","4","5"]: raise ValueError("FLAGSHIP_ACTION_DIRECTORY_MISMATCH")
    ability = card["Abilities"]["0"]; normalized = {"priority":ability["Priority"],"trigger":ability["Trigger"]["$type"],"activeIn":ability["ActiveIn"],"worksIn":ability["WorksIn"],"prerequisites":ability["Prerequisites"],"action":{"type":ability["Action"]["$type"],"referenceValue":ability["Action"]["ReferenceValue"],"target":"OpponentPlayer"}}
    if normalized != json.loads(rows[3]["payload_json"]): raise ValueError("FLAGSHIP_ABILITY_0_MISMATCH")
    for index, aura_id in enumerate(("1","2","3","4","5"), start=4):
        aura=card["Auras"][aura_id]; action=aura["Action"]; prereq=aura["Prerequisites"][0]; subject=prereq["Subject"]; condition=subject["Conditions"]
        if condition["$type"]=="TCardConditionalTag": normalized_condition={"type":condition["$type"],"tags":condition["Tags"],"operator":condition["Operator"]}
        else: normalized_condition={"type":condition["$type"],"attribute":condition["Attribute"],"comparison":condition["ComparisonOperator"],"value":condition["ComparisonValue"]["Value"]}
        normalized=candidate._aura_payload(aura_id,aura["ActiveIn"],normalized_condition)
        if (normalized != json.loads(rows[index]["payload_json"]) or aura["WorksIn"]!="Anywhere" or action["$type"]!="TAuraActionCardModifyAttribute" or action["AttributeType"]!="Multicast" or action["Operation"]!="Add" or action["Value"]!={"$type":"TFixedValue","Value":1.0} or action["Target"]!={"$type":"TTargetCardSelf","Conditions":None} or prereq["Comparison"]!="GreaterThanOrEqual" or prereq["Amount"]!=1 or subject["TargetSection"]!="SelfHand" or subject["ExcludeSelf"] is not False): raise ValueError("FLAGSHIP_AURA_MISMATCH:"+aura_id)
    overlay=json.loads(rows[9]["payload_json"]); shielded=card["Enchantments"]["Shielded"]
    e1=shielded["Abilities"]["e1"];e2=shielded["Auras"]["e2"];value=e2["Action"]["Value"]
    actual={"attributes":shielded["Attributes"],"hiddenTags":shielded["HiddenTags"],"ability":{"sourceAbilityId":"e1","priority":e1["Priority"],"trigger":e1["Trigger"]["$type"],"activeIn":e1["ActiveIn"],"worksIn":e1["WorksIn"],"prerequisites":e1["Prerequisites"],"action":{"type":e1["Action"]["$type"],"referenceValue":e1["Action"]["ReferenceValue"],"target":"SelfPlayer"}},"aura":{"sourceAuraId":"e2","activeIn":e2["ActiveIn"],"worksIn":e2["WorksIn"],"prerequisites":e2["Prerequisites"],"action":{"type":e2["Action"]["$type"],"attribute":e2["Action"]["AttributeType"],"operation":e2["Action"]["Operation"],"target":"SelfCard","value":{"type":value["$type"],"attribute":value["AttributeType"],"target":"SelfCard","defaultValue":value["DefaultValue"],"modifier":{"mode":value["Modifier"]["ModifyMode"],"value":value["Modifier"]["Value"]["Value"],"shouldRound":value["Modifier"]["ShouldRound"]}}}}}
    if actual != overlay: raise ValueError("FLAGSHIP_SHIELDED_OVERLAY_MISMATCH")


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("--db",type=Path,required=True);args=parser.parse_args();verify_source(args.db);rows=candidate.expected_rows()
    if candidate.WORKBOOK.exists():
        if candidate.workbook_rows()!=rows:raise ValueError("FLAGSHIP_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook=openpyxl.Workbook();sheet=workbook.active;sheet.title=candidate.SHEET;sheet.append(candidate.HEADERS)
        for row in rows:sheet.append([row[key] for key in candidate.HEADERS])
        candidate.WORKBOOK.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=candidate.WORKBOOK.stem+".",suffix=".xlsx",dir=candidate.WORKBOOK.parent,delete=False) as stream:temporary=Path(stream.name)
        workbook.save(temporary);workbook.close();candidate.workbook_rows(temporary);temporary.replace(candidate.WORKBOOK)
    candidate.export_csv();candidate.write_artifacts();print("PASS Flagship source verified; isolated workbook, CSV and JSON generated")


if __name__=="__main__":main()
