#!/usr/bin/env python3
"""Verify locked Powder Horn data and create its isolated mapping workbook."""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile

import openpyxl

import export_original_pirate_powder_horn_source_mapping_candidate as candidate


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("POWDER_HORN_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("POWDER_HORN_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    if {key: card.get(key) for key in ("Id", "InternalName", "Type", "Size", "StartingTier")} != {
        "Id": candidate.SOURCE_UUID, "InternalName": "Powder Horn", "Type": "Item",
        "Size": "Small", "StartingTier": "Bronze",
    } or card.get("Tags") != ["Tool"] or card.get("HiddenTags") != ["AmmoReference"]:
        raise ValueError("POWDER_HORN_SOURCE_IDENTITY_MISMATCH")
    resolved = {}
    for quality, reload_amount in zip(("Bronze", "Silver", "Gold", "Diamond"), candidate.RELOAD):
        tier = card["Tiers"][quality]
        resolved.update(tier.get("Attributes", {}))
        if tier.get("AbilityIds") != ["0"] or tier.get("AuraIds") != [] or resolved != {
            "CooldownMax": 3000, "Multicast": 1,
            "ReloadAmount": reload_amount, "ReloadTargets": 1,
        }:
            raise ValueError("POWDER_HORN_SOURCE_TIER_MISMATCH")
    ability = card["Abilities"]["0"]
    if ability.get("Priority") != "Lowest" or ability.get("Trigger") != {"$type": "TTriggerOnCardFired"}:
        raise ValueError("POWDER_HORN_SOURCE_TRIGGER_MISMATCH")
    action = ability.get("Action", {})
    if action.get("$type") != "TActionCardReload" or action.get("Value") is not None \
            or action.get("TargetCount") is not None or action.get("Cost") is not None \
            or action.get("Target") != {
                "$type": "TTargetCardPositional", "Origin": "Self", "TargetMode": "RightCard",
                "IncludeOrigin": False,
                "Conditions": {
                    "$type": "TCardConditionalAttribute", "Attribute": "AmmoMax",
                    "ComparisonOperator": "GreaterThan",
                    "ComparisonValue": {"$type": "TFixedValue", "Value": 0.0},
                },
            }:
        raise ValueError("POWDER_HORN_SOURCE_ACTION_MISMATCH")


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
            raise ValueError("POWDER_HORN_MAPPING_EXISTING_WORKBOOK_MISMATCH")
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
    print("PASS Powder Horn source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
