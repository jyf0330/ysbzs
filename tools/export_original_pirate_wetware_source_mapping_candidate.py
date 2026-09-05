#!/usr/bin/env python3
"""Export Wetware's isolated, fail-closed source mapping candidate."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_wetware_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/wetware_source_mapping"
SOURCE_UUID = "dd913d79-7509-4c8a-b68a-5bf364dc521e"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
SOURCE_CARD_SHA256 = "cba511727cac679efe645bb469067846fdcbd1ee5189d0efa38474d245a06d8b"
SOURCE_TIERS_SHA256 = "aacf1f03b94f9d974ac039a5ae0626acc6da84b224b63eb5528625f04a4c191f"
SOURCE_ABILITIES_SHA256 = "f648ad26812dfa5c869893ecc5ef396aaf6d5186d6bbde666936d5155e18b23a"
SOURCE_AURAS_SHA256 = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
TIER_CSV = "source_tiers.csv"
ABILITY_CSV = "source_abilities.csv"
AURA_CSV = "source_auras.csv"
APPEARANCE_CSV = "reference_build_appearances.csv"
SHEETS = {
    TIER_CSV: "SOURCE_TIERS",
    ABILITY_CSV: "SOURCE_ABILITIES",
    AURA_CSV: "SOURCE_AURAS",
    APPEARANCE_CSV: "REFERENCE_BUILDS",
}
HEADERS = {
    TIER_CSV: ["quality", "ability_ids", "aura_ids", "tooltip_ids", "declared_attributes_json"],
    ABILITY_CSV: [
        "source_ability_id", "priority", "trigger_json", "action_json",
        "active_in", "works_in", "prerequisites_json",
    ],
    AURA_CSV: ["source_aura_id", "source_payload_json"],
    APPEARANCE_CSV: ["rank", "quality", "enchantment", "evidence_scope"],
}


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _ability_rows() -> list[dict[str, str]]:
    return [
        {
            "source_ability_id": "0",
            "priority": "Medium",
            "trigger_json": _canonical({"$type": "TTriggerOnCardFired"}),
            "action_json": _canonical({
                "$type": "TActionPlayerShieldApply",
                "ReferenceValue": None,
                "Target": {
                    "$type": "TTargetPlayerRelative", "TargetMode": "Self",
                    "Conditions": None,
                },
                "Cost": None,
            }),
            "active_in": "HandOnly",
            "works_in": "Anywhere",
            "prerequisites_json": "null",
        },
        {
            "source_ability_id": "1",
            "priority": "Medium",
            "trigger_json": _canonical({
                "$type": "TTriggerOnCardPerformedShield",
                "Subject": {
                    "$type": "TTargetCardSection", "TargetSection": "SelfBoard",
                    "ExcludeSelf": False, "Conditions": None,
                },
                "Target": None,
            }),
            "action_json": _canonical({
                "$type": "TActionCardModifyAttribute",
                "Value": {
                    "$type": "TReferenceValueCardAttribute", "AttributeType": "Custom_0",
                    "Target": {"$type": "TTargetCardSelf", "Conditions": None},
                    "DefaultValue": 0.0, "Modifier": None,
                },
                "AttributeType": "DamageAmount", "Operation": "Add",
                "Duration": {"$type": "TDeterminantDuration", "DurationType": "UntilEndOfCombat"},
                "TargetCount": {"$type": "TFixedValue", "Value": 1.0},
                "Target": {
                    "$type": "TTargetCardRandom", "ExcludeSelf": False,
                    "TargetSection": "SelfHand",
                    "Conditions": {
                        "$type": "TCardConditionalTag", "Tags": ["Weapon"],
                        "Operator": "Any",
                    },
                },
                "Cost": None,
            }),
            "active_in": "HandOnly",
            "works_in": "Anywhere",
            "prerequisites_json": "null",
        },
    ]


def expected_tables() -> dict[str, list[dict[str, str]]]:
    declared = (
        {"CooldownMax": 6000, "Multicast": 1, "ShieldApplyAmount": 20, "Custom_0": 15},
        {"ShieldApplyAmount": 40, "Custom_0": 25},
        {"ShieldApplyAmount": 80, "Custom_0": 35},
    )
    tiers = [
        {
            "quality": quality, "ability_ids": "0,1", "aura_ids": "",
            "tooltip_ids": "0,1,2", "declared_attributes_json": _canonical(attributes),
        }
        for quality, attributes in zip(("silver", "gold", "diamond"), declared)
    ]
    appearances = [
        {"rank": rank, "quality": "diamond", "enchantment": "None",
         "evidence_scope": "task_locked_reference_build_observation"}
        for rank in ("1", "2")
    ]
    return {
        TIER_CSV: tiers,
        ABILITY_CSV: _ability_rows(),
        AURA_CSV: [],
        APPEARANCE_CSV: appearances,
    }


def _csv_text(name: str, rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=HEADERS[name], lineterminator="\n")
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


def validate_tables(tables: object) -> None:
    if not isinstance(tables, dict) or set(tables) != set(HEADERS):
        raise ValueError("WETWARE_MAPPING_DOMAINS_INVALID")
    for name, rows in tables.items():
        headers = set(HEADERS[name])
        if not isinstance(rows, list) or any(
            not isinstance(row, dict) or set(row) != headers
            or any(not isinstance(value, str) for value in row.values())
            for row in rows
        ):
            raise ValueError("WETWARE_MAPPING_FIELDS_INVALID:" + name)
    if tables != expected_tables():
        raise ValueError("WETWARE_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_tables(path: Path = WORKBOOK) -> dict[str, list[dict[str, str]]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != list(SHEETS.values()):
            raise ValueError("WETWARE_MAPPING_WORKBOOK_SHEETS_INVALID")
        tables = {}
        for name, sheet_name in SHEETS.items():
            values = list(workbook[sheet_name].values)
            headers = HEADERS[name]
            if not values or list(values[0]) != headers:
                raise ValueError("WETWARE_MAPPING_WORKBOOK_HEADERS_INVALID:" + name)
            rows = []
            for raw in values[1:]:
                if any(isinstance(value, str) and value.startswith("=") for value in raw):
                    raise ValueError("WETWARE_MAPPING_FORMULA_FORBIDDEN")
                padded = list(raw) + [None] * (len(headers) - len(raw))
                rows.append({
                    key: "" if value is None else str(value)
                    for key, value in zip(headers, padded)
                })
            tables[name] = rows
    finally:
        workbook.close()
    validate_tables(tables)
    return tables


def export_csv(
    workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR, check: bool = False
) -> None:
    if csv_dir.resolve() != CSV_DIR.resolve():
        raise ValueError("WETWARE_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    tables = workbook_tables(workbook)
    for name, rows in tables.items():
        payload = _csv_text(name, rows)
        target = csv_dir / name
        if check:
            if not target.is_file() or target.read_text(encoding="utf-8") != payload:
                raise ValueError("WETWARE_MAPPING_CSV_STALE:" + name)
        else:
            _atomic_write(target, payload)


def read_candidate() -> dict[str, list[dict[str, str]]]:
    export_csv(check=True)
    tables = {}
    for name in HEADERS:
        with (CSV_DIR / name).open(encoding="utf-8", newline="") as stream:
            tables[name] = list(csv.DictReader(stream))
    validate_tables(tables)
    return tables


def build_artifacts(tables: object) -> tuple[dict, dict]:
    validate_tables(tables)
    resolved = {}
    profiles = []
    for row in tables[TIER_CSV]:
        declared = json.loads(row["declared_attributes_json"])
        resolved.update(declared)
        profiles.append({
            "quality": row["quality"],
            "sourceTier": {
                "abilityIds": ["0", "1"], "auraIds": [], "tooltipIds": [0, 1, 2],
                "declaredAttributes": declared, "resolvedAttributes": dict(resolved),
            },
        })
    abilities = []
    for index, row in enumerate(tables[ABILITY_CSV]):
        abilities.append({
            "sourceAbilityId": row["source_ability_id"],
            "sourceAbilityDirectoryIndex": index,
            "priority": row["priority"],
            "trigger": json.loads(row["trigger_json"]),
            "action": json.loads(row["action_json"]),
            "activeIn": row["active_in"], "worksIn": row["works_in"],
            "prerequisites": json.loads(row["prerequisites_json"]),
        })
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Wetware",
        "sourceIdentity": {
            "type": "Item", "size": "Medium", "startingTier": "Silver",
            "heroes": ["Vanessa"], "tags": ["Aquatic", "Apparel", "Tech"],
            "hiddenTags": ["Shield", "DamageReference"],
            "spawningEligibility": "Always",
        },
        "sourceDirectoryLocks": {
            "tiersSha256": SOURCE_TIERS_SHA256,
            "abilitiesSha256": SOURCE_ABILITIES_SHA256,
            "aurasSha256": SOURCE_AURAS_SHA256,
        },
        "sourceAbilityDirectoryOrderObserved": ["0", "1"],
        "sourceAuraDirectoryOrderObserved": [],
        "qualityProfiles": profiles,
        "sourceAbilities": abilities,
        "sourceAuras": [],
        "referenceBuildAppearances": [
            {"rank": int(row["rank"]), "quality": row["quality"],
             "enchantment": None, "evidenceScope": row["evidence_scope"]}
            for row in tables[APPEARANCE_CSV]
        ],
        "executionStatus": "static_source_mapping_only_dynamic_expression_and_timing_fail_closed",
        "unknownSourceFields": [
            "initialCooldownProgress", "performedShieldEventEmissionTiming",
            "performedShieldEventSourceIdentity", "shieldToDamageBuffReentrancy",
            "samePriorityAbilityAndCrossItemOrder", "randomWeaponSelectionRngAndSnapshotPolicy",
            "emptyRandomWeaponTargetPolicy", "dynamicReferenceValueEvaluationTime",
            "untilEndOfCombatStackingAndExpiry", "shieldAndDamageCritEligibility",
        ],
        "excludedScopes": [
            "dynamic_expression_execution", "event_timing", "enchantment_directory_and_execution",
            "economy", "acquisition", "complete_initial_state", "complete_run_state",
            "exact_top_three_identity", "original_game_acceptance",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-wetware-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Complete Silver/Gold/Diamond tiers, Ability 0/1 and empty base Aura directory",
        "referenceBuildScope": "Task-locked Rank 1 and Rank 2 appearances are Diamond and unenchanted",
        "limitations": [
            "This is static source mapping, not executable Wetware content or a complete Run.",
            "Dynamic attribute evaluation, random Weapon choice, Shield-event timing, reentrancy, stacking and expiry remain unverified and fail closed.",
            "Rank observations do not establish exact build identity, acquisition, enchantment rules or original-game execution acceptance.",
        ],
    }
    return mapping, provenance


def write_artifacts() -> None:
    mapping, provenance = build_artifacts(read_candidate())
    for name, value in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        _atomic_write(CSV_DIR / name, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def validate_artifacts() -> None:
    mapping, provenance = build_artifacts(read_candidate())
    for name, expected in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        try:
            actual = json.loads((CSV_DIR / name).read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise ValueError("WETWARE_MAPPING_ARTIFACT_UNREADABLE:" + name) from error
        if actual != expected:
            raise ValueError("WETWARE_MAPPING_ARTIFACT_STALE:" + name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export_csv(check=args.check)
    if args.check:
        validate_artifacts()
    else:
        write_artifacts()
    print("PASS Wetware source mapping candidate")


if __name__ == "__main__":
    main()
