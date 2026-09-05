#!/usr/bin/env python3
"""Export Diving Helmet's locked source mapping without claiming a complete item."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_diving_helmet_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/diving_helmet_source_mapping"
SOURCE_UUID = "fb6e6b16-d6d0-4493-ac3f-46c26afe6c51"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
ITEM_ID = "item_bazaar_diving_helmet"
SKILL_ID = "skill_bazaar_diving_helmet_shield"
QUALITIES = ("gold", "diamond")
SHIELD = (50, 100)
FORMAL_CONTENT_SHA256 = "edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd"
EFFECT_CSV = "47_bz_item_effects.csv"
TIER_CSV = "source_tiers.csv"
AURA_CSV = "source_auras.csv"
SHEETS = {EFFECT_CSV: "BZ_ITEM_EFFECTS", TIER_CSV: "SOURCE_TIERS", AURA_CSV: "SOURCE_AURAS"}
HEADERS = {
    EFFECT_CSV: formal.DOMAIN_HEADERS[EFFECT_CSV],
    TIER_CSV: ["quality", "ability_ids", "aura_ids", "tooltip_ids", "declared_attributes_json"],
    AURA_CSV: [
        "source_aura_id", "active_in", "action_type", "tags", "target_type",
        "target_origin", "target_mode", "include_origin", "target_conditions",
        "prerequisites", "works_in",
    ],
}


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def expected_tables() -> dict[str, list[dict[str, str]]]:
    effects = []
    for quality, shield in zip(QUALITIES, SHIELD):
        values = {
            "effect_id": f"effect_bazaar_diving_helmet_{quality}_0",
            "item_id": ITEM_ID,
            "quality": quality,
            "item_skill_id": SKILL_ID,
            "trigger_event": "friendly_item_used",
            "condition_type": "source_item_has_any_tag",
            "condition_tags": "aquatic",
            "condition_source_relation": "any",
            "target_type": "owner_hero",
            "operation_type": "gain_shield",
            "amount": str(shield),
            "catalog_status": "candidate_reference",
            "source_ability_id": "0",
            "trigger_priority": "Medium",
            "effect_order": "0",
        }
        effects.append({key: str(values.get(key, "")) for key in HEADERS[EFFECT_CSV]})
    tiers = [
        {
            "quality": quality,
            "ability_ids": "0",
            "aura_ids": "2",
            "tooltip_ids": "0,1",
            "declared_attributes_json": _canonical({"ShieldApplyAmount": shield}),
        }
        for quality, shield in zip(QUALITIES, SHIELD)
    ]
    aura = {
        "source_aura_id": "2",
        "active_in": "HandAndStash",
        "action_type": "TAuraActionCardAddTagsList",
        "tags": "Aquatic",
        "target_type": "TTargetCardPositional",
        "target_origin": "Self",
        "target_mode": "Neighbor",
        "include_origin": "false",
        "target_conditions": "none",
        "prerequisites": "none",
        "works_in": "CombatOnly",
    }
    return {EFFECT_CSV: effects, TIER_CSV: tiers, AURA_CSV: [aura]}


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
    if not isinstance(tables, dict) or set(tables) != set(HEADERS):
        raise ValueError("DIVING_HELMET_MAPPING_DOMAINS_INVALID")
    for name, rows in tables.items():
        headers = set(HEADERS[name])
        if not isinstance(rows, list) or any(
            not isinstance(row, dict) or set(row) != headers
            or any(not isinstance(value, str) for value in row.values())
            for row in rows
        ):
            raise ValueError("DIVING_HELMET_MAPPING_FIELDS_INVALID:" + name)
    if tables != expected_tables():
        raise ValueError("DIVING_HELMET_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_tables(path: Path = WORKBOOK) -> dict[str, list[dict[str, str]]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != list(SHEETS.values()):
            raise ValueError("DIVING_HELMET_MAPPING_WORKBOOK_SHEETS_INVALID")
        tables = {}
        for name, sheet_name in SHEETS.items():
            values = list(workbook[sheet_name].values)
            headers = HEADERS[name]
            if not values or list(values[0]) != headers:
                raise ValueError("DIVING_HELMET_MAPPING_WORKBOOK_HEADERS_INVALID:" + name)
            rows = []
            for raw in values[1:]:
                if any(isinstance(value, str) and value.startswith("=") for value in raw):
                    raise ValueError("DIVING_HELMET_MAPPING_FORMULA_FORBIDDEN")
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
                raise ValueError("DIVING_HELMET_MAPPING_CSV_STALE:" + name)
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
    for tier_row, effect_row in zip(tables[TIER_CSV], tables[EFFECT_CSV]):
        declared = json.loads(tier_row["declared_attributes_json"])
        resolved.update(declared)
        profiles.append({
            "quality": tier_row["quality"],
            "sourceTier": {
                "abilityIds": ["0"], "auraIds": ["2"], "tooltipIds": [0, 1],
                "declaredAttributes": declared, "resolvedAttributes": dict(resolved),
            },
            "sourceAttributes": {"shieldApplyAmount": int(effect_row["amount"])},
            "effects": [{
                "sourceAbilityId": "0", "sourceAbilityDirectoryIndex": 0,
                "sourceValueAttribute": "ShieldApplyAmount",
                "sourceTriggerType": "TTriggerOnItemUsed",
                "mappedTriggerEvent": "friendly_item_used",
                "triggerPriority": "Medium", "effectOrder": 0,
                "subject": {
                    "type": "card_section", "section": "self_hand", "excludeSelf": False,
                    "condition": {"type": "card_tag", "tags": ["Aquatic"], "operator": "Any"},
                },
                "target": {"type": "self_player"},
                "operation": {"type": "gain_shield", "amount": int(effect_row["amount"])},
            }],
        })
    aura_row = tables[AURA_CSV][0]
    source_aura = {
        "sourceAuraId": "2", "sourceAuraDirectoryIndex": 0,
        "activeIn": aura_row["active_in"], "worksIn": aura_row["works_in"],
        "prerequisites": None,
        "action": {
            "type": "TAuraActionCardAddTagsList", "tags": ["Aquatic"],
            "target": {
                "type": "TTargetCardPositional", "origin": "Self", "targetMode": "Neighbor",
                "includeOrigin": False, "conditions": None,
            },
        },
    }
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Diving Helmet",
        "sourceIdentity": {
            "type": "Item", "size": "Medium", "startingTier": "Gold", "heroes": ["Vanessa"],
            "tags": ["Aquatic", "Tool", "Apparel"], "hiddenTags": ["Shield"],
            "spawningEligibility": "Always",
        },
        "itemId": ITEM_ID,
        "activationEvidence": "no_source_cooldown_attributes_listener_and_aura_only",
        "sourceAbilityDirectoryOrderObserved": ["0"],
        "sourceAuraDirectoryOrderObserved": ["2"],
        "qualityProfiles": profiles,
        "sourceAuras": [source_aura],
        "unknownSourceFields": [
            "dynamicTagAuraApplicationTiming", "dynamicTagAuraRemovalTiming",
            "overlappingTagAuraReferenceCounting", "sourceEventTagSnapshotPolicy",
            "adjacencySnapshotAndMovementPolicy", "disabledDestroyedTransformedAuraLifecycle",
            "samePriorityCrossItemOrder", "shieldResolutionOrder",
        ],
        "excludedScopes": [
            "enchantments", "economy", "acquisition", "complete_initial_state",
            "simultaneous_event_order", "complete_run_state", "top_three_identity",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-diving-helmet-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256, "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Complete Gold/Diamond inheritance, Ability 0 and Aura 2 directories",
        "limitations": [
            "This is not executable original-pirate content or a complete Diving Helmet item.",
            "Dynamic Aquatic tag Aura lifecycle, event tag sampling, adjacency movement and same-priority ordering remain unverified.",
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
        raise ValueError("DIVING_HELMET_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping, provenance = build_artifacts(read_candidate(args.workbook, args.csv_dir))
    for name, value in {"source-effect-mapping.json": mapping, "provenance.json": provenance}.items():
        payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        target = args.out_dir / name
        if target.exists() and target.read_text(encoding="utf-8") != payload:
            raise ValueError("DIVING_HELMET_MAPPING_OUTPUT_EXISTS_DIFFERENT:" + name)
        _atomic_write(target, payload)
    print(json.dumps({
        "output": str(args.out_dir), "mappingSha256": provenance["mappingSha256"],
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
    }))


if __name__ == "__main__":
    main()
