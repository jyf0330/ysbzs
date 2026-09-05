#!/usr/bin/env python3
"""Export a fail-closed Nesting Doll source mapping candidate."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_nesting_doll_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/nesting_doll_source_mapping"
SOURCE_UUID = "c65da89e-3504-40e7-87a8-10defcb7f07b"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
FORMAL_CONTENT_SHA256 = "8412253fee8faa427f19a98b8a5a0257b86dd4acd9477c70a7195f2c6a682366"
PROFILE_CSV = "source_profiles.csv"
HEADERS = [
    "record_type", "source_id", "scope", "quality_or_enchantment", "priority",
    "trigger", "action_type", "attribute", "target", "value_expression",
    "active_in", "works_in",
]


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def expected_rows() -> list[dict[str, str]]:
    rows = []
    for quality, aura_id, multiplier in (
        ("silver", "2", 5), ("gold", "3", 10), ("diamond", "4", 15)
    ):
        rows.append({
            "record_type": "tier", "source_id": quality, "scope": "base",
            "quality_or_enchantment": quality,
            "value_expression": _canonical({
                "abilityIds": ["0", "1"], "auraIds": [aura_id],
                "tooltipIds": [0, 1], "shieldPerCurrentAmmo": multiplier,
            }),
        })
    rows.extend([
        {"record_type": "ability", "source_id": "0", "scope": "base",
         "priority": "Medium", "trigger": "TTriggerOnCardFired",
         "action_type": "TActionPlayerShieldApply", "target": "SelfPlayer",
         "value_expression": "ReferenceValue:null", "active_in": "HandOnly",
         "works_in": "Anywhere"},
        {"record_type": "ability", "source_id": "1", "scope": "base",
         "priority": "Medium", "trigger": "TTriggerOnDayStarted",
         "action_type": "TActionCardModifyAttribute", "attribute": "AmmoMax",
         "target": "SelfCard", "value_expression": "Self.Custom_0",
         "active_in": "HandAndStash", "works_in": "Anywhere"},
    ])
    for aura_id, quality, multiplier in (
        ("2", "silver", 5), ("3", "gold", 10), ("4", "diamond", 15)
    ):
        rows.append({
            "record_type": "aura", "source_id": aura_id, "scope": "base",
            "quality_or_enchantment": quality,
            "action_type": "TAuraActionCardModifyAttribute",
            "attribute": "ShieldApplyAmount", "target": "SelfCard",
            "value_expression": f"Self.Ammo*{multiplier}:round",
            "active_in": "HandAndStash", "works_in": "Anywhere",
        })
    rows.extend([
        {"record_type": "aura", "source_id": "9", "scope": "base",
         "action_type": "TAuraActionCardModifyAttribute", "attribute": "Custom_2",
         "target": "SelfCard", "value_expression": "Self.Custom_1*1:round",
         "active_in": "HandAndStash", "works_in": "Anywhere"},
        {"record_type": "enchantment", "source_id": "Fiery", "scope": "enchantment",
         "quality_or_enchantment": "Fiery", "value_expression": _canonical({
             "hiddenTags": ["Burn"], "abilityIds": ["e1"], "auraIds": ["e2"],
             "declaredAttributes": {"BurnApplyAmount": 0},
         })},
        {"record_type": "ability", "source_id": "e1", "scope": "Fiery",
         "quality_or_enchantment": "Fiery", "priority": "Medium",
         "trigger": "TTriggerOnCardFired", "action_type": "TActionPlayerBurnApply",
         "target": "OpponentPlayer", "value_expression": "ReferenceValue:null",
         "active_in": "HandOnly", "works_in": "Anywhere"},
        {"record_type": "aura", "source_id": "e2", "scope": "Fiery",
         "quality_or_enchantment": "Fiery",
         "action_type": "TAuraActionCardModifyAttribute",
         "attribute": "BurnApplyAmount", "target": "SelfCard",
         "value_expression": "Self.ShieldApplyAmount*0.1:round",
         "active_in": "HandAndStash", "works_in": "Anywhere"},
    ])
    return [{key: str(row.get(key, "")) for key in HEADERS} for row in rows]


def _csv_text(rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=HEADERS, lineterminator="\n")
    writer.writeheader(); writer.writerows(rows)
    return stream.getvalue()


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != ["SOURCE_MAPPING"]:
            raise ValueError("NESTING_DOLL_WORKBOOK_SHEETS_INVALID")
        values = list(workbook["SOURCE_MAPPING"].values)
        if not values or list(values[0]) != HEADERS:
            raise ValueError("NESTING_DOLL_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("NESTING_DOLL_WORKBOOK_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(HEADERS) - len(raw))
            rows.append({key: "" if value is None else str(value)
                         for key, value in zip(HEADERS, padded)})
    finally:
        workbook.close()
    if rows != expected_rows():
        raise ValueError("NESTING_DOLL_MAPPING_SOURCE_LOCK_MISMATCH")
    return rows


def export_csv(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR, check: bool = False) -> None:
    payload = _csv_text(workbook_rows(workbook))
    target = csv_dir / PROFILE_CSV
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != payload:
            raise ValueError("NESTING_DOLL_MAPPING_CSV_STALE")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent,
                                     prefix=target.name + ".", delete=False) as stream:
        stream.write(payload); temporary = Path(stream.name)
    temporary.replace(target)


def build_artifacts(rows: object) -> tuple[dict, dict]:
    if rows != expected_rows():
        raise ValueError("NESTING_DOLL_MAPPING_SOURCE_LOCK_MISMATCH")
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Nesting Doll",
        "sourceIdentity": {"type": "Item", "size": "Small", "startingTier": "Silver",
                           "heroes": ["Vanessa"], "tags": ["Toy"],
                           "hiddenTags": ["Shield", "Ammo"],
                           "spawningEligibility": "Always"},
        "sourceAbilityDirectoryOrderObserved": ["0", "1"],
        "sourceAuraDirectoryOrderObserved": ["2", "3", "4", "9"],
        "qualityProfiles": [
            {"quality": quality, "abilityIds": ["0", "1"], "auraIds": [aura_id],
             "cooldownMaxMilliseconds": 2000, "multicastBase": 1,
             "ammoMaximumBase": 8, "dailyPermanentAmmoMaximumGain": 1,
             "shieldPerCurrentAmmo": multiplier}
            for quality, aura_id, multiplier in (
                ("silver", "2", 5), ("gold", "3", 10), ("diamond", "4", 15)
            )
        ],
        "baseAbilities": [
            {"sourceAbilityId": "0", "priority": "Medium",
             "trigger": "TTriggerOnCardFired", "action": "TActionPlayerShieldApply",
             "target": "self_player", "referenceValue": None},
            {"sourceAbilityId": "1", "priority": "Medium",
             "trigger": "TTriggerOnDayStarted", "action": "TActionCardModifyAttribute",
             "attribute": "AmmoMax", "operation": "Add", "target": "self_card",
             "value": {"attribute": "Custom_0", "target": "self_card", "default": 0}},
        ],
        "baseAuras": [
            {"sourceAuraId": aura_id, "quality": quality,
             "attribute": "ShieldApplyAmount", "operation": "Add",
             "target": "self_card",
             "value": {"attribute": "Ammo", "target": "self_card",
                       "multiplier": multiplier, "shouldRound": True}}
            for aura_id, quality, multiplier in (
                ("2", "silver", 5), ("3", "gold", 10), ("4", "diamond", 15)
            )
        ] + [{
            "sourceAuraId": "9", "quality": "all_source_directory_only",
            "attribute": "Custom_2", "operation": "Add", "target": "self_card",
            "value": {"attribute": "Custom_1", "target": "self_card",
                      "multiplier": 1, "shouldRound": True},
        }],
        "fieryOverlay": {
            "hiddenTags": ["Burn"], "declaredAttributes": {"BurnApplyAmount": 0},
            "ability": {"sourceAbilityId": "e1", "priority": "Medium",
                        "trigger": "TTriggerOnCardFired", "action": "TActionPlayerBurnApply",
                        "target": "opponent_player", "referenceValue": None},
            "aura": {"sourceAuraId": "e2", "attribute": "BurnApplyAmount",
                     "operation": "Add", "target": "self_card",
                     "value": {"attribute": "ShieldApplyAmount", "target": "self_card",
                               "multiplier": 0.1, "shouldRound": True}},
        },
        "unknownSourceFields": [
            "initialAmmo", "initialCooldownProgress", "zeroAmmoCooldownPolicy",
            "ammoSpendRelativeToShieldSnapshot", "nullReferenceValueRuntimeBinding",
            "dayStartHistoryAndInitialPermanentAmmo", "dynamicAuraRefreshTiming",
            "baseAndFierySameMediumAbilityOrder", "shieldAndBurnCritEligibility",
            "fieryBurnRoundingAndApplicationTiming", "completeStatusAndCooldownInteraction",
        ],
        "excludedScopes": [
            "non_fiery_enchantments", "economy", "acquisition", "complete_initial_state",
            "complete_run_history", "simultaneous_ready_order", "top_three_identity",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-nesting-doll-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Three base tiers, Abilities 0/1, Auras 2/3/4/9 and Fiery e1/e2 overlay",
        "limitations": [
            "This is not executable original-pirate content or a complete Nesting Doll item.",
            "Initial Ammo, day-history state, null ReferenceValue binding, Ammo snapshot timing and zero-Ammo behavior remain unverified.",
            "The Fiery overlay is source-locked but its same-Medium order, Burn rounding/application and combat execution remain unverified.",
            "No other enchantment, economy, acquisition, exact-top-three or original-game acceptance claim is included.",
        ],
    }
    return mapping, provenance


def write_artifacts(csv_dir: Path = CSV_DIR) -> None:
    rows = workbook_rows(); mapping, provenance = build_artifacts(rows)
    for name, value in (("source-effect-mapping.json", mapping), ("provenance.json", provenance)):
        path = csv_dir / name
        payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=path.name + ".", delete=False) as stream:
            stream.write(payload); temporary = Path(stream.name)
        temporary.replace(path)


def validate_artifacts(csv_dir: Path = CSV_DIR) -> None:
    mapping, provenance = build_artifacts(workbook_rows())
    for name, expected in (("source-effect-mapping.json", mapping),
                           ("provenance.json", provenance)):
        path = csv_dir / name
        try:
            actual = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise ValueError("NESTING_DOLL_ARTIFACT_UNREADABLE:" + name) from error
        if actual != expected:
            raise ValueError("NESTING_DOLL_ARTIFACT_STALE:" + name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=WORKBOOK)
    parser.add_argument("--csv-dir", type=Path, default=CSV_DIR)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export_csv(args.workbook, args.csv_dir, check=args.check)
    if args.check:
        validate_artifacts(args.csv_dir)
    else:
        write_artifacts(args.csv_dir)
    print("PASS Nesting Doll source mapping candidate")


if __name__ == "__main__":
    main()
