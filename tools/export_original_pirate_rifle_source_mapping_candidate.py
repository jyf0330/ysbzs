#!/usr/bin/env python3
"""Export a source-locked Rifle Ability mapping artifact, never a complete item."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import tempfile

import openpyxl

import export_original_pirate_content as formal


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_rifle_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/rifle_source_mapping"
CSV_NAME = "47_bz_item_effects.csv"
SHEET = "BZ_ITEM_EFFECTS"
SOURCE_UUID = "1dcc7604-4f84-46e9-bbd1-2456317ec0ed"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
BASE_HASH = "36f2f03b10f3d822472b216db9a8c355fd42df829c2831ed40cda1555192a83b"
ITEM_ID = "item_bazaar_rifle"
SKILL_ID = "skill_bazaar_rifle"
QUALITIES = ("bronze", "silver", "gold", "diamond")
DAMAGE = (20, 40, 80, 160)
GROWTH = (10, 20, 40, 80)


def expected_rows() -> list[dict[str, str]]:
    rows = []
    for quality, damage, growth in zip(QUALITIES, DAMAGE, GROWTH):
        common = dict(item_id=ITEM_ID, quality=quality, item_skill_id=SKILL_ID,
                      priority="", trigger_event="item_ready", condition_type="always",
                      condition_source_relation="any", catalog_status="candidate_reference")
        values = [
            dict(common, effect_id=f"effect_bazaar_rifle_{quality}_damage",
                 target_type="selected_enemy", operation_type="deal_damage", amount=str(damage),
                 source_ability_id="0", trigger_priority="Medium", effect_order="0"),
            dict(common, effect_id=f"effect_bazaar_rifle_{quality}_growth",
                 target_type="self_item", operation_type="gain_damage_for_fight", amount=str(growth),
                 source_ability_id="1", trigger_priority="Low", effect_order="0"),
        ]
        for value in values:
            rows.append({key: str(value.get(key, "")) for key in formal.DOMAIN_HEADERS[CSV_NAME]})
    return rows


def _csv_text(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=formal.DOMAIN_HEADERS[CSV_NAME], lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", delete=False,
    ) as stream:
        stream.write(text)
        temporary = Path(stream.name)
    temporary.replace(path)


def validate_rows(rows: list[dict[str, str]]) -> None:
    headers = set(formal.DOMAIN_HEADERS[CSV_NAME])
    if not isinstance(rows, list) or any(
        not isinstance(row, dict) or set(row) != headers
        or any(not isinstance(value, str) for value in row.values())
        for row in rows
    ):
        raise ValueError("RIFLE_MAPPING_FIELDS_INVALID")
    if rows != expected_rows():
        raise ValueError("RIFLE_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != [SHEET]:
            raise ValueError("RIFLE_MAPPING_WORKBOOK_SHEETS_INVALID")
        values = list(workbook[SHEET].values)
        if not values or list(values[0]) != formal.DOMAIN_HEADERS[CSV_NAME]:
            raise ValueError("RIFLE_MAPPING_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("RIFLE_MAPPING_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(values[0]) - len(raw))
            rows.append({key: "" if value is None else str(value) for key, value in zip(values[0], padded)})
        validate_rows(rows)
        return rows
    finally:
        workbook.close()


def export_csv(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR, check: bool = False) -> None:
    expected = _csv_text(workbook_rows(workbook))
    target = csv_dir / CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != expected:
            raise ValueError("RIFLE_MAPPING_CSV_STALE")
    else:
        _atomic_write(target, expected)


def read_candidate(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR) -> dict[str, list[dict[str, str]]]:
    export_csv(workbook, csv_dir, check=True)
    with (csv_dir / CSV_NAME).open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    validate_rows(rows)
    return {CSV_NAME: rows}


def build_artifacts(tables: dict[str, list[dict[str, str]]]):
    if not isinstance(tables, dict) or set(tables) != {CSV_NAME}:
        raise ValueError("RIFLE_MAPPING_DOMAINS_INVALID")
    rows = tables[CSV_NAME]
    validate_rows(rows)
    profiles = []
    for quality in QUALITIES:
        quality_rows = [row for row in rows if row["quality"] == quality]
        effects = []
        for row in quality_rows:
            operation = {"type": row["operation_type"], "amount": int(row["amount"])}
            effects.append({
                "sourceAbilityId": row["source_ability_id"],
                "sourceTriggerType": "TTriggerOnCardFired",
                "mappedTriggerEvent": row["trigger_event"],
                "triggerPriority": row["trigger_priority"],
                "effectOrder": int(row["effect_order"]),
                "target": row["target_type"],
                "operation": operation,
            })
        profiles.append({
            "quality": quality,
            "sourceAttributes": {
                "cooldownMaxMilliseconds": 2000,
                "multicast": 1,
                "ammoMaximum": 1,
            },
            "effects": effects,
        })
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Rifle",
        "itemId": ITEM_ID,
        "qualityProfiles": profiles,
        "unknownSourceFields": ["initialAmmo", "baseCritChance"],
        "excludedScopes": ["enchantments", "economy", "acquisition", "complete_initial_state"],
    }
    mapping_hash = hashlib.sha256(
        json.dumps(mapping, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-rifle-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"],
        "notValidatedAs": formal.CONTENT_SCHEMA,
        "mappingSha256": mapping_hash,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Abilities 0 and 1 plus resolved tier attributes only",
        "limitations": [
            "This is not an executable original-pirate content package or a complete Rifle item.",
            "Initial Ammo and base Crit chance are intentionally absent because their defaults are unverified.",
            "No enchantment, price, acquisition, Run state or original-game acceptance claim is included.",
        ],
    }
    return mapping, provenance


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=CSV_DIR)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    resolved = args.out_dir.resolve()
    if resolved == formal.DEFAULT_CSV_DIR.resolve() or "gameplay" in resolved.parts or "generated" in resolved.parts:
        raise ValueError("RIFLE_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping, provenance = build_artifacts(read_candidate(args.workbook, args.csv_dir))
    outputs = {
        "source-effect-mapping.json": mapping,
        "provenance.json": provenance,
    }
    for name, value in outputs.items():
        text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        target = args.out_dir / name
        if target.exists() and target.read_text(encoding="utf-8") != text:
            raise ValueError("RIFLE_MAPPING_OUTPUT_EXISTS_DIFFERENT:" + name)
        _atomic_write(target, text)
    print(json.dumps({"output": str(args.out_dir), "mappingSha256": provenance["mappingSha256"],
                      "acceptance": mapping["acceptance"]}))


if __name__ == "__main__":
    main()
