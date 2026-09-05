#!/usr/bin/env python3
"""Export Flagship's isolated, fail-closed source mapping candidate."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_flagship_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/flagship_source_mapping"
CSV_NAME = "source_profiles.csv"
SHEET = "SOURCE_PROFILES"
SOURCE_UUID = "865a673a-beae-4f5c-b04a-dd3fd026bc6d"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
SOURCE_CARD_SHA256 = "2b9420c0cd20ac692331a4be1167cc979214f58027240c1f665217f6d6cd84ce"
SOURCE_TIERS_SHA256 = "161e6fec29dad57cea9fd5aa0db250ea8c755761ba22fc56d3ea17045732de09"
SOURCE_ABILITIES_SHA256 = "8cf9033cc4a5b842c5ec71c9cb5bbf4952e4f3257f675749f0baaa79e1bf3576"
SOURCE_AURAS_SHA256 = "c3b3c0e3cfb9eab6d51250301f5f9cf6498895e78d4e9fbfd373c8ce3ecca513"
SOURCE_ENCHANTMENTS_SHA256 = "98834576c8a57bec634394a11114a2ed2420fcade25be98d3d9833b0ce1a80a6"
HEADERS = ["record_type", "source_id", "scope", "quality", "enchantment", "payload_json"]


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _aura_payload(aura_id: str, active_in: str, condition: dict) -> dict:
    return {
        "sourceAuraId": aura_id, "activeIn": active_in, "worksIn": "Anywhere",
        "action": {
            "type": "TAuraActionCardModifyAttribute", "attribute": "Multicast",
            "operation": "Add", "value": {"type": "TFixedValue", "value": 1.0},
            "target": {"type": "TTargetCardSelf", "conditions": None},
        },
        "prerequisites": [{
            "type": "TPrerequisiteCardCount", "comparison": "GreaterThanOrEqual", "amount": 1,
            "subject": {
                "type": "TTargetCardSection", "section": "SelfHand", "excludeSelf": False,
                "condition": condition,
            },
        }],
    }


def expected_rows() -> list[dict[str, str]]:
    rows = []
    for quality, attributes in (
        ("silver", {"CooldownMax": 5000, "Multicast": 1, "DamageAmount": 35}),
        ("gold", {"DamageAmount": 70}),
        ("diamond", {"DamageAmount": 140}),
    ):
        rows.append({
            "record_type": "tier", "source_id": quality, "scope": "base", "quality": quality,
            "payload_json": _canonical({"attributes": attributes, "abilityIds": ["0"],
                                         "auraIds": ["1", "2", "3", "4", "5"],
                                         "tooltipIds": [0, 1]}),
        })
    rows.append({
        "record_type": "ability", "source_id": "0", "scope": "base",
        "payload_json": _canonical({
            "priority": "Medium", "trigger": "TTriggerOnCardFired", "activeIn": "HandOnly",
            "worksIn": "Anywhere", "prerequisites": None,
            "action": {"type": "TActionPlayerDamage", "referenceValue": None,
                       "target": "OpponentPlayer"},
        }),
    })
    conditions = (
        ("1", "HandOnly", {"type": "TCardConditionalTag", "tags": ["Property"], "operator": "Any"}),
        ("2", "HandAndStash", {"type": "TCardConditionalTag", "tags": ["Tool"], "operator": "Any"}),
        ("3", "HandAndStash", {"type": "TCardConditionalTag", "tags": ["Friend"], "operator": "Any"}),
        ("4", "HandAndStash", {"type": "TCardConditionalAttribute", "attribute": "AmmoMax",
                                 "comparison": "GreaterThan", "value": 0.0}),
        ("5", "HandAndStash", {"type": "TCardConditionalTag", "tags": ["Relic"], "operator": "Any"}),
    )
    for aura_id, active_in, condition in conditions:
        rows.append({"record_type": "aura", "source_id": aura_id, "scope": "base",
                     "payload_json": _canonical(_aura_payload(aura_id, active_in, condition))})
    rows.extend([
        {
            "record_type": "enchantment", "source_id": "Shielded", "scope": "overlay",
            "enchantment": "Shielded", "payload_json": _canonical({
                "attributes": {"ShieldApplyAmount": 0}, "hiddenTags": ["Shield"],
                "ability": {
                    "sourceAbilityId": "e1", "priority": "Medium",
                    "trigger": "TTriggerOnCardFired", "activeIn": "HandOnly",
                    "worksIn": "Anywhere", "prerequisites": None,
                    "action": {"type": "TActionPlayerShieldApply", "referenceValue": None,
                               "target": "SelfPlayer"},
                },
                "aura": {
                    "sourceAuraId": "e2", "activeIn": "HandAndStash", "worksIn": "Anywhere",
                    "prerequisites": None,
                    "action": {
                        "type": "TAuraActionCardModifyAttribute", "attribute": "ShieldApplyAmount",
                        "operation": "Add", "target": "SelfCard",
                        "value": {"type": "TReferenceValueCardAttribute", "attribute": "DamageAmount",
                                  "target": "SelfCard", "defaultValue": 0.0,
                                  "modifier": {"mode": "Multiply", "value": 1.0, "shouldRound": True}},
                    },
                },
            }),
        },
        {"record_type": "reference_build", "source_id": "3", "scope": "task_locked_observation",
         "quality": "diamond", "enchantment": "Shielded",
         "payload_json": _canonical({"rank": 3})},
    ])
    return [{key: str(row.get(key, "")) for key in HEADERS} for row in rows]


def strict_json_loads(payload: str) -> object:
    def pairs(values):
        result = {}
        for key, value in values:
            if key in result: raise ValueError("FLAGSHIP_MAPPING_DUPLICATE_JSON_KEY:" + key)
            result[key] = value
        return result
    return json.loads(payload, object_pairs_hook=pairs)


def strict_json_equal(actual: object, expected: object) -> bool:
    if type(actual) is not type(expected): return False
    if isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(strict_json_equal(actual[key], value) for key, value in expected.items())
    if isinstance(expected, list):
        return len(actual) == len(expected) and all(strict_json_equal(left, right) for left, right in zip(actual, expected))
    return actual == expected


def _csv_text(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline=""); writer = csv.DictWriter(stream, fieldnames=HEADERS, lineterminator="\n")
    writer.writeheader(); writer.writerows(rows); return stream.getvalue()


def _atomic_write(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                     prefix=path.name + ".", delete=False) as stream:
        stream.write(payload); temporary = Path(stream.name)
    temporary.replace(path)


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != [SHEET]: raise ValueError("FLAGSHIP_WORKBOOK_SHEETS_INVALID")
        values = list(workbook[SHEET].values)
        if not values or list(values[0]) != HEADERS: raise ValueError("FLAGSHIP_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("FLAGSHIP_WORKBOOK_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(HEADERS) - len(raw))
            rows.append({key: "" if value is None else str(value) for key, value in zip(HEADERS, padded)})
    finally: workbook.close()
    if rows != expected_rows(): raise ValueError("FLAGSHIP_MAPPING_SOURCE_LOCK_MISMATCH")
    return rows


def export_csv(check: bool = False) -> None:
    payload = _csv_text(workbook_rows()); target = CSV_DIR / CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != payload:
            raise ValueError("FLAGSHIP_MAPPING_CSV_STALE")
    else: _atomic_write(target, payload)


def build_artifacts(rows: object) -> tuple[dict, dict]:
    if rows != expected_rows(): raise ValueError("FLAGSHIP_MAPPING_SOURCE_LOCK_MISMATCH")
    resolved = {}; profiles = []
    for row in rows[:3]:
        source = strict_json_loads(row["payload_json"]); resolved.update(source["attributes"])
        profiles.append({"quality": row["quality"], "sourceTier": {
            "abilityIds": source["abilityIds"], "auraIds": source["auraIds"],
            "tooltipIds": source["tooltipIds"], "declaredAttributes": source["attributes"],
            "resolvedAttributes": dict(resolved)}})
    ability = {"sourceAbilityId": "0", "sourceAbilityDirectoryIndex": 0,
               **strict_json_loads(rows[3]["payload_json"])}
    auras = [{"sourceAuraDirectoryIndex": index, **strict_json_loads(row["payload_json"])}
             for index, row in enumerate(rows[4:9])]
    shielded = strict_json_loads(rows[9]["payload_json"])
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1", "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item", "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID, "sourceInternalName": "Flagship",
        "sourceIdentity": {"type": "Item", "size": "Large", "startingTier": "Silver",
                           "heroes": ["Vanessa"], "tags": ["Aquatic", "Vehicle", "Weapon"],
                           "hiddenTags": ["Damage", "AmmoReference"], "spawningEligibility": "Always"},
        "sourceDirectoryLocks": {"tiersSha256": SOURCE_TIERS_SHA256,
                                 "abilitiesSha256": SOURCE_ABILITIES_SHA256,
                                 "aurasSha256": SOURCE_AURAS_SHA256,
                                 "enchantmentsSha256": SOURCE_ENCHANTMENTS_SHA256},
        "sourceAbilityDirectoryOrderObserved": ["0"],
        "sourceAuraDirectoryOrderObserved": ["1", "2", "3", "4", "5"],
        "qualityProfiles": profiles, "sourceAbilities": [ability], "sourceAuras": auras,
        "shieldedOverlay": shielded,
        "candidateBuildUsage": {"buildRank": 3, "quality": "diamond", "enchantmentId": "Shielded",
                                "claimScope": "task_locked_membership_only_not_popularity_or_rules_proof"},
        "executionStatus": "static_source_mapping_only_dynamic_aura_and_multicast_fail_closed",
        "unknownSourceFields": ["initialCooldownProgress", "nullReferenceValueRuntimeBinding",
            "dynamicAuraActivationAndRemovalTiming", "multipleAuraStackingAndRefreshPolicy",
            "selfIncludedCardCountSemantics", "stashAuraContributionToBoardCombatState",
            "multicastEventBundleConstructionAndDispatch", "multicastSubeventOrdering",
            "shieldedDamageReferenceEvaluationTime", "baseDamageAndShieldedSameMediumOrder",
            "shieldedShieldCritEligibility", "completeStatusAndCooldownInteraction"],
        "excludedScopes": ["dynamic_aura_execution", "multicast_runtime_execution",
            "shielded_runtime_execution", "non_shielded_enchantment_execution", "event_timing",
            "economy", "acquisition", "complete_initial_state", "complete_run_state",
            "top_three_identity_proof", "original_game_acceptance"],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {"schema": "ysbzs.original-pirate-flagship-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Complete three tiers, Ability 0, Auras 1..5 and Shielded e1/e2 overlay",
        "limitations": ["This is static source mapping, not executable Flagship content or a complete Run.",
            "Property Aura is HandOnly; Tool, Friend, Ammo and Relic Auras are HandAndStash. All count SelfHand with ExcludeSelf=false.",
            "Dynamic Aura refresh/stacking, Multicast event packaging, null ReferenceValue and Shielded/base same-Medium order remain unverified.",
            "Rank 3 Diamond Shielded is task membership context, not popularity or original-rules proof."]}
    return mapping, provenance


def write_artifacts() -> None:
    mapping, provenance = build_artifacts(workbook_rows())
    for name, value in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        _atomic_write(CSV_DIR / name, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def validate_artifacts(csv_dir: Path = CSV_DIR) -> None:
    mapping, provenance = build_artifacts(workbook_rows())
    for name, expected in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        try: actual = strict_json_loads((csv_dir / name).read_text(encoding="utf-8"))
        except (OSError, ValueError) as error: raise ValueError("FLAGSHIP_ARTIFACT_INVALID:" + name) from error
        if not strict_json_equal(actual, expected): raise ValueError("FLAGSHIP_ARTIFACT_STALE:" + name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument("--check", action="store_true")
    args = parser.parse_args(); export_csv(check=args.check)
    if args.check: validate_artifacts()
    else: write_artifacts()
    print("PASS Flagship source mapping candidate")


if __name__ == "__main__": main()
