#!/usr/bin/env python3
"""Verify the locked Dive Weights card and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_dive_weights_source_mapping_candidate as candidate


def _reference(attribute: str, *, modifier: bool) -> dict:
    value = {
        "$type": "TReferenceValueCardAttribute",
        "AttributeType": attribute,
        "Target": {"$type": "TTargetCardSelf", "Conditions": None},
        "DefaultValue": 0.0,
        "Modifier": None,
    }
    if modifier:
        value["Modifier"] = {
            "ModifyMode": "Multiply",
            "Value": {"$type": "TFixedValue", "Value": 1.0},
            "ShouldRound": True,
        }
    return value


def _aura_action(attribute: str, *, modifier: bool) -> dict:
    return {
        "$type": "TAuraActionCardModifyAttribute",
        "AttributeType": attribute,
        "Operation": "Add",
        "Value": _reference("Custom_0" if modifier else "Ammo", modifier=modifier),
        "Target": {"$type": "TTargetCardSelf", "Conditions": None},
    }


def _adjacent_prerequisite(target_mode: str) -> list[dict]:
    return [{
        "$type": "TPrerequisiteCardCount",
        "Subject": {
            "$type": "TTargetCardPositional", "Origin": "Self", "TargetMode": target_mode,
            "IncludeOrigin": False,
            "Conditions": {"$type": "TCardConditionalTag", "Tags": ["Aquatic"], "Operator": "Any"},
        },
        "Comparison": "Equal", "Amount": 1,
    }]


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("DIVE_WEIGHTS_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("DIVE_WEIGHTS_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags",
        "HiddenTags", "SpawningEligibility",
    )}
    if identity != {
        "Id": candidate.SOURCE_UUID, "InternalName": "Dive Weights", "Type": "Item",
        "Size": "Small", "StartingTier": "Silver", "Heroes": ["Vanessa"],
        "Tags": ["Aquatic", "Tool", "Apparel"], "HiddenTags": ["Haste", "Ammo"],
        "SpawningEligibility": "Always",
    }:
        raise ValueError("DIVE_WEIGHTS_SOURCE_IDENTITY_MISMATCH")
    if list(card.get("Tiers", {})) != ["Silver", "Gold", "Diamond"]:
        raise ValueError("DIVE_WEIGHTS_SOURCE_TIER_DIRECTORY_MISMATCH")
    declared_attributes = (
        {"CooldownMax": 8000, "Multicast": 1, "HasteTargets": 1, "HasteAmount": 1000, "AmmoMax": 4, "Custom_0": 1000},
        {"HasteAmount": 2000},
        {"HasteAmount": 3000},
    )
    resolved = {}
    for quality, declared, haste_ms in zip(("Silver", "Gold", "Diamond"), declared_attributes, candidate.HASTE_MS):
        tier = card["Tiers"][quality]
        if tier.get("AbilityIds") != ["0"] or tier.get("AuraIds") != ["1", "2", "3"] or tier.get("TooltipIds") != [0, 1, 2]:
            raise ValueError("DIVE_WEIGHTS_SOURCE_TIER_REFS_MISMATCH:" + quality)
        if tier.get("Attributes") != declared:
            raise ValueError("DIVE_WEIGHTS_SOURCE_TIER_ATTRIBUTES_MISMATCH:" + quality)
        resolved.update(declared)
        if resolved != {
            "CooldownMax": 8000, "Multicast": 1, "HasteTargets": 1,
            "HasteAmount": haste_ms, "AmmoMax": 4, "Custom_0": 1000,
        }:
            raise ValueError("DIVE_WEIGHTS_SOURCE_TIER_INHERITANCE_MISMATCH:" + quality)

    if list(card.get("Abilities", {})) != ["0"] or list((card.get("Auras") or {})) != ["1", "2", "3"]:
        raise ValueError("DIVE_WEIGHTS_SOURCE_ACTION_DIRECTORIES_MISMATCH")
    ability = card["Abilities"]["0"]
    if (
        ability.get("Priority") != "Medium"
        or ability.get("Trigger") != {"$type": "TTriggerOnCardFired"}
        or ability.get("Prerequisites") is not None
        or ability.get("ActiveIn") != "HandOnly"
        or ability.get("WorksIn") != "Anywhere"
        or ability.get("Action") != {
            "$type": "TActionCardHaste", "Value": None, "TargetCount": None,
            "Target": {
                "$type": "TTargetCardRandom", "ExcludeSelf": False, "TargetSection": "SelfHand",
                "Conditions": {
                    "$type": "TCardConditionalAttribute", "Attribute": "CooldownMax",
                    "ComparisonOperator": "GreaterThan",
                    "ComparisonValue": {"$type": "TFixedValue", "Value": 0.0},
                },
            },
            "Cost": None,
        }
    ):
        raise ValueError("DIVE_WEIGHTS_SOURCE_ABILITY_0_MISMATCH")
    for aura_id, target_mode in (("1", "LeftCard"), ("2", "RightCard")):
        aura = card["Auras"][aura_id]
        if (
            aura.get("Id") != aura_id or aura.get("ActiveIn") != "HandAndStash"
            or aura.get("WorksIn") != "Anywhere"
            or aura.get("Action") != _aura_action("FlatCooldownReduction", modifier=True)
            or aura.get("Prerequisites") != _adjacent_prerequisite(target_mode)
        ):
            raise ValueError("DIVE_WEIGHTS_SOURCE_AURA_MISMATCH:" + aura_id)
    aura_three = card["Auras"]["3"]
    if (
        aura_three.get("Id") != "3" or aura_three.get("ActiveIn") != "HandAndStash"
        or aura_three.get("WorksIn") != "Anywhere"
        or aura_three.get("Action") != _aura_action("Multicast", modifier=False)
        or aura_three.get("Prerequisites") is not None
    ):
        raise ValueError("DIVE_WEIGHTS_SOURCE_AURA_MISMATCH:3")


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
            raise ValueError("DIVE_WEIGHTS_MAPPING_EXISTING_WORKBOOK_MISMATCH")
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
    print("PASS Dive Weights source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
