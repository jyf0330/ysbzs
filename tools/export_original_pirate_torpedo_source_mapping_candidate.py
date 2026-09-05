#!/usr/bin/env python3
"""Export Torpedo's isolated, fail-closed source mapping candidate."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_torpedo_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/torpedo_source_mapping"
CSV_NAME = "source_profiles.csv"
SHEET = "SOURCE_PROFILES"
SOURCE_UUID = "9778f31c-87b0-4d8d-8289-50e90dd7edc5"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
SOURCE_CARD_SHA256 = "99750a608b4684072bcc86fc65b5b52ff46b117356b26cedf728124547b11eea"
SOURCE_TIERS_SHA256 = "2a8e50e69916cfae009399d219f7109ee45fb111f54cf1dd75fe60fd8e0e7132"
SOURCE_ABILITIES_SHA256 = "b24a4166e4bd5c5280b4fa8dab6869678bdb73ebf69ae64b9934ef7638ea0cd9"
SOURCE_AURAS_SHA256 = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
SOURCE_ENCHANTMENTS_SHA256 = "88457f2d7e2cb4e41e7b7922e19b59987a98e1bcca171b5eab5423353d81ce13"
HEADERS = ["record_type", "source_id", "scope", "quality", "enchantment", "payload_json"]


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def strict_json_loads(payload: str) -> object:
    def reject_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("TORPEDO_MAPPING_DUPLICATE_JSON_KEY:" + key)
            result[key] = value
        return result

    return json.loads(payload, object_pairs_hook=reject_duplicate_keys)


def strict_json_equal(actual: object, expected: object) -> bool:
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, dict):
        return (actual.keys() == expected.keys()
                and all(strict_json_equal(actual[key], value) for key, value in expected.items()))
    if isinstance(expected, list):
        return (len(actual) == len(expected)
                and all(strict_json_equal(left, right) for left, right in zip(actual, expected)))
    return actual == expected


def _ability_payloads() -> dict[str, dict]:
    common_value = {
        "$type": "TReferenceValueCardAttribute", "AttributeType": "Custom_0",
        "Target": {"$type": "TTargetCardSelf", "Conditions": None},
        "DefaultValue": 0.0, "Modifier": None,
    }
    common_action = {
        "$type": "TActionCardModifyAttribute", "Value": common_value,
        "AttributeType": "DamageAmount", "Operation": "Add",
        "Duration": {"$type": "TDeterminantDuration", "DurationType": "UntilEndOfCombat"},
        "TargetCount": None,
        "Target": {"$type": "TTargetCardSelf", "Conditions": None}, "Cost": None,
    }
    aquatic_or_ammo = {
        "$type": "TCardConditionalOr",
        "Conditions": [
            {"$type": "TCardConditionalTag", "Tags": ["Aquatic"], "Operator": "Any"},
            {
                "$type": "TCardConditionalAttribute", "Attribute": "AmmoMax",
                "ComparisonOperator": "GreaterThan",
                "ComparisonValue": {"$type": "TFixedValue", "Value": 0.0},
            },
        ],
    }
    return {
        "0": {
            "priority": "Medium", "trigger": {"$type": "TTriggerOnCardFired"},
            "action": {
                "$type": "TActionPlayerDamage", "ReferenceValue": None,
                "Target": {"$type": "TTargetPlayerRelative", "TargetMode": "Opponent", "Conditions": None},
                "Cost": None,
            },
            "activeIn": "HandOnly", "worksIn": "Anywhere", "prerequisites": None,
        },
        "1": {
            "priority": "Medium",
            "trigger": {
                "$type": "TTriggerOnItemUsed",
                "Subject": {
                    "$type": "TTargetCardSection", "TargetSection": "SelfHand",
                    "ExcludeSelf": True, "Conditions": aquatic_or_ammo,
                },
            },
            "action": common_action,
            "activeIn": "HandOnly", "worksIn": "Anywhere", "prerequisites": None,
        },
        "2": {
            "priority": "Medium",
            "trigger": {
                "$type": "TTriggerOnItemUsed",
                "Subject": {
                    "$type": "TTargetCardSection", "TargetSection": "SelfHand",
                    "ExcludeSelf": True,
                    "Conditions": {
                        "$type": "TCardConditionalAnd",
                        "Conditions": [
                            {"$type": "TCardConditionalSize", "Sizes": ["Large"], "IsNot": False},
                            aquatic_or_ammo,
                        ],
                    },
                },
            },
            "action": common_action,
            "activeIn": "HandOnly", "worksIn": "Anywhere", "prerequisites": None,
        },
    }


def expected_rows() -> list[dict[str, str]]:
    rows = []
    declarations = (
        ("silver", {"CooldownMax": 8000, "Multicast": 1, "AmmoMax": 1, "DamageAmount": 100, "Custom_0": 40}),
        ("gold", {"Custom_0": 80}),
        ("diamond", {"Custom_0": 160}),
    )
    for quality, attributes in declarations:
        rows.append({
            "record_type": "tier", "source_id": quality, "scope": "base",
            "quality": quality, "payload_json": _canonical({
                "attributes": attributes, "abilityIds": ["0", "1", "2"],
                "auraIds": [], "tooltipIds": [0, 1, 2],
            }),
        })
    for ability_id, payload in _ability_payloads().items():
        rows.append({
            "record_type": "ability", "source_id": ability_id, "scope": "base",
            "payload_json": _canonical(payload),
        })
    rows.extend([
        {"record_type": "aura_directory", "source_id": "base", "scope": "base",
         "payload_json": "[]"},
        {
            "record_type": "enchantment", "source_id": "Radiant", "scope": "overlay",
            "enchantment": "Radiant", "payload_json": _canonical({
                "attributes": {"PercentSlowReduction": 100, "PercentFreezeReduction": 100, "DestroyImmunity": 1},
                "abilityIds": [], "auraIds": [], "tags": [], "hiddenTags": [],
            }),
        },
        {
            "record_type": "reference_build", "source_id": "3", "scope": "task_locked_observation",
            "quality": "diamond", "enchantment": "Radiant",
            "payload_json": _canonical({"rank": 3}),
        },
    ])
    return [{key: str(row.get(key, "")) for key in HEADERS} for row in rows]


def _csv_text(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=HEADERS, lineterminator="\n")
    writer.writeheader(); writer.writerows(rows)
    return stream.getvalue()


def _atomic_write(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                     prefix=path.name + ".", delete=False) as stream:
        stream.write(payload); temporary = Path(stream.name)
    temporary.replace(path)


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != [SHEET]:
            raise ValueError("TORPEDO_MAPPING_WORKBOOK_SHEETS_INVALID")
        values = list(workbook[SHEET].values)
        if not values or list(values[0]) != HEADERS:
            raise ValueError("TORPEDO_MAPPING_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("TORPEDO_MAPPING_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(HEADERS) - len(raw))
            rows.append({key: "" if value is None else str(value)
                         for key, value in zip(HEADERS, padded)})
    finally:
        workbook.close()
    if rows != expected_rows():
        raise ValueError("TORPEDO_MAPPING_SOURCE_LOCK_MISMATCH")
    return rows


def export_csv(check: bool = False) -> None:
    payload = _csv_text(workbook_rows())
    target = CSV_DIR / CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != payload:
            raise ValueError("TORPEDO_MAPPING_CSV_STALE")
        return
    _atomic_write(target, payload)


def build_artifacts(rows: object) -> tuple[dict, dict]:
    if rows != expected_rows():
        raise ValueError("TORPEDO_MAPPING_SOURCE_LOCK_MISMATCH")
    resolved = {}
    profiles = []
    for row in rows[:3]:
        source = json.loads(row["payload_json"])
        resolved.update(source["attributes"])
        profiles.append({
            "quality": row["quality"], "sourceTier": {
                "abilityIds": source["abilityIds"], "auraIds": source["auraIds"],
                "tooltipIds": source["tooltipIds"],
                "declaredAttributes": source["attributes"], "resolvedAttributes": dict(resolved),
            },
            "sourceAttributes": {
                "damageAmountBase": 100, "custom0SourceValue": resolved["Custom_0"],
                "cooldownMaxMilliseconds": 8000, "ammoMaximum": 1, "multicast": 1,
            },
        })
    abilities = []
    for index, row in enumerate(rows[3:6]):
        abilities.append({"sourceAbilityId": row["source_id"],
                          "sourceAbilityDirectoryIndex": index,
                          **json.loads(row["payload_json"])})
    radiant = json.loads(rows[7]["payload_json"])
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1, "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID, "sourceInternalName": "Torpedo",
        "sourceIdentity": {
            "type": "Item", "size": "Medium", "startingTier": "Silver",
            "heroes": ["Vanessa"], "tags": ["Aquatic", "Weapon", "Tech"],
            "hiddenTags": ["Damage", "DamageReference", "Ammo"],
            "spawningEligibility": "Always",
        },
        "sourceDirectoryLocks": {
            "tiersSha256": SOURCE_TIERS_SHA256, "abilitiesSha256": SOURCE_ABILITIES_SHA256,
            "aurasSha256": SOURCE_AURAS_SHA256, "enchantmentsSha256": SOURCE_ENCHANTMENTS_SHA256,
        },
        "sourceAbilityDirectoryOrderObserved": ["0", "1", "2"],
        "sourceAuraDirectoryOrderObserved": [],
        "qualityProfiles": profiles, "sourceAbilities": abilities, "sourceAuras": [],
        "radiantOverlay": radiant,
        "candidateBuildUsage": {
            "buildRank": 3, "quality": "diamond", "enchantmentId": "Radiant",
            "claimScope": "task_locked_membership_only_not_popularity_or_rules_proof",
        },
        "ability2SourceDescriptionConflict": {
            "descriptionClaims": "reload_one_ammo_if_large",
            "structuredActionObserved": "add_Custom_0_to_self_DamageAmount_until_end_of_combat",
            "resolution": "STRUCTURED_SOURCE_RECORDED_EXECUTION_FAIL_CLOSED",
        },
        "executionStatus": "static_source_mapping_only_dynamic_expression_and_timing_fail_closed",
        "unknownSourceFields": [
            "initialAmmo", "initialCooldownProgress", "zeroAmmoCooldownPolicy",
            "aquaticOrAmmoConditionSampling", "largeAndAquaticOrAmmoConditionSampling",
            "ability1AndAbility2SameMediumStackingOrder", "cardFiredToItemUsedDispatchOrder",
            "nestedItemUsedReentrancy", "dynamicCustom0EvaluationTime",
            "untilEndOfCombatStackingAndExpiry", "ability2DescriptionActionConflictRuntimeBehavior",
            "radiantImmunityApplicationAndStatusRemovalTiming", "damageCritEligibility",
        ],
        "excludedScopes": [
            "dynamic_expression_execution", "event_timing", "non_radiant_enchantment_execution",
            "radiant_runtime_execution", "economy", "acquisition", "complete_initial_state",
            "complete_run_state", "top_three_identity_proof", "original_game_acceptance",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-torpedo-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Complete Silver/Gold/Diamond tiers, Abilities 0/1/2, empty base Aura directory and Radiant overlay",
        "limitations": [
            "This is static source mapping, not executable Torpedo content or a complete Run.",
            "Ability 1 OR and Ability 2 Large-AND-OR structures are source-locked; their simultaneous Medium stacking and event order remain unverified.",
            "DamageAmount 100 is distinct from Custom_0 gains 40/80/160; dynamic evaluation and combat stacking remain fail closed.",
            "Radiant immunity attributes are source-locked, but their runtime application is not accepted.",
        ],
    }
    return mapping, provenance


def write_artifacts() -> None:
    mapping, provenance = build_artifacts(workbook_rows())
    for name, value in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        _atomic_write(CSV_DIR / name, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def validate_artifacts(csv_dir: Path = CSV_DIR) -> None:
    mapping, provenance = build_artifacts(workbook_rows())
    for name, expected in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        try: actual = strict_json_loads((csv_dir / name).read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise ValueError("TORPEDO_MAPPING_ARTIFACT_UNREADABLE:" + name) from error
        if not strict_json_equal(actual, expected):
            raise ValueError("TORPEDO_MAPPING_ARTIFACT_STALE:" + name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export_csv(check=args.check)
    if args.check: validate_artifacts()
    else: write_artifacts()
    print("PASS Torpedo source mapping candidate")


if __name__ == "__main__": main()
