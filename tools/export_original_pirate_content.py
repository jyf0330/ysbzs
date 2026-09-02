#!/usr/bin/env python3
"""Build strict original-pirate runtime and display candidates from 16 BZ domains.

The CSV files are the complete authoring projection from ysbzs_master.xlsx.
This exporter deliberately keeps planner-facing Chinese/catalog/source fields
outside the integration-pending v8 runtime package while still validating every
domain and every reference before emitting any output.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV_DIR = ROOT / "data" / "csv"

GAMEPLAY_ID = "original_pirate"
CONTENT_SCHEMA = "ysbzs.original-pirate-content.v1"
CONTENT_SCHEMA_VERSION = 10
QUALITY_PROFILE_SCHEMA = "ysbzs.original-pirate-item-quality-profiles.v1"
RUNTIME_SCHEMA = "ysbzs.original-pirate-runtime-bundle.v1"
RUNTIME_SCHEMA_VERSION = 8
SOURCE_CONTENT_SCHEMA_VERSION = 8
SOURCE_RUNTIME_SCHEMA_VERSION = 6
NEW_RUN_SCHEMA_VERSION = 1
BATTLE_PACKAGE_SCHEMA_VERSION = 1
GENERATION_SCHEMA = "ysbzs.original-pirate-generation.v1"
GENERATION_SCHEMA_VERSION = 1
GENERATION_ALGORITHM = "sha256-ranked-selection-v1"
DISPLAY_SCHEMA = "ysbzs.original-pirate-display-directory.v1"
DISPLAY_SCHEMA_VERSION = 1
EXECUTABLE_CATALOGS_SCHEMA = "ysbzs.original-pirate-executable-catalogs.v1"
EXECUTABLE_CATALOGS_SCHEMA_VERSION = 3
PROGRESSION_SCHEMA = "ysbzs.original-pirate-progression-rules.v1"
PROGRESSION_SCHEMA_VERSION = 1
SCHEDULE_SCHEMA = "ysbzs.original-pirate-schedule-config.v3"
SCHEDULE_SCHEMA_VERSION = 3
RULES_VERSION = "ysbzs.original-pirate-rules.2026-09-02-v6"
INCOME_PAYOUT_POLICY = "day_advance"
QUALITIES = ["bronze", "silver", "gold", "diamond"]
ITEM_EFFECT_TARGETS = {"selected_enemy", "self_item", "first_enemy_item"}
ITEM_EFFECT_OPERATIONS = {"deal_damage", "reload", "charge", "apply_status"}
ITEM_STATUSES = {"haste", "slow", "freeze"}
EXPECTED_HOUR_KINDS = {1: "choice", 2: "choice", 3: "pve", 4: "choice", 5: "choice", 6: "ghost"}
CHOICE_HOURS = {1, 2, 4, 5}
STABLE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")
INTEGER_RE = re.compile(r"^-?(0|[1-9][0-9]*)$")
CJK_RE = re.compile(r"[\u3400-\u9fff]")

DOMAIN_HEADERS = OrderedDict([
    ("44_bz_gameplay.csv", [
        "gameplay_id", "content_schema", "schema_version", "quality_profile_schema",
        "rules_version", "source_revision", "bundle_revision", "content_revision",
        "runtime_schema", "runtime_schema_version", "new_run_schema_version",
        "battle_package_schema_version", "schedule_schema", "schedule_schema_version",
        "income_payout_policy",
        "seed", "phase", "start_day", "start_hour", "board_size",
        "terminal_pressure_enabled", "terminal_pressure_start_tick",
        "terminal_pressure_interval_ticks", "terminal_pressure_initial_damage",
        "terminal_pressure_increment_damage", "pve_win_bonus_xp",
        "pve_loss_prestige", "pve_draw_prestige", "ghost_loss_prestige",
        "ghost_draw_prestige", "win_target", "last_chance_enabled",
        "bootstrap_run_day_coverage", "bootstrap_refresh_package_coverage", "hour", "kind",
        "completion_xp", "node_types", "catalog_status",
    ]),
    ("45_bz_heroes.csv", [
        "hero_id", "name_zh", "max_hp", "start_level", "start_xp", "start_prestige",
        "start_gold", "start_income", "skill_ids", "catalog_status",
    ]),
    ("46_bz_items.csv", [
        "item_id", "name_zh", "slot_width", "base_quality", "quality", "buy_price",
        "sell_price", "cooldown_ticks", "ammo_enabled", "ammo_initial", "ammo_maximum",
        "skill_id", "starter_instance_id", "starter_location", "starter_start_slot",
        "catalog_status",
    ]),
    ("47_bz_item_effects.csv", [
        "effect_id", "item_id", "quality", "skill_id", "priority", "trigger_event",
        "condition_type", "target_type", "operation_type", "amount", "status", "ticks",
        "catalog_status",
    ]),
    ("48_bz_skills.csv", [
        "skill_id", "name_zh", "description_zh", "trigger_event", "effect_ids",
        "catalog_status",
    ]),
    ("49_bz_stalls.csv", [
        "stall_id", "name_zh", "refresh_cost", "offer_slots", "catalog_status",
    ]),
    ("50_bz_stall_offers.csv", [
        "package_id", "stall_id", "refresh_index", "offer_id", "item_id", "quality",
        "enchantment", "price", "frozen", "slot_order", "catalog_status",
    ]),
    ("51_bz_events.csv", [
        "event_id", "name_zh", "description_zh", "hour_slots", "catalog_status",
    ]),
    ("52_bz_event_options.csv", [
        "option_id", "event_id", "name_zh", "description_zh", "reward_id", "gold_delta",
        "catalog_status",
    ]),
    ("53_bz_encounters.csv", [
        "encounter_id", "name_zh", "day", "hour", "kind", "enemy_id", "reward_id",
        "catalog_status",
    ]),
    ("54_bz_enemies.csv", [
        "enemy_id", "name_zh", "hero_hp", "hero_max_hp", "instance_id", "item_id",
        "quality", "enchantment", "start_slot", "catalog_status",
    ]),
    ("55_bz_rewards.csv", [
        "reward_id", "name_zh", "reward_type", "amount", "item_id", "quality",
        "description_zh", "catalog_status",
    ]),
    ("56_bz_source_snapshot.csv", [
        "snapshot_id", "source_kind", "source_revision", "captured_on", "license_note",
        "catalog_scope", "completeness", "catalog_status",
    ]),
    ("57_bz_item_upgrades.csv", [
        "upgrade_id", "item_id", "from_quality", "to_quality", "price",
        "source_stall_id", "catalog_status",
    ]),
    ("58_bz_enchantments.csv", [
        "enchantment_id", "name_zh", "description_zh", "item_id", "quality", "price",
        "cooldown_delta_ticks", "damage_delta", "ammo_delta", "source_stall_id",
        "catalog_status",
    ]),
    ("59_bz_level_up_choices.csv", [
        "enabled", "milestone_id", "level", "required_xp", "option_id", "option_order",
        "name_zh", "description_zh", "effect_type", "amount", "item_id", "quality",
        "target_rule", "catalog_status",
    ]),
])

DISPLAY_DOMAINS = [
    ("45_bz_heroes.csv", "heroes", "hero_id"),
    ("46_bz_items.csv", "items", "item_id"),
    ("48_bz_skills.csv", "skills", "skill_id"),
    ("49_bz_stalls.csv", "stalls", "stall_id"),
    ("51_bz_events.csv", "events", "event_id"),
    ("52_bz_event_options.csv", "event_options", "option_id"),
    ("53_bz_encounters.csv", "encounters", "encounter_id"),
    ("54_bz_enemies.csv", "enemies", "enemy_id"),
    ("55_bz_rewards.csv", "rewards", "reward_id"),
    ("58_bz_enchantments.csv", "enchantments", "enchantment_id"),
    ("59_bz_level_up_choices.csv", "level_up_options", "option_id"),
]


class ExportError(ValueError):
    """One deterministic authoring-contract rejection."""


def _read_domains(csv_dir: Path) -> dict[str, list[dict[str, str]]]:
    tables: dict[str, list[dict[str, str]]] = {}
    for filename, expected_headers in DOMAIN_HEADERS.items():
        path = csv_dir / filename
        if not path.is_file():
            raise ExportError(f"DOMAIN_FILE_MISSING:{filename}")
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            actual_headers = list(reader.fieldnames or [])
            if actual_headers != expected_headers:
                raise ExportError(f"DOMAIN_HEADERS_INVALID:{filename}")
            rows = []
            for row_index, source in enumerate(reader, start=2):
                row = {header: str(source.get(header, "") or "").strip() for header in expected_headers}
                if not any(row.values()):
                    continue
                row["__row__"] = str(row_index)
                rows.append(row)
        if not rows:
            raise ExportError(f"DOMAIN_EMPTY:{filename}")
        tables[filename] = rows
    return tables


def _location(filename: str, row: dict[str, str]) -> str:
    return f"{filename}:{row.get('__row__', '?')}"


def _require_text(filename: str, row: dict[str, str], field: str) -> str:
    value = row.get(field, "")
    if value == "":
        raise ExportError(f"FIELD_REQUIRED:{_location(filename, row)}:{field}")
    return value


def _require_id(filename: str, row: dict[str, str], field: str) -> str:
    value = _require_text(filename, row, field)
    if not STABLE_ID_RE.fullmatch(value):
        raise ExportError(f"STABLE_ID_INVALID:{_location(filename, row)}:{field}")
    return value


def _require_chinese(filename: str, row: dict[str, str], field: str) -> str:
    value = _require_text(filename, row, field)
    if not CJK_RE.search(value):
        raise ExportError(f"CHINESE_TEXT_REQUIRED:{_location(filename, row)}:{field}")
    return value


def _integer(filename: str, row: dict[str, str], field: str, minimum: int | None = None) -> int:
    value = _require_text(filename, row, field)
    if not INTEGER_RE.fullmatch(value):
        raise ExportError(f"INTEGER_INVALID:{_location(filename, row)}:{field}")
    number = int(value)
    if minimum is not None and number < minimum:
        raise ExportError(f"INTEGER_RANGE_INVALID:{_location(filename, row)}:{field}")
    return number


def _optional_integer(filename: str, row: dict[str, str], field: str) -> int | None:
    if row.get(field, "") == "":
        return None
    return _integer(filename, row, field)


def _boolean(filename: str, row: dict[str, str], field: str) -> bool:
    value = _require_text(filename, row, field)
    if value not in {"true", "false"}:
        raise ExportError(f"BOOLEAN_INVALID:{_location(filename, row)}:{field}")
    return value == "true"


def _ids(filename: str, row: dict[str, str], field: str, allow_empty: bool = False) -> list[str]:
    raw = row.get(field, "")
    values = [part.strip() for part in re.split(r"[,，、]", raw) if part.strip()]
    if not values and not allow_empty:
        raise ExportError(f"ID_LIST_REQUIRED:{_location(filename, row)}:{field}")
    if len(values) != len(set(values)) or any(not STABLE_ID_RE.fullmatch(value) for value in values):
        raise ExportError(f"ID_LIST_INVALID:{_location(filename, row)}:{field}")
    return values


def _hours(filename: str, row: dict[str, str], field: str) -> list[int]:
    raw_values = [part.strip() for part in re.split(r"[,，、]", row.get(field, "")) if part.strip()]
    if not raw_values:
        raise ExportError(f"HOUR_LIST_REQUIRED:{_location(filename, row)}:{field}")
    if any(not INTEGER_RE.fullmatch(value) for value in raw_values):
        raise ExportError(f"HOUR_LIST_INVALID:{_location(filename, row)}:{field}")
    values = [int(value) for value in raw_values]
    if len(values) != len(set(values)) or any(value not in CHOICE_HOURS for value in values):
        raise ExportError(f"HOUR_LIST_INVALID:{_location(filename, row)}:{field}")
    return values


def _formal(filename: str, row: dict[str, str]) -> None:
    if _require_text(filename, row, "catalog_status") != "formal":
        raise ExportError(f"CATALOG_STATUS_INVALID:{_location(filename, row)}")


def _unique(rows: list[dict[str, str]], filename: str, field: str) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    for row in rows:
        value = _require_id(filename, row, field)
        if value in result:
            raise ExportError(f"ID_DUPLICATE:{filename}:{field}:{value}")
        result[value] = row
    return result


def _same(rows: list[dict[str, str]], filename: str, field: str) -> str:
    values = {_require_text(filename, row, field) for row in rows}
    if len(values) != 1:
        raise ExportError(f"GLOBAL_FIELD_INCONSISTENT:{filename}:{field}")
    return next(iter(values))


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _canonical_runtime_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = json.loads(json.dumps(items, ensure_ascii=False))
    for item in result:
        for profile in item.get("qualityProfiles", {}).values():
            profile.get("effects", []).sort(key=lambda value: (value.get("priority", 0), value.get("effectId", "")))
    result.sort(key=lambda value: value.get("itemId", ""))
    return result


def _canonical_runtime_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    result = json.loads(json.dumps(bundle, ensure_ascii=False))
    result.pop("bundleHash", None)
    generation = result.get("generation", {})
    shop = generation.get("shop", {})
    shop.get("templates", []).sort(key=lambda value: value.get("offerTemplateId", ""))
    for layer in shop.get("layers", []):
        layer.get("templateIds", []).sort()
    shop.get("layers", []).sort(key=lambda value: value.get("fromRefreshIndex", -1))
    battle = generation.get("battle", {})
    battle.get("templates", []).sort(key=lambda value: value.get("encounterTemplateId", ""))
    for layer in battle.get("layers", []):
        layer.get("pveTemplateIds", []).sort()
        layer.get("ghostTemplateIds", []).sort()
    battle.get("layers", []).sort(key=lambda value: value.get("fromDay", -1))
    schedule = result.get("scheduleConfig", {})
    schedule.get("hours", []).sort(key=lambda value: value.get("hour", -1))
    progression = result.get("progressionRules", {})
    progression.get("milestones", []).sort(key=lambda value: value.get("level", -1))
    progression.get("options", []).sort(key=lambda value: value.get("optionId", ""))
    catalogs = result.get("executableCatalogs", {})
    for hero in catalogs.get("heroes", []):
        hero.get("skillIds", []).sort()
    catalogs.get("heroes", []).sort(key=lambda value: value.get("heroId", ""))
    for skill in catalogs.get("skills", []):
        skill.get("effectIds", []).sort()
    catalogs.get("skills", []).sort(key=lambda value: value.get("skillId", ""))
    for stall in catalogs.get("stalls", []):
        stall.get("shopTemplateIds", []).sort()
    catalogs.get("stalls", []).sort(key=lambda value: value.get("stallId", ""))
    catalogs.get("upgrades", []).sort(key=lambda value: value.get("upgradeId", ""))
    for enchantment in catalogs.get("enchantments", []):
        enchantment.get("stallIds", []).sort()
        enchantment.get("profiles", []).sort(
            key=lambda value: (value.get("itemId", ""), QUALITIES.index(value.get("quality", "")))
        )
    catalogs.get("enchantments", []).sort(key=lambda value: value.get("enchantmentId", ""))
    for event in catalogs.get("events", []):
        event.get("hourSlots", []).sort()
        event.get("optionIds", []).sort()
    catalogs.get("events", []).sort(key=lambda value: value.get("eventId", ""))
    catalogs.get("eventOptions", []).sort(key=lambda value: value.get("optionId", ""))
    for reward in catalogs.get("rewards", []):
        reward.get("effects", []).sort(key=_canonical_json)
    catalogs.get("rewards", []).sort(key=lambda value: value.get("rewardId", ""))
    return result


def _runtime_bundle_hash(bundle: dict[str, Any], items: list[dict[str, Any]]) -> str:
    source = {
        "items": _canonical_runtime_items(items),
        "runtimeBundle": _canonical_runtime_bundle(bundle),
    }
    return hashlib.sha256(_canonical_json(source).encode("utf-8")).hexdigest()


def _expect_exact_fields(value: Any, fields: set[str], context: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != fields:
        raise ExportError(f"EXECUTABLE_FIELDS_INVALID:{context}")
    return value


def _expect_list(value: Any, context: str, maximum: int = 100_000) -> list[Any]:
    if not isinstance(value, list) or len(value) > maximum:
        raise ExportError(f"EXECUTABLE_LIST_INVALID:{context}")
    return value


def _expect_stable_id(value: Any, context: str) -> str:
    if not isinstance(value, str) or not STABLE_ID_RE.fullmatch(value):
        raise ExportError(f"EXECUTABLE_STABLE_ID_INVALID:{context}")
    return value


def _expect_integer(value: Any, context: str, minimum: int | None = None) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or (minimum is not None and value < minimum):
        raise ExportError(f"EXECUTABLE_INTEGER_INVALID:{context}")
    return value


def _validate_executable_item_effect(value: Any, context: str) -> str:
    effect = _expect_exact_fields(value, {
        "effectId", "priority", "trigger", "target", "operation",
    }, context)
    effect_id = _expect_stable_id(effect["effectId"], f"{context}:effectId")
    _expect_integer(effect["priority"], f"{context}:priority", 0)
    trigger = _expect_exact_fields(effect["trigger"], {"event", "conditions"}, f"{context}:trigger")
    if trigger["event"] != "item_ready":
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TRIGGER_INVALID:{effect_id}")
    conditions = _expect_list(trigger["conditions"], f"{context}:trigger:conditions")
    if conditions != [{"type": "always", "params": {}}]:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CONDITIONS_INVALID:{effect_id}")
    target = _expect_exact_fields(effect["target"], {"type", "params"}, f"{context}:target")
    target_type = target["type"]
    if target_type not in ITEM_EFFECT_TARGETS or target["params"] != {}:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TARGET_INVALID:{effect_id}")
    operation = _expect_exact_fields(effect["operation"], {"type", "params"}, f"{context}:operation")
    operation_type = operation["type"]
    if operation_type not in ITEM_EFFECT_OPERATIONS:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_OPERATION_INVALID:{effect_id}")
    if operation_type == "deal_damage":
        params = _expect_exact_fields(operation["params"], {"amount"}, f"{context}:operation:params")
        _expect_integer(params["amount"], f"{context}:operation:params:amount", 1)
        valid_target = target_type == "selected_enemy"
    elif operation_type == "reload":
        params = _expect_exact_fields(operation["params"], {"amount"}, f"{context}:operation:params")
        _expect_integer(params["amount"], f"{context}:operation:params:amount", 1)
        valid_target = target_type == "self_item"
    elif operation_type == "charge":
        params = _expect_exact_fields(operation["params"], {"ticks"}, f"{context}:operation:params")
        _expect_integer(params["ticks"], f"{context}:operation:params:ticks", 1)
        valid_target = target_type == "self_item"
    else:
        params = _expect_exact_fields(operation["params"], {"status", "ticks"}, f"{context}:operation:params")
        if params["status"] not in ITEM_STATUSES:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_STATUS_INVALID:{effect_id}")
        _expect_integer(params["ticks"], f"{context}:operation:params:ticks", 1)
        valid_target = target_type in {"self_item", "first_enemy_item"}
    if not valid_target:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
    return effect_id


def _directory(records: list[Any], id_field: str, fields: set[str], context: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for index, value in enumerate(records):
        record = _expect_exact_fields(value, fields, f"{context}:{index}")
        stable_id = _expect_stable_id(record.get(id_field), f"{context}:{index}:{id_field}")
        if stable_id in result:
            raise ExportError(f"EXECUTABLE_ID_DUPLICATE:{context}:{stable_id}")
        result[stable_id] = record
    return result


def validate_package(package: Any) -> None:
    """Validate the integration-pending v10/v8 package without accepting partial data."""
    root = _expect_exact_fields(package, {
        "gameplayId", "contentSchema", "sourceRevision", "rulesVersion", "schemaVersion",
        "qualityProfileSchema", "contentRevision", "items", "runtimeBundle",
    }, "root")
    if root["gameplayId"] != GAMEPLAY_ID or root["contentSchema"] != CONTENT_SCHEMA \
            or root["schemaVersion"] != CONTENT_SCHEMA_VERSION \
            or root["qualityProfileSchema"] != QUALITY_PROFILE_SCHEMA \
            or root["rulesVersion"] != RULES_VERSION:
        raise ExportError("EXECUTABLE_ROOT_IDENTITY_INVALID")
    _expect_stable_id(root["sourceRevision"], "root:sourceRevision")
    _expect_stable_id(root["contentRevision"], "root:contentRevision")

    items = _expect_list(root["items"], "root:items")
    item_profiles: set[tuple[str, str]] = set()
    item_profile_values: dict[tuple[str, str], dict[str, Any]] = {}
    item_qualities: dict[str, list[str]] = {}
    item_effect_ids: set[str] = set()
    for item_index, item_value in enumerate(items):
        item = _expect_exact_fields(item_value, {
            "itemId", "slotWidth", "baseQuality", "qualityProfiles",
        }, f"items:{item_index}")
        item_id = _expect_stable_id(item["itemId"], f"items:{item_index}:itemId")
        profiles = item["qualityProfiles"]
        if not isinstance(profiles, dict) or not profiles:
            raise ExportError(f"EXECUTABLE_ITEM_PROFILES_INVALID:{item_id}")
        qualities = sorted(profiles, key=QUALITIES.index)
        base_quality = item.get("baseQuality")
        if base_quality not in QUALITIES or qualities != QUALITIES[QUALITIES.index(base_quality):]:
            raise ExportError(f"EXECUTABLE_ITEM_PROFILE_COVERAGE_INVALID:{item_id}")
        item_qualities[item_id] = qualities
        for quality, profile in profiles.items():
            if quality not in QUALITIES or not isinstance(profile, dict):
                raise ExportError(f"EXECUTABLE_ITEM_PROFILE_INVALID:{item_id}:{quality}")
            _expect_exact_fields(profile, {
                "buyPrice", "sellPrice", "baseCooldownTicks", "ammo", "effects",
            }, f"items:{item_id}:{quality}")
            _expect_integer(profile["buyPrice"], f"items:{item_id}:{quality}:buyPrice", 1)
            _expect_integer(profile["sellPrice"], f"items:{item_id}:{quality}:sellPrice", 0)
            _expect_integer(profile["baseCooldownTicks"], f"items:{item_id}:{quality}:baseCooldownTicks", 1)
            ammo = _expect_exact_fields(profile["ammo"], {
                "enabled", "initial", "maximum",
            }, f"items:{item_id}:{quality}:ammo")
            if not isinstance(ammo["enabled"], bool):
                raise ExportError(f"EXECUTABLE_ITEM_AMMO_ENABLED_INVALID:{item_id}:{quality}")
            _expect_integer(ammo["initial"], f"items:{item_id}:{quality}:ammo.initial", 0)
            _expect_integer(ammo["maximum"], f"items:{item_id}:{quality}:ammo.maximum", 0)
            item_profiles.add((item_id, quality))
            item_profile_values[(item_id, quality)] = profile
            for effect_index, effect in enumerate(_expect_list(profile.get("effects"), f"items:{item_id}:{quality}:effects")):
                effect_id = _validate_executable_item_effect(
                    effect, f"items:{item_id}:{quality}:effects:{effect_index}"
                )
                if effect_id in item_effect_ids:
                    raise ExportError(f"EXECUTABLE_EFFECT_ID_DUPLICATE:{effect_id}")
                item_effect_ids.add(effect_id)

    bundle = _expect_exact_fields(root["runtimeBundle"], {
        "schema", "schemaVersion", "bundleRevision", "rulesVersion", "contentRevision",
        "bundleHash", "newRunTemplate", "scheduleConfig", "shopRules", "battleRules",
        "progressionRules", "generation", "executableCatalogs",
    }, "runtimeBundle")
    if bundle["schema"] != RUNTIME_SCHEMA or bundle["schemaVersion"] != RUNTIME_SCHEMA_VERSION \
            or bundle["rulesVersion"] != root["rulesVersion"] \
            or bundle["contentRevision"] != root["contentRevision"]:
        raise ExportError("EXECUTABLE_RUNTIME_IDENTITY_INVALID")
    _expect_stable_id(bundle["bundleRevision"], "runtimeBundle:bundleRevision")

    battle_rules = _expect_exact_fields(bundle["battleRules"], {
        "terminalPressure",
    }, "battleRules")
    terminal_pressure = _expect_exact_fields(battle_rules["terminalPressure"], {
        "enabled", "startTick", "intervalTicks", "initialDamage", "incrementDamage",
    }, "battleRules:terminalPressure")
    if terminal_pressure["enabled"] is not True:
        raise ExportError("EXECUTABLE_TERMINAL_PRESSURE_ENABLED_INVALID")
    _expect_integer(terminal_pressure["startTick"], "battleRules:terminalPressure:startTick", 1)
    _expect_integer(terminal_pressure["intervalTicks"], "battleRules:terminalPressure:intervalTicks", 1)
    _expect_integer(terminal_pressure["initialDamage"], "battleRules:terminalPressure:initialDamage", 1)
    _expect_integer(terminal_pressure["incrementDamage"], "battleRules:terminalPressure:incrementDamage", 0)

    progression = _expect_exact_fields(bundle["progressionRules"], {
        "schema", "schemaVersion", "enabled", "milestones", "options",
    }, "progressionRules")
    if progression["schema"] != PROGRESSION_SCHEMA \
            or progression["schemaVersion"] != PROGRESSION_SCHEMA_VERSION \
            or progression["enabled"] is not True:
        raise ExportError("EXECUTABLE_PROGRESSION_IDENTITY_INVALID")
    progression_options = _directory(
        _expect_list(progression["options"], "progressionRules:options"),
        "optionId",
        {"optionId", "milestoneId", "effect"},
        "progressionOptions",
    )
    option_effect_types: dict[str, str] = {}
    for option_id, option in progression_options.items():
        milestone_id = _expect_stable_id(option["milestoneId"], f"progressionOptions:{option_id}:milestoneId")
        effect = option["effect"]
        if not isinstance(effect, dict):
            raise ExportError(f"EXECUTABLE_PROGRESSION_EFFECT_INVALID:{option_id}")
        effect_type = effect.get("type")
        if effect_type == "change_gold":
            _expect_exact_fields(effect, {"type", "amount"}, f"progressionOptions:{option_id}:effect")
            _expect_integer(effect["amount"], f"progressionOptions:{option_id}:amount", 1)
        elif effect_type == "grant_item":
            _expect_exact_fields(effect, {
                "type", "itemId", "quality", "quantity", "destination",
            }, f"progressionOptions:{option_id}:effect")
            item_id = _expect_stable_id(effect["itemId"], f"progressionOptions:{option_id}:itemId")
            if (item_id, effect["quality"]) not in item_profiles or effect["destination"] != "stash":
                raise ExportError(f"EXECUTABLE_PROGRESSION_ITEM_INVALID:{option_id}")
            _expect_integer(effect["quantity"], f"progressionOptions:{option_id}:quantity", 1)
        elif effect_type == "upgrade_owned_item":
            _expect_exact_fields(effect, {
                "type", "targetRule", "steps",
            }, f"progressionOptions:{option_id}:effect")
            if effect["targetRule"] != "player_selected_owned_instance" or effect["steps"] != 1:
                raise ExportError(f"EXECUTABLE_PROGRESSION_UPGRADE_INVALID:{option_id}")
        else:
            raise ExportError(f"EXECUTABLE_PROGRESSION_EFFECT_INVALID:{option_id}")
        option_effect_types[option_id] = str(effect_type)

    milestones = _directory(
        _expect_list(progression["milestones"], "progressionRules:milestones"),
        "milestoneId",
        {"milestoneId", "level", "requiredXp", "optionIds"},
        "progressionMilestones",
    )
    if len(milestones) < 3:
        raise ExportError("EXECUTABLE_PROGRESSION_MILESTONES_INCOMPLETE")
    milestone_records = list(milestones.values())
    levels_by_id = {
        value["milestoneId"]: _expect_integer(
            value["level"], f"progressionMilestones:{value['milestoneId']}:level", 2
        )
        for value in milestone_records
    }
    milestone_records.sort(key=lambda value: levels_by_id[value["milestoneId"]])
    levels = [levels_by_id[value["milestoneId"]] for value in milestone_records]
    if levels != list(range(2, 2 + len(levels))):
        raise ExportError("EXECUTABLE_PROGRESSION_LEVEL_COVERAGE_INVALID")
    required_xp = [
        _expect_integer(value["requiredXp"], "progressionMilestones:requiredXp", 1)
        for value in milestone_records
    ]
    if any(required_xp[index] <= required_xp[index - 1] for index in range(1, len(required_xp))):
        raise ExportError("EXECUTABLE_PROGRESSION_XP_ORDER_INVALID")
    owned_option_ids: set[str] = set()
    required_types = {"change_gold", "grant_item", "upgrade_owned_item"}
    for milestone_id, milestone in milestones.items():
        option_ids = [
            _expect_stable_id(value, f"progressionMilestones:{milestone_id}:optionIds")
            for value in _expect_list(milestone["optionIds"], f"progressionMilestones:{milestone_id}:optionIds")
        ]
        if len(option_ids) != 3 or len(option_ids) != len(set(option_ids)) \
                or any(value not in progression_options for value in option_ids) \
                or any(progression_options[value]["milestoneId"] != milestone_id for value in option_ids) \
                or {option_effect_types[value] for value in option_ids} != required_types \
                or owned_option_ids.intersection(option_ids):
            raise ExportError(f"EXECUTABLE_PROGRESSION_OPTIONS_INVALID:{milestone_id}")
        owned_option_ids.update(option_ids)
    if owned_option_ids != set(progression_options):
        raise ExportError("EXECUTABLE_PROGRESSION_OPTION_COVERAGE_INVALID")

    catalogs = _expect_exact_fields(bundle["executableCatalogs"], {
        "schema", "schemaVersion", "heroes", "skills", "stalls", "events",
        "eventOptions", "rewards", "upgrades", "enchantments",
    }, "executableCatalogs")
    if catalogs["schema"] != EXECUTABLE_CATALOGS_SCHEMA \
            or catalogs["schemaVersion"] != EXECUTABLE_CATALOGS_SCHEMA_VERSION:
        raise ExportError("EXECUTABLE_CATALOG_IDENTITY_INVALID")

    skills = _directory(_expect_list(catalogs["skills"], "catalogs:skills"), "skillId", {
        "skillId", "triggerEvent", "effectIds",
    }, "skills")
    referenced_effects: set[str] = set()
    for skill_id, skill in skills.items():
        if skill["triggerEvent"] != "item_ready":
            raise ExportError(f"EXECUTABLE_SKILL_TRIGGER_INVALID:{skill_id}")
        effect_ids = [
            _expect_stable_id(effect_id, f"skills:{skill_id}:effectIds")
            for effect_id in _expect_list(skill["effectIds"], f"skills:{skill_id}:effectIds")
        ]
        if not effect_ids or len(effect_ids) != len(set(effect_ids)) or any(effect_id not in item_effect_ids for effect_id in effect_ids):
            raise ExportError(f"EXECUTABLE_SKILL_EFFECT_REFERENCE_INVALID:{skill_id}")
        if referenced_effects.intersection(effect_ids):
            raise ExportError(f"EXECUTABLE_SKILL_EFFECT_OWNERSHIP_INVALID:{skill_id}")
        referenced_effects.update(effect_ids)
    if referenced_effects != item_effect_ids:
        raise ExportError("EXECUTABLE_SKILL_EFFECT_COVERAGE_INVALID")

    heroes = _directory(_expect_list(catalogs["heroes"], "catalogs:heroes"), "heroId", {
        "heroId", "skillIds",
    }, "heroes")
    for hero_id, hero in heroes.items():
        skill_ids = [
            _expect_stable_id(skill_id, f"heroes:{hero_id}:skillIds")
            for skill_id in _expect_list(hero["skillIds"], f"heroes:{hero_id}:skillIds")
        ]
        if not skill_ids or len(skill_ids) != len(set(skill_ids)) or any(skill_id not in skills for skill_id in skill_ids):
            raise ExportError(f"EXECUTABLE_HERO_SKILL_REFERENCE_INVALID:{hero_id}")
    new_run = _expect_exact_fields(bundle["newRunTemplate"], {
        "schemaVersion", "stateVersion", "phase", "day", "hour", "activeNode", "seed",
        "hero", "economy", "run", "board", "stash", "itemInstances", "shop", "battle",
        "levelRewards",
    }, "newRunTemplate")
    if new_run.get("phase") != "schedule":
        raise ExportError("EXECUTABLE_NEW_RUN_INVALID")
    new_run_hero = _expect_exact_fields(new_run["hero"], {
        "heroId", "level", "experience", "prestige", "maxHp",
    }, "newRunTemplate:hero")
    active_node = _expect_exact_fields(new_run["activeNode"], {
        "nodeId", "kind", "rewardId",
    }, "newRunTemplate:activeNode")
    if new_run_hero.get("heroId") not in heroes:
        raise ExportError("EXECUTABLE_NEW_RUN_HERO_REFERENCE_INVALID")
    if active_node != {"nodeId": "", "kind": "", "rewardId": ""}:
        raise ExportError("EXECUTABLE_NEW_RUN_ACTIVE_NODE_INVALID")
    level_rewards = _expect_exact_fields(new_run["levelRewards"], {
        "pendingMilestoneIds", "resolved",
    }, "newRunTemplate:levelRewards")
    if level_rewards["pendingMilestoneIds"] != [] or level_rewards["resolved"] != []:
        raise ExportError("EXECUTABLE_NEW_RUN_LEVEL_REWARDS_INVALID")

    rewards = _directory(_expect_list(catalogs["rewards"], "catalogs:rewards"), "rewardId", {
        "rewardId", "trigger", "effects",
    }, "rewards")
    for reward_id, reward in rewards.items():
        trigger = _expect_exact_fields(reward["trigger"], {"scope", "event"}, f"rewards:{reward_id}:trigger")
        if trigger != {"scope": "system", "event": "REWARD_RESOLUTION"}:
            raise ExportError(f"EXECUTABLE_REWARD_TRIGGER_INVALID:{reward_id}")
        effects = _expect_list(reward["effects"], f"rewards:{reward_id}:effects")
        if len(effects) != 1 or not isinstance(effects[0], dict):
            raise ExportError(f"EXECUTABLE_REWARD_EFFECT_COUNT_INVALID:{reward_id}")
        effect = effects[0]
        effect_type = effect.get("type")
        if effect_type == "change_gold":
            _expect_exact_fields(effect, {"type", "amount"}, f"rewards:{reward_id}:effect")
            _expect_integer(effect["amount"], f"rewards:{reward_id}:amount", 1)
        elif effect_type == "grant_item":
            _expect_exact_fields(effect, {
                "type", "itemId", "quality", "quantity", "destination",
            }, f"rewards:{reward_id}:effect")
            item_id = _expect_stable_id(effect["itemId"], f"rewards:{reward_id}:itemId")
            if (item_id, effect["quality"]) not in item_profiles or effect["destination"] != "stash":
                raise ExportError(f"EXECUTABLE_REWARD_ITEM_INVALID:{reward_id}")
            _expect_integer(effect["quantity"], f"rewards:{reward_id}:quantity", 1)
        else:
            raise ExportError(f"EXECUTABLE_REWARD_EFFECT_INVALID:{reward_id}")

    _expect_exact_fields(bundle["shopRules"], {"refreshCost"}, "shopRules")
    generation = _expect_exact_fields(bundle["generation"], {
        "schema", "schemaVersion", "algorithmId", "shop", "battle",
    }, "generation")
    shop = _expect_exact_fields(generation["shop"], {
        "offerCount", "templates", "layers",
    }, "generation:shop")
    shop_templates = _directory(_expect_list(shop.get("templates"), "generation:shop:templates"), "offerTemplateId", {
        "offerTemplateId", "itemId", "quality", "enchantment",
    }, "shopTemplates")
    stalls = _directory(_expect_list(catalogs["stalls"], "catalogs:stalls"), "stallId", {
        "stallId", "offerCount", "shopTemplateIds",
    }, "stalls")
    catalog_template_refs: set[str] = set()
    for stall_id, stall in stalls.items():
        offer_count = _expect_integer(stall["offerCount"], f"stalls:{stall_id}:offerCount", 1)
        refs = [
            _expect_stable_id(ref, f"stalls:{stall_id}:shopTemplateIds")
            for ref in _expect_list(stall["shopTemplateIds"], f"stalls:{stall_id}:shopTemplateIds")
        ]
        if len(refs) != len(set(refs)) or any(ref not in shop_templates for ref in refs):
            raise ExportError(f"EXECUTABLE_STALL_TEMPLATE_REFERENCE_INVALID:{stall_id}")
        if catalog_template_refs.intersection(refs):
            raise ExportError(f"EXECUTABLE_STALL_TEMPLATE_OWNERSHIP_INVALID:{stall_id}")
        catalog_template_refs.update(refs)
        if shop.get("offerCount") != offer_count:
            raise ExportError(f"EXECUTABLE_STALL_OFFER_COUNT_INVALID:{stall_id}")
        for layer in _expect_list(shop.get("layers"), "generation:shop:layers"):
            if not isinstance(layer, dict):
                raise ExportError(f"EXECUTABLE_STALL_LAYER_INVALID:{stall_id}")
            layer_refs = layer.get("templateIds")
            if not isinstance(layer_refs, list) or len(layer_refs) != offer_count \
                    or any(ref not in refs for ref in layer_refs):
                raise ExportError(f"EXECUTABLE_STALL_LAYER_INVALID:{stall_id}")
    if catalog_template_refs != set(shop_templates):
        raise ExportError("EXECUTABLE_STALL_TEMPLATE_COVERAGE_INVALID")

    upgrades = _directory(_expect_list(catalogs["upgrades"], "catalogs:upgrades"), "upgradeId", {
        "upgradeId", "itemId", "fromQuality", "toQuality", "price", "stallId",
    }, "upgrades")
    upgrade_transitions: set[tuple[str, str, str]] = set()
    for upgrade_id, upgrade in upgrades.items():
        item_id = _expect_stable_id(upgrade["itemId"], f"upgrades:{upgrade_id}:itemId")
        from_quality = upgrade["fromQuality"]
        to_quality = upgrade["toQuality"]
        if (item_id, from_quality) not in item_profiles or (item_id, to_quality) not in item_profiles \
                or from_quality not in QUALITIES or QUALITIES.index(from_quality) + 1 >= len(QUALITIES) \
                or QUALITIES[QUALITIES.index(from_quality) + 1] != to_quality:
            raise ExportError(f"EXECUTABLE_UPGRADE_TRANSITION_INVALID:{upgrade_id}")
        transition = (item_id, from_quality, to_quality)
        if transition in upgrade_transitions:
            raise ExportError(f"EXECUTABLE_UPGRADE_TRANSITION_DUPLICATE:{upgrade_id}")
        upgrade_transitions.add(transition)
        _expect_integer(upgrade["price"], f"upgrades:{upgrade_id}:price", 1)
        stall_id = _expect_stable_id(upgrade["stallId"], f"upgrades:{upgrade_id}:stallId")
        if stall_id not in stalls:
            raise ExportError(f"EXECUTABLE_UPGRADE_STALL_UNKNOWN:{upgrade_id}")
    expected_transitions = {
        (item_id, qualities[index], qualities[index + 1])
        for item_id, qualities in item_qualities.items()
        for index in range(len(qualities) - 1)
    }
    if upgrade_transitions != expected_transitions:
        raise ExportError("EXECUTABLE_UPGRADE_TRANSITION_COVERAGE_INVALID")

    enchantments = _directory(
        _expect_list(catalogs["enchantments"], "catalogs:enchantments"), "enchantmentId", {
            "enchantmentId", "stallIds", "profiles",
        }, "enchantments"
    )
    if not enchantments:
        raise ExportError("EXECUTABLE_ENCHANTMENT_CATALOG_REQUIRED")
    for enchantment_id, enchantment in enchantments.items():
        stall_ids = [
            _expect_stable_id(value, f"enchantments:{enchantment_id}:stallIds")
            for value in _expect_list(enchantment["stallIds"], f"enchantments:{enchantment_id}:stallIds")
        ]
        if not stall_ids or len(stall_ids) != len(set(stall_ids)) or any(value not in stalls for value in stall_ids):
            raise ExportError(f"EXECUTABLE_ENCHANTMENT_STALLS_INVALID:{enchantment_id}")
        profile_keys: set[tuple[str, str]] = set()
        profiles = _expect_list(enchantment["profiles"], f"enchantments:{enchantment_id}:profiles")
        if not profiles:
            raise ExportError(f"EXECUTABLE_ENCHANTMENT_PROFILES_REQUIRED:{enchantment_id}")
        for profile_index, profile_value in enumerate(profiles):
            profile = _expect_exact_fields(profile_value, {
                "itemId", "quality", "price", "cooldownDeltaTicks", "damageDelta", "ammoDelta",
            }, f"enchantments:{enchantment_id}:profiles:{profile_index}")
            item_id = _expect_stable_id(profile["itemId"], f"enchantments:{enchantment_id}:profiles:{profile_index}:itemId")
            quality = profile["quality"]
            profile_key = (item_id, quality)
            if profile_key not in item_profiles or profile_key in profile_keys:
                raise ExportError(f"EXECUTABLE_ENCHANTMENT_PROFILE_REFERENCE_INVALID:{enchantment_id}:{item_id}:{quality}")
            profile_keys.add(profile_key)
            _expect_integer(profile["price"], f"enchantments:{enchantment_id}:{item_id}:{quality}:price", 1)
            cooldown_delta = _expect_integer(profile["cooldownDeltaTicks"], f"enchantments:{enchantment_id}:{item_id}:{quality}:cooldownDeltaTicks")
            damage_delta = _expect_integer(profile["damageDelta"], f"enchantments:{enchantment_id}:{item_id}:{quality}:damageDelta", 0)
            ammo_delta = _expect_integer(profile["ammoDelta"], f"enchantments:{enchantment_id}:{item_id}:{quality}:ammoDelta", 0)
            if cooldown_delta == 0 and damage_delta == 0 and ammo_delta == 0:
                raise ExportError(f"EXECUTABLE_ENCHANTMENT_PROFILE_NOOP:{enchantment_id}:{item_id}:{quality}")
            item_profile = item_profile_values[profile_key]
            if item_profile["baseCooldownTicks"] + cooldown_delta <= 0:
                raise ExportError(f"EXECUTABLE_ENCHANTMENT_COOLDOWN_INVALID:{enchantment_id}:{item_id}:{quality}")
            if ammo_delta > 0 and not item_profile["ammo"]["enabled"]:
                raise ExportError(f"EXECUTABLE_ENCHANTMENT_AMMO_INCOMPATIBLE:{enchantment_id}:{item_id}:{quality}")
            if damage_delta > 0 and not any(
                effect.get("operation", {}).get("type") == "deal_damage"
                for effect in item_profile["effects"]
            ):
                raise ExportError(f"EXECUTABLE_ENCHANTMENT_DAMAGE_INCOMPATIBLE:{enchantment_id}:{item_id}:{quality}")

    reachable_profiles: set[tuple[str, str]] = set()
    for instance_value in _expect_list(new_run.get("itemInstances"), "newRunTemplate:itemInstances"):
        if isinstance(instance_value, dict):
            reachable_profiles.add((instance_value.get("itemId"), instance_value.get("quality")))
    for template in shop_templates.values():
        reachable_profiles.add((template.get("itemId"), template.get("quality")))
    for reward in rewards.values():
        effects = reward.get("effects", [])
        if effects and isinstance(effects[0], dict) and effects[0].get("type") == "grant_item":
            reachable_profiles.add((effects[0].get("itemId"), effects[0].get("quality")))
    for option in progression_options.values():
        effect = option.get("effect", {})
        if isinstance(effect, dict) and effect.get("type") == "grant_item":
            reachable_profiles.add((effect.get("itemId"), effect.get("quality")))
    changed = True
    while changed:
        changed = False
        for upgrade in upgrades.values():
            source = (upgrade["itemId"], upgrade["fromQuality"])
            target = (upgrade["itemId"], upgrade["toQuality"])
            if source in reachable_profiles and target not in reachable_profiles:
                reachable_profiles.add(target)
                changed = True
    if reachable_profiles.intersection(item_profiles) != item_profiles:
        raise ExportError("EXECUTABLE_PLAYER_ITEM_PROFILE_REACHABILITY_INVALID")

    events = _directory(_expect_list(catalogs["events"], "catalogs:events"), "eventId", {
        "eventId", "hourSlots", "optionIds",
    }, "events")
    options = _directory(_expect_list(catalogs["eventOptions"], "catalogs:eventOptions"), "optionId", {
        "optionId", "eventId", "rewardId", "goldDelta",
    }, "eventOptions")
    option_membership: set[str] = set()
    for event_id, event in events.items():
        hours = [_expect_integer(hour, f"events:{event_id}:hourSlots", 1) for hour in _expect_list(event["hourSlots"], f"events:{event_id}:hourSlots")]
        option_ids = [_expect_stable_id(option_id, f"events:{event_id}:optionIds") for option_id in _expect_list(event["optionIds"], f"events:{event_id}:optionIds")]
        if not hours or len(hours) != len(set(hours)) or any(hour not in CHOICE_HOURS for hour in hours):
            raise ExportError(f"EXECUTABLE_EVENT_HOURS_INVALID:{event_id}")
        if len(option_ids) < 2 or len(option_ids) != len(set(option_ids)) \
                or any(option_id not in options or options[option_id]["eventId"] != event_id for option_id in option_ids):
            raise ExportError(f"EXECUTABLE_EVENT_OPTIONS_INVALID:{event_id}")
        if option_membership.intersection(option_ids):
            raise ExportError(f"EXECUTABLE_EVENT_OPTION_OWNERSHIP_INVALID:{event_id}")
        option_membership.update(option_ids)
    if option_membership != set(options):
        raise ExportError("EXECUTABLE_EVENT_OPTION_COVERAGE_INVALID")

    referenced_rewards: set[str] = set()
    for option_id, option in options.items():
        _expect_stable_id(option["eventId"], f"eventOptions:{option_id}:eventId")
        reward_id = _expect_stable_id(option["rewardId"], f"eventOptions:{option_id}:rewardId")
        _expect_integer(option["goldDelta"], f"eventOptions:{option_id}:goldDelta")
        if reward_id not in rewards:
            raise ExportError(f"EXECUTABLE_EVENT_REWARD_INVALID:{option_id}")
        referenced_rewards.add(reward_id)

    schedule = _expect_exact_fields(bundle["scheduleConfig"], {
        "schema", "schemaVersion", "rulesVersion", "contentRevision", "hours",
        "incomePayoutPolicy", "pveWinBonusXp", "prestigeLoss", "terminalRules",
    }, "scheduleConfig")
    if schedule["schema"] != SCHEDULE_SCHEMA or schedule["schemaVersion"] != SCHEDULE_SCHEMA_VERSION \
            or schedule["rulesVersion"] != root["rulesVersion"] \
            or schedule["contentRevision"] != root["contentRevision"]:
        raise ExportError("EXECUTABLE_SCHEDULE_IDENTITY_INVALID")
    if schedule["incomePayoutPolicy"] != INCOME_PAYOUT_POLICY:
        raise ExportError("EXECUTABLE_SCHEDULE_INCOME_POLICY_INVALID")
    _expect_integer(schedule["pveWinBonusXp"], "schedule:pveWinBonusXp", 0)
    prestige_loss = _expect_exact_fields(schedule["prestigeLoss"], {
        "pveLoss", "pveDraw", "ghostLoss", "ghostDraw",
    }, "schedule:prestigeLoss")
    for field in ["pveLoss", "pveDraw", "ghostLoss", "ghostDraw"]:
        _expect_integer(prestige_loss[field], f"schedule:prestigeLoss:{field}", 0)
    terminal_rules = _expect_exact_fields(schedule["terminalRules"], {
        "winTarget", "lastChanceEnabled",
    }, "schedule:terminalRules")
    _expect_integer(terminal_rules["winTarget"], "schedule:terminalRules:winTarget", 1)
    if not isinstance(terminal_rules["lastChanceEnabled"], bool):
        raise ExportError("EXECUTABLE_SCHEDULE_LAST_CHANCE_INVALID")

    event_hour_refs: dict[str, set[int]] = defaultdict(set)
    seen_schedule_hours: set[int] = set()
    for hour_record in _expect_list(schedule.get("hours"), "schedule:hours"):
        hour_record = _expect_exact_fields(hour_record, {
            "hour", "kind", "completionXp", "nodeTypes",
        }, "schedule:hour")
        hour = _expect_integer(hour_record["hour"], "schedule:hours:hour", 1)
        if hour in seen_schedule_hours or hour_record["kind"] != EXPECTED_HOUR_KINDS.get(hour):
            raise ExportError(f"EXECUTABLE_SCHEDULE_HOUR_KIND_INVALID:{hour}")
        seen_schedule_hours.add(hour)
        _expect_integer(hour_record["completionXp"], f"schedule:hours:{hour}:completionXp", 0)
        for node_id in _expect_list(hour_record["nodeTypes"], f"schedule:hours:{hour}:nodeTypes"):
            _expect_stable_id(node_id, f"schedule:hours:{hour}:nodeType")
            if node_id in events:
                event_hour_refs[node_id].add(hour)
            elif node_id in rewards:
                referenced_rewards.add(node_id)
            elif node_id not in stalls:
                raise ExportError(f"EXECUTABLE_SCHEDULE_NODE_UNKNOWN:{node_id}")
    if seen_schedule_hours != set(EXPECTED_HOUR_KINDS):
        raise ExportError("EXECUTABLE_SCHEDULE_HOUR_COVERAGE_INVALID")
    for event_id, event in events.items():
        if event_hour_refs.get(event_id, set()) != set(event["hourSlots"]):
            raise ExportError(f"EXECUTABLE_EVENT_SCHEDULE_MISMATCH:{event_id}")

    battle = _expect_exact_fields(generation["battle"], {"templates", "layers"}, "generation:battle")
    for template in _expect_list(battle.get("templates"), "generation:battle:templates"):
        record = _expect_exact_fields(template, {"encounterTemplateId", "rewardId", "enemy"}, "battleTemplate")
        _expect_stable_id(record["encounterTemplateId"], "battleTemplate:encounterTemplateId")
        reward_id = _expect_stable_id(record["rewardId"], "battleTemplate:rewardId")
        if reward_id not in rewards:
            raise ExportError(f"EXECUTABLE_BATTLE_REWARD_INVALID:{reward_id}")
        referenced_rewards.add(reward_id)
    if referenced_rewards != set(rewards):
        raise ExportError("EXECUTABLE_REWARD_REFERENCE_COVERAGE_INVALID")

    expected_hash = _runtime_bundle_hash(bundle, items)
    if not isinstance(bundle["bundleHash"], str) or bundle["bundleHash"] != expected_hash:
        raise ExportError("EXECUTABLE_BUNDLE_HASH_INVALID")


class ContentAssembler:
    def __init__(self, tables: dict[str, list[dict[str, str]]]) -> None:
        self.tables = tables
        self.item_profiles: dict[tuple[str, str], dict[str, Any]] = {}
        self.item_widths: dict[str, int] = {}
        self.item_skills: dict[str, str] = {}

    def build(self) -> dict[str, Any]:
        source_revision = self._source_snapshot()
        skills = self._skills()
        items, starters = self._items(skills)
        self._effects(items, skills)
        rewards = self._rewards()
        progression_rules = self._progression_rules()
        hero = self._hero(skills)
        stalls = self._stalls()
        upgrades = self._upgrades(stalls)
        enchantments = self._enchantments(stalls)
        shop_generation, source_refresh_max = self._offers(stalls)
        events = self._events(rewards)
        node_ids = set(stalls) | set(events) | set(rewards)
        schedule, identity = self._gameplay(source_revision, node_ids)
        if source_refresh_max != identity["refreshPackageMax"]:
            raise ExportError("STALL_REFRESH_DECLARED_COVERAGE_INVALID")
        battle_generation = self._encounters(rewards, identity["runDayMax"])
        new_run = self._new_run(hero, starters)
        self._validate_player_profile_reachability(
            starters, shop_generation, rewards, progression_rules, upgrades
        )
        executable_catalogs = self._executable_catalogs(
            hero,
            skills,
            stalls,
            shop_generation,
            events,
            rewards,
            upgrades,
            enchantments,
        )
        bundle = {
            "schema": identity["runtimeSchema"],
            "schemaVersion": identity["runtimeSchemaVersion"],
            "bundleRevision": identity["bundleRevision"],
            "rulesVersion": identity["rulesVersion"],
            "contentRevision": identity["contentRevision"],
            "bundleHash": "",
            "newRunTemplate": new_run,
            "scheduleConfig": schedule,
            "shopRules": {"refreshCost": next(iter(stalls.values()))["refreshCost"]},
            "battleRules": {"terminalPressure": identity["terminalPressure"]},
            "progressionRules": progression_rules,
            "generation": {
                "schema": GENERATION_SCHEMA,
                "schemaVersion": GENERATION_SCHEMA_VERSION,
                "algorithmId": GENERATION_ALGORITHM,
                "shop": shop_generation,
                "battle": battle_generation,
            },
            "executableCatalogs": executable_catalogs,
        }
        bundle["bundleHash"] = _runtime_bundle_hash(bundle, items)
        return {
            "gameplayId": GAMEPLAY_ID,
            "contentSchema": identity["contentSchema"],
            "sourceRevision": source_revision,
            "rulesVersion": identity["rulesVersion"],
            "schemaVersion": identity["schemaVersion"],
            "qualityProfileSchema": identity["qualityProfileSchema"],
            "contentRevision": identity["contentRevision"],
            "items": items,
            "runtimeBundle": bundle,
        }

    def _source_snapshot(self) -> str:
        filename = "56_bz_source_snapshot.csv"
        rows = self.tables[filename]
        if len(rows) != 1:
            raise ExportError("SOURCE_SNAPSHOT_SINGLETON_REQUIRED")
        row = rows[0]
        _formal(filename, row)
        _require_id(filename, row, "snapshot_id")
        if _require_text(filename, row, "source_kind") != "local_original":
            raise ExportError("SOURCE_KIND_MUST_BE_LOCAL_ORIGINAL")
        revision = _require_id(filename, row, "source_revision")
        if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", _require_text(filename, row, "captured_on")):
            raise ExportError("SOURCE_CAPTURE_DATE_INVALID")
        _require_chinese(filename, row, "license_note")
        _require_text(filename, row, "catalog_scope")
        if _require_text(filename, row, "completeness") != "bootstrap":
            raise ExportError("SOURCE_COMPLETENESS_MUST_BE_BOOTSTRAP")
        return revision

    def _rewards(self) -> dict[str, dict[str, Any]]:
        filename = "55_bz_rewards.csv"
        rows_by_id = _unique(self.tables[filename], filename, "reward_id")
        rewards: dict[str, dict[str, Any]] = {}
        for reward_id, row in rows_by_id.items():
            _formal(filename, row)
            reward_type = _require_text(filename, row, "reward_type")
            if reward_type not in {"currency", "item"}:
                raise ExportError(f"REWARD_TYPE_INVALID:{reward_id}")
            _require_chinese(filename, row, "name_zh")
            _require_chinese(filename, row, "description_zh")
            amount = _integer(filename, row, "amount", 1)
            item_id = row.get("item_id", "")
            quality = row.get("quality", "")
            if reward_type == "item":
                if not STABLE_ID_RE.fullmatch(item_id) or quality not in QUALITIES:
                    raise ExportError(f"REWARD_ITEM_INVALID:{reward_id}")
                if (item_id, quality) not in self.item_profiles:
                    raise ExportError(f"REWARD_ITEM_QUALITY_UNKNOWN:{reward_id}")
            elif item_id != "" or quality != "":
                raise ExportError(f"REWARD_ITEM_FIELDS_UNEXPECTED:{reward_id}")
            if reward_type == "currency":
                effects = [{"type": "change_gold", "amount": amount}]
            else:
                effects = [{
                    "type": "grant_item",
                    "itemId": item_id,
                    "quality": quality,
                    "quantity": amount,
                    "destination": "stash",
                }]
            rewards[reward_id] = {
                "type": reward_type,
                "trigger": {"scope": "system", "event": "REWARD_RESOLUTION"},
                "effects": effects,
            }
        return rewards

    def _progression_rules(self) -> dict[str, Any]:
        filename = "59_bz_level_up_choices.csv"
        rows = self.tables[filename]
        if _same(rows, filename, "enabled") != "true":
            raise ExportError("PROGRESSION_ENABLED_REQUIRED")
        milestones: dict[str, dict[str, Any]] = {}
        seen_option_ids: set[str] = set()
        for row in rows:
            _formal(filename, row)
            milestone_id = _require_id(filename, row, "milestone_id")
            level = _integer(filename, row, "level", 2)
            required_xp = _integer(filename, row, "required_xp", 1)
            option_id = _require_id(filename, row, "option_id")
            if option_id in seen_option_ids:
                raise ExportError(f"PROGRESSION_OPTION_ID_DUPLICATE:{option_id}")
            seen_option_ids.add(option_id)
            option_order = _integer(filename, row, "option_order", 1)
            _require_chinese(filename, row, "name_zh")
            _require_chinese(filename, row, "description_zh")
            effect_type = _require_text(filename, row, "effect_type")
            amount = _integer(filename, row, "amount", 1)
            item_id = row.get("item_id", "")
            quality = row.get("quality", "")
            target_rule = row.get("target_rule", "")
            if effect_type == "change_gold":
                if item_id != "" or quality != "" or target_rule != "":
                    raise ExportError(f"PROGRESSION_GOLD_FIELDS_UNEXPECTED:{option_id}")
                effect = {"type": effect_type, "amount": amount}
            elif effect_type == "grant_item":
                if not STABLE_ID_RE.fullmatch(item_id) or (item_id, quality) not in self.item_profiles \
                        or target_rule != "":
                    raise ExportError(f"PROGRESSION_ITEM_INVALID:{option_id}")
                effect = {
                    "type": effect_type,
                    "itemId": item_id,
                    "quality": quality,
                    "quantity": amount,
                    "destination": "stash",
                }
            elif effect_type == "upgrade_owned_item":
                if amount != 1 or item_id != "" or quality != "" \
                        or target_rule != "player_selected_owned_instance":
                    raise ExportError(f"PROGRESSION_UPGRADE_INVALID:{option_id}")
                effect = {
                    "type": effect_type,
                    "targetRule": target_rule,
                    "steps": amount,
                }
            else:
                raise ExportError(f"PROGRESSION_EFFECT_TYPE_INVALID:{option_id}")
            milestone = milestones.setdefault(milestone_id, {
                "milestoneId": milestone_id,
                "level": level,
                "requiredXp": required_xp,
                "options": [],
            })
            if milestone["level"] != level or milestone["requiredXp"] != required_xp:
                raise ExportError(f"PROGRESSION_MILESTONE_INCONSISTENT:{milestone_id}")
            milestone["options"].append({
                "optionId": option_id,
                "milestoneId": milestone_id,
                "optionOrder": option_order,
                "effect": effect,
            })
        if len(milestones) < 3:
            raise ExportError("PROGRESSION_MILESTONES_INCOMPLETE")
        ordered = sorted(milestones.values(), key=lambda value: value["level"])
        if [value["level"] for value in ordered] != list(range(2, 2 + len(ordered))):
            raise ExportError("PROGRESSION_LEVEL_COVERAGE_INVALID")
        if any(ordered[index]["requiredXp"] <= ordered[index - 1]["requiredXp"] for index in range(1, len(ordered))):
            raise ExportError("PROGRESSION_XP_ORDER_INVALID")
        runtime_milestones = []
        runtime_options = []
        required_types = {"change_gold", "grant_item", "upgrade_owned_item"}
        for milestone in ordered:
            options = sorted(milestone["options"], key=lambda value: value["optionOrder"])
            if len(options) != 3 or [value["optionOrder"] for value in options] != [1, 2, 3] \
                    or {value["effect"]["type"] for value in options} != required_types:
                raise ExportError(f"PROGRESSION_OPTIONS_INVALID:{milestone['milestoneId']}")
            runtime_milestones.append({
                "milestoneId": milestone["milestoneId"],
                "level": milestone["level"],
                "requiredXp": milestone["requiredXp"],
                "optionIds": [value["optionId"] for value in options],
            })
            runtime_options.extend({
                "optionId": value["optionId"],
                "milestoneId": value["milestoneId"],
                "effect": value["effect"],
            } for value in options)
        runtime_options.sort(key=lambda value: value["optionId"])
        return {
            "schema": PROGRESSION_SCHEMA,
            "schemaVersion": PROGRESSION_SCHEMA_VERSION,
            "enabled": True,
            "milestones": runtime_milestones,
            "options": runtime_options,
        }

    def _skills(self) -> dict[str, dict[str, Any]]:
        filename = "48_bz_skills.csv"
        rows_by_id = _unique(self.tables[filename], filename, "skill_id")
        skills: dict[str, dict[str, Any]] = {}
        seen_effects: set[str] = set()
        for skill_id, row in rows_by_id.items():
            _formal(filename, row)
            _require_chinese(filename, row, "name_zh")
            _require_chinese(filename, row, "description_zh")
            if _require_text(filename, row, "trigger_event") != "item_ready":
                raise ExportError(f"SKILL_TRIGGER_INVALID:{skill_id}")
            effect_ids = _ids(filename, row, "effect_ids")
            if seen_effects.intersection(effect_ids):
                raise ExportError(f"SKILL_EFFECT_OWNERSHIP_DUPLICATE:{skill_id}")
            seen_effects.update(effect_ids)
            skills[skill_id] = {"triggerEvent": "item_ready", "effectIds": set(effect_ids)}
        return skills

    def _items(self, skills: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        filename = "46_bz_items.csv"
        grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
        seen_profile_keys: set[tuple[str, str]] = set()
        starter_instances: set[str] = set()
        starters: list[dict[str, Any]] = []
        for row in self.tables[filename]:
            _formal(filename, row)
            item_id = _require_id(filename, row, "item_id")
            grouped[item_id].append(row)
            quality = _require_text(filename, row, "quality")
            if quality not in QUALITIES:
                raise ExportError(f"ITEM_QUALITY_INVALID:{item_id}:{quality}")
            key = (item_id, quality)
            if key in seen_profile_keys:
                raise ExportError(f"ITEM_QUALITY_DUPLICATE:{item_id}:{quality}")
            seen_profile_keys.add(key)
            starter_id = row.get("starter_instance_id", "")
            starter_location = row.get("starter_location", "")
            starter_slot = row.get("starter_start_slot", "")
            if starter_id:
                if not STABLE_ID_RE.fullmatch(starter_id) or starter_id in starter_instances:
                    raise ExportError(f"STARTER_INSTANCE_INVALID:{item_id}")
                if starter_location not in {"board", "stash"}:
                    raise ExportError(f"STARTER_LOCATION_INVALID:{item_id}")
                slot = _integer(filename, row, "starter_start_slot", 0) if starter_location == "board" else None
                if starter_location == "stash" and starter_slot != "":
                    raise ExportError(f"STARTER_SLOT_UNEXPECTED:{item_id}")
                starter_instances.add(starter_id)
                starters.append({
                    "instanceId": starter_id,
                    "itemId": item_id,
                    "quality": quality,
                    "enchantment": "",
                    "location": starter_location,
                    "startSlot": slot,
                })
            elif starter_location != "" or starter_slot != "":
                raise ExportError(f"STARTER_FIELDS_INCOMPLETE:{item_id}:{quality}")
        items = []
        for item_id in sorted(grouped):
            rows = grouped[item_id]
            name = _same(rows, filename, "name_zh")
            if not CJK_RE.search(name):
                raise ExportError(f"ITEM_CHINESE_NAME_REQUIRED:{item_id}")
            slot_width = int(_same(rows, filename, "slot_width")) if INTEGER_RE.fullmatch(_same(rows, filename, "slot_width")) else 0
            if slot_width not in {1, 2, 3}:
                raise ExportError(f"ITEM_SLOT_WIDTH_INVALID:{item_id}")
            base_quality = _same(rows, filename, "base_quality")
            if base_quality not in QUALITIES:
                raise ExportError(f"ITEM_BASE_QUALITY_INVALID:{item_id}")
            skill_id = _same(rows, filename, "skill_id")
            if not STABLE_ID_RE.fullmatch(skill_id) or skill_id not in skills:
                raise ExportError(f"ITEM_SKILL_UNKNOWN:{item_id}:{skill_id}")
            expected_qualities = QUALITIES[QUALITIES.index(base_quality):]
            actual_qualities = sorted((row["quality"] for row in rows), key=QUALITIES.index)
            if actual_qualities != expected_qualities:
                raise ExportError(f"ITEM_QUALITY_COVERAGE_INVALID:{item_id}")
            profiles: dict[str, Any] = {}
            for row in rows:
                quality = row["quality"]
                buy_price = _integer(filename, row, "buy_price", 1)
                sell_price = _integer(filename, row, "sell_price", 0)
                if sell_price > buy_price:
                    raise ExportError(f"ITEM_PRICE_ORDER_INVALID:{item_id}:{quality}")
                cooldown = _integer(filename, row, "cooldown_ticks", 1)
                ammo_enabled = _boolean(filename, row, "ammo_enabled")
                ammo_initial = _integer(filename, row, "ammo_initial", 0)
                ammo_maximum = _integer(filename, row, "ammo_maximum", 0)
                if ammo_enabled and (ammo_maximum <= 0 or ammo_initial > ammo_maximum):
                    raise ExportError(f"ITEM_AMMO_RANGE_INVALID:{item_id}:{quality}")
                if not ammo_enabled and (ammo_initial != 0 or ammo_maximum != 0):
                    raise ExportError(f"ITEM_AMMO_DISABLED_INVALID:{item_id}:{quality}")
                profile = {
                    "buyPrice": buy_price,
                    "sellPrice": sell_price,
                    "baseCooldownTicks": cooldown,
                    "ammo": {"enabled": ammo_enabled, "initial": ammo_initial, "maximum": ammo_maximum},
                    "effects": [],
                }
                profiles[quality] = profile
                self.item_profiles[(item_id, quality)] = profile
            self.item_widths[item_id] = slot_width
            self.item_skills[item_id] = skill_id
            items.append({
                "itemId": item_id,
                "slotWidth": slot_width,
                "baseQuality": base_quality,
                "qualityProfiles": profiles,
            })
        if not starters:
            raise ExportError("STARTER_ITEMS_REQUIRED")
        for starter in starters:
            if (starter["itemId"], starter["quality"]) not in self.item_profiles:
                raise ExportError(f"STARTER_QUALITY_UNAVAILABLE:{starter['instanceId']}")
        self._validate_placements(starters, "STARTER")
        return items, starters

    def _upgrades(self, stalls: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        filename = "57_bz_item_upgrades.csv"
        rows_by_id = _unique(self.tables[filename], filename, "upgrade_id")
        recipes: list[dict[str, Any]] = []
        transitions: set[tuple[str, str, str]] = set()
        for upgrade_id, row in rows_by_id.items():
            _formal(filename, row)
            item_id = _require_id(filename, row, "item_id")
            from_quality = _require_text(filename, row, "from_quality")
            to_quality = _require_text(filename, row, "to_quality")
            if (item_id, from_quality) not in self.item_profiles or (item_id, to_quality) not in self.item_profiles:
                raise ExportError(f"UPGRADE_PROFILE_UNKNOWN:{upgrade_id}")
            if from_quality not in QUALITIES or QUALITIES.index(from_quality) + 1 >= len(QUALITIES) \
                    or QUALITIES[QUALITIES.index(from_quality) + 1] != to_quality:
                raise ExportError(f"UPGRADE_QUALITY_TRANSITION_INVALID:{upgrade_id}")
            transition = (item_id, from_quality, to_quality)
            if transition in transitions:
                raise ExportError(f"UPGRADE_TRANSITION_DUPLICATE:{item_id}:{from_quality}")
            transitions.add(transition)
            stall_id = _require_id(filename, row, "source_stall_id")
            if stall_id not in stalls:
                raise ExportError(f"UPGRADE_STALL_UNKNOWN:{upgrade_id}:{stall_id}")
            recipes.append({
                "upgradeId": upgrade_id,
                "itemId": item_id,
                "fromQuality": from_quality,
                "toQuality": to_quality,
                "price": _integer(filename, row, "price", 1),
                "stallId": stall_id,
            })
        expected: set[tuple[str, str, str]] = set()
        for item_id in sorted(self.item_widths):
            qualities = [quality for quality in QUALITIES if (item_id, quality) in self.item_profiles]
            for index in range(len(qualities) - 1):
                expected.add((item_id, qualities[index], qualities[index + 1]))
        if transitions != expected:
            raise ExportError("UPGRADE_TRANSITION_COVERAGE_INVALID")
        recipes.sort(key=lambda value: value["upgradeId"])
        return recipes

    def _enchantments(self, stalls: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        filename = "58_bz_enchantments.csv"
        grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
        seen_profiles: set[tuple[str, str, str]] = set()
        for row in self.tables[filename]:
            _formal(filename, row)
            enchantment_id = _require_id(filename, row, "enchantment_id")
            grouped[enchantment_id].append(row)
        result: list[dict[str, Any]] = []
        for enchantment_id in sorted(grouped):
            rows = grouped[enchantment_id]
            _require_chinese(filename, rows[0], "name_zh")
            _require_chinese(filename, rows[0], "description_zh")
            _same(rows, filename, "name_zh")
            _same(rows, filename, "description_zh")
            profiles: list[dict[str, Any]] = []
            stall_ids: set[str] = set()
            for row in rows:
                item_id = _require_id(filename, row, "item_id")
                quality = _require_text(filename, row, "quality")
                profile_key = (enchantment_id, item_id, quality)
                if profile_key in seen_profiles:
                    raise ExportError(f"ENCHANTMENT_PROFILE_DUPLICATE:{enchantment_id}:{item_id}:{quality}")
                seen_profiles.add(profile_key)
                item_profile = self.item_profiles.get((item_id, quality))
                if item_profile is None:
                    raise ExportError(f"ENCHANTMENT_ITEM_PROFILE_UNKNOWN:{enchantment_id}:{item_id}:{quality}")
                cooldown_delta = _integer(filename, row, "cooldown_delta_ticks")
                damage_delta = _integer(filename, row, "damage_delta", 0)
                ammo_delta = _integer(filename, row, "ammo_delta", 0)
                if cooldown_delta == 0 and damage_delta == 0 and ammo_delta == 0:
                    raise ExportError(f"ENCHANTMENT_PROFILE_NOOP:{enchantment_id}:{item_id}:{quality}")
                if int(item_profile["baseCooldownTicks"]) + cooldown_delta <= 0:
                    raise ExportError(f"ENCHANTMENT_COOLDOWN_INVALID:{enchantment_id}:{item_id}:{quality}")
                ammo = item_profile["ammo"]
                if ammo_delta > 0 and not bool(ammo["enabled"]):
                    raise ExportError(f"ENCHANTMENT_AMMO_INCOMPATIBLE:{enchantment_id}:{item_id}:{quality}")
                if damage_delta > 0 and not any(
                    effect.get("operation", {}).get("type") == "deal_damage"
                    for effect in item_profile["effects"]
                ):
                    raise ExportError(f"ENCHANTMENT_DAMAGE_INCOMPATIBLE:{enchantment_id}:{item_id}:{quality}")
                stall_id = _require_id(filename, row, "source_stall_id")
                if stall_id not in stalls:
                    raise ExportError(f"ENCHANTMENT_STALL_UNKNOWN:{enchantment_id}:{stall_id}")
                stall_ids.add(stall_id)
                profiles.append({
                    "itemId": item_id,
                    "quality": quality,
                    "price": _integer(filename, row, "price", 1),
                    "cooldownDeltaTicks": cooldown_delta,
                    "damageDelta": damage_delta,
                    "ammoDelta": ammo_delta,
                })
            profiles.sort(key=lambda value: (value["itemId"], QUALITIES.index(value["quality"])))
            result.append({
                "enchantmentId": enchantment_id,
                "stallIds": sorted(stall_ids),
                "profiles": profiles,
            })
        if not result:
            raise ExportError("ENCHANTMENT_CATALOG_REQUIRED")
        return result

    def _validate_player_profile_reachability(
        self,
        starters: list[dict[str, Any]],
        shop_generation: dict[str, Any],
        rewards: dict[str, dict[str, Any]],
        progression_rules: dict[str, Any],
        upgrades: list[dict[str, Any]],
    ) -> None:
        reachable = {(item["itemId"], item["quality"]) for item in starters}
        reachable.update((value["itemId"], value["quality"]) for value in shop_generation["templates"])
        for reward in rewards.values():
            for effect in reward["effects"]:
                if effect.get("type") == "grant_item":
                    reachable.add((effect["itemId"], effect["quality"]))
        for option in progression_rules["options"]:
            effect = option["effect"]
            if effect.get("type") == "grant_item":
                reachable.add((effect["itemId"], effect["quality"]))
        changed = True
        while changed:
            changed = False
            for recipe in upgrades:
                source = (recipe["itemId"], recipe["fromQuality"])
                target = (recipe["itemId"], recipe["toQuality"])
                if source in reachable and target not in reachable:
                    reachable.add(target)
                    changed = True
        missing = sorted(set(self.item_profiles) - reachable)
        if missing:
            raise ExportError("PLAYER_ITEM_PROFILE_UNREACHABLE:" + ",".join(f"{item_id}:{quality}" for item_id, quality in missing))

    def _effects(self, items: list[dict[str, Any]], skills: dict[str, dict[str, Any]]) -> None:
        del items
        filename = "47_bz_item_effects.csv"
        seen_ids: set[str] = set()
        actual_skill_effects: dict[str, set[str]] = defaultdict(set)
        for row in self.tables[filename]:
            _formal(filename, row)
            effect_id = _require_id(filename, row, "effect_id")
            if effect_id in seen_ids:
                raise ExportError(f"EFFECT_ID_DUPLICATE:{effect_id}")
            seen_ids.add(effect_id)
            item_id = _require_id(filename, row, "item_id")
            quality = _require_text(filename, row, "quality")
            profile = self.item_profiles.get((item_id, quality))
            if profile is None:
                raise ExportError(f"EFFECT_ITEM_QUALITY_UNKNOWN:{effect_id}")
            skill_id = _require_id(filename, row, "skill_id")
            if self.item_skills.get(item_id) != skill_id or skill_id not in skills:
                raise ExportError(f"EFFECT_SKILL_MISMATCH:{effect_id}")
            if _require_text(filename, row, "trigger_event") != "item_ready":
                raise ExportError(f"EFFECT_TRIGGER_INVALID:{effect_id}")
            if _require_text(filename, row, "condition_type") != "always":
                raise ExportError(f"EFFECT_CONDITION_INVALID:{effect_id}")
            target_type = _require_text(filename, row, "target_type")
            operation_type = _require_text(filename, row, "operation_type")
            if target_type not in ITEM_EFFECT_TARGETS:
                raise ExportError(f"EFFECT_TARGET_INVALID:{effect_id}")
            if operation_type not in ITEM_EFFECT_OPERATIONS:
                raise ExportError(f"EFFECT_OPERATION_INVALID:{effect_id}")
            if operation_type == "deal_damage" and target_type != "selected_enemy":
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            if operation_type in {"reload", "charge"} and target_type != "self_item":
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            if operation_type == "apply_status" and target_type not in {"self_item", "first_enemy_item"}:
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            params: dict[str, Any]
            if operation_type in {"deal_damage", "reload"}:
                params = {"amount": _integer(filename, row, "amount", 1)}
                if row.get("status", "").strip() or row.get("ticks", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            elif operation_type == "charge":
                params = {"ticks": _integer(filename, row, "ticks", 1)}
                if row.get("amount", "").strip() or row.get("status", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            else:
                status = _require_text(filename, row, "status")
                if status not in ITEM_STATUSES:
                    raise ExportError(f"EFFECT_STATUS_INVALID:{effect_id}")
                params = {"status": status, "ticks": _integer(filename, row, "ticks", 1)}
                if row.get("amount", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            effect = {
                "effectId": effect_id,
                "priority": _integer(filename, row, "priority", 0),
                "trigger": {"event": "item_ready", "conditions": [{"type": "always", "params": {}}]},
                "target": {"type": target_type, "params": {}},
                "operation": {"type": operation_type, "params": params},
            }
            profile["effects"].append(effect)
            actual_skill_effects[skill_id].add(effect_id)
        for key, profile in self.item_profiles.items():
            if not profile["effects"]:
                raise ExportError(f"EFFECT_REQUIRED:{key[0]}:{key[1]}")
            profile["effects"].sort(key=lambda value: (value["priority"], value["effectId"]))
        for skill_id, skill in skills.items():
            if actual_skill_effects.get(skill_id, set()) != skill["effectIds"]:
                raise ExportError(f"SKILL_EFFECT_DIRECTORY_MISMATCH:{skill_id}")

    def _hero(self, skills: dict[str, dict[str, Any]]) -> dict[str, Any]:
        filename = "45_bz_heroes.csv"
        rows = self.tables[filename]
        if len(rows) != 1:
            raise ExportError("BOOTSTRAP_HERO_SINGLETON_REQUIRED")
        row = rows[0]
        _formal(filename, row)
        hero_id = _require_id(filename, row, "hero_id")
        _require_chinese(filename, row, "name_zh")
        skill_ids = _ids(filename, row, "skill_ids")
        if any(skill_id not in skills for skill_id in skill_ids):
            raise ExportError("HERO_SKILL_REFERENCE_INVALID")
        hero = {
            "heroId": hero_id,
            "level": _integer(filename, row, "start_level", 1),
            "experience": _integer(filename, row, "start_xp", 0),
            "prestige": _integer(filename, row, "start_prestige", 0),
            "skillIds": skill_ids,
            "maxHp": _integer(filename, row, "max_hp", 1),
        }
        hero["startGold"] = _integer(filename, row, "start_gold", 0)
        hero["startIncome"] = _integer(filename, row, "start_income", 0)
        if hero["level"] != 1 or hero["experience"] != 0:
            raise ExportError("BOOTSTRAP_HERO_LEVEL_XP_INVALID")
        return hero

    def _stalls(self) -> dict[str, dict[str, Any]]:
        filename = "49_bz_stalls.csv"
        rows_by_id = _unique(self.tables[filename], filename, "stall_id")
        if len(rows_by_id) != 1:
            raise ExportError("BOOTSTRAP_STALL_SINGLETON_REQUIRED")
        result = {}
        for stall_id, row in rows_by_id.items():
            _formal(filename, row)
            _require_chinese(filename, row, "name_zh")
            result[stall_id] = {
                "refreshCost": _integer(filename, row, "refresh_cost", 0),
                "offerSlots": _integer(filename, row, "offer_slots", 1),
            }
        return result

    def _offers(self, stalls: dict[str, dict[str, Any]]) -> tuple[dict[str, Any], int]:
        filename = "50_bz_stall_offers.csv"
        packages: dict[int, list[dict[str, str]]] = defaultdict(list)
        package_ids: dict[int, str] = {}
        seen_offer_ids: set[str] = set()
        for row in self.tables[filename]:
            _formal(filename, row)
            package_id = _require_id(filename, row, "package_id")
            stall_id = _require_id(filename, row, "stall_id")
            if stall_id not in stalls:
                raise ExportError(f"STALL_OFFER_STALL_UNKNOWN:{package_id}")
            refresh_index = _integer(filename, row, "refresh_index", 0)
            if refresh_index in package_ids and package_ids[refresh_index] != package_id:
                raise ExportError(f"STALL_PACKAGE_INDEX_AMBIGUOUS:{refresh_index}")
            package_ids[refresh_index] = package_id
            offer_id = _require_id(filename, row, "offer_id")
            if offer_id in seen_offer_ids:
                raise ExportError(f"STALL_OFFER_ID_DUPLICATE:{offer_id}")
            seen_offer_ids.add(offer_id)
            item_id = _require_id(filename, row, "item_id")
            quality = _require_text(filename, row, "quality")
            profile = self.item_profiles.get((item_id, quality))
            if profile is None:
                raise ExportError(f"STALL_OFFER_ITEM_QUALITY_UNKNOWN:{offer_id}")
            price = _integer(filename, row, "price", 0)
            if price != profile["buyPrice"]:
                raise ExportError(f"STALL_OFFER_PRICE_MISMATCH:{offer_id}")
            enchantment = row.get("enchantment", "")
            if enchantment != "":
                raise ExportError(f"STALL_OFFER_ENCHANTMENT_UNSUPPORTED:{offer_id}")
            if _boolean(filename, row, "frozen"):
                raise ExportError(f"STALL_OFFER_FROZEN_UNSUPPORTED:{offer_id}")
            _integer(filename, row, "slot_order", 1)
            packages[refresh_index].append(row)
        if sorted(packages) != list(range(0, max(packages) + 1)) or 1 not in packages:
            raise ExportError("STALL_REFRESH_COVERAGE_INVALID")
        templates: list[dict[str, Any]] = []
        layers: list[dict[str, Any]] = []
        maximum_index = max(packages)
        for refresh_index, rows in packages.items():
            stall_id = rows[0]["stall_id"]
            if any(row["stall_id"] != stall_id for row in rows):
                raise ExportError(f"STALL_PACKAGE_OWNER_INCONSISTENT:{refresh_index}")
            orders = sorted(_integer(filename, row, "slot_order", 1) for row in rows)
            if orders != list(range(1, len(rows) + 1)) or len(rows) != stalls[stall_id]["offerSlots"]:
                raise ExportError(f"STALL_PACKAGE_SLOT_ORDER_INVALID:{refresh_index}")
            ordered_rows = sorted(rows, key=lambda value: int(value["slot_order"]))
            templates.extend([
                {
                    "offerTemplateId": row["offer_id"],
                    "itemId": row["item_id"],
                    "quality": row["quality"],
                    "enchantment": row["enchantment"],
                }
                for row in ordered_rows
            ])
            layers.append({
                "fromRefreshIndex": refresh_index,
                "toRefreshIndex": None if refresh_index == maximum_index else refresh_index,
                "templateIds": [row["offer_id"] for row in ordered_rows],
            })
        templates.sort(key=lambda value: value["offerTemplateId"])
        layers.sort(key=lambda value: value["fromRefreshIndex"])
        return {
            "offerCount": next(iter(stalls.values()))["offerSlots"],
            "templates": templates,
            "layers": layers,
        }, maximum_index

    def _events(self, rewards: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
        event_file = "51_bz_events.csv"
        option_file = "52_bz_event_options.csv"
        event_rows = _unique(self.tables[event_file], event_file, "event_id")
        events: dict[str, dict[str, Any]] = {}
        for event_id, row in event_rows.items():
            _formal(event_file, row)
            _require_chinese(event_file, row, "name_zh")
            _require_chinese(event_file, row, "description_zh")
            events[event_id] = {"hours": set(_hours(event_file, row, "hour_slots")), "options": []}
        seen_options: set[str] = set()
        for row in self.tables[option_file]:
            _formal(option_file, row)
            option_id = _require_id(option_file, row, "option_id")
            if option_id in seen_options:
                raise ExportError(f"EVENT_OPTION_ID_DUPLICATE:{option_id}")
            seen_options.add(option_id)
            event_id = _require_id(option_file, row, "event_id")
            if event_id not in events:
                raise ExportError(f"EVENT_OPTION_EVENT_UNKNOWN:{option_id}")
            _require_chinese(option_file, row, "name_zh")
            _require_chinese(option_file, row, "description_zh")
            reward_id = _require_id(option_file, row, "reward_id")
            if reward_id not in rewards:
                raise ExportError(f"EVENT_OPTION_REWARD_UNKNOWN:{option_id}")
            if rewards[reward_id]["type"] == "level":
                raise ExportError(f"EVENT_OPTION_LEVEL_REWARD_FORBIDDEN:{option_id}")
            events[event_id]["options"].append({
                "optionId": option_id,
                "eventId": event_id,
                "rewardId": reward_id,
                "goldDelta": _integer(option_file, row, "gold_delta"),
            })
        for event_id, event in events.items():
            if len(event["options"]) < 2:
                raise ExportError(f"EVENT_OPTIONS_INCOMPLETE:{event_id}")
        return events

    def _executable_catalogs(
        self,
        hero: dict[str, Any],
        skills: dict[str, dict[str, Any]],
        stalls: dict[str, dict[str, Any]],
        shop_generation: dict[str, Any],
        events: dict[str, dict[str, Any]],
        rewards: dict[str, dict[str, Any]],
        upgrades: list[dict[str, Any]],
        enchantments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        template_ids = sorted(template["offerTemplateId"] for template in shop_generation["templates"])
        if len(template_ids) != len(set(template_ids)):
            raise ExportError("EXECUTABLE_STALL_TEMPLATE_ID_DUPLICATE")
        stall_records = []
        for stall_id in sorted(stalls):
            offer_count = stalls[stall_id]["offerSlots"]
            for layer in shop_generation["layers"]:
                refs = layer["templateIds"]
                if len(refs) != offer_count or any(ref not in template_ids for ref in refs):
                    raise ExportError(f"EXECUTABLE_STALL_LAYER_INVALID:{stall_id}")
            stall_records.append({
                "stallId": stall_id,
                "offerCount": offer_count,
                "shopTemplateIds": template_ids,
            })
        event_records = []
        option_records = []
        for event_id in sorted(events):
            event = events[event_id]
            options = sorted(event["options"], key=lambda value: value["optionId"])
            event_records.append({
                "eventId": event_id,
                "hourSlots": sorted(event["hours"]),
                "optionIds": [option["optionId"] for option in options],
            })
            option_records.extend(options)
        return {
            "schema": EXECUTABLE_CATALOGS_SCHEMA,
            "schemaVersion": EXECUTABLE_CATALOGS_SCHEMA_VERSION,
            "heroes": [{
                "heroId": hero["heroId"],
                "skillIds": sorted(hero["skillIds"]),
            }],
            "skills": [
                {
                    "skillId": skill_id,
                    "triggerEvent": skills[skill_id]["triggerEvent"],
                    "effectIds": sorted(skills[skill_id]["effectIds"]),
                }
                for skill_id in sorted(skills)
            ],
            "stalls": stall_records,
            "upgrades": upgrades,
            "enchantments": enchantments,
            "events": event_records,
            "eventOptions": sorted(option_records, key=lambda value: value["optionId"]),
            "rewards": [
                {
                    "rewardId": reward_id,
                    "trigger": rewards[reward_id]["trigger"],
                    "effects": rewards[reward_id]["effects"],
                }
                for reward_id in sorted(rewards)
            ],
        }

    def _gameplay(
        self,
        source_revision: str,
        node_ids: set[str],
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        filename = "44_bz_gameplay.csv"
        rows = self.tables[filename]
        if len(rows) != 6:
            raise ExportError("GAMEPLAY_HOUR_ROW_COUNT_INVALID")
        for row in rows:
            _formal(filename, row)
        expected_constants = {
            "gameplay_id": GAMEPLAY_ID,
            "content_schema": CONTENT_SCHEMA,
            # The current 16-domain workbook is the finite v8 candidate source.
            # This adapter is its explicit one-way projection into executable v10.
            "schema_version": str(SOURCE_CONTENT_SCHEMA_VERSION),
            "quality_profile_schema": QUALITY_PROFILE_SCHEMA,
            "rules_version": RULES_VERSION,
            "source_revision": source_revision,
            "runtime_schema": RUNTIME_SCHEMA,
            "runtime_schema_version": str(SOURCE_RUNTIME_SCHEMA_VERSION),
            "new_run_schema_version": str(NEW_RUN_SCHEMA_VERSION),
            "battle_package_schema_version": str(BATTLE_PACKAGE_SCHEMA_VERSION),
            "schedule_schema": SCHEDULE_SCHEMA,
            "schedule_schema_version": str(SCHEDULE_SCHEMA_VERSION),
            "income_payout_policy": INCOME_PAYOUT_POLICY,
            "phase": "schedule",
            "start_day": "1",
            "start_hour": "1",
            "board_size": "10",
            "terminal_pressure_enabled": "true",
        }
        for field, expected in expected_constants.items():
            actual = _same(rows, filename, field)
            if actual != expected:
                raise ExportError(f"GAMEPLAY_CONSTANT_INVALID:{field}")
        identity = {
            "contentSchema": CONTENT_SCHEMA,
            "schemaVersion": CONTENT_SCHEMA_VERSION,
            "qualityProfileSchema": QUALITY_PROFILE_SCHEMA,
            "rulesVersion": RULES_VERSION,
            "bundleRevision": _same(rows, filename, "bundle_revision"),
            "contentRevision": _same(rows, filename, "content_revision"),
            "runtimeSchema": RUNTIME_SCHEMA,
            "runtimeSchemaVersion": RUNTIME_SCHEMA_VERSION,
            "seed": _same(rows, filename, "seed"),
        }
        for field in ["bundleRevision", "contentRevision", "seed"]:
            if not STABLE_ID_RE.fullmatch(identity[field]):
                raise ExportError(f"GAMEPLAY_IDENTITY_INVALID:{field}")
        global_integer_fields = [
            "terminal_pressure_start_tick", "terminal_pressure_interval_ticks",
            "terminal_pressure_initial_damage", "terminal_pressure_increment_damage",
            "pve_win_bonus_xp", "pve_loss_prestige", "pve_draw_prestige",
            "ghost_loss_prestige", "ghost_draw_prestige", "win_target",
            "bootstrap_run_day_coverage", "bootstrap_refresh_package_coverage",
        ]
        globals_int = {}
        for field in global_integer_fields:
            text = _same(rows, filename, field)
            if not INTEGER_RE.fullmatch(text):
                raise ExportError(f"GAMEPLAY_INTEGER_INVALID:{field}")
            globals_int[field] = int(text)
        if globals_int["terminal_pressure_start_tick"] <= 0 \
                or globals_int["terminal_pressure_interval_ticks"] <= 0 \
                or globals_int["terminal_pressure_initial_damage"] <= 0 \
                or globals_int["terminal_pressure_increment_damage"] < 0 \
                or any(globals_int[field] < 0 for field in [
                    "pve_win_bonus_xp", "pve_loss_prestige", "pve_draw_prestige",
                    "ghost_loss_prestige", "ghost_draw_prestige",
                ]) \
                or any(globals_int[field] <= 0 for field in [
                    "win_target", "bootstrap_run_day_coverage", "bootstrap_refresh_package_coverage",
                ]):
            raise ExportError("GAMEPLAY_INTEGER_RANGE_INVALID")
        if globals_int["bootstrap_run_day_coverage"] < globals_int["win_target"]:
            raise ExportError("GAMEPLAY_RUN_DAY_RANGE_INCOMPLETE")
        identity["runDayMax"] = globals_int["bootstrap_run_day_coverage"]
        identity["refreshPackageMax"] = globals_int["bootstrap_refresh_package_coverage"]
        identity["terminalPressure"] = {
            "enabled": _boolean(filename, rows[0], "terminal_pressure_enabled"),
            "startTick": globals_int["terminal_pressure_start_tick"],
            "intervalTicks": globals_int["terminal_pressure_interval_ticks"],
            "initialDamage": globals_int["terminal_pressure_initial_damage"],
            "incrementDamage": globals_int["terminal_pressure_increment_damage"],
        }
        last_chance_text = _same(rows, filename, "last_chance_enabled")
        if last_chance_text not in {"true", "false"}:
            raise ExportError("GAMEPLAY_LAST_CHANCE_INVALID")
        hours = []
        seen_hours: set[int] = set()
        for row in rows:
            hour = _integer(filename, row, "hour", 1)
            if hour in seen_hours or hour not in EXPECTED_HOUR_KINDS:
                raise ExportError(f"GAMEPLAY_HOUR_INVALID:{hour}")
            seen_hours.add(hour)
            kind = _require_text(filename, row, "kind")
            if kind != EXPECTED_HOUR_KINDS[hour]:
                raise ExportError(f"GAMEPLAY_HOUR_KIND_INVALID:{hour}")
            nodes = _ids(filename, row, "node_types", allow_empty=kind != "choice")
            if kind != "choice" and nodes:
                raise ExportError(f"GAMEPLAY_FIXED_HOUR_NODE_INVALID:{hour}")
            if any(node_id not in node_ids for node_id in nodes):
                raise ExportError(f"GAMEPLAY_NODE_REFERENCE_INVALID:{hour}")
            hours.append({
                "hour": hour,
                "kind": kind,
                "completionXp": _integer(filename, row, "completion_xp", 0),
                "nodeTypes": nodes,
            })
        if seen_hours != set(EXPECTED_HOUR_KINDS):
            raise ExportError("GAMEPLAY_HOUR_COVERAGE_INVALID")
        hours.sort(key=lambda value: value["hour"])
        return {
            "schema": SCHEDULE_SCHEMA,
            "schemaVersion": SCHEDULE_SCHEMA_VERSION,
            "rulesVersion": RULES_VERSION,
            "contentRevision": identity["contentRevision"],
            "incomePayoutPolicy": INCOME_PAYOUT_POLICY,
            "hours": hours,
            "pveWinBonusXp": globals_int["pve_win_bonus_xp"],
            "prestigeLoss": {
                "pveLoss": globals_int["pve_loss_prestige"],
                "pveDraw": globals_int["pve_draw_prestige"],
                "ghostLoss": globals_int["ghost_loss_prestige"],
                "ghostDraw": globals_int["ghost_draw_prestige"],
            },
            "terminalRules": {
                "winTarget": globals_int["win_target"],
                "lastChanceEnabled": last_chance_text == "true",
            },
        }, identity

    def _encounters(
        self,
        rewards: dict[str, dict[str, Any]],
        run_day_max: int,
    ) -> dict[str, Any]:
        encounter_file = "53_bz_encounters.csv"
        enemy_file = "54_bz_enemies.csv"
        enemy_groups: dict[str, list[dict[str, str]]] = defaultdict(list)
        global_instances: set[str] = set()
        for row in self.tables[enemy_file]:
            _formal(enemy_file, row)
            enemy_id = _require_id(enemy_file, row, "enemy_id")
            enemy_groups[enemy_id].append(row)
            instance_id = _require_id(enemy_file, row, "instance_id")
            if instance_id in global_instances:
                raise ExportError(f"ENEMY_INSTANCE_ID_DUPLICATE:{instance_id}")
            global_instances.add(instance_id)
        enemies = {}
        for enemy_id, rows in enemy_groups.items():
            name = _same(rows, enemy_file, "name_zh")
            if not CJK_RE.search(name):
                raise ExportError(f"ENEMY_CHINESE_NAME_REQUIRED:{enemy_id}")
            hero_hp_text = _same(rows, enemy_file, "hero_hp")
            hero_max_text = _same(rows, enemy_file, "hero_max_hp")
            if not INTEGER_RE.fullmatch(hero_hp_text) or not INTEGER_RE.fullmatch(hero_max_text):
                raise ExportError(f"ENEMY_HERO_HP_INVALID:{enemy_id}")
            hero_hp, hero_max = int(hero_hp_text), int(hero_max_text)
            if hero_hp <= 0 or hero_max <= 0 or hero_hp > hero_max:
                raise ExportError(f"ENEMY_HERO_HP_INVALID:{enemy_id}")
            instances = []
            for row in rows:
                item_id = _require_id(enemy_file, row, "item_id")
                quality = _require_text(enemy_file, row, "quality")
                if (item_id, quality) not in self.item_profiles:
                    raise ExportError(f"ENEMY_ITEM_QUALITY_UNKNOWN:{enemy_id}")
                enchantment = row.get("enchantment", "")
                if enchantment != "":
                    raise ExportError(f"ENEMY_ENCHANTMENT_UNSUPPORTED:{enemy_id}")
                instances.append({
                    "instanceId": row["instance_id"],
                    "itemId": item_id,
                    "quality": quality,
                    "enchantment": enchantment,
                    "location": "board",
                    "startSlot": _integer(enemy_file, row, "start_slot", 0),
                })
            instances.sort(key=lambda value: (value["startSlot"], value["instanceId"]))
            self._validate_placements(instances, f"ENEMY:{enemy_id}")
            enemies[enemy_id] = {
                "hero": {"hp": hero_hp, "maxHp": hero_max},
                "board": {"placements": [
                    {"instanceId": item["instanceId"], "itemId": item["itemId"], "startSlot": item["startSlot"]}
                    for item in instances
                ]},
                "itemInstances": [
                    {key: item[key] for key in ["instanceId", "itemId", "quality", "enchantment"]}
                    for item in instances
                ],
            }
        encounter_rows = _unique(self.tables[encounter_file], encounter_file, "encounter_id")
        templates = []
        layer_references: dict[int, dict[str, list[str]]] = defaultdict(lambda: {"pve": [], "ghost": []})
        seen_keys: set[tuple[int, int, str]] = set()
        for encounter_id, row in encounter_rows.items():
            _formal(encounter_file, row)
            _require_chinese(encounter_file, row, "name_zh")
            day = _integer(encounter_file, row, "day", 1)
            hour = _integer(encounter_file, row, "hour", 1)
            kind = _require_text(encounter_file, row, "kind")
            if hour not in {3, 6} or kind != ("pve" if hour == 3 else "ghost"):
                raise ExportError(f"ENCOUNTER_HOUR_KIND_INVALID:{encounter_id}")
            key = (day, hour, kind)
            if key in seen_keys:
                raise ExportError(f"ENCOUNTER_SLOT_DUPLICATE:{day}:{hour}:{kind}")
            seen_keys.add(key)
            enemy_id = _require_id(encounter_file, row, "enemy_id")
            if enemy_id not in enemies:
                raise ExportError(f"ENCOUNTER_ENEMY_UNKNOWN:{encounter_id}")
            reward_id = _require_id(encounter_file, row, "reward_id")
            if reward_id not in rewards:
                raise ExportError(f"ENCOUNTER_REWARD_UNKNOWN:{encounter_id}")
            templates.append({
                "encounterTemplateId": encounter_id,
                "rewardId": reward_id,
                "enemy": enemies[enemy_id],
            })
            layer_references[day][kind].append(encounter_id)
        required_keys = {
            (day, hour, "pve" if hour == 3 else "ghost")
            for day in range(1, run_day_max + 1)
            for hour in [3, 6]
        }
        if seen_keys != required_keys:
            raise ExportError("BOOTSTRAP_ENCOUNTER_COVERAGE_INVALID")
        templates.sort(key=lambda value: value["encounterTemplateId"])
        layers = []
        for day in range(1, run_day_max + 1):
            pve_ids = sorted(layer_references[day]["pve"])
            ghost_ids = sorted(layer_references[day]["ghost"])
            if not pve_ids or not ghost_ids:
                raise ExportError(f"BOOTSTRAP_ENCOUNTER_LAYER_POOL_INVALID:{day}")
            layers.append({
                "fromDay": day,
                "toDay": None if day == run_day_max else day,
                "pveTemplateIds": pve_ids,
                "ghostTemplateIds": ghost_ids,
            })
        return {"templates": templates, "layers": layers}

    def _new_run(self, hero: dict[str, Any], starters: list[dict[str, Any]]) -> dict[str, Any]:
        # v5 makes executableCatalogs the sole owner of hero -> skill bindings.
        hero_payload = {key: hero[key] for key in ["heroId", "level", "experience", "prestige", "maxHp"]}
        board_items = sorted((item for item in starters if item["location"] == "board"), key=lambda value: value["startSlot"])
        stash_items = sorted((item for item in starters if item["location"] == "stash"), key=lambda value: value["instanceId"])
        return {
            "schemaVersion": NEW_RUN_SCHEMA_VERSION,
            "stateVersion": 0,
            "phase": "schedule",
            "day": 1,
            "hour": 1,
            "activeNode": {"nodeId": "", "kind": "", "rewardId": ""},
            "seed": _same(self.tables["44_bz_gameplay.csv"], "44_bz_gameplay.csv", "seed"),
            "hero": hero_payload,
            "economy": {"gold": hero["startGold"], "income": hero["startIncome"]},
            "run": {
                "wins": 0,
                "losses": 0,
                "lastChance": False,
                "terminal": {"ended": False, "victory": False, "reason": ""},
            },
            "board": {"placements": [
                {"instanceId": item["instanceId"], "itemId": item["itemId"], "startSlot": item["startSlot"]}
                for item in board_items
            ]},
            "stash": [item["instanceId"] for item in stash_items],
            "itemInstances": [
                {key: item[key] for key in ["instanceId", "itemId", "quality", "enchantment"]}
                for item in sorted(starters, key=lambda value: value["instanceId"])
            ],
            "shop": {"nextInstanceOrdinal": 1, "refreshIndex": 0},
            "battle": {"kind": "idle", "kernelState": {}},
            "levelRewards": {"pendingMilestoneIds": [], "resolved": []},
        }

    def _validate_placements(self, instances: list[dict[str, Any]], context: str) -> None:
        occupied: set[int] = set()
        for item in instances:
            if item["location"] != "board":
                continue
            width = self.item_widths.get(item["itemId"], 0)
            start = item["startSlot"]
            if width not in {1, 2, 3} or start is None or start < 0 or start + width > 10:
                raise ExportError(f"BOARD_PLACEMENT_RANGE_INVALID:{context}:{item['instanceId']}")
            slots = set(range(start, start + width))
            if occupied.intersection(slots):
                raise ExportError(f"BOARD_PLACEMENT_OVERLAP:{context}:{item['instanceId']}")
            occupied.update(slots)


def _build_display_directory(
    tables: dict[str, list[dict[str, str]]],
    package: dict[str, Any],
) -> dict[str, Any]:
    entries: list[dict[str, str]] = []
    for filename, domain, id_field in DISPLAY_DOMAINS:
        grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in tables[filename]:
            _formal(filename, row)
            grouped[_require_id(filename, row, id_field)].append(row)
        for source_id in sorted(grouped):
            rows = grouped[source_id]
            name_zh = _same(rows, filename, "name_zh")
            if not CJK_RE.search(name_zh):
                raise ExportError(f"DISPLAY_CHINESE_NAME_REQUIRED:{domain}:{source_id}")
            description_zh = ""
            if "description_zh" in DOMAIN_HEADERS[filename]:
                description_zh = _same(rows, filename, "description_zh")
                if not CJK_RE.search(description_zh):
                    raise ExportError(f"DISPLAY_CHINESE_DESCRIPTION_REQUIRED:{domain}:{source_id}")
            entries.append({
                "displayId": f"{domain}.{source_id}",
                "domain": domain,
                "sourceId": source_id,
                "nameZh": name_zh,
                # Empty means that domain has no authored description_zh column;
                # the adapter never synthesizes presentation prose.
                "descriptionZh": description_zh,
            })
    entries.sort(key=lambda value: value["displayId"])
    return {
        "schema": DISPLAY_SCHEMA,
        "schemaVersion": DISPLAY_SCHEMA_VERSION,
        "gameplayId": GAMEPLAY_ID,
        "sourceRevision": package["sourceRevision"],
        "contentRevision": package["contentRevision"],
        "entries": entries,
    }


def build_exports(csv_dir: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    tables = _read_domains(csv_dir)
    package = ContentAssembler(tables).build()
    # JSON round-trip is the final type gate. NaN and non-string dictionary keys
    # cannot enter from CSV, but this also isolates the returned value.
    package = json.loads(_canonical_json(package))
    validate_package(package)
    display = json.loads(_canonical_json(_build_display_directory(tables, package)))
    return package, display


def build_package(csv_dir: Path) -> dict[str, Any]:
    return build_exports(csv_dir)[0]


def _write_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export strict original-pirate v10 runtime and display candidates from 16 BZ CSV domains")
    parser.add_argument("--csv-dir", default=str(DEFAULT_CSV_DIR))
    parser.add_argument("--out", help="Write one deterministic JSON package; stdout when omitted")
    parser.add_argument("--display-out", help="Write the independent deterministic Chinese display sidecar")
    parser.add_argument("--check", action="store_true", help="Validate without writing package JSON")
    args = parser.parse_args(argv)
    try:
        package, display = build_exports(Path(args.csv_dir))
    except (ExportError, OSError, csv.Error, json.JSONDecodeError) as exc:
        print(f"FAIL original-pirate content export: {exc}", file=sys.stderr)
        return 1
    text = _canonical_json(package) + "\n"
    display_text = _canonical_json(display) + "\n"
    if args.check:
        print(
            "PASS original-pirate v10 integration-pending candidate "
            f"items={len(package['items'])} hours={len(package['runtimeBundle']['scheduleConfig']['hours'])} "
            f"shopTemplates={len(package['runtimeBundle']['generation']['shop']['templates'])} "
            f"battleTemplates={len(package['runtimeBundle']['generation']['battle']['templates'])} "
            f"displayEntries={len(display['entries'])} "
            f"revision={package['contentRevision']}"
        )
        return 0
    if args.out:
        output = Path(args.out)
        _write_atomic(output, text)
        print(f"exported original-pirate v10 integration-pending candidate to {output}")
    else:
        sys.stdout.write(text)
    if args.display_out:
        display_output = Path(args.display_out)
        _write_atomic(display_output, display_text)
        print(f"exported original-pirate display candidate to {display_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
