#!/usr/bin/env python3
"""Verify the locked Burnacuda card and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_burnacuda_source_mapping_candidate as candidate


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("BURNACUDA_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("BURNACUDA_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {
        key: card.get(key)
        for key in (
            "Id",
            "InternalName",
            "Type",
            "Size",
            "StartingTier",
            "Heroes",
            "Tags",
            "HiddenTags",
            "SpawningEligibility",
        )
    }
    expected_identity = {
        "Id": candidate.SOURCE_UUID,
        "InternalName": "Burnacuda",
        "Type": "Item",
        "Size": "Small",
        "StartingTier": "Bronze",
        "Heroes": ["Vanessa"],
        "Tags": ["Aquatic", "Friend"],
        "HiddenTags": ["Burn", "Ammo", "Haste"],
        "SpawningEligibility": "Always",
    }
    if identity != expected_identity:
        raise ValueError("BURNACUDA_SOURCE_IDENTITY_MISMATCH")

    resolved = {}
    expected_declared = (
        {
            "CooldownMax": 3000,
            "Multicast": 1,
            "AmmoMax": 1,
            "BurnApplyAmount": 3,
            "HasteAmount": 1000,
            "HasteTargets": 1,
        },
        {"AmmoMax": 2},
        {"AmmoMax": 3},
        {"AmmoMax": 4},
    )
    for quality, declared, ammo_maximum in zip(
        ("Bronze", "Silver", "Gold", "Diamond"), expected_declared, candidate.AMMO_MAXIMUM
    ):
        tier = card["Tiers"][quality]
        if tier.get("AbilityIds") != ["0", "1"] or tier.get("AuraIds") != [] or tier.get("TooltipIds") != [0, 1]:
            raise ValueError("BURNACUDA_SOURCE_TIER_DIRECTORY_MISMATCH:" + quality)
        if tier.get("Attributes") != declared:
            raise ValueError("BURNACUDA_SOURCE_TIER_DECLARED_ATTRIBUTES_MISMATCH:" + quality)
        resolved.update(declared)
        expected_resolved = {
            "CooldownMax": 3000,
            "Multicast": 1,
            "AmmoMax": ammo_maximum,
            "BurnApplyAmount": 3,
            "HasteAmount": 1000,
            "HasteTargets": 1,
        }
        if resolved != expected_resolved:
            raise ValueError("BURNACUDA_SOURCE_TIER_INHERITANCE_MISMATCH:" + quality)

    if list(card.get("Abilities", {})) != ["0", "1"] or card.get("Auras", {}) not in ({}, None):
        raise ValueError("BURNACUDA_SOURCE_DIRECTORIES_MISMATCH")
    ability_zero = card["Abilities"]["0"]
    if (
        ability_zero.get("Priority") != "Medium"
        or ability_zero.get("Trigger") != {"$type": "TTriggerOnCardFired"}
        or ability_zero.get("Prerequisites") is not None
        or ability_zero.get("ActiveIn") != "HandOnly"
        or ability_zero.get("WorksIn") != "Anywhere"
        or ability_zero.get("Action")
        != {
            "$type": "TActionPlayerBurnApply",
            "ReferenceValue": None,
            "Target": {
                "$type": "TTargetPlayerRelative",
                "TargetMode": "Opponent",
                "Conditions": None,
            },
            "Cost": None,
        }
    ):
        raise ValueError("BURNACUDA_SOURCE_ABILITY_0_MISMATCH")
    ability_one = card["Abilities"]["1"]
    if (
        ability_one.get("Priority") != "Medium"
        or ability_one.get("Trigger") != {"$type": "TTriggerOnCardFired"}
        or ability_one.get("Prerequisites") is not None
        or ability_one.get("ActiveIn") != "HandOnly"
        or ability_one.get("WorksIn") != "Anywhere"
        or ability_one.get("Action")
        != {
            "$type": "TActionCardHaste",
            "Value": None,
            "TargetCount": None,
            "Target": {
                "$type": "TTargetCardRandom",
                "ExcludeSelf": False,
                "TargetSection": "SelfNeighbors",
                "Conditions": {
                    "$type": "TCardConditionalAttribute",
                    "Attribute": "CooldownMax",
                    "ComparisonOperator": "GreaterThan",
                    "ComparisonValue": {"$type": "TFixedValue", "Value": 0.0},
                },
            },
            "Cost": None,
        }
    ):
        raise ValueError("BURNACUDA_SOURCE_ABILITY_1_MISMATCH")


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
            raise ValueError("BURNACUDA_MAPPING_EXISTING_WORKBOOK_MISMATCH")
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
            prefix=args.workbook.stem + ".", suffix=".xlsx", dir=args.workbook.parent, delete=False
        ) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary)
        workbook.close()
        candidate.workbook_rows(temporary)
        temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    print("PASS Burnacuda source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
