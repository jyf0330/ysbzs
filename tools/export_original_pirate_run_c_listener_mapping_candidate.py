#!/usr/bin/env python3
"""Export source-locked Cannonade/Grapeshot listeners for one item-used event."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import tempfile

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "xlsx/candidates/original_pirate_run_c_listener_mapping.xlsx"
CSV_DIR = ROOT / "data/candidates/original_pirate/run_c_listener_mapping"
CSV_NAME = "source_event_listeners.csv"
SHEET = "SOURCE_EVENT_LISTENERS"
HEADERS = [
    "source_uuid", "source_internal_name", "item_id", "quality", "source_ability_id",
    "trigger_priority", "effect_order", "trigger_json", "action_json",
    "source_attributes_json", "catalog_status",
]
SOURCE_DB_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
CANNONADE_UUID = "c264f900-4482-4f8c-b99d-22a5a529fb2a"
GRAPESHOT_UUID = "e6a183ce-0ea9-4981-bbfb-95be32b93de2"


def _canonical(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def cannonade_trigger() -> dict:
    return {"$type": "TTriggerOnItemUsed", "Subject": {
        "$type": "TTargetCardSection", "TargetSection": "SelfHand", "ExcludeSelf": True,
        "Conditions": {"$type": "TCardConditionalOr", "Conditions": [
            {"$type": "TCardConditionalTag", "Tags": ["Weapon"], "Operator": "Any"},
            {"$type": "TCardConditionalHiddenTag", "Tags": ["Burn"], "Operator": "Any"},
        ]},
    }}


def grapeshot_trigger() -> dict:
    return {"$type": "TTriggerOnItemUsed", "Subject": {
        "$type": "TTargetCardSection", "TargetSection": "SelfHand", "ExcludeSelf": True,
        "Conditions": {
            "$type": "TCardConditionalAttribute", "Attribute": "AmmoMax",
            "ComparisonOperator": "GreaterThan", "ComparisonValue": {"$type": "TFixedValue", "Value": 0.0},
        },
    }}


def self_action(action_type: str) -> dict:
    return {
        "$type": action_type, "Value": None, "TargetCount": None,
        "Target": {"$type": "TTargetCardSelf", "Conditions": None}, "Cost": None,
    }


def expected_rows() -> list[dict[str, str]]:
    rows = []
    for quality, cooldown, damage in (("gold", 12000, 200), ("diamond", 10000, 300)):
        rows.append({
            "source_uuid": CANNONADE_UUID, "source_internal_name": "Cannonade",
            "item_id": "item_bazaar_cannonade", "quality": quality, "source_ability_id": "1",
            "trigger_priority": "Medium", "effect_order": "0",
            "trigger_json": _canonical(cannonade_trigger()),
            "action_json": _canonical(self_action("TActionCardCharge")),
            "source_attributes_json": _canonical({
                "cooldownMaxMilliseconds": cooldown, "multicast": 3,
                "damageAmount": damage, "chargeAmountMilliseconds": 2000, "chargeTargets": 1,
            }),
            "catalog_status": "candidate_reference",
        })
    for quality, damage in (("bronze", 30), ("silver", 60), ("gold", 120), ("diamond", 240)):
        rows.append({
            "source_uuid": GRAPESHOT_UUID, "source_internal_name": "Grapeshot",
            "item_id": "item_bazaar_grapeshot", "quality": quality, "source_ability_id": "1",
            "trigger_priority": "Lowest", "effect_order": "0",
            "trigger_json": _canonical(grapeshot_trigger()),
            "action_json": _canonical(self_action("TActionCardReload")),
            "source_attributes_json": _canonical({
                "cooldownMaxMilliseconds": 4000, "multicast": 1, "ammoMaximum": 1,
                "damageAmount": damage, "reloadAmount": 1, "reloadTargets": 1,
            }),
            "catalog_status": "candidate_reference",
        })
    return rows


def validate_rows(rows) -> None:
    if not isinstance(rows, list) or any(
        not isinstance(row, dict) or list(row) != HEADERS
        or any(not isinstance(value, str) for value in row.values()) for row in rows
    ):
        raise ValueError("RUN_C_LISTENER_MAPPING_FIELDS_INVALID")
    if rows != expected_rows():
        raise ValueError("RUN_C_LISTENER_MAPPING_SOURCE_LOCK_MISMATCH")


def workbook_rows(path: Path = WORKBOOK) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != [SHEET]:
            raise ValueError("RUN_C_LISTENER_MAPPING_WORKBOOK_SHEETS_INVALID")
        values = list(workbook[SHEET].values)
        if not values or list(values[0]) != HEADERS:
            raise ValueError("RUN_C_LISTENER_MAPPING_WORKBOOK_HEADERS_INVALID")
        rows = []
        for raw in values[1:]:
            if any(isinstance(value, str) and value.startswith("=") for value in raw):
                raise ValueError("RUN_C_LISTENER_MAPPING_FORMULA_FORBIDDEN")
            padded = list(raw) + [None] * (len(HEADERS) - len(raw))
            rows.append({key: "" if value is None else str(value) for key, value in zip(HEADERS, padded)})
        validate_rows(rows)
        return rows
    finally:
        workbook.close()


def _csv_text(rows) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=HEADERS, lineterminator="\n")
    writer.writeheader(); writer.writerows(rows)
    return stream.getvalue()


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", delete=False) as stream:
        stream.write(text); temporary = Path(stream.name)
    temporary.replace(path)


def export_csv(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR, check: bool = False) -> None:
    expected = _csv_text(workbook_rows(workbook))
    target = csv_dir / CSV_NAME
    if check:
        if not target.is_file() or target.read_text(encoding="utf-8") != expected:
            raise ValueError("RUN_C_LISTENER_MAPPING_CSV_STALE")
    else:
        _atomic_write(target, expected)


def read_candidate(workbook: Path = WORKBOOK, csv_dir: Path = CSV_DIR):
    export_csv(workbook, csv_dir, check=True)
    with (csv_dir / CSV_NAME).open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    validate_rows(rows)
    return rows


def build_artifacts(rows):
    validate_rows(rows)
    entries = []
    for row in rows:
        trigger = json.loads(row["trigger_json"])
        attrs = json.loads(row["source_attributes_json"])
        if row["source_internal_name"] == "Cannonade":
            source_filter = {"owner": "self", "excludeSelf": True, "any": [
                {"kind": "tag", "value": "Weapon"}, {"kind": "hiddenTag", "value": "Burn"},
            ]}
            operation = {"type": "charge_self", "ticks": attrs["chargeAmountMilliseconds"] // 50}
        else:
            source_filter = {"owner": "self", "excludeSelf": True,
                             "attribute": "AmmoMax", "operator": "GreaterThan", "value": 0}
            operation = {"type": "reload_self", "amount": attrs["reloadAmount"]}
        entries.append({
            "sourceObjectUuid": row["source_uuid"], "sourceInternalName": row["source_internal_name"],
            "itemId": row["item_id"], "quality": row["quality"],
            "sourceAbilityId": row["source_ability_id"], "sourceTrigger": trigger,
            "mappedEvent": "another_friendly_item_used", "sourceFilter": source_filter,
            "triggerPriority": row["trigger_priority"], "effectOrder": int(row["effect_order"]),
            "sourceAction": json.loads(row["action_json"]), "operation": operation,
            "sourceAttributes": attrs,
        })
    mapping = {
        "schema": "ysbzs.original-pirate-source-event-listener-mapping-candidate.v1",
        "schemaVersion": 1,
        "acceptance": "source_listener_mapping_only_not_complete_items",
        "sourceDbSha256": SOURCE_DB_SHA256,
        "compositionId": "run_c_cannonade_medium_then_grapeshot_lowest_on_ammo_weapon_use",
        "entries": entries,
        "excludedScopes": [
            "emitter_complete_item", "same_tier_tie_break", "nested_events", "enchantments",
            "economy", "acquisition", "complete_run_state", "top_three_identity",
        ],
    }
    digest = hashlib.sha256(_canonical(mapping).encode("utf-8")).hexdigest()
    provenance = {
        "schema": "ysbzs.original-pirate-source-event-listener-provenance.v1",
        "mappingSha256": digest, "sourceDbSha256": SOURCE_DB_SHA256,
        "acceptance": mapping["acceptance"], "notValidatedAs": "ysbzs.original-pirate-content.v1",
        "limitations": [
            "This candidate locks two listener abilities, not complete Cannonade or Grapeshot items.",
            "A complete original source item must emit the shared event before this can become a natural Run proof.",
            "Representative Run C is not proven to be a top-three exact build.",
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
    if "generated" in resolved.parts or "gameplay" in resolved.parts:
        raise ValueError("RUN_C_LISTENER_MAPPING_OUTPUT_MUST_BE_ISOLATED")
    mapping, provenance = build_artifacts(read_candidate(args.workbook, args.csv_dir))
    for name, value in {"source-event-listener-mapping.json": mapping, "provenance.json": provenance}.items():
        text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        target = args.out_dir / name
        if target.exists() and target.read_text(encoding="utf-8") != text:
            raise ValueError("RUN_C_LISTENER_MAPPING_OUTPUT_EXISTS_DIFFERENT:" + name)
        _atomic_write(target, text)
    print(json.dumps({"mappingSha256": provenance["mappingSha256"], "output": str(args.out_dir)}))


if __name__ == "__main__":
    main()
