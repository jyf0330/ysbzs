#!/usr/bin/env python3
"""Export Burnacuda's locked source mapping without claiming a complete item."""

import argparse
import csv
import hashlib
import io
import json
import tempfile
from pathlib import Path

import openpyxl

import export_original_pirate_content as formal


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_burnacuda_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/burnacuda_source_mapping"
CSV_NAME = "47_bz_item_effects.csv"
SHEET = "BZ_ITEM_EFFECTS"
SOURCE_UUID = "8f18974c-eef9-4e82-a2d2-7f4e7c67daf8"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
ITEM_ID = "item_bazaar_burnacuda"
SKILL_IDS = ("skill_bazaar_burnacuda_burn", "skill_bazaar_burnacuda_haste_neighbor")
QUALITIES = ("bronze", "silver", "gold", "diamond")
AMMO_MAXIMUM = (1, 2, 3, 4)
FORMAL_CONTENT_SHA256 = "edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd"


def expected_rows() -> list[dict[str, str]]:
    rows = []
    for quality in QUALITIES:
        effects = (
            {
                "effect_id": f"effect_bazaar_burnacuda_{quality}_0",
                "item_skill_id": SKILL_IDS[0],
                "target_type": "selected_enemy",
                "operation_type": "apply_burn",
                "stacks": "3",
                "source_ability_id": "0",
            },
            {
                "effect_id": f"effect_bazaar_burnacuda_{quality}_1",
                "item_skill_id": SKILL_IDS[1],
                "target_type": "random_adjacent_friendly_active_clock_item",
                "target_exclude_self": "false",
                "target_count": "1",
                "operation_type": "apply_status",
                "status": "haste",
                "ticks": "20",
                "source_ability_id": "1",
            },
        )
        for effect in effects:
            values = {
                "item_id": ITEM_ID,
                "quality": quality,
                "priority": "",
                "trigger_event": "item_ready",
                "condition_type": "always",
                "condition_source_relation": "any",
                "catalog_status": "candidate_reference",
                "trigger_priority": "Medium",
                "effect_order": "0",
                **effect,
            }
            rows.append({key: str(values.get(key, "")) for key in formal.DOMAIN_HEADERS[CSV_NAME]})
    return rows


def _csv_text(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(
        stream, fieldnames=formal.DOMAIN_HEADERS[CSV_NAME], lineterminator="\n"
    )
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def _atomic_write(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", delete=False
    ) as stream:
        stream.write(payload)
        temporary = Path(stream.name)
    temporary.replace(path)


def validate_rows(rows: object) -> None:
    headers = set(formal.DOMAIN_HEADERS[CSV_NAME])
    if not isinstance(rows, list) or any(
        not isinstance(row, dict)
        or set(row) != headers
        or any(not isinstance(value, str) for value in row.values())
        for row in rows
    ):
        raise ValueError("BURNACUDA_MAPPING_FIELDS_INVALID")
    if rows != expected_rows():
        raise ValueError("BURNACUDA_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != [SHEET]:
            raise ValueError("BURNACUDA_MAPPING_WORKBOOK_SHEETS_INVALID")
        values = list(workbook[SHEET].values)
        headers = formal.DOMAIN_HEADERS[CSV_NAME]
        if not values or list(values[0]) != headers:
            raise ValueError("BURNACUDA_MAPPING_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("BURNACUDA_MAPPING_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(headers) - len(raw))
            rows.append(
                {key: "" if value is None else str(value) for key, value in zip(headers, padded)}
            )
        validate_rows(rows)
        return rows
    finally:
        workbook.close()


def export_csv(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR, check: bool = False) -> None:
    expected = _csv_text(workbook_rows(workbook))
    target = csv_dir / CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != expected:
            raise ValueError("BURNACUDA_MAPPING_CSV_STALE")
    else:
        _atomic_write(target, expected)


def read_candidate(
    workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR
) -> dict[str, list[dict[str, str]]]:
    export_csv(workbook, csv_dir, check=True)
    with (csv_dir / CSV_NAME).open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    validate_rows(rows)
    return {CSV_NAME: rows}


def build_artifacts(tables: object) -> tuple[dict, dict]:
    if not isinstance(tables, dict) or set(tables) != {CSV_NAME}:
        raise ValueError("BURNACUDA_MAPPING_DOMAINS_INVALID")
    rows = tables[CSV_NAME]
    validate_rows(rows)
    quality_profiles = []
    resolved = {}
    declared_attributes = (
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
    for quality, ammo_maximum, declared in zip(QUALITIES, AMMO_MAXIMUM, declared_attributes):
        resolved.update(declared)
        quality_profiles.append(
            {
                "quality": quality,
                "sourceTier": {
                    "abilityIds": ["0", "1"],
                    "auraIds": [],
                    "tooltipIds": [0, 1],
                    "declaredAttributes": dict(declared),
                    "resolvedAttributes": dict(resolved),
                },
                "sourceAttributes": {
                    "cooldownMaxMilliseconds": 3000,
                    "multicast": 1,
                    "ammoMaximum": ammo_maximum,
                    "burnApplyAmount": 3,
                    "hasteAmountMilliseconds": 1000,
                    "hasteTargets": 1,
                },
                "effects": [
                    {
                        "sourceAbilityId": "0",
                        "sourceAbilityDirectoryIndex": 0,
                        "sourceValueAttribute": "BurnApplyAmount",
                        "sourceTriggerType": "TTriggerOnCardFired",
                        "mappedTriggerEvent": "item_ready",
                        "triggerPriority": "Medium",
                        "effectOrder": 0,
                        "target": {"type": "opponent_player"},
                        "operation": {"type": "apply_burn", "stacks": 3},
                    },
                    {
                        "sourceAbilityId": "1",
                        "sourceAbilityDirectoryIndex": 1,
                        "sourceValueAttribute": "HasteAmount",
                        "sourceTargetCountAttribute": "HasteTargets",
                        "sourceTriggerType": "TTriggerOnCardFired",
                        "mappedTriggerEvent": "item_ready",
                        "triggerPriority": "Medium",
                        "effectOrder": 0,
                        "target": {
                            "type": "random_card",
                            "section": "self_neighbors",
                            "excludeSelf": False,
                            "count": 1,
                            "condition": {
                                "attribute": "CooldownMax",
                                "operator": "GreaterThan",
                                "value": 0,
                            },
                        },
                        "operation": {"type": "apply_status", "status": "haste", "ticks": 20},
                    },
                ],
            }
        )
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Burnacuda",
        "sourceIdentity": {
            "type": "Item",
            "size": "Small",
            "startingTier": "Bronze",
            "heroes": ["Vanessa"],
            "tags": ["Aquatic", "Friend"],
            "hiddenTags": ["Burn", "Ammo", "Haste"],
            "spawningEligibility": "Always",
        },
        "itemId": ITEM_ID,
        "sourceAbilityDirectoryOrderObserved": ["0", "1"],
        "samePriorityAbilityExecutionOrderStatus": "UNVERIFIED_FAIL_CLOSED",
        "sourceAuraDirectory": [],
        "qualityProfiles": quality_profiles,
        "unknownSourceFields": [
            "initialAmmo",
            "initialCooldownProgress",
            "zeroAmmoCooldownPolicy",
            "ammoSpendRelativeToAbilityExecution",
            "samePriorityAbilityExecutionOrder",
            "randomTargetRngAndSnapshotPolicy",
            "emptyRandomTargetPolicy",
            "hasteReapplicationPolicy",
            "burnResolutionAndReapplicationPolicy",
        ],
        "excludedScopes": [
            "enchantments",
            "economy",
            "acquisition",
            "complete_initial_state",
            "simultaneous_ready_order",
            "complete_run_state",
            "top_three_identity",
        ],
    }
    digest = hashlib.sha256(
        json.dumps(mapping, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-burnacuda-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"],
        "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA,
        "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Full four-tier identity, inheritance, Ability and Aura directories",
        "limitations": [
            "This is not an executable original-pirate content package or a complete Burnacuda item.",
            "Initial Ammo, empty-Ammo cooldown, same-priority Ability order, original random selection, Haste reapplication and Burn resolution remain unverified.",
            "No enchantment, economy, acquisition, exact-top-three or original-game acceptance claim is included.",
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
        raise ValueError("BURNACUDA_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping, provenance = build_artifacts(read_candidate(args.workbook, args.csv_dir))
    for name, value in {"source-effect-mapping.json": mapping, "provenance.json": provenance}.items():
        payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        target = args.out_dir / name
        if target.exists() and target.read_text(encoding="utf-8") != payload:
            raise ValueError("BURNACUDA_MAPPING_OUTPUT_EXISTS_DIFFERENT:" + name)
        _atomic_write(target, payload)
    print(
        json.dumps(
            {
                "output": str(args.out_dir),
                "mappingSha256": provenance["mappingSha256"],
                "acceptance": mapping["acceptance"],
                "originalRulesAccepted": False,
            }
        )
    )


if __name__ == "__main__":
    main()
