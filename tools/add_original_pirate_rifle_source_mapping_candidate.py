#!/usr/bin/env python3
"""Verify the locked Rifle source and create only its normalized mapping workbook."""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile

import openpyxl

import export_original_pirate_rifle_source_mapping_candidate as candidate


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("RIFLE_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("RIFLE_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    if {key: card.get(key) for key in ("Id", "InternalName", "Type", "Size", "StartingTier")} != {
        "Id": candidate.SOURCE_UUID, "InternalName": "Rifle", "Type": "Item",
        "Size": "Medium", "StartingTier": "Bronze",
    } or card.get("Tags") != ["Weapon"] or card.get("HiddenTags") != ["Damage", "DamageReference", "Ammo"]:
        raise ValueError("RIFLE_SOURCE_IDENTITY_MISMATCH")
    resolved = {"CooldownMax": 2000, "Multicast": 1, "AmmoMax": 1}
    for quality, damage, growth in zip(("Bronze", "Silver", "Gold", "Diamond"), candidate.DAMAGE, candidate.GROWTH):
        tier = card["Tiers"][quality]
        if tier.get("AbilityIds") != ["0", "1"] or tier.get("AuraIds") != []:
            raise ValueError("RIFLE_SOURCE_ABILITY_DIRECTORY_MISMATCH")
        resolved.update(tier.get("Attributes", {}))
        if any(resolved.get(key) != value for key, value in {
            "CooldownMax": 2000, "Multicast": 1, "AmmoMax": 1,
            "DamageAmount": damage, "Custom_0": growth,
        }.items()):
            raise ValueError("RIFLE_SOURCE_TIER_VALUES_MISMATCH")
    ability0, ability1 = card["Abilities"]["0"], card["Abilities"]["1"]
    if ability0.get("Priority") != "Medium" or ability0.get("Trigger", {}).get("$type") != "TTriggerOnCardFired":
        raise ValueError("RIFLE_SOURCE_ABILITY_0_TRIGGER_MISMATCH")
    action0 = ability0.get("Action", {})
    if action0.get("$type") != "TActionPlayerDamage" or action0.get("Target") != {
        "$type": "TTargetPlayerRelative", "TargetMode": "Opponent", "Conditions": None,
    }:
        raise ValueError("RIFLE_SOURCE_ABILITY_0_ACTION_MISMATCH")
    if ability1.get("Priority") != "Low" or ability1.get("Trigger", {}).get("$type") != "TTriggerOnCardFired":
        raise ValueError("RIFLE_SOURCE_ABILITY_1_TRIGGER_MISMATCH")
    action1 = ability1.get("Action", {})
    if action1.get("$type") != "TActionCardModifyAttribute" \
            or action1.get("AttributeType") != "DamageAmount" or action1.get("Operation") != "Add" \
            or action1.get("Target") != {"$type": "TTargetCardSelf", "Conditions": None} \
            or action1.get("Duration") != {"$type": "TDeterminantDuration", "DurationType": "UntilEndOfCombat"} \
            or action1.get("Value") != {
                "$type": "TReferenceValueCardAttribute", "AttributeType": "Custom_0",
                "Target": {"$type": "TTargetCardSelf", "Conditions": None},
                "DefaultValue": 0.0, "Modifier": None,
            }:
        raise ValueError("RIFLE_SOURCE_ABILITY_1_ACTION_MISMATCH")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, default=candidate.WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=candidate.CSV_DIR)
    args = parser.parse_args()
    verify_source(args.db)
    rows = candidate.expected_rows()
    if args.workbook.exists():
        if candidate.workbook_rows(args.workbook) != rows:
            raise ValueError("RIFLE_MAPPING_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = candidate.SHEET
        headers = candidate.formal.DOMAIN_HEADERS[candidate.CSV_NAME]
        sheet.append(headers)
        for row in rows:
            sheet.append([row[key] for key in headers])
        args.workbook.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            prefix=args.workbook.stem + ".", suffix=".xlsx", dir=args.workbook.parent, delete=False,
        ) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary)
        workbook.close()
        candidate.workbook_rows(temporary)
        temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    print("PASS Rifle source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
