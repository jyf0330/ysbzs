#!/usr/bin/env python3
"""Verify locked Run-C listeners and create their isolated workbook/CSV."""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile

import openpyxl

import export_original_pirate_run_c_listener_mapping_candidate as candidate


def _card(db: Path, uuid: str) -> dict:
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (uuid,)).fetchone()
    if row is None:
        raise ValueError("RUN_C_LISTENER_SOURCE_UUID_MISSING:" + uuid)
    return json.loads(row[0])


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("RUN_C_LISTENER_SOURCE_DB_SHA_MISMATCH")
    cannonade = _card(db, candidate.CANNONADE_UUID)
    grapeshot = _card(db, candidate.GRAPESHOT_UUID)
    if {key: cannonade.get(key) for key in ("Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags", "HiddenTags", "SpawningEligibility")} != {
        "Id": candidate.CANNONADE_UUID, "InternalName": "Cannonade", "Type": "Item",
        "Size": "Large", "StartingTier": "Gold", "Heroes": ["Vanessa"], "Tags": ["Weapon"],
        "HiddenTags": ["Damage", "BurnReference"], "SpawningEligibility": "Always",
    }:
        raise ValueError("RUN_C_CANNONADE_IDENTITY_MISMATCH")
    c_resolved = {}
    for quality, cooldown, damage in (("Gold", 12000, 200), ("Diamond", 10000, 300)):
        tier = cannonade["Tiers"][quality]; c_resolved.update(tier.get("Attributes", {}))
        if tier.get("AbilityIds") != ["0", "1"] or c_resolved != {
            "CooldownMax": cooldown, "Multicast": 3, "DamageAmount": damage,
            "ChargeTargets": 1, "ChargeAmount": 2000,
        }:
            raise ValueError("RUN_C_CANNONADE_TIER_MISMATCH:" + quality)
    c_ability = cannonade["Abilities"]["1"]
    if c_ability.get("Priority") != "Medium" or c_ability.get("Prerequisites") is not None \
            or c_ability.get("ActiveIn") != "HandOnly" or c_ability.get("WorksIn") != "Anywhere" \
            or c_ability.get("Trigger") != candidate.cannonade_trigger() \
            or c_ability.get("Action") != candidate.self_action("TActionCardCharge"):
        raise ValueError("RUN_C_CANNONADE_ABILITY_MISMATCH")
    if {key: grapeshot.get(key) for key in ("Id", "InternalName", "Type", "Size", "StartingTier", "Heroes", "Tags", "HiddenTags", "SpawningEligibility")} != {
        "Id": candidate.GRAPESHOT_UUID, "InternalName": "Grapeshot", "Type": "Item",
        "Size": "Small", "StartingTier": "Bronze", "Heroes": ["Vanessa"], "Tags": ["Weapon"],
        "HiddenTags": ["Damage", "Ammo"], "SpawningEligibility": "Always",
    }:
        raise ValueError("RUN_C_GRAPESHOT_IDENTITY_MISMATCH")
    g_resolved = {}
    for quality, damage in (("Bronze", 30), ("Silver", 60), ("Gold", 120), ("Diamond", 240)):
        tier = grapeshot["Tiers"][quality]; g_resolved.update(tier.get("Attributes", {}))
        if tier.get("AbilityIds") != ["0", "1"] or g_resolved != {
            "CooldownMax": 4000, "Multicast": 1, "AmmoMax": 1,
            "DamageAmount": damage, "ReloadAmount": 1, "ReloadTargets": 1,
        }:
            raise ValueError("RUN_C_GRAPESHOT_TIER_MISMATCH:" + quality)
    g_ability = grapeshot["Abilities"]["1"]
    if g_ability.get("Priority") != "Lowest" or g_ability.get("Prerequisites") is not None \
            or g_ability.get("ActiveIn") != "HandOnly" or g_ability.get("WorksIn") != "Anywhere" \
            or g_ability.get("Trigger") != candidate.grapeshot_trigger() \
            or g_ability.get("Action") != candidate.self_action("TActionCardReload"):
        raise ValueError("RUN_C_GRAPESHOT_ABILITY_MISMATCH")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, default=candidate.WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=candidate.CSV_DIR)
    args = parser.parse_args(); verify_source(args.db)
    rows = candidate.expected_rows()
    if args.workbook.exists():
        if candidate.workbook_rows(args.workbook) != rows:
            raise ValueError("RUN_C_LISTENER_MAPPING_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook(); sheet = workbook.active; sheet.title = candidate.SHEET
        sheet.append(candidate.HEADERS)
        for row in rows: sheet.append([row[key] for key in candidate.HEADERS])
        args.workbook.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=args.workbook.stem + ".", suffix=".xlsx", dir=args.workbook.parent, delete=False) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary); workbook.close(); candidate.workbook_rows(temporary); temporary.replace(args.workbook)
    candidate.export_csv(args.workbook, args.csv_dir)
    print("PASS Run C Cannonade/Grapeshot listener sources verified")


if __name__ == "__main__":
    main()
