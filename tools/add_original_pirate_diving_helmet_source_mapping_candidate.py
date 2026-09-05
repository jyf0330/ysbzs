#!/usr/bin/env python3
"""Verify the locked Diving Helmet card and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_diving_helmet_source_mapping_candidate as candidate


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("DIVING_HELMET_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("DIVING_HELMET_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags",
        "HiddenTags", "SpawningEligibility",
    )}
    if identity != {
        "Id": candidate.SOURCE_UUID, "InternalName": "Diving Helmet", "Type": "Item",
        "Size": "Medium", "StartingTier": "Gold", "Heroes": ["Vanessa"],
        "Tags": ["Aquatic", "Tool", "Apparel"], "HiddenTags": ["Shield"],
        "SpawningEligibility": "Always",
    }:
        raise ValueError("DIVING_HELMET_SOURCE_IDENTITY_MISMATCH")
    if list(card.get("Tiers", {})) != ["Gold", "Diamond"]:
        raise ValueError("DIVING_HELMET_SOURCE_TIER_DIRECTORY_MISMATCH")
    resolved = {}
    for quality, shield in (("Gold", 50), ("Diamond", 100)):
        tier = card["Tiers"][quality]
        declared = {"ShieldApplyAmount": shield}
        if tier.get("AbilityIds") != ["0"] or tier.get("AuraIds") != ["2"] or tier.get("TooltipIds") != [0, 1]:
            raise ValueError("DIVING_HELMET_SOURCE_TIER_REFS_MISMATCH:" + quality)
        if tier.get("Attributes") != declared:
            raise ValueError("DIVING_HELMET_SOURCE_TIER_ATTRIBUTES_MISMATCH:" + quality)
        resolved.update(declared)
        if resolved != declared:
            raise ValueError("DIVING_HELMET_SOURCE_TIER_INHERITANCE_MISMATCH:" + quality)
    if list(card.get("Abilities", {})) != ["0"] or list((card.get("Auras") or {})) != ["2"]:
        raise ValueError("DIVING_HELMET_SOURCE_ACTION_DIRECTORIES_MISMATCH")
    ability = card["Abilities"]["0"]
    if (
        ability.get("Priority") != "Medium"
        or ability.get("Trigger") != {
            "$type": "TTriggerOnItemUsed",
            "Subject": {
                "$type": "TTargetCardSection", "TargetSection": "SelfHand", "ExcludeSelf": False,
                "Conditions": {"$type": "TCardConditionalTag", "Tags": ["Aquatic"], "Operator": "Any"},
            },
        }
        or ability.get("Prerequisites") is not None
        or ability.get("ActiveIn") != "HandOnly"
        or ability.get("WorksIn") != "Anywhere"
        or ability.get("Action") != {
            "$type": "TActionPlayerShieldApply", "ReferenceValue": None,
            "Target": {"$type": "TTargetPlayerRelative", "TargetMode": "Self", "Conditions": None},
            "Cost": None,
        }
    ):
        raise ValueError("DIVING_HELMET_SOURCE_ABILITY_0_MISMATCH")
    aura = card["Auras"]["2"]
    if (
        aura.get("Id") != "2" or aura.get("ActiveIn") != "HandAndStash"
        or aura.get("WorksIn") != "CombatOnly" or aura.get("Prerequisites") is not None
        or aura.get("Action") != {
            "$type": "TAuraActionCardAddTagsList", "Tags": ["Aquatic"],
            "Target": {
                "$type": "TTargetCardPositional", "Origin": "Self", "TargetMode": "Neighbor",
                "IncludeOrigin": False, "Conditions": None,
            },
        }
    ):
        raise ValueError("DIVING_HELMET_SOURCE_AURA_2_MISMATCH")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, default=candidate.WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=candidate.CSV_DIR)
    args = parser.parse_args()
    verify_source(args.db)
    tables = candidate.expected_tables()
    if args.workbook.exists():
        if candidate.workbook_tables(args.workbook) != tables:
            raise ValueError("DIVING_HELMET_MAPPING_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook()
        workbook.remove(workbook.active)
        for name, sheet_name in candidate.SHEETS.items():
            sheet = workbook.create_sheet(sheet_name)
            headers = candidate.HEADERS[name]
            sheet.append(headers)
            for source_row in tables[name]:
                sheet.append([source_row[key] for key in headers])
        args.workbook.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=args.workbook.stem + ".", suffix=".xlsx", dir=args.workbook.parent, delete=False) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary)
        workbook.close()
        candidate.workbook_tables(temporary)
        temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    print("PASS Diving Helmet source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
