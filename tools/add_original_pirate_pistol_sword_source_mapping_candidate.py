#!/usr/bin/env python3
"""Verify locked Pistol Sword source and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_pistol_sword_source_mapping_candidate as candidate


def _sha256(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("PISTOL_SWORD_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None:
        raise ValueError("PISTOL_SWORD_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "Version", "InternalName", "Type", "Size", "StartingTier",
        "Heroes", "Tags", "HiddenTags", "SpawningEligibility",
    )}
    if identity != {
        "Id": candidate.SOURCE_UUID, "Version": "5.0.0", "InternalName": "Pistol Sword",
        "Type": "Item", "Size": "Medium", "StartingTier": "Gold",
        "Heroes": ["Vanessa"], "Tags": ["Weapon"], "HiddenTags": ["Damage", "Ammo"],
        "SpawningEligibility": "Always",
    }:
        raise ValueError("PISTOL_SWORD_SOURCE_IDENTITY_MISMATCH")
    for field, expected in (
        ("Tiers", candidate.SOURCE_TIERS_SHA256),
        ("Abilities", candidate.SOURCE_ABILITIES_SHA256),
        ("Auras", candidate.SOURCE_AURAS_SHA256),
        ("Enchantments", candidate.SOURCE_ENCHANTMENTS_SHA256),
    ):
        if _sha256(card.get(field)) != expected:
            raise ValueError("PISTOL_SWORD_SOURCE_DIRECTORY_MISMATCH:" + field)
    if _sha256(card) != candidate.SOURCE_CARD_SHA256:
        raise ValueError("PISTOL_SWORD_SOURCE_CARD_MISMATCH")
    if list(card["Tiers"]) != ["Gold", "Diamond"]:
        raise ValueError("PISTOL_SWORD_SOURCE_TIER_ORDER_MISMATCH")
    resolved = {}
    declarations = (
        {"CooldownMax": 5000, "Multicast": 1, "AmmoMax": 3, "DamageAmount": 15},
        {"DamageAmount": 30},
    )
    expected_resolved = (
        {"CooldownMax": 5000, "Multicast": 1, "AmmoMax": 3, "DamageAmount": 15},
        {"CooldownMax": 5000, "Multicast": 1, "AmmoMax": 3, "DamageAmount": 30},
    )
    for quality, declared, expected in zip(("Gold", "Diamond"), declarations, expected_resolved):
        tier = card["Tiers"][quality]
        if tier.get("Attributes") != declared:
            raise ValueError("PISTOL_SWORD_SOURCE_TIER_DECLARATION_MISMATCH:" + quality)
        resolved.update(declared)
        if (
            tier.get("AbilityIds") != ["0", "1"] or tier.get("AuraIds") != []
            or tier.get("TooltipIds") != [0, 1] or resolved != expected
        ):
            raise ValueError("PISTOL_SWORD_SOURCE_TIER_MISMATCH:" + quality)
    if list(card["Abilities"]) != ["0", "1"] or card["Auras"] != {}:
        raise ValueError("PISTOL_SWORD_SOURCE_ABILITY_AURA_DIRECTORY_MISMATCH")
    if card["Abilities"]["0"] != {
        "Id": "0", "Trigger": {"$type": "TTriggerOnCardFired"}, "ActiveIn": "HandOnly",
        "Action": {
            "$type": "TActionPlayerDamage", "ReferenceValue": None,
            "Target": {"$type": "TTargetPlayerRelative", "TargetMode": "Opponent", "Conditions": None},
            "Cost": None,
        },
        "Prerequisites": None, "Priority": "Medium", "InternalName": "Pistol Sword 1",
        "InternalDescription": "Deal {ability.0} Damage", "MigrationData": "",
        "VFXConfig": {
            "VFXOverrideKey": "Assets/TheBazaar/Projectiles/ProjectilesForDerek/Projectile_ShootSingle_PV.prefab",
            "VFXShouldPlay": True, "VFXIsTakeover": False,
        },
        "TranslationKey": "e870810891a6f1f187ea04b812da8452", "WorksIn": "Anywhere",
    }:
        raise ValueError("PISTOL_SWORD_SOURCE_ABILITY_0_MISMATCH")
    if card["Abilities"]["1"] != {
        "Id": "1",
        "Trigger": {
            "$type": "TTriggerOnItemUsed",
            "Subject": {
                "$type": "TTargetCardSection", "TargetSection": "SelfHand", "ExcludeSelf": False,
                "Conditions": {
                    "$type": "TCardConditionalAttribute", "Attribute": "AmmoMax",
                    "ComparisonOperator": "GreaterThan",
                    "ComparisonValue": {"$type": "TFixedValue", "Value": 0.0},
                },
            },
        },
        "ActiveIn": "HandOnly",
        "Action": {
            "$type": "TActionPlayerDamage", "ReferenceValue": None,
            "Target": {"$type": "TTargetPlayerRelative", "TargetMode": "Opponent", "Conditions": None},
            "Cost": None,
        },
        "Prerequisites": None, "Priority": "Medium", "InternalName": "Pistol Sword 2",
        "InternalDescription": "When you use an Ammo item, deal {ability.1}", "MigrationData": "",
        "VFXConfig": {
            "VFXOverrideKey": "Assets/TheBazaar/Projectiles/Slash/VFX_Slash_Tier1_PV.prefab",
            "VFXShouldPlay": True, "VFXIsTakeover": False,
        },
        "TranslationKey": "8bcead9540e0d7788c81bfb13286c4f6", "WorksIn": "Anywhere",
    }:
        raise ValueError("PISTOL_SWORD_SOURCE_ABILITY_1_MISMATCH")
    if list(card["Enchantments"]) != [
        "Golden", "Heavy", "Icy", "Turbo", "Shielded", "Restorative", "Toxic",
        "Fiery", "Shiny", "Deadly", "Radiant", "Obsidian", "Mossy",
    ]:
        raise ValueError("PISTOL_SWORD_SOURCE_ENCHANTMENT_DIRECTORY_MISMATCH")


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
            raise ValueError("PISTOL_SWORD_MAPPING_EXISTING_WORKBOOK_MISMATCH")
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
    print("PASS Pistol Sword source verified; mapping-only workbook and CSV generated")


if __name__ == "__main__":
    main()
