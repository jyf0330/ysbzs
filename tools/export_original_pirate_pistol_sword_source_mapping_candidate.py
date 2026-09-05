#!/usr/bin/env python3
"""Export Pistol Sword's locked source mapping without executable-rule claims."""

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
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_pistol_sword_source_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/pistol_sword_source_mapping"
SOURCE_UUID = "65527be1-b100-4a4c-98d1-4f8975368b5b"
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
SOURCE_CARD_SHA256 = "e82625692474cb68e5e6e5d738dc6822e44c06b6f7be6268842395e21f13c7b5"
SOURCE_TIERS_SHA256 = "154af4404369f30dad77a238f3666730a7787759eb7610d35bff7db36aab72ad"
SOURCE_ABILITIES_SHA256 = "81f8eee29d4f1001bd14c8fa14c3f663cb689078d86c304912e1ca28fa3d10a8"
SOURCE_AURAS_SHA256 = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
SOURCE_ENCHANTMENTS_SHA256 = "21886d0f433c9bda3d910bb084ebd2fd92df6289a1ffda093158f4c06f81074f"
FORMAL_CONTENT_SHA256 = "edf1006c193d5cd772157b05ae6150fbe0db2a73f9e633673e3dcc2f8aa255cd"
ITEM_ID = "item_bazaar_pistol_sword"
SKILL_IDS = ("skill_bazaar_pistol_sword_fire", "skill_bazaar_pistol_sword_ammo_listener")
QUALITIES = ("gold", "diamond")
DAMAGE_AMOUNTS = (15, 30)
EFFECT_CSV = "47_bz_item_effects.csv"
TIER_CSV = "source_tiers.csv"
AURA_CSV = "source_auras.csv"
SHEETS = {EFFECT_CSV: "BZ_ITEM_EFFECTS", TIER_CSV: "SOURCE_TIERS", AURA_CSV: "SOURCE_AURAS"}
HEADERS = {
    EFFECT_CSV: formal.DOMAIN_HEADERS[EFFECT_CSV],
    TIER_CSV: ["quality", "ability_ids", "aura_ids", "tooltip_ids", "declared_attributes_json"],
    AURA_CSV: ["source_aura_id", "active_in", "action_type", "target_type", "prerequisites", "works_in"],
}


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def expected_tables() -> dict[str, list[dict[str, str]]]:
    effects = []
    for quality, damage in zip(QUALITIES, DAMAGE_AMOUNTS):
        values = (
            {
                "effect_id": f"effect_bazaar_pistol_sword_{quality}_0",
                "item_id": ITEM_ID,
                "quality": quality,
                "item_skill_id": SKILL_IDS[0],
                "trigger_event": "item_ready",
                "condition_type": "always",
                "condition_source_relation": "any",
                "target_type": "opponent_hero",
                "operation_type": "deal_damage",
                "amount": str(damage),
                "catalog_status": "candidate_reference",
                "source_ability_id": "0",
                "trigger_priority": "Medium",
                "effect_order": "0",
            },
            {
                "effect_id": f"effect_bazaar_pistol_sword_{quality}_1",
                "item_id": ITEM_ID,
                "quality": quality,
                "item_skill_id": SKILL_IDS[1],
                "trigger_event": "friendly_item_used",
                "condition_type": "source_item_ammo_max_gt_zero",
                "condition_source_relation": "any",
                "target_type": "opponent_hero",
                "operation_type": "deal_damage",
                "amount": str(damage),
                "catalog_status": "candidate_reference",
                "source_ability_id": "1",
                "trigger_priority": "Medium",
                "effect_order": "0",
            },
        )
        effects.extend({key: str(row.get(key, "")) for key in HEADERS[EFFECT_CSV]} for row in values)
    declared = (
        {"AmmoMax": 3, "CooldownMax": 5000, "DamageAmount": 15, "Multicast": 1},
        {"DamageAmount": 30},
    )
    tiers = [
        {
            "quality": quality,
            "ability_ids": "0,1",
            "aura_ids": "",
            "tooltip_ids": "0,1",
            "declared_attributes_json": _canonical(attributes),
        }
        for quality, attributes in zip(QUALITIES, declared)
    ]
    return {EFFECT_CSV: effects, TIER_CSV: tiers, AURA_CSV: []}


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
        raise ValueError("PISTOL_SWORD_MAPPING_DOMAINS_INVALID")
    for name, rows in tables.items():
        headers = set(HEADERS[name])
        if not isinstance(rows, list) or any(
            not isinstance(row, dict) or set(row) != headers
            or any(not isinstance(value, str) for value in row.values())
            for row in rows
        ):
            raise ValueError("PISTOL_SWORD_MAPPING_FIELDS_INVALID:" + name)
    if tables != expected_tables():
        raise ValueError("PISTOL_SWORD_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_tables(path: Path = WORKBOOK) -> dict[str, list[dict[str, str]]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != list(SHEETS.values()):
            raise ValueError("PISTOL_SWORD_MAPPING_WORKBOOK_SHEETS_INVALID")
        tables = {}
        for name, sheet_name in SHEETS.items():
            values = list(workbook[sheet_name].values)
            headers = HEADERS[name]
            if not values or list(values[0]) != headers:
                raise ValueError("PISTOL_SWORD_MAPPING_WORKBOOK_HEADERS_INVALID:" + name)
            rows = []
            for raw in values[1:]:
                if any(isinstance(value, str) and value.startswith("=") for value in raw):
                    raise ValueError("PISTOL_SWORD_MAPPING_FORMULA_FORBIDDEN")
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
                raise ValueError("PISTOL_SWORD_MAPPING_CSV_STALE:" + name)
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
    for quality, damage in zip(QUALITIES, DAMAGE_AMOUNTS):
        tier_row = next(row for row in tables[TIER_CSV] if row["quality"] == quality)
        effect_rows = [row for row in tables[EFFECT_CSV] if row["quality"] == quality]
        declared = json.loads(tier_row["declared_attributes_json"])
        resolved.update(declared)
        profiles.append({
            "quality": quality,
            "sourceTier": {
                "abilityIds": ["0", "1"], "auraIds": [], "tooltipIds": [0, 1],
                "declaredAttributes": declared, "resolvedAttributes": dict(resolved),
            },
            "sourceAttributes": {
                "cooldownMaxMilliseconds": 5000, "multicast": 1,
                "ammoMaximum": 3, "damageAmount": damage,
            },
            "effects": [
                {
                    "sourceAbilityId": effect_rows[0]["source_ability_id"],
                    "sourceAbilityDirectoryIndex": 0,
                    "sourceValueAttribute": "DamageAmount",
                    "sourceTriggerType": "TTriggerOnCardFired",
                    "mappedTriggerEvent": "item_ready",
                    "triggerPriority": "Medium", "effectOrder": 0,
                    "target": {"type": "opponent_player"},
                    "operation": {"type": "deal_damage", "amount": damage},
                },
                {
                    "sourceAbilityId": effect_rows[1]["source_ability_id"],
                    "sourceAbilityDirectoryIndex": 1,
                    "sourceValueAttribute": "DamageAmount",
                    "sourceTriggerType": "TTriggerOnItemUsed",
                    "mappedTriggerEvent": "friendly_item_used",
                    "triggerPriority": "Medium", "effectOrder": 0,
                    "subject": {
                        "type": "card_section", "section": "self_hand", "excludeSelf": False,
                        "condition": {
                            "type": "card_attribute", "attribute": "AmmoMax",
                            "operator": "GreaterThan", "value": 0,
                        },
                    },
                    "target": {"type": "opponent_player"},
                    "operation": {"type": "deal_damage", "amount": damage},
                },
            ],
        })
    mapping = {
        "schema": "ysbzs.original-pirate-source-effect-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_effect_mapping_only_not_complete_item",
        "originalRulesAccepted": False,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceInternalName": "Pistol Sword",
        "sourceIdentity": {
            "type": "Item", "size": "Medium", "startingTier": "Gold",
            "heroes": ["Vanessa"], "tags": ["Weapon"],
            "hiddenTags": ["Damage", "Ammo"], "spawningEligibility": "Always",
        },
        "itemId": ITEM_ID,
        "candidateBuildUsage": {
            "buildRank": 1, "quality": "diamond", "enchantmentId": "none",
            "claimScope": "provided_candidate_membership_only_not_popularity_or_rules_proof",
        },
        "sourceDirectoryLocks": {
            "tiersSha256": SOURCE_TIERS_SHA256,
            "abilitiesSha256": SOURCE_ABILITIES_SHA256,
            "aurasSha256": SOURCE_AURAS_SHA256,
            "enchantmentsSha256": SOURCE_ENCHANTMENTS_SHA256,
        },
        "sourceAbilityDirectoryOrderObserved": ["0", "1"],
        "sourceAuraDirectoryOrderObserved": [],
        "sourceEnchantmentDirectoryOrderObserved": [
            "Golden", "Heavy", "Icy", "Turbo", "Shielded", "Restorative",
            "Toxic", "Fiery", "Shiny", "Deadly", "Radiant", "Obsidian", "Mossy",
        ],
        "qualityProfiles": profiles,
        "sourceAuras": [],
        "executionStatus": "static_source_mapping_only_all_timing_fail_closed",
        "unknownSourceFields": [
            "initialAmmo", "initialCooldownProgress", "baseCritChance",
            "damageCritEligibility", "emptyAmmoCooldownPolicy",
            "samePriorityAbilityOrder", "samePriorityCrossItemOrder",
            "cardFiredToItemUsedDispatchOrder", "selfAmmoItemUseReentrancy",
            "ammoConsumptionVersusItemUsedDispatchOrder", "multicastCardFiredPolicy",
        ],
        "excludedScopes": [
            "enchantment_execution", "economy", "acquisition", "complete_initial_state",
            "simultaneous_event_order", "complete_run_state", "top_three_identity_proof",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode()).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-pistol-sword-source-mapping-provenance.v1",
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
        "notValidatedAs": formal.CONTENT_SCHEMA, "mappingSha256": digest,
        "sourceDbSha256": SOURCE_DB_SHA256,
        "sourceCardCanonicalSha256": SOURCE_CARD_SHA256,
        "sourceObjectUuid": SOURCE_UUID,
        "sourceScope": "Complete Gold/Diamond inheritance, Ability 0/1 and empty base Aura directory",
        "limitations": [
            "This is static source mapping, not executable Pistol Sword content or a complete Run.",
            "Rank 1 Diamond/none is provided candidate membership context, not source-derived popularity or original-rules proof.",
            "Ammo initialization/consumption, event nesting, Crit eligibility and same-priority ordering remain unverified and fail closed.",
            "The enchantment directory is identity-locked but no enchantment execution semantics are accepted.",
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
        raise ValueError("PISTOL_SWORD_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping, provenance = build_artifacts(read_candidate(args.workbook, args.csv_dir))
    for name, value in {"source-effect-mapping.json": mapping, "provenance.json": provenance}.items():
        payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        target = args.out_dir / name
        if target.exists() and target.read_text(encoding="utf-8") != payload:
            raise ValueError("PISTOL_SWORD_MAPPING_OUTPUT_EXISTS_DIFFERENT:" + name)
        _atomic_write(target, payload)
    print(json.dumps({
        "output": str(args.out_dir), "mappingSha256": provenance["mappingSha256"],
        "acceptance": mapping["acceptance"], "originalRulesAccepted": False,
    }))


if __name__ == "__main__":
    main()
