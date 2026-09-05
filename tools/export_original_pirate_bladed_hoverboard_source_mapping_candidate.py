#!/usr/bin/env python3
"""Export a fail-closed Bladed Hoverboard source mapping candidate."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_bladed_hoverboard_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/bladed_hoverboard_source_mapping"
SOURCE_UUID = "808ad956-94c2-4510-a06c-396156c59791"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
FORMAL_CONTENT_SHA256 = "8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366"
PROFILE_CSV = "source_profiles.csv"
HEADERS = [
    "record_type", "source_id", "scope", "quality_or_enchantment", "priority",
    "trigger", "action_type", "attribute", "target", "value_expression",
    "active_in", "works_in",
]


class DuplicateJsonKeyError(ValueError):
    """Raised when a decoded JSON object repeats a key at any nesting depth."""


def _reject_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict:
    value = {}
    for key, item in pairs:
        if key in value:
            raise DuplicateJsonKeyError(key)
        value[key] = item
    return value


def _load_json_without_duplicates(payload: str) -> object:
    return json.loads(payload, object_pairs_hook=_reject_duplicate_json_keys)


def _strict_json_equal(actual: object, expected: object) -> bool:
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, dict):
        if list(actual) != list(expected):
            return False
        return all(_strict_json_equal(actual[key], expected[key]) for key in expected)
    if isinstance(expected, list):
        return (len(actual) == len(expected)
                and all(_strict_json_equal(left, right)
                        for left, right in zip(actual, expected)))
    return actual == expected


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _neighbor_item_used_trigger() -> dict:
    return {
        "type": "TTriggerOnItemUsed",
        "subject": {
            "type": "TTargetCardPositional", "origin": "Self",
            "targetMode": "Neighbor", "includeOrigin": False,
        },
    }


def expected_rows() -> list[dict[str, str]]:
    rows = []
    for quality, damage in (("silver", 20), ("gold", 40), ("diamond", 60)):
        rows.append({
            "record_type": "tier", "source_id": quality, "scope": "base",
            "quality_or_enchantment": quality,
            "value_expression": _canonical({
                "abilityIds": ["0", "1"], "auraIds": [], "tooltipIds": [0],
                "damageAmount": damage, "flyingTargets": 1,
            }),
        })
    trigger = _canonical(_neighbor_item_used_trigger())
    rows.extend([
        {"record_type": "ability", "source_id": "0", "scope": "base",
         "priority": "Medium", "trigger": trigger,
         "action_type": "TActionPlayerDamage", "target": "OpponentPlayer",
         "value_expression": "ReferenceValue:null", "active_in": "HandOnly",
         "works_in": "Anywhere"},
        {"record_type": "ability", "source_id": "1", "scope": "base",
         "priority": "Medium", "trigger": trigger,
         "action_type": "TActionCardFlyingStart", "target": "TriggerSource",
         "value_expression": _canonical({
             "condition": {"attribute": "Flying", "operator": "Equal", "value": 0},
             "excludeSelf": False,
         }), "active_in": "HandOnly", "works_in": "Anywhere"},
        {"record_type": "enchantment", "source_id": "Toxic", "scope": "enchantment",
         "quality_or_enchantment": "Toxic", "value_expression": _canonical({
             "hiddenTags": ["Poison"], "abilityIds": ["e1"], "auraIds": ["e2"],
             "declaredAttributes": {"PoisonApplyAmount": 0},
         })},
        {"record_type": "ability", "source_id": "e1", "scope": "Toxic",
         "quality_or_enchantment": "Toxic", "priority": "Medium", "trigger": trigger,
         "action_type": "TActionPlayerPoisonApply", "target": "OpponentPlayer",
         "value_expression": "ReferenceValue:null", "active_in": "HandOnly",
         "works_in": "Anywhere"},
        {"record_type": "aura", "source_id": "e2", "scope": "Toxic",
         "quality_or_enchantment": "Toxic",
         "action_type": "TAuraActionCardModifyAttribute",
         "attribute": "PoisonApplyAmount", "target": "SelfCard",
         "value_expression": "Self.DamageAmount*0.1:round",
         "active_in": "HandAndStash", "works_in": "Anywhere"},
    ])
    return [{key: str(row.get(key, "")) for key in HEADERS} for row in rows]


def _csv_text(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=HEADERS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != ["SOURCE_MAPPING"]:
            raise ValueError("BLADED_HOVERBOARD_WORKBOOK_SHEETS_INVALID")
        values = list(workbook["SOURCE_MAPPING"].values)
        if not values or list(values[0]) != HEADERS:
            raise ValueError("BLADED_HOVERBOARD_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("BLADED_HOVERBOARD_WORKBOOK_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(HEADERS) - len(raw))
            rows.append({key: "" if value is None else str(value)
                         for key, value in zip(HEADERS, padded)})
    finally:
        workbook.close()
    if rows != expected_rows():
        raise ValueError("BLADED_HOVERBOARD_MAPPING_SOURCE_LOCK_MISMATCH")
    return rows


def export_csv(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR,
               check: bool = False) -> None:
    payload = _csv_text(workbook_rows(workbook))
    target = csv_dir / PROFILE_CSV
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != payload:
            raise ValueError("BLADED_HOVERBOARD_MAPPING_CSV_STALE")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent,
                                     prefix=target.name + ".", delete=False) as stream:
        stream.write(payload)
        temporary = Path(stream.name)
    temporary.replace(target)


def build_artifacts(rows: object) -> tuple[dict, dict]:
    if rows != expected_rows():
        raise ValueError("BLADED_HOVERBOARD_MAPPING_SOURCE_LOCK_MISMATCH")
    trigger = _neighbor_item_used_trigger()
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Bladed Hoverboard",
        "requestedRankProfile": {
            "rank": 2, "quality": "gold", "enchantment": "Toxic",
            "status": "requested_candidate_only_not_source_popularity_evidence",
        },
        "sourceIdentity": {
            "type": "Item", "size": "Medium", "startingTier": "Silver",
            "heroes": ["Vanessa"], "tags": ["Weapon", "Tech", "Aquatic", "Vehicle"],
            "hiddenTags": ["Damage", "Flying"], "spawningEligibility": "Always",
        },
        "sourceAbilityDirectoryOrderObserved": ["0", "1"],
        "sourceBaseAuraDirectoryObserved": [],
        "qualityProfiles": [
            {"quality": quality, "abilityIds": ["0", "1"], "auraIds": [],
             "damageAmount": damage, "flyingTargets": 1}
            for quality, damage in (("silver", 20), ("gold", 40), ("diamond", 60))
        ],
        "baseAbilities": [
            {"sourceAbilityId": "0", "declaredPriority": "Medium", "trigger": trigger,
             "action": "TActionPlayerDamage", "target": "opponent_player",
             "referenceValue": None},
            {"sourceAbilityId": "1", "declaredPriority": "Medium", "trigger": trigger,
             "action": "TActionCardFlyingStart", "target": "trigger_source",
             "targetCount": None, "duration": None, "excludeSelf": False,
             "condition": {"attribute": "Flying", "operator": "Equal", "value": 0}},
        ],
        "toxicOverlay": {
            "hiddenTags": ["Poison"], "declaredAttributes": {"PoisonApplyAmount": 0},
            "ability": {
                "sourceAbilityId": "e1", "declaredPriority": "Medium", "trigger": trigger,
                "action": "TActionPlayerPoisonApply", "target": "opponent_player",
                "referenceValue": None,
            },
            "aura": {
                "sourceAuraId": "e2", "attribute": "PoisonApplyAmount",
                "operation": "Add", "target": "self_card",
                "value": {"attribute": "DamageAmount", "target": "self_card",
                          "multiplier": 0.1, "shouldRound": True},
            },
        },
        "unknownSourceFields": [
            "nullReferenceValueRuntimeBinding", "runtimePriorityTierOrdering",
            "base0Base1ToxicE1SameMediumExecutionOrder", "nestedTriggerQueueTiming",
            "flyingStateApplicationTiming", "poisonRoundingAndApplicationTiming",
            "criticalEligibility", "rngSeedAndConsumptionForRank2CompleteBuild",
            "completeCooldownStatusAndTargetInteraction",
        ],
        "excludedScopes": [
            "non_toxic_enchantments", "economy", "acquisition", "complete_rank2_build",
            "complete_combat_initial_state", "runtime_priority_acceptance",
            "simultaneous_ready_order", "top_three_popularity_evidence",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-bladed-hoverboard-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Three base tiers, Abilities 0/1, empty base Aura directory and Toxic e1/e2 overlay",
        "limitations": [
            "This is not executable original-pirate content or a complete Rank 2 build.",
            "Medium is a locked source declaration, not proof of runtime tier semantics or same-tier order.",
            "Null ReferenceValue binding, nested timing, status application and complete-build RNG remain unverified.",
            "No popularity, economy, acquisition, match acceptance or original-game execution claim is included.",
        ],
    }
    return mapping, provenance


def write_artifacts(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR) -> None:
    mapping, provenance = build_artifacts(workbook_rows(workbook))
    for name, value in (("source-effect-mapping.json", mapping),
                        ("provenance.json", provenance)):
        path = csv_dir / name
        payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=path.name + ".", delete=False) as stream:
            stream.write(payload)
            temporary = Path(stream.name)
        temporary.replace(path)


def validate_artifacts(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR) -> None:
    mapping, provenance = build_artifacts(workbook_rows(workbook))
    for name, expected in (("source-effect-mapping.json", mapping),
                           ("provenance.json", provenance)):
        path = csv_dir / name
        try:
            actual = _load_json_without_duplicates(path.read_text(encoding="utf-8"))
        except DuplicateJsonKeyError as error:
            raise ValueError(
                "BLADED_HOVERBOARD_ARTIFACT_DUPLICATE_KEY:"
                + name + ":" + str(error)
            ) from error
        except (OSError, ValueError) as error:
            raise ValueError("BLADED_HOVERBOARD_ARTIFACT_UNREADABLE:" + name) from error
        if not _strict_json_equal(actual, expected):
            raise ValueError("BLADED_HOVERBOARD_ARTIFACT_STALE:" + name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=CSV_DIR)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export_csv(args.workbook, args.csv_dir, check=args.check)
    if args.check:
        validate_artifacts(args.workbook, args.csv_dir)
    else:
        write_artifacts(args.workbook, args.csv_dir)
    print("PASS Bladed Hoverboard source mapping candidate")


if __name__ == "__main__":
    main()
