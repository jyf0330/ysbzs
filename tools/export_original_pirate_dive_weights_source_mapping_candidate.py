#!/usr/bin/env python3
"""Export Dive Weights' locked source mapping without claiming a complete item."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_dive_weights_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/dive_weights_source_mapping"
SOURCE_UUID = "ce6769db-f9a6-44a8-b915-afec472a2ea3"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
ITEM_ID = "item_bazaar_dive_weights"
SKILL_ID = "skill_bazaar_dive_weights_haste"
QUALITIES = ("silver", "gold", "diamond")
HASTE_MS = (1000, 2000, 3000)
FORMAL_CONTENT_SHA256 = "edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd"
EFFECT_CSV = "47_bz_item_effects.csv"
TIER_CSV = "source_tiers.csv"
AURA_CSV = "source_auras.csv"
SHEETS = {EFFECT_CSV: "BZ_ITEM_EFFECTS", TIER_CSV: "SOURCE_TIERS", AURA_CSV: "SOURCE_AURAS"}
HEADERS = {
    EFFECT_CSV: formal.DOMAIN_HEADERS[EFFECT_CSV],
    TIER_CSV: ["quality", "ability_ids", "aura_ids", "tooltip_ids", "declared_attributes_json"],
    AURA_CSV: [
        "source_aura_id", "active_in", "action_type", "attribute_type", "operation",
        "value_type", "value_attribute", "value_target", "value_default", "modifier_mode",
        "modifier_value", "modifier_round", "target_type", "prerequisite_type",
        "subject_target_mode", "subject_include_origin", "subject_condition_tags",
        "subject_condition_operator", "comparison", "amount", "works_in",
    ],
}


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def expected_tables() -> dict[str, list[dict[str, str]]]:
    effects = []
    for quality, haste_ms in zip(QUALITIES, HASTE_MS):
        values = {
            "effect_id": f"effect_bazaar_dive_weights_{quality}_0",
            "item_id": ITEM_ID,
            "quality": quality,
            "item_skill_id": SKILL_ID,
            "trigger_event": "item_ready",
            "condition_type": "always",
            "condition_source_relation": "any",
            "target_type": "random_friendly_active_clock_item",
            "target_exclude_self": "false",
            "target_count": "1",
            "operation_type": "apply_status",
            "status": "haste",
            "ticks": str(haste_ms // 50),
            "catalog_status": "candidate_reference",
            "source_ability_id": "0",
            "trigger_priority": "Medium",
            "effect_order": "0",
        }
        effects.append({key: str(values.get(key, "")) for key in HEADERS[EFFECT_CSV]})
    declared = (
        {"AmmoMax": 4, "CooldownMax": 8000, "Custom_0": 1000, "HasteAmount": 1000, "HasteTargets": 1, "Multicast": 1},
        {"HasteAmount": 2000},
        {"HasteAmount": 3000},
    )
    tiers = [
        {
            "quality": quality,
            "ability_ids": "0",
            "aura_ids": "1,2,3",
            "tooltip_ids": "0,1,2",
            "declared_attributes_json": _canonical(attrs),
        }
        for quality, attrs in zip(QUALITIES, declared)
    ]
    common = {
        "active_in": "HandAndStash",
        "action_type": "TAuraActionCardModifyAttribute",
        "operation": "Add",
        "value_type": "TReferenceValueCardAttribute",
        "value_target": "Self",
        "value_default": "0",
        "target_type": "Self",
        "works_in": "Anywhere",
    }
    auras = [
        {
            **common,
            "source_aura_id": aura_id,
            "attribute_type": "FlatCooldownReduction",
            "value_attribute": "Custom_0",
            "modifier_mode": "Multiply",
            "modifier_value": "1",
            "modifier_round": "true",
            "prerequisite_type": "TPrerequisiteCardCount",
            "subject_target_mode": target_mode,
            "subject_include_origin": "false",
            "subject_condition_tags": "Aquatic",
            "subject_condition_operator": "Any",
            "comparison": "Equal",
            "amount": "1",
        }
        for aura_id, target_mode in (("1", "LeftCard"), ("2", "RightCard"))
    ]
    auras.append(
        {
            **common,
            "source_aura_id": "3",
            "attribute_type": "Multicast",
            "value_attribute": "Ammo",
        }
    )
    auras = [{key: str(row.get(key, "")) for key in HEADERS[AURA_CSV]} for row in auras]
    return {EFFECT_CSV: effects, TIER_CSV: tiers, AURA_CSV: auras}


def _csv_text(name: str, rows: list[dict[str, str]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=HEADERS[name], lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def _atomic_write(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", delete=False) as stream:
        stream.write(payload)
        temporary = Path(stream.name)
    temporary.replace(path)


def validate_tables(tables: object) -> None:
    expected = expected_tables()
    if not isinstance(tables, dict) or set(tables) != set(HEADERS):
        raise ValueError("DIVE_WEIGHTS_MAPPING_DOMAINS_INVALID")
    for name, rows in tables.items():
        headers = set(HEADERS[name])
        if not isinstance(rows, list) or any(
            not isinstance(row, dict) or set(row) != headers
            or any(not isinstance(value, str) for value in row.values())
            for row in rows
        ):
            raise ValueError("DIVE_WEIGHTS_MAPPING_FIELDS_INVALID:" + name)
    if tables != expected:
        raise ValueError("DIVE_WEIGHTS_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_tables(path: Path = WORKBOOK) -> dict[str, list[dict[str, str]]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != list(SHEETS.values()):
            raise ValueError("DIVE_WEIGHTS_MAPPING_WORKBOOK_SHEETS_INVALID")
        tables = {}
        for name, sheet_name in SHEETS.items():
            values = list(workbook[sheet_name].values)
            headers = HEADERS[name]
            if not values or list(values[0]) != headers:
                raise ValueError("DIVE_WEIGHTS_MAPPING_WORKBOOK_HEADERS_INVALID:" + name)
            rows = []
            for raw in values[1:]:
                if any(isinstance(value, str) and value.startswith("=") for value in raw):
                    raise ValueError("DIVE_WEIGHTS_MAPPING_FORMULA_FORBIDDEN")
                padded = list(raw) + [None] * (len(headers) - len(raw))
                rows.append({key: "" if value is None else str(value) for key, value in zip(headers, padded)})
            tables[name] = rows
        validate_tables(tables)
        return tables
    finally:
        workbook.close()


def export_csv(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR, check: bool = False) -> None:
    tables = workbook_tables(workbook)
    for name, rows in tables.items():
        expected = _csv_text(name, rows)
        target = csv_dir / name
        if check:
            if not target.is_file() or target.read_text(encoding="utf-8") != expected:
                raise ValueError("DIVE_WEIGHTS_MAPPING_CSV_STALE:" + name)
        else:
            _atomic_write(target, expected)


def read_candidate(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR) -> dict[str, list[dict[str, str]]]:
    export_csv(workbook, csv_dir, check=True)
    tables = {}
    for name in HEADERS:
        with (csv_dir / name).open(encoding="utf-8", newline="") as stream:
            tables[name] = list(csv.DictReader(stream))
    validate_tables(tables)
    return tables


def build_artifacts(tables: object) -> tuple[dict, dict]:
    validate_tables(tables)
    resolved = {}
    profiles = []
    for tier_row, effect_row, haste_ms in zip(tables[TIER_CSV], tables[EFFECT_CSV], HASTE_MS):
        declared = json.loads(tier_row["declared_attributes_json"])
        resolved.update(declared)
        profiles.append({
            "quality": tier_row["quality"],
            "sourceTier": {
                "abilityIds": tier_row["ability_ids"].split(","),
                "auraIds": tier_row["aura_ids"].split(","),
                "tooltipIds": [int(value) for value in tier_row["tooltip_ids"].split(",")],
                "declaredAttributes": declared,
                "resolvedAttributes": dict(resolved),
            },
            "sourceAttributes": {
                "cooldownMaxMilliseconds": 8000,
                "multicastBase": 1,
                "ammoMaximum": 4,
                "hasteTargets": 1,
                "hasteAmountMilliseconds": haste_ms,
                "adjacentAquaticCooldownReductionMilliseconds": 1000,
            },
            "effects": [{
                "sourceAbilityId": effect_row["source_ability_id"],
                "sourceAbilityDirectoryIndex": 0,
                "sourceValueAttribute": "HasteAmount",
                "sourceTargetCountAttribute": "HasteTargets",
                "sourceTriggerType": "TTriggerOnCardFired",
                "mappedTriggerEvent": "item_ready",
                "triggerPriority": effect_row["trigger_priority"],
                "effectOrder": int(effect_row["effect_order"]),
                "target": {
                    "type": "random_card", "section": "self_hand", "excludeSelf": False,
                    "count": 1,
                    "condition": {"attribute": "CooldownMax", "operator": "GreaterThan", "value": 0},
                },
                "operation": {"type": "apply_status", "status": "haste", "ticks": int(effect_row["ticks"])},
            }],
        })
    source_auras = []
    for index, row in enumerate(tables[AURA_CSV]):
        entry = {
            "sourceAuraId": row["source_aura_id"],
            "sourceAuraDirectoryIndex": index,
            "activeIn": row["active_in"],
            "worksIn": row["works_in"],
            "action": {
                "type": row["action_type"], "attribute": row["attribute_type"],
                "operation": row["operation"],
                "value": {"type": row["value_type"], "attribute": row["value_attribute"], "target": "self", "default": 0},
                "target": "self",
            },
        }
        if row["modifier_mode"]:
            entry["action"]["value"]["modifier"] = {"mode": "Multiply", "value": 1, "shouldRound": True}
        if row["prerequisite_type"]:
            entry["prerequisite"] = {
                "type": row["prerequisite_type"], "comparison": row["comparison"], "amount": 1,
                "subject": {
                    "type": "TTargetCardPositional", "origin": "Self",
                    "targetMode": row["subject_target_mode"], "includeOrigin": False,
                    "condition": {"type": "TCardConditionalTag", "tags": ["Aquatic"], "operator": "Any"},
                },
            }
        source_auras.append(entry)
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Dive Weights",
        "sourceIdentity": {
            "type": "Item", "size": "Small", "startingTier": "Silver", "heroes": ["Vanessa"],
            "tags": ["Aquatic", "Tool", "Apparel"], "hiddenTags": ["Haste", "Ammo"],
            "spawningEligibility": "Always",
        },
        "itemId": ITEM_ID,
        "sourceAbilityDirectoryOrderObserved": ["0"],
        "sourceAuraDirectoryOrderObserved": ["1", "2", "3"],
        "qualityProfiles": profiles,
        "sourceAuras": source_auras,
        "unknownSourceFields": [
            "initialAmmo", "initialCooldownProgress", "zeroAmmoCooldownPolicy",
            "ammoSpendRelativeToMulticastSnapshot", "multicastPacketAndCardFiredPolicy",
            "dynamicAuraRefreshTiming", "randomTargetRngAndSnapshotPolicy",
            "emptyRandomTargetPolicy", "hasteReapplicationPolicy",
            "samePriorityCrossItemOrder", "completeStatusAndCooldownInteraction",
        ],
        "excludedScopes": [
            "enchantments", "economy", "acquisition", "complete_initial_state",
            "simultaneous_ready_order", "complete_run_state", "top_three_identity",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-dive-weights-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Complete three-tier inheritance, Ability 0 and Aura 1/2/3 directories",
        "limitations": [
            "This is not executable original-pirate content or a complete Dive Weights item.",
            "Initial Ammo, zero-Ammo clock, Ammo/multicast timing, multicast CardFired behavior, original random selection and Haste reapplication remain unverified.",
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
        raise ValueError("DIVE_WEIGHTS_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping, provenance = build_artifacts(read_candidate(args.workbook, args.csv_dir))
    for name, value in {"source-effect-mapping.json": mapping, "provenance.json": provenance}.items():
        payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        target = args.out_dir / name
        if target.exists() and target.read_text(encoding="utf-8") != payload:
            raise ValueError("DIVE_WEIGHTS_MAPPING_OUTPUT_EXISTS_DIFFERENT:" + name)
        _atomic_write(target, payload)
    print(json.dumps({"output": str(args.out_dir), "mappingSha256": provenance["mappingSha256"], "acceptance": mapping["acceptance"], "originalRulesAccepted": False}))


if __name__ == "__main__":
    main()
