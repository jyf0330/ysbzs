#!/usr/bin/env python3
"""Verify the locked Wetware source and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_wetware_source_mapping_candidate as candidate


def _sha256(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("WETWARE_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute(
            "SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)
        ).fetchone()
    if row is None:
        raise ValueError("WETWARE_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    identity = {key: card.get(key) for key in (
        "Id", "Version", "InternalName", "Type", "Size", "StartingTier",
        "Heroes", "Tags", "HiddenTags", "SpawningEligibility",
    )}
    if identity != {
        "Id": candidate.SOURCE_UUID, "Version": "5.0.0", "InternalName": "Wetware",
        "Type": "Item", "Size": "Medium", "StartingTier": "Silver",
        "Heroes": ["Vanessa"], "Tags": ["Aquatic", "Apparel", "Tech"],
        "HiddenTags": ["Shield", "DamageReference"], "SpawningEligibility": "Always",
    }:
        raise ValueError("WETWARE_SOURCE_IDENTITY_MISMATCH")
    for field, expected in (
        ("Tiers", candidate.SOURCE_TIERS_SHA256),
        ("Abilities", candidate.SOURCE_ABILITIES_SHA256),
        ("Auras", candidate.SOURCE_AURAS_SHA256),
    ):
        if _sha256(card.get(field)) != expected:
            raise ValueError("WETWARE_SOURCE_DIRECTORY_MISMATCH:" + field)
    if _sha256(card) != candidate.SOURCE_CARD_SHA256:
        raise ValueError("WETWARE_SOURCE_CARD_MISMATCH")
    expected_declared = (
        {"CooldownMax": 6000, "Multicast": 1, "ShieldApplyAmount": 20, "Custom_0": 15},
        {"ShieldApplyAmount": 40, "Custom_0": 25},
        {"ShieldApplyAmount": 80, "Custom_0": 35},
    )
    resolved = {}
    expected_resolved = (
        {"CooldownMax": 6000, "Multicast": 1, "ShieldApplyAmount": 20, "Custom_0": 15},
        {"CooldownMax": 6000, "Multicast": 1, "ShieldApplyAmount": 40, "Custom_0": 25},
        {"CooldownMax": 6000, "Multicast": 1, "ShieldApplyAmount": 80, "Custom_0": 35},
    )
    if list(card["Tiers"]) != ["Silver", "Gold", "Diamond"]:
        raise ValueError("WETWARE_SOURCE_TIER_DIRECTORY_MISMATCH")
    for quality, declared, final in zip(
        ("Silver", "Gold", "Diamond"), expected_declared, expected_resolved
    ):
        tier = card["Tiers"][quality]
        resolved.update(tier.get("Attributes", {}))
        if (tier.get("Attributes") != declared or tier.get("AbilityIds") != ["0", "1"]
                or tier.get("AuraIds") != [] or tier.get("TooltipIds") != [0, 1, 2]
                or resolved != final):
            raise ValueError("WETWARE_SOURCE_TIER_MISMATCH:" + quality)
    if list(card["Abilities"]) != ["0", "1"] or card["Auras"] != {}:
        raise ValueError("WETWARE_SOURCE_ABILITY_AURA_DIRECTORY_MISMATCH")
    expected_rows = candidate._ability_rows()
    for row in expected_rows:
        ability = card["Abilities"][row["source_ability_id"]]
        if (ability.get("Id") != row["source_ability_id"]
                or ability.get("Priority") != row["priority"]
                or ability.get("Trigger") != json.loads(row["trigger_json"])
                or ability.get("Action") != json.loads(row["action_json"])
                or ability.get("ActiveIn") != row["active_in"]
                or ability.get("WorksIn") != row["works_in"]
                or ability.get("Prerequisites") != json.loads(row["prerequisites_json"])):
            raise ValueError("WETWARE_SOURCE_ABILITY_MISMATCH:" + row["source_ability_id"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--workbook", type=Path, default=candidate.WORKBOOK)
    args = parser.parse_args()
    verify_source(args.db)
    tables = candidate.expected_tables()
    if args.workbook.exists():
        if candidate.workbook_tables(args.workbook) != tables:
            raise ValueError("WETWARE_MAPPING_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook()
        workbook.remove(workbook.active)
        for name, sheet_name in candidate.SHEETS.items():
            sheet = workbook.create_sheet(sheet_name)
            headers = candidate.HEADERS[name]
            sheet.append(headers)
            for row in tables[name]:
                sheet.append([row[key] for key in headers])
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
    candidate.export_csv(args.workbook, candidate.CSV_DIR)
    candidate.write_artifacts()
    print("PASS Wetware source verified; isolated workbook, CSV and JSON generated")


if __name__ == "__main__":
    main()
