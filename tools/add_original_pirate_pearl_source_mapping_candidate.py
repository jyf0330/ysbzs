#!/usr/bin/env python3
"""Verify the locked Pearl card and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_pearl_source_mapping_candidate as candidate


def _sha256(value: object) -> str:
    payload = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode()
    return hashlib.sha256(payload).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("PEARL_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute(
            "SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)
        ).fetchone()
    if row is None:
        raise ValueError("PEARL_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "Version", "InternalName", "Type", "Size", "StartingTier",
        "Heroes", "Tags", "HiddenTags", "SpawningEligibility",
    )}
    expected_identity = {
        "Id": candidate.SOURCE_UUID,
        "Version": "5.0.0",
        "InternalName": "Pearl",
        "Type": "Item",
        "Size": "Small",
        "StartingTier": "Bronze",
        "Heroes": ["Vanessa"],
        "Tags": ["Aquatic"],
        "HiddenTags": ["Shield"],
        "SpawningEligibility": "Always",
    }
    if identity != expected_identity:
        raise ValueError("PEARL_SOURCE_IDENTITY_MISMATCH")
    for field, expected in (
        ("Tiers", candidate.SOURCE_TIERS_SHA256),
        ("Abilities", candidate.SOURCE_ABILITIES_SHA256),
        ("Auras", candidate.SOURCE_AURAS_SHA256),
        ("Enchantments", candidate.SOURCE_ENCHANTMENTS_SHA256),
    ):
        if _sha256(card.get(field)) != expected:
            raise ValueError("PEARL_SOURCE_DIRECTORY_MISMATCH:" + field)
    if _sha256(card) != candidate.SOURCE_CARD_SHA256:
        raise ValueError("PEARL_SOURCE_CARD_MISMATCH")
    if list(card["Tiers"]) != ["Bronze", "Silver", "Gold", "Diamond"]:
        raise ValueError("PEARL_SOURCE_TIER_ORDER_MISMATCH")
    resolved = {}
    expected_resolved = (
        {"ChargeAmount": 1000, "ChargeTargets": 1, "CooldownMax": 5000, "Multicast": 1, "ShieldApplyAmount": 10},
        {"ChargeAmount": 1000, "ChargeTargets": 1, "CooldownMax": 5000, "Multicast": 1, "ShieldApplyAmount": 20},
        {"ChargeAmount": 1000, "ChargeTargets": 1, "CooldownMax": 5000, "Multicast": 1, "ShieldApplyAmount": 40},
        {"ChargeAmount": 1000, "ChargeTargets": 1, "CooldownMax": 5000, "Multicast": 1, "ShieldApplyAmount": 80},
    )
    for quality, expected in zip(("Bronze", "Silver", "Gold", "Diamond"), expected_resolved):
        tier = card["Tiers"][quality]
        resolved.update(tier.get("Attributes", {}))
        if (
            tier.get("AbilityIds") != ["0", "1"]
            or tier.get("AuraIds") != []
            or tier.get("TooltipIds") != [0, 1]
            or resolved != expected
        ):
            raise ValueError("PEARL_SOURCE_TIER_MISMATCH:" + quality)
    if list(card["Abilities"]) != ["0", "1"] or card["Auras"] != {}:
        raise ValueError("PEARL_SOURCE_ABILITY_AURA_DIRECTORY_MISMATCH")
    ability_zero = card["Abilities"]["0"]
    if (
        ability_zero.get("Id") != "0"
        or ability_zero.get("Trigger") != {"$type": "TTriggerOnCardFired"}
        or ability_zero.get("ActiveIn") != "HandOnly"
        or ability_zero.get("WorksIn") != "Anywhere"
        or ability_zero.get("Prerequisites") is not None
        or ability_zero.get("Priority") != "Low"
        or ability_zero.get("Action") != {
            "$type": "TActionPlayerShieldApply",
            "ReferenceValue": None,
            "Target": {
                "$type": "TTargetPlayerRelative",
                "TargetMode": "Self",
                "Conditions": None,
            },
            "Cost": None,
        }
    ):
        raise ValueError("PEARL_SOURCE_ABILITY_0_MISMATCH")
    ability_one = card["Abilities"]["1"]
    if (
        ability_one.get("Id") != "1"
        or ability_one.get("Trigger") != {
            "$type": "TTriggerOnItemUsed",
            "Subject": {
                "$type": "TTargetCardSection",
                "TargetSection": "SelfHand",
                "ExcludeSelf": True,
                "Conditions": {
                    "$type": "TCardConditionalTag",
                    "Tags": ["Aquatic"],
                    "Operator": "Any",
                },
            },
        }
        or ability_one.get("ActiveIn") != "HandOnly"
        or ability_one.get("WorksIn") != "Anywhere"
        or ability_one.get("Prerequisites") is not None
        or ability_one.get("Priority") != "Low"
        or ability_one.get("Action") != {
            "$type": "TActionCardCharge",
            "Value": None,
            "TargetCount": None,
            "Target": {"$type": "TTargetCardSelf", "Conditions": None},
            "Cost": None,
        }
    ):
        raise ValueError("PEARL_SOURCE_ABILITY_1_MISMATCH")
    if list(card["Enchantments"]) != [
        "Golden", "Heavy", "Icy", "Turbo", "Shielded", "Restorative",
        "Toxic", "Fiery", "Shiny", "Radiant", "Deadly", "Obsidian", "Mossy",
    ]:
        raise ValueError("PEARL_SOURCE_ENCHANTMENT_DIRECTORY_MISMATCH")


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
            raise ValueError("PEARL_MAPPING_EXISTING_WORKBOOK_MISMATCH")
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
        with tempfile.NamedTemporaryFile(
            prefix=args.workbook.stem + ".", suffix=".xlsx",
            dir=args.workbook.parent, delete=False,
        ) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary)
        workbook.close()
        candidate.workbook_tables(temporary)
        temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    print("PASS Pearl source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
