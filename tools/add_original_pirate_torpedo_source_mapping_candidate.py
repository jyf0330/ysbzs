#!/usr/bin/env python3
"""Verify locked Torpedo source and create only its candidate workbook."""

import argparse
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_torpedo_source_mapping_candidate as candidate


def _sha(value: object) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode()).hexdigest()


def verify_source(db: Path) -> None:
    with db.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != candidate.SOURCE_DB_SHA256:
            raise ValueError("TORPEDO_SOURCE_DB_SHA_MISMATCH")
    with sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        row = connection.execute("SELECT Data FROM cards WHERE Id=?", (candidate.SOURCE_UUID,)).fetchone()
    if row is None: raise ValueError("TORPEDO_SOURCE_UUID_MISSING")
    card = json.loads(row[0])
    if {key: card.get(key) for key in (
        "Id", "Version", "InternalName", "Type", "Size", "StartingTier",
        "Heroes", "Tags", "HiddenTags", "SpawningEligibility",
    )} != {
        "Id": candidate.SOURCE_UUID, "Version": "5.0.0", "InternalName": "Torpedo",
        "Type": "Item", "Size": "Medium", "StartingTier": "Silver",
        "Heroes": ["Vanessa"], "Tags": ["Aquatic", "Weapon", "Tech"],
        "HiddenTags": ["Damage", "DamageReference", "Ammo"], "SpawningEligibility": "Always",
    }: raise ValueError("TORPEDO_SOURCE_IDENTITY_MISMATCH")
    for field, expected in (("Tiers", candidate.SOURCE_TIERS_SHA256),
                            ("Abilities", candidate.SOURCE_ABILITIES_SHA256),
                            ("Auras", candidate.SOURCE_AURAS_SHA256),
                            ("Enchantments", candidate.SOURCE_ENCHANTMENTS_SHA256)):
        if _sha(card.get(field)) != expected:
            raise ValueError("TORPEDO_SOURCE_DIRECTORY_MISMATCH:" + field)
    if _sha(card) != candidate.SOURCE_CARD_SHA256: raise ValueError("TORPEDO_SOURCE_CARD_MISMATCH")
    expected_rows = candidate.expected_rows()
    for index, quality in enumerate(("Silver", "Gold", "Diamond")):
        source = json.loads(expected_rows[index]["payload_json"])
        tier = card["Tiers"][quality]
        if (tier.get("Attributes") != source["attributes"]
                or tier.get("AbilityIds") != source["abilityIds"]
                or tier.get("AuraIds") != source["auraIds"]
                or tier.get("TooltipIds") != source["tooltipIds"]):
            raise ValueError("TORPEDO_SOURCE_TIER_MISMATCH:" + quality)
    if list(card["Tiers"]) != ["Silver", "Gold", "Diamond"]:
        raise ValueError("TORPEDO_SOURCE_TIER_DIRECTORY_MISMATCH")
    if list(card["Abilities"]) != ["0", "1", "2"] or card["Auras"] != {}:
        raise ValueError("TORPEDO_SOURCE_ABILITY_AURA_DIRECTORY_MISMATCH")
    for index, ability_id in enumerate(("0", "1", "2"), start=3):
        expected = json.loads(expected_rows[index]["payload_json"])
        ability = card["Abilities"][ability_id]
        actual = {"priority": ability.get("Priority"), "trigger": ability.get("Trigger"),
                  "action": ability.get("Action"), "activeIn": ability.get("ActiveIn"),
                  "worksIn": ability.get("WorksIn"), "prerequisites": ability.get("Prerequisites")}
        if actual != expected: raise ValueError("TORPEDO_SOURCE_ABILITY_MISMATCH:" + ability_id)
    radiant = card["Enchantments"].get("Radiant")
    expected_radiant = json.loads(expected_rows[7]["payload_json"])
    if (radiant.get("Attributes") != expected_radiant["attributes"]
            or list(radiant.get("Abilities", {})) != expected_radiant["abilityIds"]
            or list(radiant.get("Auras", {})) != expected_radiant["auraIds"]
            or radiant.get("Tags") != [] or radiant.get("HiddenTags") != []
            or radiant.get("HasAbilities") is not False or radiant.get("HasAuras") is not False):
        raise ValueError("TORPEDO_SOURCE_RADIANT_OVERLAY_MISMATCH")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    args = parser.parse_args()
    verify_source(args.db)
    rows = candidate.expected_rows()
    if candidate.WORKBOOK.exists():
        if candidate.workbook_rows() != rows: raise ValueError("TORPEDO_EXISTING_WORKBOOK_MISMATCH")
    else:
        workbook = openpyxl.Workbook(); sheet = workbook.active; sheet.title = candidate.SHEET
        sheet.append(candidate.HEADERS)
        for row in rows: sheet.append([row[key] for key in candidate.HEADERS])
        candidate.WORKBOOK.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix=candidate.WORKBOOK.stem + ".", suffix=".xlsx",
                                         dir=candidate.WORKBOOK.parent, delete=False) as stream:
            temporary = Path(stream.name)
        workbook.save(temporary); workbook.close(); candidate.workbook_rows(temporary)
        temporary.replace(candidate.WORKBOOK)
    candidate.export_csv(); candidate.write_artifacts()
    print("PASS Torpedo source verified; isolated workbook, CSV and JSON generated")


if __name__ == "__main__": main()
