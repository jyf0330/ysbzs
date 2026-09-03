#!/usr/bin/env python3
"""Build strict original-pirate runtime and display candidates from 23 BZ domains.

The CSV files are the complete authoring projection from ysbzs_master.xlsx.
This exporter deliberately keeps planner-facing Chinese/catalog/source fields
outside the formal v32 candidate package while still validating every
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
CONTENT_SCHEMA_VERSION = 32
QUALITY_PROFILE_SCHEMA = "ysbzs.original-pirate-item-quality-profiles.v1"
RUNTIME_SCHEMA = "ysbzs.original-pirate-runtime-bundle.v1"
RUNTIME_SCHEMA_VERSION = 30
SOURCE_CONTENT_SCHEMA_VERSION = 30
SOURCE_RUNTIME_SCHEMA_VERSION = 28
NEW_RUN_SCHEMA_VERSION = 3
BATTLE_PACKAGE_SCHEMA_VERSION = 3
GENERATION_SCHEMA = "ysbzs.original-pirate-generation.v1"
GENERATION_SCHEMA_VERSION = 3
GENERATION_ALGORITHM = "sha256-ranked-selection-v1"
DISPLAY_SCHEMA = "ysbzs.original-pirate-display-directory.v1"
DISPLAY_SCHEMA_VERSION = 3
EXECUTABLE_CATALOGS_SCHEMA = "ysbzs.original-pirate-executable-catalogs.v1"
EXECUTABLE_CATALOGS_SCHEMA_VERSION = 22
PROGRESSION_SCHEMA = "ysbzs.original-pirate-progression-rules.v1"
PROGRESSION_SCHEMA_VERSION = 1
SCHEDULE_SCHEMA = "ysbzs.original-pirate-schedule-config.v4"
SCHEDULE_SCHEMA_VERSION = 4
PRESTIGE_POLICY_SCHEMA = "ysbzs.original-pirate-prestige-policy.v1"
PRESTIGE_POLICY_SCHEMA_VERSION = 1
LAST_CHANCE_SCHEMA = "ysbzs.original-pirate-last-chance-rules.v1"
LAST_CHANCE_SCHEMA_VERSION = 1
GHOST_SNAPSHOT_SCHEMA = "ysbzs.original-pirate-ghost-snapshot.v1"
GHOST_SNAPSHOT_SCHEMA_VERSION = 2
GHOST_MATCH_SOURCE = "offline_content"
RULES_VERSION = "ysbzs.original-pirate-rules.2026-09-04-v28"
AMMO_DEPLETION_CONTRACT = "ysbzs.original-pirate-ammo-depletion.v1"
AMMO_DEPLETION_TRIGGER_POLICY = "current_item_use_positive_to_zero"
AMMO_DEPLETION_EVALUATION_PHASE = "after_ammo_spend_before_item_effects"
AMMO_DEPLETION_SNAPSHOT_POLICY = "ammo_before_after_from_same_use"
AMMO_DEPLETION_REPEAT_POLICY = "once_per_depleting_use"
AMMO_DEPLETION_NON_AMMO_POLICY = "not_eligible"
AMMO_DEPLETION_RELOAD_POLICY = "later_reload_does_not_cancel"
AMMO_DEPLETION_RNG_POLICY = "never"
DAMAGE_AURA_CONTRACT = "ysbzs.original-pirate-damage-aura.v1"
DAMAGE_AURA_EVALUATION_POLICY = "per_damage_from_compiled_sources"
DAMAGE_AURA_TARGET_SNAPSHOT_POLICY = "battle_start_board"
DAMAGE_AURA_TARGET_ORDER = "board_slot_then_instance_id"
DAMAGE_AURA_STACKING_POLICY = "additive_per_source_effect"
DAMAGE_AURA_DAMAGE_PHASE = "before_crit"
DAMAGE_AURA_SOURCE_LIFECYCLE_POLICY = "compiled_board_source_for_battle"
DAMAGE_AURA_OVERFLOW_POLICY = "reject_advance"
DAMAGE_AURA_RNG_POLICY = "never"
BURN_CONTRACT = "ysbzs.original-pirate-burn.v2"
BURN_PULSE_INTERVAL_TICKS = 1
BURN_FIRST_PULSE_POLICY = "next_tick"
BURN_PULSE_PHASE = "tick_start_before_item_progress"
BURN_DAMAGE_PER_STACK = 1
BURN_DECAY_STACKS_PER_PULSE = 1
BURN_SHIELD_POLICY = "shield_first_consuming"
BURN_RESOLUTION_ORDER = "simultaneous_sides_then_terminal"
BURN_MAX_STACKS = 1000000
BURN_STACK_OVERFLOW_POLICY = "reject_advance"
POISON_CONTRACT = "ysbzs.original-pirate-poison.v2"
POISON_PULSE_INTERVAL_TICKS = 10
POISON_FIRST_PULSE_POLICY = "after_full_interval"
POISON_REAPPLY_SCHEDULE_POLICY = "preserve_existing_due_tick"
POISON_PULSE_PHASE = "tick_start_after_burn_terminal_before_item_progress"
POISON_DAMAGE_PER_STACK = 1
POISON_DECAY_STACKS_PER_PULSE = 0
POISON_SHIELD_POLICY = "bypass_without_consuming"
POISON_RESOLUTION_ORDER = "due_sides_snapshot_then_terminal"
POISON_HEAL_CLEANSE_POLICY = "delegated_to_heal_status_cleanse_rules"
POISON_CRIT_POLICY = "never"
POISON_MAX_STACKS = 1000000
POISON_STACK_OVERFLOW_POLICY = "reject_advance"
HEAL_STATUS_CLEANSE_CONTRACT = "ysbzs.original-pirate-heal-status-cleanse.v1"
HEAL_STATUS_CLEANSE_TRIGGER_POLICY = "after_effective_heal"
HEAL_STATUS_CLEANSE_HEAL_BASIS = "applied_heal"
HEAL_STATUS_CLEANSE_SCALE_BPS = 2500
HEAL_STATUS_CLEANSE_ROUNDING_MODE = "floor_min_one_if_positive"
HEAL_STATUS_CLEANSE_STATUS_TARGETS = ["burn", "poison"]
HEAL_STATUS_CLEANSE_STATUS_RESOLUTION_POLICY = "independent_caps_from_same_snapshot"
HEAL_STATUS_CLEANSE_POISON_SCHEDULE_POLICY = "clear_due_if_zero_else_preserve"
HEAL_STATUS_CLEANSE_TRACE_EMIT_POLICY = "only_when_effective_heal_and_any_status_present"
HEAL_STATUS_CLEANSE_CRIT_POLICY = "never"
HEAL_STATUS_CLEANSE_RNG_POLICY = "never"
CRIT_CONTRACT = "ysbzs.original-pirate-critical-damage.v3"
CRIT_CHANCE_SCALE_BPS = 10000
CRIT_DAMAGE_MULTIPLIER_MAX_BPS = 100000
CRIT_DAMAGE_AMOUNT_MAX = 922337203685477580
CRIT_ROUNDING_MODE = "floor"
CRIT_ROLL_SCOPE = "item_use"
CRIT_DRAW_POLICY = "once_if_eligible_damage_effect"
CRIT_GROWTH_STACKING_POLICY = "additive_bps_per_effect"
CRIT_GROWTH_CAP_POLICY = "effective_chance_capped_at_chance_scale"
CRIT_GROWTH_TIMING_POLICY = "after_source_use_for_subsequent_uses"
CRIT_GROWTH_ELIGIBLE_TARGET_POLICY = \
    "trigger_source_item_with_exactly_one_can_crit_item_ready_direct_damage"
CRIT_GROWTH_RNG_POLICY = "never"
CRIT_SUCCESS_RESPONSE_EVIDENCE_POLICY = \
    "crit_resolve_is_critical_with_bound_committed_damage"
CRIT_SUCCESS_RESPONSE_SOURCE_POLICY = "another_same_owner_active_board_item"
CRIT_SUCCESS_RESPONSE_TIMING_POLICY = "after_source_use_effects_in_item_response_phase"
CRIT_SUCCESS_RESPONSE_REPEAT_POLICY = "once_per_qualifying_item_use"
CRIT_SUCCESS_RESPONSE_TERMINAL_POLICY = "skip_after_terminal"
CRIT_SUCCESS_RESPONSE_RNG_POLICY = "never"
INCOME_PAYOUT_POLICY = "day_advance"
QUALITIES = ["bronze", "silver", "gold", "diamond"]
QUALITY_NAMES_ZH = {"bronze": "青铜", "silver": "白银", "gold": "黄金", "diamond": "钻石"}
DETERMINISTIC_FRIENDLY_ITEM_TARGETS = {
    "left_adjacent_item", "right_adjacent_item",
    "leftmost_friendly_item", "rightmost_friendly_item",
}
COLLECTION_FRIENDLY_ITEM_TARGETS = {"friendly_items_with_any_tag"}
RANDOM_FRIENDLY_ITEM_TARGETS = {"random_friendly_item_with_any_tag"}
PARAMETERIZED_FRIENDLY_ITEM_TARGETS = (
    COLLECTION_FRIENDLY_ITEM_TARGETS | RANDOM_FRIENDLY_ITEM_TARGETS
)
ITEM_EFFECT_TARGETS = {
    "selected_enemy", "self_item", "first_enemy_item", "owner_hero",
    "trigger_source_item",
    *DETERMINISTIC_FRIENDLY_ITEM_TARGETS,
    *COLLECTION_FRIENDLY_ITEM_TARGETS,
    *RANDOM_FRIENDLY_ITEM_TARGETS,
}
ITEM_EFFECT_OPERATIONS = {
    "deal_damage", "reload", "charge", "apply_status", "heal", "gain_shield",
    "gain_damage_for_fight", "gain_crit_chance_for_fight", "apply_burn", "apply_poison",
}
REACTIVE_ITEM_EFFECT_OPERATIONS = {
    "deal_damage", "reload", "charge", "gain_damage_for_fight",
    "gain_crit_chance_for_fight",
}
ITEM_STATUSES = {"haste", "slow", "freeze"}
ITEM_TAGS = {"ammo", "aquatic", "burn", "poison", "relic", "tool", "vehicle", "weapon"}
BURN_RESPONSE_TRIGGER = "another_friendly_item_applied_burn"
CRIT_SUCCESS_RESPONSE_TRIGGER = "another_friendly_item_crit"
ITEM_EFFECT_TRIGGERS = {
    "item_ready", "another_friendly_item_used", BURN_RESPONSE_TRIGGER,
    CRIT_SUCCESS_RESPONSE_TRIGGER, "battle_start",
}
ITEM_EFFECT_CONDITIONS = {
    "always", "source_item_has_any_tag", "source_item_can_crit", "source_item_ammo_depleted",
}
ITEM_EFFECT_SOURCE_RELATIONS = {"any", "adjacent"}
DAMAGE_AURA_TARGET = "friendly_items_with_any_tag"
DAMAGE_AURA_OPERATION = "grant_damage"
HERO_SKILL_TRIGGER = "friendly_item_used"
HERO_SKILL_TARGETS = {"opponent_hero", "source_item", "owner_hero"}
HERO_SKILL_OPERATIONS = {"deal_damage", "charge", "heal", "gain_shield"}
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
        "terminal_pressure_increment_damage", "crit_contract", "chance_scale_bps",
        "damage_multiplier_bps", "rounding_mode", "roll_scope", "draw_policy",
        "crit_growth_stacking_policy", "crit_growth_cap_policy",
        "crit_growth_timing_policy", "crit_growth_eligible_target_policy",
        "crit_growth_rng_policy",
        "crit_success_response_evidence_policy", "crit_success_response_source_policy",
        "crit_success_response_timing_policy", "crit_success_response_repeat_policy",
        "crit_success_response_terminal_policy", "crit_success_response_rng_policy",
        "ammo_depletion_contract", "ammo_depletion_trigger_policy",
        "ammo_depletion_evaluation_phase", "ammo_depletion_snapshot_policy",
        "ammo_depletion_repeat_policy", "ammo_depletion_non_ammo_policy",
        "ammo_depletion_reload_policy", "ammo_depletion_rng_policy",
        "burn_contract", "burn_pulse_interval_ticks", "burn_first_pulse_policy",
        "burn_pulse_phase", "burn_damage_per_stack", "burn_decay_stacks_per_pulse",
        "burn_shield_policy", "burn_resolution_order", "burn_max_stacks",
        "burn_stack_overflow_policy",
        "poison_contract", "poison_pulse_interval_ticks", "poison_first_pulse_policy",
        "poison_reapply_schedule_policy", "poison_pulse_phase", "poison_damage_per_stack",
        "poison_decay_stacks_per_pulse", "poison_shield_policy", "poison_resolution_order",
        "poison_heal_cleanse_policy", "poison_crit_policy", "poison_max_stacks",
        "poison_stack_overflow_policy",
        "heal_status_cleanse_contract", "heal_status_cleanse_trigger_policy",
        "heal_status_cleanse_heal_basis", "heal_status_cleanse_scale_bps",
        "heal_status_cleanse_rounding_mode", "heal_status_cleanse_status_targets",
        "heal_status_cleanse_status_resolution_policy",
        "heal_status_cleanse_poison_schedule_policy",
        "heal_status_cleanse_trace_emit_policy", "heal_status_cleanse_crit_policy",
        "heal_status_cleanse_rng_policy",
        "damage_aura_contract", "damage_aura_evaluation_policy",
        "damage_aura_target_snapshot_policy", "damage_aura_target_order",
        "damage_aura_stacking_policy", "damage_aura_damage_phase",
        "damage_aura_source_lifecycle_policy", "damage_aura_overflow_policy",
        "damage_aura_rng_policy",
        "pve_win_bonus_xp",
        "prestige_battle_kind", "ghost_loss_prestige", "ghost_draw_prestige",
        "win_target", "last_chance_policy_id",
        "bootstrap_run_day_coverage", "bootstrap_refresh_package_coverage", "hour", "kind",
        "completion_xp", "node_types", "catalog_status",
    ]),
    ("45_bz_heroes.csv", [
        "hero_id", "name_zh", "max_hp", "start_level", "start_xp", "start_prestige",
        "start_gold", "start_income", "catalog_status",
    ]),
    ("46_bz_items.csv", [
        "item_id", "name_zh", "tags", "slot_width", "base_quality", "quality", "buy_price",
        "sell_price", "cooldown_ticks", "crit_chance_bps", "ammo_enabled", "ammo_initial", "ammo_maximum",
        "item_skill_id", "starter_instance_id", "starter_location", "starter_start_slot",
        "catalog_status",
    ]),
    ("47_bz_item_effects.csv", [
        "effect_id", "item_id", "quality", "item_skill_id", "priority", "trigger_event",
        "condition_type", "condition_tags", "condition_source_relation", "target_type", "target_tags",
        "target_exclude_self", "target_count",
        "operation_type", "amount", "crit_chance_bps_delta", "stacks", "can_crit",
        "status", "ticks", "catalog_status",
    ]),
    ("48_bz_item_skills.csv", [
        "item_skill_id", "name_zh", "description_zh", "trigger_events", "effect_ids",
        "aura_ids", "catalog_status",
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
        "encounter_id", "name_zh", "day", "hour", "kind", "enemy_id", "snapshot_id",
        "reward_id", "catalog_status",
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
    ("60_bz_ghost_snapshots.csv", [
        "schema", "schema_version", "snapshot_id", "match_source",
        "opponent_content_revision", "hero_id", "hero_level",
        "hero_hp", "hero_max_hp", "instance_id", "item_id", "quality",
        "enchantment", "start_slot", "catalog_status",
    ]),
    ("61_bz_last_chance_choices.csv", [
        "schema", "schema_version", "policy_id", "max_uses_per_run",
        "trigger_battle_kind", "trigger_outcomes", "trigger_prestige_at_or_below",
        "option_id", "option_order", "name_zh", "description_zh",
        "restore_prestige", "cost_type", "cost_amount", "catalog_status",
    ]),
    ("62_bz_hero_skills.csv", [
        "hero_skill_id", "hero_id", "quality", "name_zh", "description_zh", "effect_description_zh",
        "priority", "trigger_event", "reentrant", "max_triggers_per_battle",
        "effect_id", "target_type", "operation_type", "amount", "ticks",
        "catalog_status",
    ]),
    ("63_bz_hero_skill_loadouts.csv", [
        "loadout_kind", "loadout_id", "instance_id", "hero_skill_id", "quality",
        "source_type", "source_id", "acquired_day", "acquired_seq", "catalog_status",
    ]),
    ("64_bz_hero_skill_trainers.csv", [
        "trainer_id", "hero_id", "stall_id", "name_zh", "description_zh",
        "offer_slots", "catalog_status",
    ]),
    ("65_bz_hero_skill_offers.csv", [
        "offer_id", "trainer_id", "hero_skill_id", "action_type", "upgrade_id",
        "from_quality", "to_quality", "price_currency", "price_amount", "from_day",
        "to_day", "offer_order", "name_zh", "description_zh", "catalog_status",
    ]),
    ("66_bz_item_auras.csv", [
        "aura_id", "item_id", "quality", "item_skill_id", "priority",
        "target_type", "target_tags", "target_exclude_self", "operation_type",
        "amount", "catalog_status",
    ]),
])

DISPLAY_DOMAINS = [
    ("45_bz_heroes.csv", "heroes", "hero_id"),
    ("46_bz_items.csv", "items", "item_id"),
    ("48_bz_item_skills.csv", "item_skills", "item_skill_id"),
    ("49_bz_stalls.csv", "stalls", "stall_id"),
    ("51_bz_events.csv", "events", "event_id"),
    ("52_bz_event_options.csv", "event_options", "option_id"),
    ("53_bz_encounters.csv", "encounters", "encounter_id"),
    ("54_bz_enemies.csv", "enemies", "enemy_id"),
    ("55_bz_rewards.csv", "rewards", "reward_id"),
    ("58_bz_enchantments.csv", "enchantments", "enchantment_id"),
    ("59_bz_level_up_choices.csv", "level_up_options", "option_id"),
    ("61_bz_last_chance_choices.csv", "last_chance_options", "option_id"),
    ("62_bz_hero_skills.csv", "hero_skills", "hero_skill_id"),
    ("64_bz_hero_skill_trainers.csv", "hero_skill_trainers", "trainer_id"),
    ("65_bz_hero_skill_offers.csv", "hero_skill_offers", "offer_id"),
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


def _item_tags(filename: str, row: dict[str, str], field: str) -> list[str]:
    values = _ids(filename, row, field)
    if any(value not in ITEM_TAGS for value in values) or values != sorted(values):
        raise ExportError(f"ITEM_TAG_INVALID:{_location(filename, row)}:{field}")
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
        item.get("tags", []).sort()
        for profile in item.get("qualityProfiles", {}).values():
            for effect in profile.get("effects", []):
                for condition in effect.get("trigger", {}).get("conditions", []):
                    if condition.get("type") == "source_item_has_any_tag":
                        condition.get("params", {}).get("tags", []).sort()
                if effect.get("target", {}).get("type") in PARAMETERIZED_FRIENDLY_ITEM_TARGETS:
                    effect.get("target", {}).get("params", {}).get("tags", []).sort()
            profile.get("effects", []).sort(key=lambda value: (value.get("priority", 0), value.get("effectId", "")))
            for aura in profile.get("auras", []):
                aura.get("target", {}).get("params", {}).get("tags", []).sort()
            profile.get("auras", []).sort(
                key=lambda value: (value.get("priority", 0), value.get("auraId", ""))
            )
    result.sort(key=lambda value: value.get("itemId", ""))
    return result


def _canonical_combat_build(build: dict[str, Any]) -> dict[str, Any]:
    result = json.loads(json.dumps(build, ensure_ascii=False))
    result.get("heroSkills", []).sort(
        key=lambda value: (value.get("acquiredSeq", -1), value.get("instanceId", ""))
    )
    result.get("itemInstances", []).sort(key=lambda value: value.get("instanceId", ""))
    result.get("board", {}).get("placements", []).sort(
        key=lambda value: (value.get("startSlot", -1), value.get("instanceId", ""))
    )
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
    for template in battle.get("templates", []):
        if isinstance(template.get("enemy"), dict):
            template["enemy"] = _canonical_combat_build(template["enemy"])
    battle.get("templates", []).sort(key=lambda value: value.get("encounterTemplateId", ""))
    battle.get("ghostEncounters", []).sort(key=lambda value: value.get("encounterId", ""))
    for snapshot in battle.get("ghostSnapshots", []):
        if isinstance(snapshot.get("build"), dict):
            snapshot["build"] = _canonical_combat_build(snapshot["build"])
    battle.get("ghostSnapshots", []).sort(key=lambda value: value.get("snapshotId", ""))
    for layer in battle.get("layers", []):
        layer.get("pveTemplateIds", []).sort()
        layer.get("ghostEncounterIds", []).sort()
    battle.get("layers", []).sort(key=lambda value: value.get("fromDay", -1))
    schedule = result.get("scheduleConfig", {})
    schedule.get("hours", []).sort(key=lambda value: value.get("hour", -1))
    progression = result.get("progressionRules", {})
    progression.get("milestones", []).sort(key=lambda value: value.get("level", -1))
    progression.get("options", []).sort(key=lambda value: value.get("optionId", ""))
    catalogs = result.get("executableCatalogs", {})
    for hero in catalogs.get("heroes", []):
        hero.get("heroSkillIds", []).sort()
        hero.get("startingHeroSkills", []).sort(
            key=lambda value: (value.get("acquiredSeq", -1), value.get("instanceId", ""))
        )
    catalogs.get("heroes", []).sort(key=lambda value: value.get("heroId", ""))
    for skill in catalogs.get("itemSkills", []):
        skill.get("triggerEvents", []).sort()
        skill.get("effectIds", []).sort()
        skill.get("auraIds", []).sort()
    catalogs.get("itemSkills", []).sort(key=lambda value: value.get("itemSkillId", ""))
    for skill in catalogs.get("heroSkills", []):
        for profile in skill.get("qualityProfiles", {}).values():
            profile.get("effects", []).sort(key=lambda value: value.get("effectId", ""))
    catalogs.get("heroSkills", []).sort(key=lambda value: value.get("heroSkillId", ""))
    for trainer in catalogs.get("heroSkillTrainers", []):
        trainer.get("offerIds", []).sort()
    catalogs.get("heroSkillTrainers", []).sort(key=lambda value: value.get("trainerId", ""))
    catalogs.get("heroSkillOffers", []).sort(key=lambda value: value.get("offerId", ""))
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


def _expect_canonical_item_tags(value: Any, context: str) -> list[str]:
    tags = _expect_list(value, context)
    if not tags or any(not isinstance(tag, str) or tag not in ITEM_TAGS for tag in tags) \
            or len(tags) != len(set(tags)) or tags != sorted(tags):
        raise ExportError(f"EXECUTABLE_ITEM_TAGS_INVALID:{context}")
    return tags


def _expect_integer(value: Any, context: str, minimum: int | None = None) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or (minimum is not None and value < minimum):
        raise ExportError(f"EXECUTABLE_INTEGER_INVALID:{context}")
    return value


def _validate_executable_item_effect(value: Any, context: str) -> tuple[str, str]:
    effect = _expect_exact_fields(value, {
        "effectId", "priority", "trigger", "target", "operation",
    }, context)
    effect_id = _expect_stable_id(effect["effectId"], f"{context}:effectId")
    _expect_integer(effect["priority"], f"{context}:priority", 0)
    trigger = _expect_exact_fields(effect["trigger"], {"event", "conditions"}, f"{context}:trigger")
    trigger_event = trigger["event"]
    if trigger_event not in ITEM_EFFECT_TRIGGERS:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TRIGGER_INVALID:{effect_id}")
    conditions = _expect_list(trigger["conditions"], f"{context}:trigger:conditions")
    if trigger_event in {"item_ready", "battle_start"}:
        if conditions == [{"type": "always", "params": {}}]:
            pass
        elif trigger_event == "item_ready" \
                and conditions == [{"type": "source_item_ammo_depleted", "params": {}}]:
            pass
        else:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CONDITIONS_INVALID:{effect_id}")
    elif trigger_event == BURN_RESPONSE_TRIGGER:
        if conditions != [{
            "type": "source_item_has_any_tag",
            "params": {"tags": ["burn"]},
        }]:
            raise ExportError(f"EXECUTABLE_ITEM_BURN_RESPONSE_TRIGGER_INVALID:{effect_id}")
    elif trigger_event == CRIT_SUCCESS_RESPONSE_TRIGGER:
        if conditions != [{"type": "always", "params": {}}]:
            raise ExportError(f"EXECUTABLE_ITEM_CRIT_SUCCESS_RESPONSE_TRIGGER_INVALID:{effect_id}")
    else:
        if len(conditions) not in {1, 2}:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CONDITIONS_INVALID:{effect_id}")
        condition = _expect_exact_fields(
            conditions[0], {"type", "params"}, f"{context}:trigger:conditions:0"
        )
        if condition["type"] == "source_item_can_crit":
            if condition["params"] != {} or len(conditions) != 1:
                raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CONDITIONS_INVALID:{effect_id}")
        elif condition["type"] == "source_item_has_any_tag":
            params = _expect_exact_fields(
                condition["params"], {"tags"}, f"{context}:trigger:conditions:0:params"
            )
            _expect_canonical_item_tags(
                params["tags"], f"{context}:trigger:conditions:0:params:tags"
            )
            if len(conditions) == 2:
                adjacency = _expect_exact_fields(
                    conditions[1], {"type", "params"}, f"{context}:trigger:conditions:1"
                )
                if adjacency != {"type": "source_item_adjacent_to_self", "params": {}}:
                    raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CONDITIONS_INVALID:{effect_id}")
        else:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CONDITIONS_INVALID:{effect_id}")
    target = _expect_exact_fields(effect["target"], {"type", "params"}, f"{context}:target")
    target_type = target["type"]
    if target_type not in ITEM_EFFECT_TARGETS:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TARGET_INVALID:{effect_id}")
    if target_type in COLLECTION_FRIENDLY_ITEM_TARGETS:
        target_params = _expect_exact_fields(
            target["params"], {"tags"}, f"{context}:target:params"
        )
        _expect_canonical_item_tags(target_params["tags"], f"{context}:target:params:tags")
    elif target_type in RANDOM_FRIENDLY_ITEM_TARGETS:
        target_params = _expect_exact_fields(
            target["params"], {"tags", "excludeSelf", "count"}, f"{context}:target:params"
        )
        _expect_canonical_item_tags(target_params["tags"], f"{context}:target:params:tags")
        if type(target_params["excludeSelf"]) is not bool:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_RANDOM_TARGET_EXCLUDE_SELF_INVALID:{effect_id}")
        if _expect_integer(target_params["count"], f"{context}:target:params:count", 1) != 1:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_RANDOM_TARGET_COUNT_INVALID:{effect_id}")
    elif target["params"] != {}:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TARGET_INVALID:{effect_id}")
    operation = _expect_exact_fields(effect["operation"], {"type", "params"}, f"{context}:operation")
    operation_type = operation["type"]
    if operation_type not in ITEM_EFFECT_OPERATIONS:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_OPERATION_INVALID:{effect_id}")
    if trigger_event == "another_friendly_item_used" \
            and operation_type not in REACTIVE_ITEM_EFFECT_OPERATIONS:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_REACTIVE_OPERATION_INVALID:{effect_id}")
    if trigger_event == BURN_RESPONSE_TRIGGER and (
        target_type != "self_item" or operation_type != "charge"
    ):
        raise ExportError(f"EXECUTABLE_ITEM_BURN_RESPONSE_CONTRACT_INVALID:{effect_id}")
    if trigger_event == CRIT_SUCCESS_RESPONSE_TRIGGER and (
        target_type != "self_item" or operation_type != "charge"
    ):
        raise ExportError(f"EXECUTABLE_ITEM_CRIT_SUCCESS_RESPONSE_CONTRACT_INVALID:{effect_id}")
    if conditions and conditions[0].get("type") == "source_item_can_crit" \
            and operation_type != "gain_crit_chance_for_fight":
        raise ExportError(f"EXECUTABLE_ITEM_CRIT_GROWTH_TRIGGER_INVALID:{effect_id}")
    if conditions and conditions[0].get("type") == "source_item_ammo_depleted" and (
        trigger_event != "item_ready"
        or target_type != "owner_hero"
        or operation_type != "gain_shield"
    ):
        raise ExportError(f"EXECUTABLE_ITEM_AMMO_DEPLETION_CONTRACT_INVALID:{effect_id}")
    if trigger_event == "battle_start" \
            and (target_type != "owner_hero" or operation_type != "gain_shield"):
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_BATTLE_START_CONTRACT_INVALID:{effect_id}")
    if operation_type == "deal_damage":
        params = _expect_exact_fields(
            operation["params"], {"amount", "canCrit"}, f"{context}:operation:params"
        )
        damage_amount = _expect_integer(
            params["amount"], f"{context}:operation:params:amount", 1
        )
        if type(params["canCrit"]) is not bool:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CAN_CRIT_INVALID:{effect_id}")
        if params["canCrit"] and damage_amount > CRIT_DAMAGE_AMOUNT_MAX:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CRIT_DAMAGE_AMOUNT_INVALID:{effect_id}")
        if params["canCrit"] and (
            trigger_event != "item_ready"
            or conditions != [{"type": "always", "params": {}}]
            or target_type != "selected_enemy"
        ):
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_CRIT_CONTRACT_INVALID:{effect_id}")
        valid_target = target_type == "selected_enemy"
    elif operation_type in {"reload", "heal", "gain_shield", "gain_damage_for_fight"}:
        params = _expect_exact_fields(operation["params"], {"amount"}, f"{context}:operation:params")
        _expect_integer(params["amount"], f"{context}:operation:params:amount", 1)
        if operation_type == "gain_damage_for_fight":
            if trigger_event != "another_friendly_item_used" or len(conditions) not in {1, 2} \
                    or conditions[0].get("type") != "source_item_has_any_tag":
                raise ExportError(f"EXECUTABLE_ITEM_DAMAGE_GROWTH_TRIGGER_INVALID:{effect_id}")
            valid_target = target_type in {"self_item", "trigger_source_item"}
        else:
            valid_target = target_type == ("self_item" if operation_type == "reload" else "owner_hero")
    elif operation_type == "gain_crit_chance_for_fight":
        params = _expect_exact_fields(
            operation["params"], {"critChanceBpsDelta"}, f"{context}:operation:params"
        )
        crit_chance_bps_delta = _expect_integer(
            params["critChanceBpsDelta"],
            f"{context}:operation:params:critChanceBpsDelta",
            1,
        )
        if crit_chance_bps_delta > CRIT_CHANCE_SCALE_BPS \
                or trigger_event != "another_friendly_item_used" \
                or conditions != [{"type": "source_item_can_crit", "params": {}}]:
            raise ExportError(f"EXECUTABLE_ITEM_CRIT_GROWTH_TRIGGER_INVALID:{effect_id}")
        valid_target = target_type == "trigger_source_item"
    elif operation_type == "charge":
        params = _expect_exact_fields(operation["params"], {"ticks"}, f"{context}:operation:params")
        _expect_integer(params["ticks"], f"{context}:operation:params:ticks", 1)
        valid_target = target_type == "self_item" or (
            target_type in DETERMINISTIC_FRIENDLY_ITEM_TARGETS | PARAMETERIZED_FRIENDLY_ITEM_TARGETS
            and trigger_event == "item_ready"
        )
    elif operation_type == "apply_burn":
        params = _expect_exact_fields(operation["params"], {"stacks"}, f"{context}:operation:params")
        stacks = _expect_integer(params["stacks"], f"{context}:operation:params:stacks", 1)
        if stacks > BURN_MAX_STACKS:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_BURN_STACKS_INVALID:{effect_id}")
        valid_target = trigger_event == "item_ready" \
            and conditions == [{"type": "always", "params": {}}] \
            and target_type == "selected_enemy"
    elif operation_type == "apply_poison":
        params = _expect_exact_fields(operation["params"], {"stacks"}, f"{context}:operation:params")
        stacks = _expect_integer(params["stacks"], f"{context}:operation:params:stacks", 1)
        if stacks > POISON_MAX_STACKS:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_POISON_STACKS_INVALID:{effect_id}")
        valid_target = trigger_event == "item_ready" \
            and conditions == [{"type": "always", "params": {}}] \
            and target_type == "selected_enemy"
    else:
        params = _expect_exact_fields(operation["params"], {"status", "ticks"}, f"{context}:operation:params")
        if params["status"] not in ITEM_STATUSES:
            raise ExportError(f"EXECUTABLE_ITEM_EFFECT_STATUS_INVALID:{effect_id}")
        _expect_integer(params["ticks"], f"{context}:operation:params:ticks", 1)
        valid_target = target_type in {"self_item", "first_enemy_item"}
    if not valid_target:
        raise ExportError(f"EXECUTABLE_ITEM_EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
    return effect_id, trigger_event


def _validate_executable_damage_aura(value: Any, context: str) -> str:
    aura = _expect_exact_fields(value, {
        "auraId", "priority", "target", "operation",
    }, context)
    aura_id = _expect_stable_id(aura["auraId"], f"{context}:auraId")
    _expect_integer(aura["priority"], f"{context}:priority", 0)
    target = _expect_exact_fields(aura["target"], {"type", "params"}, f"{context}:target")
    if target["type"] != DAMAGE_AURA_TARGET:
        raise ExportError(f"EXECUTABLE_DAMAGE_AURA_TARGET_INVALID:{aura_id}")
    target_params = _expect_exact_fields(
        target["params"], {"tags", "excludeSelf"}, f"{context}:target:params"
    )
    _expect_canonical_item_tags(target_params["tags"], f"{context}:target:params:tags")
    if target_params["excludeSelf"] is not True:
        raise ExportError(f"EXECUTABLE_DAMAGE_AURA_EXCLUDE_SELF_INVALID:{aura_id}")
    operation = _expect_exact_fields(
        aura["operation"], {"type", "params"}, f"{context}:operation"
    )
    if operation["type"] != DAMAGE_AURA_OPERATION:
        raise ExportError(f"EXECUTABLE_DAMAGE_AURA_OPERATION_INVALID:{aura_id}")
    params = _expect_exact_fields(operation["params"], {"amount"}, f"{context}:operation:params")
    amount = _expect_integer(params["amount"], f"{context}:operation:params:amount", 1)
    if amount > CRIT_DAMAGE_AMOUNT_MAX:
        raise ExportError(f"EXECUTABLE_DAMAGE_AURA_AMOUNT_INVALID:{aura_id}")
    return aura_id


def _validate_executable_hero_skill_effect(value: Any, context: str) -> str:
    effect = _expect_exact_fields(value, {
        "effectId", "targetType", "operationType", "amount", "ticks",
    }, context)
    effect_id = _expect_stable_id(effect["effectId"], f"{context}:effectId")
    target_type = effect["targetType"]
    operation_type = effect["operationType"]
    if target_type not in HERO_SKILL_TARGETS:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_TARGET_INVALID:{effect_id}")
    if operation_type not in HERO_SKILL_OPERATIONS:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_OPERATION_INVALID:{effect_id}")
    amount = _expect_integer(effect["amount"], f"{context}:amount", 0)
    ticks = _expect_integer(effect["ticks"], f"{context}:ticks", 0)
    if operation_type == "deal_damage":
        valid = target_type == "opponent_hero" and amount > 0 and ticks == 0
    elif operation_type == "charge":
        valid = target_type == "source_item" and amount == 0 and ticks > 0
    else:
        valid = target_type == "owner_hero" and amount > 0 and ticks == 0
    if not valid:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_EFFECT_PARAMS_INVALID:{effect_id}")
    return effect_id


def _validate_executable_hero_skill_instance(
    value: Any,
    context: str,
    hero_id: str,
    hero_skills: dict[str, dict[str, Any]],
    expected_source_type: str,
    expected_source_id: str,
    expected_day: int,
) -> dict[str, Any]:
    instance = _expect_exact_fields(value, {
        "instanceId", "heroSkillId", "quality", "sourceType", "sourceId",
        "acquiredDay", "acquiredSeq",
    }, context)
    _expect_stable_id(instance["instanceId"], f"{context}:instanceId")
    hero_skill_id = _expect_stable_id(instance["heroSkillId"], f"{context}:heroSkillId")
    skill = hero_skills.get(hero_skill_id)
    if skill is None:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_INSTANCE_UNKNOWN:{hero_skill_id}")
    if skill["heroId"] != hero_id:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_INSTANCE_OWNER_MISMATCH:{hero_skill_id}")
    if instance["quality"] not in skill["qualityProfiles"]:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_INSTANCE_QUALITY_INVALID:{hero_skill_id}")
    if instance["sourceType"] != expected_source_type \
            or instance["sourceId"] != expected_source_id:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_INSTANCE_SOURCE_INVALID:{instance['instanceId']}")
    if _expect_integer(instance["acquiredDay"], f"{context}:acquiredDay", 1) != expected_day:
        raise ExportError(f"EXECUTABLE_HERO_SKILL_INSTANCE_DAY_INVALID:{instance['instanceId']}")
    _expect_integer(instance["acquiredSeq"], f"{context}:acquiredSeq", 1)
    return instance


def _directory(records: list[Any], id_field: str, fields: set[str], context: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for index, value in enumerate(records):
        record = _expect_exact_fields(value, fields, f"{context}:{index}")
        stable_id = _expect_stable_id(record.get(id_field), f"{context}:{index}:{id_field}")
        if stable_id in result:
            raise ExportError(f"EXECUTABLE_ID_DUPLICATE:{context}:{stable_id}")
        result[stable_id] = record
    return result


def _validate_combat_build(
    value: Any,
    context: str,
    item_profiles: set[tuple[str, str]],
    item_widths: dict[str, int],
    enchantment_profiles: set[tuple[str, str, str]],
    hero_skills: dict[str, dict[str, Any]] | None = None,
    expected_source_id: str = "",
    expected_day: int = 0,
) -> None:
    fields = {"hero", "board", "itemInstances"}
    if hero_skills is not None:
        fields.add("heroSkills")
    build = _expect_exact_fields(value, fields, context)
    if hero_skills is None:
        hero = _expect_exact_fields(build["hero"], {"hp", "maxHp"}, f"{context}:hero")
    else:
        hero = _expect_exact_fields(
            build["hero"], {"heroId", "level", "hp", "maxHp"}, f"{context}:hero"
        )
        hero_id = _expect_stable_id(hero["heroId"], f"{context}:hero:heroId")
        owned_hero_skill_ids = {
            skill_id for skill_id, skill in hero_skills.items() if skill["heroId"] == hero_id
        }
        if not owned_hero_skill_ids:
            raise ExportError(f"EXECUTABLE_COMBAT_BUILD_HERO_UNKNOWN:{context}:{hero_id}")
        _expect_integer(hero["level"], f"{context}:hero:level", 1)
        skill_instances = _expect_list(build["heroSkills"], f"{context}:heroSkills")
        expected_quality = (
            "bronze" if expected_day <= 3 else "silver" if expected_day <= 6
            else "gold" if expected_day <= 9 else "diamond"
        )
        instance_ids: set[str] = set()
        skill_ids: set[str] = set()
        sequences: list[int] = []
        for index, instance_value in enumerate(skill_instances):
            instance = _validate_executable_hero_skill_instance(
                instance_value, f"{context}:heroSkills:{index}", hero_id, hero_skills,
                "offline_snapshot", expected_source_id, expected_day,
            )
            if instance["quality"] != expected_quality:
                raise ExportError(
                    f"EXECUTABLE_COMBAT_BUILD_HERO_SKILL_QUALITY_INVALID:{context}:{instance['instanceId']}"
                )
            if instance["instanceId"] in instance_ids or instance["heroSkillId"] in skill_ids:
                raise ExportError(f"EXECUTABLE_COMBAT_BUILD_HERO_SKILL_DUPLICATE:{context}")
            instance_ids.add(instance["instanceId"])
            skill_ids.add(instance["heroSkillId"])
            sequences.append(instance["acquiredSeq"])
        if not skill_ids or not skill_ids.issubset(owned_hero_skill_ids) \
                or sequences != list(range(1, len(sequences) + 1)):
            raise ExportError(f"EXECUTABLE_COMBAT_BUILD_HERO_SKILLS_INVALID:{context}:{hero_id}")
    hp = _expect_integer(hero["hp"], f"{context}:hero:hp", 1)
    max_hp = _expect_integer(hero["maxHp"], f"{context}:hero:maxHp", 1)
    if hp > max_hp:
        raise ExportError(f"EXECUTABLE_COMBAT_BUILD_HERO_HP_INVALID:{context}")
    instances = _directory(
        _expect_list(build["itemInstances"], f"{context}:itemInstances"),
        "instanceId",
        {"instanceId", "itemId", "quality", "enchantment"},
        f"{context}:itemInstances",
    )
    if not instances:
        raise ExportError(f"EXECUTABLE_COMBAT_BUILD_ITEMS_REQUIRED:{context}")
    for instance_id, instance in instances.items():
        item_id = _expect_stable_id(instance["itemId"], f"{context}:itemInstances:{instance_id}:itemId")
        quality = instance["quality"]
        if (item_id, quality) not in item_profiles:
            raise ExportError(f"EXECUTABLE_COMBAT_BUILD_ITEM_PROFILE_INVALID:{context}:{instance_id}")
        enchantment = instance["enchantment"]
        if not isinstance(enchantment, str) or (
            enchantment != "" and (enchantment, item_id, quality) not in enchantment_profiles
        ):
            raise ExportError(f"EXECUTABLE_COMBAT_BUILD_ENCHANTMENT_INVALID:{context}:{instance_id}")
    board = _expect_exact_fields(build["board"], {"placements"}, f"{context}:board")
    placements = _expect_list(board["placements"], f"{context}:board:placements")
    if len(placements) != len(instances):
        raise ExportError(f"EXECUTABLE_COMBAT_BUILD_PLACEMENT_COVERAGE_INVALID:{context}")
    occupied: set[int] = set()
    placed: set[str] = set()
    for index, value in enumerate(placements):
        placement = _expect_exact_fields(
            value, {"instanceId", "itemId", "startSlot"}, f"{context}:board:placements:{index}"
        )
        instance_id = _expect_stable_id(
            placement["instanceId"], f"{context}:board:placements:{index}:instanceId"
        )
        if instance_id not in instances or instance_id in placed \
                or placement["itemId"] != instances[instance_id]["itemId"]:
            raise ExportError(f"EXECUTABLE_COMBAT_BUILD_PLACEMENT_REFERENCE_INVALID:{context}:{instance_id}")
        placed.add(instance_id)
        start_slot = _expect_integer(
            placement["startSlot"], f"{context}:board:placements:{index}:startSlot", 0
        )
        width = item_widths[instances[instance_id]["itemId"]]
        slots = set(range(start_slot, start_slot + width))
        if start_slot + width > 10 or occupied.intersection(slots):
            raise ExportError(f"EXECUTABLE_COMBAT_BUILD_PLACEMENT_INVALID:{context}:{instance_id}")
        occupied.update(slots)
    if placed != set(instances):
        raise ExportError(f"EXECUTABLE_COMBAT_BUILD_PLACEMENT_COVERAGE_INVALID:{context}")


def validate_package(package: Any) -> None:
    """Validate the formal v32/v30 candidate package without accepting partial data."""
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
    item_widths: dict[str, int] = {}
    item_effect_ids: set[str] = set()
    item_effect_events: dict[str, str] = {}
    item_aura_ids: set[str] = set()
    for item_index, item_value in enumerate(items):
        item = _expect_exact_fields(item_value, {
            "itemId", "tags", "slotWidth", "baseQuality", "qualityProfiles",
        }, f"items:{item_index}")
        item_id = _expect_stable_id(item["itemId"], f"items:{item_index}:itemId")
        if item_id in item_widths:
            raise ExportError(f"EXECUTABLE_ITEM_ID_DUPLICATE:{item_id}")
        _expect_canonical_item_tags(item["tags"], f"items:{item_id}:tags")
        item_widths[item_id] = _expect_integer(item["slotWidth"], f"items:{item_id}:slotWidth", 1)
        if item_widths[item_id] > 3:
            raise ExportError(f"EXECUTABLE_ITEM_SLOT_WIDTH_INVALID:{item_id}")
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
                "buyPrice", "sellPrice", "baseCooldownTicks", "critChanceBps", "ammo",
                "effects", "auras",
            }, f"items:{item_id}:{quality}")
            _expect_integer(profile["buyPrice"], f"items:{item_id}:{quality}:buyPrice", 1)
            _expect_integer(profile["sellPrice"], f"items:{item_id}:{quality}:sellPrice", 0)
            _expect_integer(profile["baseCooldownTicks"], f"items:{item_id}:{quality}:baseCooldownTicks", 1)
            crit_chance_bps = _expect_integer(
                profile["critChanceBps"], f"items:{item_id}:{quality}:critChanceBps", 0
            )
            if crit_chance_bps > CRIT_CHANCE_SCALE_BPS:
                raise ExportError(f"EXECUTABLE_ITEM_CRIT_CHANCE_INVALID:{item_id}:{quality}")
            ammo = _expect_exact_fields(profile["ammo"], {
                "enabled", "initial", "maximum",
            }, f"items:{item_id}:{quality}:ammo")
            if not isinstance(ammo["enabled"], bool):
                raise ExportError(f"EXECUTABLE_ITEM_AMMO_ENABLED_INVALID:{item_id}:{quality}")
            ammo_initial = _expect_integer(
                ammo["initial"], f"items:{item_id}:{quality}:ammo.initial", 0
            )
            ammo_maximum = _expect_integer(
                ammo["maximum"], f"items:{item_id}:{quality}:ammo.maximum", 0
            )
            if ammo["enabled"] and (ammo_maximum <= 0 or ammo_initial > ammo_maximum):
                raise ExportError(f"EXECUTABLE_ITEM_AMMO_RANGE_INVALID:{item_id}:{quality}")
            if not ammo["enabled"] and (ammo_initial != 0 or ammo_maximum != 0):
                raise ExportError(f"EXECUTABLE_ITEM_AMMO_DISABLED_INVALID:{item_id}:{quality}")
            item_profiles.add((item_id, quality))
            item_profile_values[(item_id, quality)] = profile
            profile_events: set[str] = set()
            for effect_index, effect in enumerate(_expect_list(profile.get("effects"), f"items:{item_id}:{quality}:effects")):
                effect_id, trigger_event = _validate_executable_item_effect(
                    effect, f"items:{item_id}:{quality}:effects:{effect_index}"
                )
                if effect_id in item_effect_ids:
                    raise ExportError(f"EXECUTABLE_EFFECT_ID_DUPLICATE:{effect_id}")
                item_effect_ids.add(effect_id)
                item_effect_events[effect_id] = trigger_event
                profile_events.add(trigger_event)
            for aura_index, aura in enumerate(
                _expect_list(profile.get("auras"), f"items:{item_id}:{quality}:auras")
            ):
                aura_id = _validate_executable_damage_aura(
                    aura, f"items:{item_id}:{quality}:auras:{aura_index}"
                )
                if aura_id in item_aura_ids:
                    raise ExportError(f"EXECUTABLE_DAMAGE_AURA_ID_DUPLICATE:{aura_id}")
                item_aura_ids.add(aura_id)
            damage_effects = [
                effect for effect in profile["effects"]
                if effect.get("operation", {}).get("type") == "deal_damage"
            ]
            crit_effects = [
                effect for effect in damage_effects
                if effect.get("operation", {}).get("params", {}).get("canCrit") is True
            ]
            if len(crit_effects) > 1 \
                    or (crit_chance_bps > 0 and len(crit_effects) != 1) \
                    or (crit_effects and len(damage_effects) != 1):
                raise ExportError(f"EXECUTABLE_ITEM_CRIT_PROFILE_MISMATCH:{item_id}:{quality}")
            poison_effects = [
                effect for effect in profile["effects"]
                if effect.get("operation", {}).get("type") == "apply_poison"
            ]
            if poison_effects and (len(poison_effects) != 1 \
                    or len(profile["effects"]) != 1 or crit_chance_bps != 0):
                raise ExportError(f"EXECUTABLE_ITEM_POISON_PROFILE_MISMATCH:{item_id}:{quality}")
            ammo_depletion_effects = [
                effect for effect in profile["effects"]
                if effect.get("trigger", {}).get("conditions")
                and effect["trigger"]["conditions"][0].get("type") == "source_item_ammo_depleted"
            ]
            if ammo_depletion_effects and (
                len(ammo_depletion_effects) != 1 or ammo["enabled"] is not True
            ):
                raise ExportError(
                    f"EXECUTABLE_ITEM_AMMO_DEPLETION_PROFILE_MISMATCH:{item_id}:{quality}"
                )
            if "item_ready" not in profile_events:
                raise ExportError(f"EXECUTABLE_ITEM_READY_EFFECT_REQUIRED:{item_id}:{quality}")
            if any(
                effect.get("operation", {}).get("type") == "gain_damage_for_fight"
                for effect in profile["effects"]
            ) and not any(
                effect.get("trigger", {}).get("event") == "item_ready"
                and effect.get("operation", {}).get("type") == "deal_damage"
                for effect in profile["effects"]
            ):
                raise ExportError(
                    f"EXECUTABLE_ITEM_DAMAGE_GROWTH_ACTIVE_DAMAGE_REQUIRED:{item_id}:{quality}"
                )

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
        "terminalPressure", "critRules", "burnRules", "poisonRules",
        "healStatusCleanseRules", "damageAuraRules", "ammoDepletionRules",
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
    crit_rules = _expect_exact_fields(battle_rules["critRules"], {
        "contractId", "chanceScaleBps", "damageMultiplierBps", "roundingMode",
        "rollScope", "drawPolicy", "growthStackingPolicy", "growthCapPolicy",
        "growthTimingPolicy", "growthEligibleTargetPolicy", "growthRngPolicy",
        "successResponseEvidencePolicy", "successResponseSourcePolicy",
        "successResponseTimingPolicy", "successResponseRepeatPolicy",
        "successResponseTerminalPolicy", "successResponseRngPolicy",
    }, "battleRules:critRules")
    damage_multiplier_bps = _expect_integer(
        crit_rules["damageMultiplierBps"], "battleRules:critRules:damageMultiplierBps",
        CRIT_CHANCE_SCALE_BPS + 1,
    )
    if damage_multiplier_bps > CRIT_DAMAGE_MULTIPLIER_MAX_BPS \
            or crit_rules["contractId"] != CRIT_CONTRACT \
            or crit_rules["chanceScaleBps"] != CRIT_CHANCE_SCALE_BPS \
            or crit_rules["roundingMode"] != CRIT_ROUNDING_MODE \
            or crit_rules["rollScope"] != CRIT_ROLL_SCOPE \
            or crit_rules["drawPolicy"] != CRIT_DRAW_POLICY \
            or crit_rules["growthStackingPolicy"] != CRIT_GROWTH_STACKING_POLICY \
            or crit_rules["growthCapPolicy"] != CRIT_GROWTH_CAP_POLICY \
            or crit_rules["growthTimingPolicy"] != CRIT_GROWTH_TIMING_POLICY \
            or crit_rules["growthEligibleTargetPolicy"] != CRIT_GROWTH_ELIGIBLE_TARGET_POLICY \
            or crit_rules["growthRngPolicy"] != CRIT_GROWTH_RNG_POLICY \
            or crit_rules["successResponseEvidencePolicy"] \
                != CRIT_SUCCESS_RESPONSE_EVIDENCE_POLICY \
            or crit_rules["successResponseSourcePolicy"] != CRIT_SUCCESS_RESPONSE_SOURCE_POLICY \
            or crit_rules["successResponseTimingPolicy"] != CRIT_SUCCESS_RESPONSE_TIMING_POLICY \
            or crit_rules["successResponseRepeatPolicy"] != CRIT_SUCCESS_RESPONSE_REPEAT_POLICY \
            or crit_rules["successResponseTerminalPolicy"] != CRIT_SUCCESS_RESPONSE_TERMINAL_POLICY \
            or crit_rules["successResponseRngPolicy"] != CRIT_SUCCESS_RESPONSE_RNG_POLICY:
        raise ExportError("EXECUTABLE_CRIT_RULES_INVALID")
    burn_rules = _expect_exact_fields(battle_rules["burnRules"], {
        "contractId", "pulseIntervalTicks", "firstPulsePolicy", "pulsePhase",
        "damagePerStack", "decayStacksPerPulse", "shieldPolicy", "resolutionOrder",
        "maxStacks", "stackOverflowPolicy",
    }, "battleRules:burnRules")
    for field in [
        "pulseIntervalTicks", "damagePerStack", "decayStacksPerPulse", "maxStacks",
    ]:
        _expect_integer(burn_rules[field], f"battleRules:burnRules:{field}", 1)
    if burn_rules != {
        "contractId": BURN_CONTRACT,
        "pulseIntervalTicks": BURN_PULSE_INTERVAL_TICKS,
        "firstPulsePolicy": BURN_FIRST_PULSE_POLICY,
        "pulsePhase": BURN_PULSE_PHASE,
        "damagePerStack": BURN_DAMAGE_PER_STACK,
        "decayStacksPerPulse": BURN_DECAY_STACKS_PER_PULSE,
        "shieldPolicy": BURN_SHIELD_POLICY,
        "resolutionOrder": BURN_RESOLUTION_ORDER,
        "maxStacks": BURN_MAX_STACKS,
        "stackOverflowPolicy": BURN_STACK_OVERFLOW_POLICY,
    }:
        raise ExportError("EXECUTABLE_BURN_RULES_INVALID")
    poison_rules = _expect_exact_fields(battle_rules["poisonRules"], {
        "contractId", "pulseIntervalTicks", "firstPulsePolicy", "reapplySchedulePolicy",
        "pulsePhase", "damagePerStack", "decayStacksPerPulse", "shieldPolicy",
        "resolutionOrder", "healCleansePolicy", "critPolicy", "maxStacks",
        "stackOverflowPolicy",
    }, "battleRules:poisonRules")
    for field, minimum in [
        ("pulseIntervalTicks", 1), ("damagePerStack", 1),
        ("decayStacksPerPulse", 0), ("maxStacks", 1),
    ]:
        _expect_integer(poison_rules[field], f"battleRules:poisonRules:{field}", minimum)
    if poison_rules != {
        "contractId": POISON_CONTRACT,
        "pulseIntervalTicks": POISON_PULSE_INTERVAL_TICKS,
        "firstPulsePolicy": POISON_FIRST_PULSE_POLICY,
        "reapplySchedulePolicy": POISON_REAPPLY_SCHEDULE_POLICY,
        "pulsePhase": POISON_PULSE_PHASE,
        "damagePerStack": POISON_DAMAGE_PER_STACK,
        "decayStacksPerPulse": POISON_DECAY_STACKS_PER_PULSE,
        "shieldPolicy": POISON_SHIELD_POLICY,
        "resolutionOrder": POISON_RESOLUTION_ORDER,
        "healCleansePolicy": POISON_HEAL_CLEANSE_POLICY,
        "critPolicy": POISON_CRIT_POLICY,
        "maxStacks": POISON_MAX_STACKS,
        "stackOverflowPolicy": POISON_STACK_OVERFLOW_POLICY,
    }:
        raise ExportError("EXECUTABLE_POISON_RULES_INVALID")
    heal_status_cleanse_rules = _expect_exact_fields(battle_rules["healStatusCleanseRules"], {
        "contractId", "triggerPolicy", "healBasis", "cleanseScaleBps", "roundingMode",
        "statusTargets", "statusResolutionPolicy", "poisonSchedulePolicy",
        "traceEmitPolicy", "critPolicy", "rngPolicy",
    }, "battleRules:healStatusCleanseRules")
    _expect_integer(
        heal_status_cleanse_rules["cleanseScaleBps"],
        "battleRules:healStatusCleanseRules:cleanseScaleBps",
        1,
    )
    _expect_list(
        heal_status_cleanse_rules["statusTargets"],
        "battleRules:healStatusCleanseRules:statusTargets",
    )
    if heal_status_cleanse_rules != {
        "contractId": HEAL_STATUS_CLEANSE_CONTRACT,
        "triggerPolicy": HEAL_STATUS_CLEANSE_TRIGGER_POLICY,
        "healBasis": HEAL_STATUS_CLEANSE_HEAL_BASIS,
        "cleanseScaleBps": HEAL_STATUS_CLEANSE_SCALE_BPS,
        "roundingMode": HEAL_STATUS_CLEANSE_ROUNDING_MODE,
        "statusTargets": HEAL_STATUS_CLEANSE_STATUS_TARGETS,
        "statusResolutionPolicy": HEAL_STATUS_CLEANSE_STATUS_RESOLUTION_POLICY,
        "poisonSchedulePolicy": HEAL_STATUS_CLEANSE_POISON_SCHEDULE_POLICY,
        "traceEmitPolicy": HEAL_STATUS_CLEANSE_TRACE_EMIT_POLICY,
        "critPolicy": HEAL_STATUS_CLEANSE_CRIT_POLICY,
        "rngPolicy": HEAL_STATUS_CLEANSE_RNG_POLICY,
    }:
        raise ExportError("EXECUTABLE_HEAL_STATUS_CLEANSE_RULES_INVALID")
    damage_aura_rules = _expect_exact_fields(battle_rules["damageAuraRules"], {
        "contractId", "evaluationPolicy", "targetSnapshotPolicy", "targetOrder",
        "stackingPolicy", "damagePhase", "sourceLifecyclePolicy", "overflowPolicy",
        "rngPolicy",
    }, "battleRules:damageAuraRules")
    if damage_aura_rules != {
        "contractId": DAMAGE_AURA_CONTRACT,
        "evaluationPolicy": DAMAGE_AURA_EVALUATION_POLICY,
        "targetSnapshotPolicy": DAMAGE_AURA_TARGET_SNAPSHOT_POLICY,
        "targetOrder": DAMAGE_AURA_TARGET_ORDER,
        "stackingPolicy": DAMAGE_AURA_STACKING_POLICY,
        "damagePhase": DAMAGE_AURA_DAMAGE_PHASE,
        "sourceLifecyclePolicy": DAMAGE_AURA_SOURCE_LIFECYCLE_POLICY,
        "overflowPolicy": DAMAGE_AURA_OVERFLOW_POLICY,
        "rngPolicy": DAMAGE_AURA_RNG_POLICY,
    }:
        raise ExportError("EXECUTABLE_DAMAGE_AURA_RULES_INVALID")
    ammo_depletion_rules = _expect_exact_fields(battle_rules["ammoDepletionRules"], {
        "contractId", "triggerPolicy", "evaluationPhase", "snapshotPolicy",
        "repeatPolicy", "nonAmmoPolicy", "reloadPolicy", "rngPolicy",
    }, "battleRules:ammoDepletionRules")
    if ammo_depletion_rules != {
        "contractId": AMMO_DEPLETION_CONTRACT,
        "triggerPolicy": AMMO_DEPLETION_TRIGGER_POLICY,
        "evaluationPhase": AMMO_DEPLETION_EVALUATION_PHASE,
        "snapshotPolicy": AMMO_DEPLETION_SNAPSHOT_POLICY,
        "repeatPolicy": AMMO_DEPLETION_REPEAT_POLICY,
        "nonAmmoPolicy": AMMO_DEPLETION_NON_AMMO_POLICY,
        "reloadPolicy": AMMO_DEPLETION_RELOAD_POLICY,
        "rngPolicy": AMMO_DEPLETION_RNG_POLICY,
    }:
        raise ExportError("EXECUTABLE_AMMO_DEPLETION_RULES_INVALID")

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
        "schema", "schemaVersion", "heroes", "itemSkills", "heroSkills",
        "heroSkillTrainers", "heroSkillOffers", "stalls", "events", "eventOptions",
        "rewards", "upgrades", "enchantments",
    }, "executableCatalogs")
    if catalogs["schema"] != EXECUTABLE_CATALOGS_SCHEMA \
            or catalogs["schemaVersion"] != EXECUTABLE_CATALOGS_SCHEMA_VERSION:
        raise ExportError("EXECUTABLE_CATALOG_IDENTITY_INVALID")

    item_skills = _directory(
        _expect_list(catalogs["itemSkills"], "catalogs:itemSkills"), "itemSkillId", {
            "itemSkillId", "triggerEvents", "effectIds", "auraIds",
        }, "itemSkills"
    )
    referenced_effects: set[str] = set()
    referenced_auras: set[str] = set()
    for item_skill_id, skill in item_skills.items():
        trigger_events = _expect_list(skill["triggerEvents"], f"itemSkills:{item_skill_id}:triggerEvents")
        if not trigger_events or trigger_events != sorted(trigger_events) \
                or len(trigger_events) != len(set(trigger_events)) \
                or any(event not in ITEM_EFFECT_TRIGGERS for event in trigger_events):
            raise ExportError(f"EXECUTABLE_ITEM_SKILL_TRIGGER_INVALID:{item_skill_id}")
        effect_ids = [
            _expect_stable_id(effect_id, f"itemSkills:{item_skill_id}:effectIds")
            for effect_id in _expect_list(skill["effectIds"], f"itemSkills:{item_skill_id}:effectIds")
        ]
        if not effect_ids or len(effect_ids) != len(set(effect_ids)) or any(effect_id not in item_effect_ids for effect_id in effect_ids):
            raise ExportError(f"EXECUTABLE_ITEM_SKILL_EFFECT_REFERENCE_INVALID:{item_skill_id}")
        if referenced_effects.intersection(effect_ids):
            raise ExportError(f"EXECUTABLE_ITEM_SKILL_EFFECT_OWNERSHIP_INVALID:{item_skill_id}")
        if set(trigger_events) != {item_effect_events[effect_id] for effect_id in effect_ids}:
            raise ExportError(f"EXECUTABLE_ITEM_SKILL_TRIGGER_COVERAGE_INVALID:{item_skill_id}")
        referenced_effects.update(effect_ids)
        aura_ids = [
            _expect_stable_id(aura_id, f"itemSkills:{item_skill_id}:auraIds")
            for aura_id in _expect_list(
                skill["auraIds"], f"itemSkills:{item_skill_id}:auraIds"
            )
        ]
        if len(aura_ids) != len(set(aura_ids)) \
                or any(aura_id not in item_aura_ids for aura_id in aura_ids):
            raise ExportError(f"EXECUTABLE_ITEM_SKILL_AURA_REFERENCE_INVALID:{item_skill_id}")
        if referenced_auras.intersection(aura_ids):
            raise ExportError(f"EXECUTABLE_ITEM_SKILL_AURA_OWNERSHIP_INVALID:{item_skill_id}")
        referenced_auras.update(aura_ids)
    if referenced_effects != item_effect_ids:
        raise ExportError("EXECUTABLE_ITEM_SKILL_EFFECT_COVERAGE_INVALID")
    if referenced_auras != item_aura_ids:
        raise ExportError("EXECUTABLE_ITEM_SKILL_AURA_COVERAGE_INVALID")

    hero_skills = _directory(
        _expect_list(catalogs["heroSkills"], "catalogs:heroSkills"), "heroSkillId", {
            "heroSkillId", "heroId", "priority", "triggerEvent", "reentrant",
            "qualityProfiles",
        }, "heroSkills"
    )
    if not hero_skills or set(item_skills).intersection(hero_skills):
        raise ExportError("EXECUTABLE_HERO_SKILL_CATALOG_INVALID")
    hero_effect_ids: set[str] = set()
    priorities: set[int] = set()
    for hero_skill_id, skill in hero_skills.items():
        _expect_stable_id(skill["heroId"], f"heroSkills:{hero_skill_id}:heroId")
        priority = _expect_integer(skill["priority"], f"heroSkills:{hero_skill_id}:priority", 0)
        if priority in priorities:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_PRIORITY_DUPLICATE:{priority}")
        priorities.add(priority)
        if skill["triggerEvent"] != HERO_SKILL_TRIGGER or skill["reentrant"] is not False:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_TRIGGER_INVALID:{hero_skill_id}")
        profiles = skill["qualityProfiles"]
        if not isinstance(profiles, dict) or set(profiles) != set(QUALITIES):
            raise ExportError(f"EXECUTABLE_HERO_SKILL_QUALITY_COVERAGE_INVALID:{hero_skill_id}")
        for quality, profile_value in profiles.items():
            profile = _expect_exact_fields(profile_value, {
                "maxTriggersPerBattle", "effects",
            }, f"heroSkills:{hero_skill_id}:{quality}")
            _expect_integer(
                profile["maxTriggersPerBattle"],
                f"heroSkills:{hero_skill_id}:{quality}:maxTriggersPerBattle", 1,
            )
            effects = _expect_list(profile["effects"], f"heroSkills:{hero_skill_id}:{quality}:effects")
            if len(effects) != 1:
                raise ExportError(f"EXECUTABLE_HERO_SKILL_EFFECT_COUNT_INVALID:{hero_skill_id}:{quality}")
            effect_id = _validate_executable_hero_skill_effect(
                effects[0], f"heroSkills:{hero_skill_id}:{quality}:effects:0"
            )
            if effect_id in hero_effect_ids or effect_id in item_effect_ids:
                raise ExportError(f"EXECUTABLE_HERO_SKILL_EFFECT_ID_DUPLICATE:{effect_id}")
            hero_effect_ids.add(effect_id)

    heroes = _directory(_expect_list(catalogs["heroes"], "catalogs:heroes"), "heroId", {
        "heroId", "heroSkillIds", "startingHeroSkills",
    }, "heroes")
    starting_skill_ids_by_hero: dict[str, set[str]] = {}
    for hero_id, hero in heroes.items():
        hero_skill_ids = [
            _expect_stable_id(skill_id, f"heroes:{hero_id}:heroSkillIds")
            for skill_id in _expect_list(hero["heroSkillIds"], f"heroes:{hero_id}:heroSkillIds")
        ]
        expected_skill_ids = sorted(
            skill_id for skill_id, skill in hero_skills.items() if skill["heroId"] == hero_id
        )
        if hero_skill_ids != expected_skill_ids:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_REFERENCE_INVALID:{hero_id}")
        starting = _expect_list(hero["startingHeroSkills"], f"heroes:{hero_id}:startingHeroSkills")
        starting_ids: set[str] = set()
        starting_skill_ids: set[str] = set()
        starting_sequences: list[int] = []
        for index, instance_value in enumerate(starting):
            instance = _validate_executable_hero_skill_instance(
                instance_value, f"heroes:{hero_id}:startingHeroSkills:{index}", hero_id,
                hero_skills, "starting_loadout", hero_id, 1,
            )
            if instance["quality"] != "bronze" \
                    or instance["instanceId"] in starting_ids \
                    or instance["heroSkillId"] in starting_skill_ids:
                raise ExportError(f"EXECUTABLE_HERO_STARTING_SKILLS_INVALID:{hero_id}")
            starting_ids.add(instance["instanceId"])
            starting_skill_ids.add(instance["heroSkillId"])
            starting_sequences.append(instance["acquiredSeq"])
        if not starting_skill_ids or not starting_skill_ids.issubset(set(hero_skill_ids)) \
                or starting_sequences != list(range(1, len(starting) + 1)):
            raise ExportError(f"EXECUTABLE_HERO_STARTING_SKILLS_INVALID:{hero_id}")
        starting_skill_ids_by_hero[hero_id] = starting_skill_ids
    new_run = _expect_exact_fields(bundle["newRunTemplate"], {
        "schemaVersion", "stateVersion", "phase", "day", "hour", "activeNode", "seed",
        "hero", "economy", "run", "board", "stash", "itemInstances", "shop", "battle",
        "levelRewards",
    }, "newRunTemplate")
    if new_run.get("schemaVersion") != NEW_RUN_SCHEMA_VERSION \
            or new_run.get("stateVersion") != 0 \
            or new_run.get("phase") != "schedule":
        raise ExportError("EXECUTABLE_NEW_RUN_INVALID")
    new_run_hero = _expect_exact_fields(new_run["hero"], {
        "heroId", "level", "experience", "prestige", "maxHp",
    }, "newRunTemplate:hero")
    active_node = _expect_exact_fields(new_run["activeNode"], {
        "nodeId", "kind", "rewardId",
    }, "newRunTemplate:activeNode")
    if new_run_hero.get("heroId") not in heroes:
        raise ExportError("EXECUTABLE_NEW_RUN_HERO_REFERENCE_INVALID")
    new_run_prestige = _expect_integer(
        new_run_hero["prestige"], "newRunTemplate:hero:prestige", 1
    )
    if active_node != {"nodeId": "", "kind": "", "rewardId": ""}:
        raise ExportError("EXECUTABLE_NEW_RUN_ACTIVE_NODE_INVALID")
    level_rewards = _expect_exact_fields(new_run["levelRewards"], {
        "pendingMilestoneIds", "resolved",
    }, "newRunTemplate:levelRewards")
    if level_rewards["pendingMilestoneIds"] != [] or level_rewards["resolved"] != []:
        raise ExportError("EXECUTABLE_NEW_RUN_LEVEL_REWARDS_INVALID")
    new_run_state = _expect_exact_fields(new_run["run"], {
        "wins", "losses", "lastChance", "terminal",
    }, "newRunTemplate:run")
    if _expect_integer(new_run_state["wins"], "newRunTemplate:run:wins", 0) != 0 \
            or _expect_integer(new_run_state["losses"], "newRunTemplate:run:losses", 0) != 0:
        raise ExportError("EXECUTABLE_NEW_RUN_RECORD_INVALID")
    new_run_last_chance = _expect_exact_fields(new_run_state["lastChance"], {
        "status", "policyId", "optionIds", "selectedOptionId",
    }, "newRunTemplate:run:lastChance")
    if new_run_last_chance != {
        "status": "available", "policyId": "", "optionIds": [], "selectedOptionId": "",
    }:
        raise ExportError("EXECUTABLE_NEW_RUN_LAST_CHANCE_INVALID")
    new_run_terminal = _expect_exact_fields(new_run_state["terminal"], {
        "ended", "victory", "reason",
    }, "newRunTemplate:run:terminal")
    if new_run_terminal != {"ended": False, "victory": False, "reason": ""}:
        raise ExportError("EXECUTABLE_NEW_RUN_TERMINAL_INVALID")

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
    if generation["schema"] != GENERATION_SCHEMA \
            or generation["schemaVersion"] != GENERATION_SCHEMA_VERSION \
            or generation["algorithmId"] != GENERATION_ALGORITHM:
        raise ExportError("EXECUTABLE_GENERATION_IDENTITY_INVALID")
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

    hero_skill_trainers = _directory(
        _expect_list(catalogs["heroSkillTrainers"], "catalogs:heroSkillTrainers"),
        "trainerId",
        {"trainerId", "heroId", "stallId", "offerSlots", "offerIds"},
        "heroSkillTrainers",
    )
    hero_skill_offers = _directory(
        _expect_list(catalogs["heroSkillOffers"], "catalogs:heroSkillOffers"),
        "offerId",
        {
            "offerId", "trainerId", "heroSkillId", "action", "price",
            "availability", "order",
        },
        "heroSkillOffers",
    )
    if not hero_skill_trainers or not hero_skill_offers \
            or set(hero_skill_trainers).intersection(set(hero_skills) | set(item_skills) | set(stalls)) \
            or set(hero_skill_offers).intersection(
                set(shop_templates) | set(hero_skill_trainers) | set(hero_skills) | set(item_skills)
            ):
        raise ExportError("EXECUTABLE_HERO_SKILL_TRAINING_CATALOG_INVALID")
    offers_by_trainer: dict[str, list[dict[str, Any]]] = defaultdict(list)
    learn_by_skill: dict[str, list[dict[str, Any]]] = defaultdict(list)
    upgrade_by_transition: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    upgrade_ids: set[str] = set()
    for offer_id, offer in hero_skill_offers.items():
        trainer_id = _expect_stable_id(offer["trainerId"], f"heroSkillOffers:{offer_id}:trainerId")
        trainer = hero_skill_trainers.get(trainer_id)
        if trainer is None:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_OFFER_TRAINER_UNKNOWN:{offer_id}")
        hero_skill_id = _expect_stable_id(
            offer["heroSkillId"], f"heroSkillOffers:{offer_id}:heroSkillId"
        )
        skill = hero_skills.get(hero_skill_id)
        if skill is None or skill["heroId"] != trainer["heroId"]:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_OFFER_OWNER_INVALID:{offer_id}")
        action = offer["action"]
        if not isinstance(action, dict):
            raise ExportError(f"EXECUTABLE_HERO_SKILL_OFFER_ACTION_INVALID:{offer_id}")
        action_type = action.get("type")
        if action_type == "learn":
            _expect_exact_fields(action, {"type", "toQuality"}, f"heroSkillOffers:{offer_id}:action")
            if action["toQuality"] != "bronze":
                raise ExportError(f"EXECUTABLE_HERO_SKILL_LEARN_ACTION_INVALID:{offer_id}")
            learn_by_skill[hero_skill_id].append(offer)
        elif action_type == "upgrade":
            _expect_exact_fields(
                action,
                {"type", "upgradeId", "fromQuality", "toQuality"},
                f"heroSkillOffers:{offer_id}:action",
            )
            upgrade_id = _expect_stable_id(
                action["upgradeId"], f"heroSkillOffers:{offer_id}:action:upgradeId"
            )
            if upgrade_id in upgrade_ids:
                raise ExportError(f"EXECUTABLE_HERO_SKILL_UPGRADE_ID_DUPLICATE:{upgrade_id}")
            upgrade_ids.add(upgrade_id)
            from_quality = action["fromQuality"]
            to_quality = action["toQuality"]
            if from_quality not in QUALITIES \
                    or QUALITIES.index(from_quality) + 1 >= len(QUALITIES) \
                    or QUALITIES[QUALITIES.index(from_quality) + 1] != to_quality:
                raise ExportError(f"EXECUTABLE_HERO_SKILL_UPGRADE_TRANSITION_INVALID:{offer_id}")
            upgrade_by_transition[(hero_skill_id, from_quality, to_quality)].append(offer)
        else:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_OFFER_ACTION_INVALID:{offer_id}")
        price = _expect_exact_fields(
            offer["price"], {"currency", "amount"}, f"heroSkillOffers:{offer_id}:price"
        )
        if price["currency"] != "gold":
            raise ExportError(f"EXECUTABLE_HERO_SKILL_OFFER_CURRENCY_INVALID:{offer_id}")
        _expect_integer(price["amount"], f"heroSkillOffers:{offer_id}:price:amount", 1)
        availability = _expect_exact_fields(
            offer["availability"], {"fromDay", "toDay"},
            f"heroSkillOffers:{offer_id}:availability",
        )
        from_day = _expect_integer(
            availability["fromDay"], f"heroSkillOffers:{offer_id}:availability:fromDay", 1
        )
        to_day = _expect_integer(
            availability["toDay"], f"heroSkillOffers:{offer_id}:availability:toDay", 1
        )
        if to_day < from_day:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_OFFER_DAY_WINDOW_INVALID:{offer_id}")
        _expect_integer(offer["order"], f"heroSkillOffers:{offer_id}:order", 1)
        offers_by_trainer[trainer_id].append(offer)

    trainer_skill_owners: dict[str, str] = {}
    for trainer_id, trainer in hero_skill_trainers.items():
        hero_id = _expect_stable_id(trainer["heroId"], f"heroSkillTrainers:{trainer_id}:heroId")
        stall_id = _expect_stable_id(trainer["stallId"], f"heroSkillTrainers:{trainer_id}:stallId")
        if hero_id not in heroes or stall_id not in stalls:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_TRAINER_REFERENCE_INVALID:{trainer_id}")
        offer_slots = _expect_integer(
            trainer["offerSlots"], f"heroSkillTrainers:{trainer_id}:offerSlots", 1
        )
        trainer_offers = sorted(
            offers_by_trainer.get(trainer_id, []), key=lambda value: (value["order"], value["offerId"])
        )
        orders = [value["order"] for value in trainer_offers]
        expected_offer_ids = [value["offerId"] for value in trainer_offers]
        offer_ids = [
            _expect_stable_id(value, f"heroSkillTrainers:{trainer_id}:offerIds")
            for value in _expect_list(trainer["offerIds"], f"heroSkillTrainers:{trainer_id}:offerIds")
        ]
        skill_ids = {value["heroSkillId"] for value in trainer_offers}
        if orders != list(range(1, len(trainer_offers) + 1)) \
                or offer_ids != expected_offer_ids or offer_slots > len(trainer_offers) \
                or len(skill_ids) != 1:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_TRAINER_OFFERS_INVALID:{trainer_id}")
        hero_skill_id = next(iter(skill_ids))
        if hero_skill_id in trainer_skill_owners:
            raise ExportError(f"EXECUTABLE_HERO_SKILL_TRAINER_SKILL_DUPLICATE:{hero_skill_id}")
        trainer_skill_owners[hero_skill_id] = trainer_id
    if set(trainer_skill_owners) != set(hero_skills) \
            or set(offers_by_trainer) != set(hero_skill_trainers):
        raise ExportError("EXECUTABLE_HERO_SKILL_TRAINER_COVERAGE_INVALID")

    starting_skill_ids = set().union(*starting_skill_ids_by_hero.values())
    expected_learn_skills = set(hero_skills) - starting_skill_ids
    if set(learn_by_skill) != expected_learn_skills \
            or any(len(values) != 1 for values in learn_by_skill.values()):
        raise ExportError("EXECUTABLE_HERO_SKILL_LEARN_PATH_INVALID")
    expected_hero_skill_transitions = {
        (hero_skill_id, QUALITIES[index], QUALITIES[index + 1])
        for hero_skill_id in hero_skills
        for index in range(len(QUALITIES) - 1)
    }
    if set(upgrade_by_transition) != expected_hero_skill_transitions \
            or any(len(values) != 1 for values in upgrade_by_transition.values()):
        raise ExportError("EXECUTABLE_HERO_SKILL_UPGRADE_PATH_INVALID")

    upgrades = _directory(_expect_list(catalogs["upgrades"], "catalogs:upgrades"), "upgradeId", {
        "upgradeId", "itemId", "fromQuality", "toQuality", "price", "stallId",
    }, "upgrades")
    if upgrade_ids.intersection(upgrades):
        raise ExportError("EXECUTABLE_HERO_SKILL_UPGRADE_ID_CROSS_DIRECTORY")
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
    enchantment_profiles: set[tuple[str, str, str]] = set()
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
            enchantment_profiles.add((enchantment_id, item_id, quality))
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
        "incomePayoutPolicy", "pveWinBonusXp", "prestigePolicy", "terminalRules",
        "lastChanceRules",
    }, "scheduleConfig")
    if schedule["schema"] != SCHEDULE_SCHEMA or schedule["schemaVersion"] != SCHEDULE_SCHEMA_VERSION \
            or schedule["rulesVersion"] != root["rulesVersion"] \
            or schedule["contentRevision"] != root["contentRevision"]:
        raise ExportError("EXECUTABLE_SCHEDULE_IDENTITY_INVALID")
    if schedule["incomePayoutPolicy"] != INCOME_PAYOUT_POLICY:
        raise ExportError("EXECUTABLE_SCHEDULE_INCOME_POLICY_INVALID")
    _expect_integer(schedule["pveWinBonusXp"], "schedule:pveWinBonusXp", 0)
    prestige_policy = _expect_exact_fields(schedule["prestigePolicy"], {
        "schema", "schemaVersion", "affectedBattleKind", "lossAmount", "drawAmount",
    }, "schedule:prestigePolicy")
    if prestige_policy["schema"] != PRESTIGE_POLICY_SCHEMA \
            or prestige_policy["schemaVersion"] != PRESTIGE_POLICY_SCHEMA_VERSION:
        raise ExportError("EXECUTABLE_PRESTIGE_POLICY_IDENTITY_INVALID")
    if prestige_policy["affectedBattleKind"] != "ghost":
        raise ExportError("EXECUTABLE_PRESTIGE_POLICY_SCOPE_INVALID")
    _expect_integer(prestige_policy["lossAmount"], "schedule:prestigePolicy:lossAmount", 1)
    _expect_integer(prestige_policy["drawAmount"], "schedule:prestigePolicy:drawAmount", 1)
    terminal_rules = _expect_exact_fields(schedule["terminalRules"], {
        "winTarget", "lastChancePolicyId",
    }, "schedule:terminalRules")
    _expect_integer(terminal_rules["winTarget"], "schedule:terminalRules:winTarget", 1)
    last_chance_policy_id = _expect_stable_id(
        terminal_rules["lastChancePolicyId"], "schedule:terminalRules:lastChancePolicyId"
    )
    last_chance_rules = _expect_exact_fields(schedule["lastChanceRules"], {
        "schema", "schemaVersion", "policyId", "trigger", "maxUsesPerRun", "options",
    }, "schedule:lastChanceRules")
    if last_chance_rules["schema"] != LAST_CHANCE_SCHEMA \
            or last_chance_rules["schemaVersion"] != LAST_CHANCE_SCHEMA_VERSION:
        raise ExportError("EXECUTABLE_LAST_CHANCE_IDENTITY_INVALID")
    if last_chance_rules["policyId"] != last_chance_policy_id:
        raise ExportError("EXECUTABLE_LAST_CHANCE_POLICY_LINK_INVALID")
    if _expect_integer(
        last_chance_rules["maxUsesPerRun"], "schedule:lastChanceRules:maxUsesPerRun", 1
    ) != 1:
        raise ExportError("EXECUTABLE_LAST_CHANCE_MAX_USES_INVALID")
    trigger = _expect_exact_fields(last_chance_rules["trigger"], {
        "battleKind", "outcomes", "prestigeAtOrBelow",
    }, "schedule:lastChanceRules:trigger")
    if trigger != {
        "battleKind": "ghost", "outcomes": ["draw", "loss"], "prestigeAtOrBelow": 0,
    }:
        raise ExportError("EXECUTABLE_LAST_CHANCE_TRIGGER_INVALID")
    last_chance_options = _expect_list(
        last_chance_rules["options"], "schedule:lastChanceRules:options"
    )
    if len(last_chance_options) != 3:
        raise ExportError("EXECUTABLE_LAST_CHANCE_OPTION_COUNT_INVALID")
    seen_last_chance_options: set[str] = set()
    fallback_count = 0
    for option_index, option_value in enumerate(last_chance_options):
        option = _expect_exact_fields(option_value, {
            "optionId", "restorePrestige", "cost",
        }, f"schedule:lastChanceRules:options:{option_index}")
        option_id = _expect_stable_id(
            option["optionId"], f"schedule:lastChanceRules:options:{option_index}:optionId"
        )
        if option_id in seen_last_chance_options:
            raise ExportError(f"EXECUTABLE_LAST_CHANCE_OPTION_ID_DUPLICATE:{option_id}")
        seen_last_chance_options.add(option_id)
        restore = _expect_integer(
            option["restorePrestige"], f"schedule:lastChanceRules:{option_id}:restorePrestige", 1
        )
        if restore > new_run_prestige:
            raise ExportError(f"EXECUTABLE_LAST_CHANCE_RESTORE_INVALID:{option_id}")
        cost = _expect_exact_fields(option["cost"], {
            "type", "amount",
        }, f"schedule:lastChanceRules:{option_id}:cost")
        cost_type = cost["type"]
        amount = _expect_integer(cost["amount"], f"schedule:lastChanceRules:{option_id}:cost:amount", 0)
        if cost_type == "none":
            if amount != 0:
                raise ExportError(f"EXECUTABLE_LAST_CHANCE_COST_INVALID:{option_id}")
            fallback_count += 1
        elif cost_type in {"spend_gold", "reduce_income"}:
            if amount <= 0:
                raise ExportError(f"EXECUTABLE_LAST_CHANCE_COST_INVALID:{option_id}")
        else:
            raise ExportError(f"EXECUTABLE_LAST_CHANCE_COST_INVALID:{option_id}")
    if fallback_count != 1:
        raise ExportError("EXECUTABLE_LAST_CHANCE_FALLBACK_REQUIRED")

    event_hour_refs: dict[str, set[int]] = defaultdict(set)
    seen_schedule_hours: set[int] = set()
    scheduled_node_ids: set[str] = set()
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
            scheduled_node_ids.add(node_id)
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
    if any(
        trainer["stallId"] not in scheduled_node_ids
        for trainer in hero_skill_trainers.values()
    ):
        raise ExportError("EXECUTABLE_HERO_SKILL_TRAINER_SCHEDULE_UNREACHABLE")

    battle = _expect_exact_fields(
        generation["battle"], {"templates", "ghostEncounters", "ghostSnapshots", "layers"},
        "generation:battle"
    )
    ghost_snapshots = _directory(
        _expect_list(battle["ghostSnapshots"], "generation:battle:ghostSnapshots"),
        "snapshotId",
        {
            "schema", "schemaVersion", "snapshotId", "matchSource",
            "opponentContentRevision", "buildHash", "build",
        },
        "ghostSnapshots",
    )
    for snapshot_id, snapshot in ghost_snapshots.items():
        if snapshot["schema"] != GHOST_SNAPSHOT_SCHEMA \
                or snapshot["schemaVersion"] != GHOST_SNAPSHOT_SCHEMA_VERSION \
                or snapshot["matchSource"] != GHOST_MATCH_SOURCE \
                or snapshot["opponentContentRevision"] != root["contentRevision"]:
            raise ExportError(f"EXECUTABLE_GHOST_SNAPSHOT_IDENTITY_INVALID:{snapshot_id}")
        day_match = re.fullmatch(r"ghost_snapshot_day_([0-9]{2})", snapshot_id)
        if day_match is None:
            raise ExportError(f"EXECUTABLE_GHOST_SNAPSHOT_ID_INVALID:{snapshot_id}")
        _validate_combat_build(
            snapshot["build"], f"ghostSnapshots:{snapshot_id}:build",
            item_profiles, item_widths, enchantment_profiles, hero_skills,
            snapshot_id, int(day_match.group(1)),
        )
        expected_build_hash = hashlib.sha256(
            _canonical_json(_canonical_combat_build(snapshot["build"])).encode("utf-8")
        ).hexdigest()
        if snapshot["buildHash"] != expected_build_hash:
            raise ExportError(f"EXECUTABLE_GHOST_SNAPSHOT_HASH_INVALID:{snapshot_id}")

    battle_templates = _directory(
        _expect_list(battle.get("templates"), "generation:battle:templates"),
        "encounterTemplateId",
        {"encounterTemplateId", "rewardId", "enemy"},
        "battleTemplates",
    )
    pve_template_ids = set(battle_templates)
    for template_id, record in battle_templates.items():
        template_id = _expect_stable_id(
            record["encounterTemplateId"], f"battleTemplate:{template_id}:encounterTemplateId"
        )
        reward_id = _expect_stable_id(record["rewardId"], f"battleTemplate:{template_id}:rewardId")
        if reward_id not in rewards:
            raise ExportError(f"EXECUTABLE_BATTLE_REWARD_INVALID:{reward_id}")
        referenced_rewards.add(reward_id)
        _validate_combat_build(
            record["enemy"], f"battleTemplate:{template_id}:enemy",
            item_profiles, item_widths, enchantment_profiles,
        )

    ghost_encounters = _directory(
        _expect_list(battle.get("ghostEncounters"), "generation:battle:ghostEncounters"),
        "encounterId",
        {"encounterId", "rewardId", "snapshotId"},
        "ghostEncounters",
    )
    if pve_template_ids.intersection(ghost_encounters):
        raise ExportError("EXECUTABLE_BATTLE_ENCOUNTER_KIND_OWNERSHIP_INVALID")
    referenced_snapshot_ids: set[str] = set()
    for encounter_id, encounter in ghost_encounters.items():
        reward_id = _expect_stable_id(
            encounter["rewardId"], f"ghostEncounter:{encounter_id}:rewardId"
        )
        if reward_id not in rewards:
            raise ExportError(f"EXECUTABLE_GHOST_ENCOUNTER_REWARD_INVALID:{encounter_id}")
        referenced_rewards.add(reward_id)
        snapshot_id = _expect_stable_id(
            encounter["snapshotId"], f"ghostEncounter:{encounter_id}:snapshotId"
        )
        if snapshot_id not in ghost_snapshots:
            raise ExportError(f"EXECUTABLE_GHOST_SNAPSHOT_REFERENCE_INVALID:{encounter_id}")
        if snapshot_id in referenced_snapshot_ids:
            raise ExportError(f"EXECUTABLE_GHOST_SNAPSHOT_REFERENCE_DUPLICATE:{snapshot_id}")
        referenced_snapshot_ids.add(snapshot_id)
    if referenced_snapshot_ids != set(ghost_snapshots):
        raise ExportError("EXECUTABLE_GHOST_SNAPSHOT_REFERENCE_COVERAGE_INVALID")

    layer_pve_refs: set[str] = set()
    layer_ghost_refs: set[str] = set()
    layers = _expect_list(battle.get("layers"), "generation:battle:layers")
    for layer_index, layer_value in enumerate(layers):
        layer = _expect_exact_fields(layer_value, {
            "fromDay", "toDay", "pveTemplateIds", "ghostEncounterIds",
        }, f"battleLayer:{layer_index}")
        day = _expect_integer(layer["fromDay"], f"battleLayer:{layer_index}:fromDay", 1)
        if day != layer_index + 1 or layer["toDay"] != (None if layer_index == len(layers) - 1 else day):
            raise ExportError(f"EXECUTABLE_BATTLE_LAYER_RANGE_INVALID:{day}")
        pve_refs = [
            _expect_stable_id(value, f"battleLayer:{day}:pveTemplateIds")
            for value in _expect_list(layer["pveTemplateIds"], f"battleLayer:{day}:pveTemplateIds")
        ]
        ghost_refs = [
            _expect_stable_id(value, f"battleLayer:{day}:ghostEncounterIds")
            for value in _expect_list(layer["ghostEncounterIds"], f"battleLayer:{day}:ghostEncounterIds")
        ]
        if not pve_refs or len(pve_refs) != len(set(pve_refs)) \
                or any(value not in pve_template_ids for value in pve_refs) \
                or layer_pve_refs.intersection(pve_refs):
            raise ExportError(f"EXECUTABLE_BATTLE_LAYER_PVE_INVALID:{day}")
        if not ghost_refs or len(ghost_refs) != len(set(ghost_refs)) \
                or any(value not in ghost_encounters for value in ghost_refs) \
                or layer_ghost_refs.intersection(ghost_refs):
            raise ExportError(f"EXECUTABLE_BATTLE_LAYER_GHOST_INVALID:{day}")
        layer_pve_refs.update(pve_refs)
        layer_ghost_refs.update(ghost_refs)
    if layer_pve_refs != pve_template_ids or layer_ghost_refs != set(ghost_encounters):
        raise ExportError("EXECUTABLE_BATTLE_LAYER_TEMPLATE_COVERAGE_INVALID")

    maximum_day = len(layers)
    if maximum_day < 1:
        raise ExportError("EXECUTABLE_HERO_SKILL_TRAINING_MAXIMUM_DAY_INVALID")
    if any(
        offer["availability"]["toDay"] > maximum_day
        for offer in hero_skill_offers.values()
    ):
        raise ExportError("EXECUTABLE_HERO_SKILL_OFFER_DAY_WINDOW_INVALID")
    reachable_hero_skill_profiles: dict[tuple[str, str], int] = {}
    for hero in heroes.values():
        for instance in hero["startingHeroSkills"]:
            reachable_hero_skill_profiles[(instance["heroSkillId"], instance["quality"])] = \
                instance["acquiredDay"]
    for hero_skill_id, skill_offers in learn_by_skill.items():
        offer = skill_offers[0]
        reachable_hero_skill_profiles[(hero_skill_id, offer["action"]["toQuality"])] = \
            offer["availability"]["fromDay"]
    changed = True
    while changed:
        changed = False
        for (hero_skill_id, from_quality, to_quality), skill_offers in upgrade_by_transition.items():
            source_day = reachable_hero_skill_profiles.get((hero_skill_id, from_quality))
            offer = skill_offers[0]
            if source_day is None:
                continue
            target_day = max(source_day, offer["availability"]["fromDay"])
            if target_day <= offer["availability"]["toDay"] \
                    and target_day < reachable_hero_skill_profiles.get(
                        (hero_skill_id, to_quality), maximum_day + 1
                    ):
                reachable_hero_skill_profiles[(hero_skill_id, to_quality)] = target_day
                changed = True
    expected_hero_skill_profiles = {
        (hero_skill_id, quality)
        for hero_skill_id in hero_skills
        for quality in QUALITIES
    }
    if set(reachable_hero_skill_profiles) != expected_hero_skill_profiles \
            or any(day > maximum_day for day in reachable_hero_skill_profiles.values()):
        raise ExportError("EXECUTABLE_HERO_SKILL_PROFILE_MAXIMUM_DAY_REACHABILITY_INVALID")
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
        item_skills = self._item_skills()
        items, starters = self._items(item_skills)
        self._effects(items, item_skills)
        self._auras(items, item_skills)
        hero_skills = self._hero_skills()
        rewards = self._rewards()
        progression_rules = self._progression_rules()
        hero = self._hero()
        hero_skill_loadouts = self._hero_skill_loadouts(hero, hero_skills)
        last_chance_rules = self._last_chance_rules(hero)
        stalls = self._stalls()
        upgrades = self._upgrades(stalls)
        enchantments = self._enchantments(stalls)
        shop_generation, source_refresh_max = self._offers(stalls)
        hero_skill_trainers, hero_skill_offers = self._hero_skill_training(
            hero,
            hero_skills,
            stalls,
            {value["offerTemplateId"] for value in shop_generation["templates"]},
            {value["upgradeId"] for value in upgrades},
        )
        events = self._events(rewards)
        node_ids = set(stalls) | set(events) | set(rewards)
        schedule, identity = self._gameplay(source_revision, node_ids, last_chance_rules)
        if source_refresh_max != identity["refreshPackageMax"]:
            raise ExportError("STALL_REFRESH_DECLARED_COVERAGE_INVALID")
        ghost_snapshots = self._ghost_snapshots(
            identity["contentRevision"], hero, hero_skills,
            hero_skill_loadouts["ghost_snapshot"],
        )
        battle_generation = self._encounters(rewards, identity["runDayMax"], ghost_snapshots)
        new_run = self._new_run(hero, starters)
        self._validate_player_profile_reachability(
            starters, shop_generation, rewards, progression_rules, upgrades
        )
        starting_hero_skills = hero_skill_loadouts["starter"].get(hero["heroId"], [])
        self._validate_hero_skill_training_reachability(
            hero_skills,
            starting_hero_skills,
            hero_skill_trainers,
            hero_skill_offers,
            schedule,
            identity["runDayMax"],
        )
        executable_catalogs = self._executable_catalogs(
            hero,
            item_skills,
            hero_skills,
            starting_hero_skills,
            hero_skill_trainers,
            hero_skill_offers,
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
            "battleRules": {
                "terminalPressure": identity["terminalPressure"],
                "ammoDepletionRules": identity["ammoDepletionRules"],
                "critRules": identity["critRules"],
                "burnRules": identity["burnRules"],
                "poisonRules": identity["poisonRules"],
                "healStatusCleanseRules": identity["healStatusCleanseRules"],
                "damageAuraRules": identity["damageAuraRules"],
            },
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

    def _last_chance_rules(self, hero: dict[str, Any]) -> dict[str, Any]:
        filename = "61_bz_last_chance_choices.csv"
        rows = self.tables[filename]
        if len(rows) != 3:
            raise ExportError("LAST_CHANCE_OPTION_COUNT_INVALID")
        for row in rows:
            _formal(filename, row)
        if _same(rows, filename, "schema") != LAST_CHANCE_SCHEMA \
                or _same(rows, filename, "schema_version") != str(LAST_CHANCE_SCHEMA_VERSION):
            raise ExportError("LAST_CHANCE_POLICY_IDENTITY_INVALID")
        policy_id = _same(rows, filename, "policy_id")
        if not STABLE_ID_RE.fullmatch(policy_id):
            raise ExportError("LAST_CHANCE_POLICY_IDENTITY_INVALID")
        max_uses = _same(rows, filename, "max_uses_per_run")
        if max_uses != "1":
            raise ExportError("LAST_CHANCE_MAX_USES_INVALID")
        battle_kind = _same(rows, filename, "trigger_battle_kind")
        trigger_outcomes = _ids(filename, rows[0], "trigger_outcomes")
        if any(_ids(filename, row, "trigger_outcomes") != trigger_outcomes for row in rows[1:]) \
                or battle_kind != "ghost" or trigger_outcomes != ["draw", "loss"]:
            raise ExportError("LAST_CHANCE_TRIGGER_INVALID")
        threshold = _same(rows, filename, "trigger_prestige_at_or_below")
        if threshold != "0":
            raise ExportError("LAST_CHANCE_TRIGGER_INVALID")

        options = []
        seen_ids: set[str] = set()
        fallback_count = 0
        for row in rows:
            option_id = _require_id(filename, row, "option_id")
            if option_id in seen_ids:
                raise ExportError(f"LAST_CHANCE_OPTION_ID_DUPLICATE:{option_id}")
            seen_ids.add(option_id)
            option_order = _integer(filename, row, "option_order", 1)
            _require_chinese(filename, row, "name_zh")
            _require_chinese(filename, row, "description_zh")
            restore = _integer(filename, row, "restore_prestige", 1)
            if restore > hero["prestige"]:
                raise ExportError(f"LAST_CHANCE_RESTORE_INVALID:{option_id}")
            cost_type = _require_text(filename, row, "cost_type")
            cost_amount = _integer(filename, row, "cost_amount", 0)
            if cost_type == "none":
                if cost_amount != 0:
                    raise ExportError(f"LAST_CHANCE_COST_INVALID:{option_id}")
                fallback_count += 1
            elif cost_type in {"spend_gold", "reduce_income"}:
                if cost_amount <= 0:
                    raise ExportError(f"LAST_CHANCE_COST_INVALID:{option_id}")
            else:
                raise ExportError(f"LAST_CHANCE_COST_INVALID:{option_id}")
            options.append({
                "optionId": option_id,
                "optionOrder": option_order,
                "restorePrestige": restore,
                "cost": {"type": cost_type, "amount": cost_amount},
            })
        options.sort(key=lambda value: value["optionOrder"])
        if [value["optionOrder"] for value in options] != [1, 2, 3]:
            raise ExportError("LAST_CHANCE_OPTION_ORDER_INVALID")
        if fallback_count != 1:
            raise ExportError("LAST_CHANCE_FALLBACK_REQUIRED")
        return {
            "schema": LAST_CHANCE_SCHEMA,
            "schemaVersion": LAST_CHANCE_SCHEMA_VERSION,
            "policyId": policy_id,
            "trigger": {
                "battleKind": battle_kind,
                "outcomes": trigger_outcomes,
                "prestigeAtOrBelow": int(threshold),
            },
            "maxUsesPerRun": int(max_uses),
            "options": [
                {key: value[key] for key in ["optionId", "restorePrestige", "cost"]}
                for value in options
            ],
        }

    def _item_skills(self) -> dict[str, dict[str, Any]]:
        filename = "48_bz_item_skills.csv"
        rows_by_id = _unique(self.tables[filename], filename, "item_skill_id")
        item_skills: dict[str, dict[str, Any]] = {}
        seen_effects: set[str] = set()
        seen_auras: set[str] = set()
        for item_skill_id, row in rows_by_id.items():
            _formal(filename, row)
            _require_chinese(filename, row, "name_zh")
            _require_chinese(filename, row, "description_zh")
            trigger_events = _ids(filename, row, "trigger_events")
            if "item_ready" not in trigger_events \
                    or any(event not in ITEM_EFFECT_TRIGGERS for event in trigger_events):
                raise ExportError(f"ITEM_SKILL_TRIGGER_INVALID:{item_skill_id}")
            effect_ids = _ids(filename, row, "effect_ids")
            if seen_effects.intersection(effect_ids):
                raise ExportError(f"ITEM_SKILL_EFFECT_OWNERSHIP_DUPLICATE:{item_skill_id}")
            seen_effects.update(effect_ids)
            aura_ids = _ids(filename, row, "aura_ids", allow_empty=True)
            if seen_auras.intersection(aura_ids):
                raise ExportError(f"ITEM_SKILL_AURA_OWNERSHIP_DUPLICATE:{item_skill_id}")
            seen_auras.update(aura_ids)
            item_skills[item_skill_id] = {
                "triggerEvents": set(trigger_events), "effectIds": set(effect_ids),
                "auraIds": set(aura_ids),
            }
        return item_skills

    def _items(self, item_skills: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
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
            _same(rows, filename, "tags")
            tags = _item_tags(filename, rows[0], "tags")
            slot_width = int(_same(rows, filename, "slot_width")) if INTEGER_RE.fullmatch(_same(rows, filename, "slot_width")) else 0
            if slot_width not in {1, 2, 3}:
                raise ExportError(f"ITEM_SLOT_WIDTH_INVALID:{item_id}")
            base_quality = _same(rows, filename, "base_quality")
            if base_quality not in QUALITIES:
                raise ExportError(f"ITEM_BASE_QUALITY_INVALID:{item_id}")
            item_skill_id = _same(rows, filename, "item_skill_id")
            if not STABLE_ID_RE.fullmatch(item_skill_id) or item_skill_id not in item_skills:
                raise ExportError(f"ITEM_SKILL_UNKNOWN:{item_id}:{item_skill_id}")
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
                crit_chance_bps = _integer(filename, row, "crit_chance_bps", 0)
                if crit_chance_bps > CRIT_CHANCE_SCALE_BPS:
                    raise ExportError(f"ITEM_CRIT_CHANCE_INVALID:{item_id}:{quality}")
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
                    "critChanceBps": crit_chance_bps,
                    "ammo": {"enabled": ammo_enabled, "initial": ammo_initial, "maximum": ammo_maximum},
                    "effects": [],
                    "auras": [],
                }
                profiles[quality] = profile
                self.item_profiles[(item_id, quality)] = profile
            self.item_widths[item_id] = slot_width
            self.item_skills[item_id] = item_skill_id
            items.append({
                "itemId": item_id,
                "tags": tags,
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

    def _effects(self, items: list[dict[str, Any]], item_skills: dict[str, dict[str, Any]]) -> None:
        del items
        filename = "47_bz_item_effects.csv"
        seen_ids: set[str] = set()
        actual_item_skill_effects: dict[str, set[str]] = defaultdict(set)
        actual_item_skill_triggers: dict[str, set[str]] = defaultdict(set)
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
            item_skill_id = _require_id(filename, row, "item_skill_id")
            if self.item_skills.get(item_id) != item_skill_id or item_skill_id not in item_skills:
                raise ExportError(f"EFFECT_ITEM_SKILL_MISMATCH:{effect_id}")
            trigger_event = _require_text(filename, row, "trigger_event")
            if trigger_event not in ITEM_EFFECT_TRIGGERS:
                raise ExportError(f"EFFECT_TRIGGER_INVALID:{effect_id}")
            condition_type = _require_text(filename, row, "condition_type")
            if condition_type not in ITEM_EFFECT_CONDITIONS:
                raise ExportError(f"EFFECT_CONDITION_INVALID:{effect_id}")
            source_relation = _require_text(filename, row, "condition_source_relation")
            if source_relation not in ITEM_EFFECT_SOURCE_RELATIONS:
                raise ExportError(f"EFFECT_SOURCE_RELATION_INVALID:{effect_id}")
            if trigger_event in {"item_ready", "battle_start"}:
                if row.get("condition_tags", "").strip() or source_relation != "any":
                    raise ExportError(f"EFFECT_CONDITION_INVALID:{effect_id}")
                if condition_type == "always":
                    conditions = [{"type": "always", "params": {}}]
                elif trigger_event == "item_ready" and condition_type == "source_item_ammo_depleted":
                    conditions = [{"type": "source_item_ammo_depleted", "params": {}}]
                else:
                    raise ExportError(f"EFFECT_CONDITION_INVALID:{effect_id}")
            elif trigger_event == BURN_RESPONSE_TRIGGER:
                if condition_type != "source_item_has_any_tag" or source_relation != "any":
                    raise ExportError(f"EFFECT_BURN_RESPONSE_TRIGGER_INVALID:{effect_id}")
                condition_tags = _item_tags(filename, row, "condition_tags")
                if condition_tags != ["burn"]:
                    raise ExportError(f"EFFECT_BURN_RESPONSE_TRIGGER_INVALID:{effect_id}")
                conditions = [{
                    "type": "source_item_has_any_tag",
                    "params": {"tags": condition_tags},
                }]
            elif trigger_event == CRIT_SUCCESS_RESPONSE_TRIGGER:
                if condition_type != "always" or row.get("condition_tags", "").strip() \
                        or source_relation != "any":
                    raise ExportError(f"EFFECT_CRIT_SUCCESS_RESPONSE_TRIGGER_INVALID:{effect_id}")
                conditions = [{"type": "always", "params": {}}]
            else:
                if condition_type == "source_item_can_crit":
                    if row.get("condition_tags", "").strip() or source_relation != "any":
                        raise ExportError(f"EFFECT_CONDITION_INVALID:{effect_id}")
                    conditions = [{"type": "source_item_can_crit", "params": {}}]
                elif condition_type == "source_item_has_any_tag":
                    condition_tags = _item_tags(filename, row, "condition_tags")
                    conditions = [{
                        "type": "source_item_has_any_tag",
                        "params": {"tags": condition_tags},
                    }]
                    if source_relation == "adjacent":
                        conditions.append({
                            "type": "source_item_adjacent_to_self",
                            "params": {},
                        })
                else:
                    raise ExportError(f"EFFECT_CONDITION_INVALID:{effect_id}")
            target_type = _require_text(filename, row, "target_type")
            operation_type = _require_text(filename, row, "operation_type")
            if target_type not in ITEM_EFFECT_TARGETS:
                raise ExportError(f"EFFECT_TARGET_INVALID:{effect_id}")
            if target_type in COLLECTION_FRIENDLY_ITEM_TARGETS:
                target_params = {"tags": _item_tags(filename, row, "target_tags")}
                if trigger_event != "item_ready" or operation_type != "charge":
                    raise ExportError(f"EFFECT_COLLECTION_TARGET_CONTRACT_INVALID:{effect_id}")
                if row.get("target_exclude_self", "").strip() \
                        or row.get("target_count", "").strip():
                    raise ExportError(f"EFFECT_COLLECTION_TARGET_PARAMS_FORGED:{effect_id}")
            elif target_type in RANDOM_FRIENDLY_ITEM_TARGETS:
                exclude_self = _boolean(filename, row, "target_exclude_self")
                target_count = _integer(filename, row, "target_count", 1)
                if trigger_event != "item_ready" or condition_type != "always" \
                        or source_relation != "any" or operation_type != "charge" \
                        or target_count != 1:
                    raise ExportError(f"EFFECT_RANDOM_TARGET_CONTRACT_INVALID:{effect_id}")
                target_params = {
                    "tags": _item_tags(filename, row, "target_tags"),
                    "excludeSelf": exclude_self,
                    "count": target_count,
                }
            else:
                if row.get("target_tags", "").strip() \
                        or row.get("target_exclude_self", "").strip() \
                        or row.get("target_count", "").strip():
                    raise ExportError(f"EFFECT_TARGET_PARAMS_FORGED:{effect_id}")
                target_params = {}
            if operation_type not in ITEM_EFFECT_OPERATIONS:
                raise ExportError(f"EFFECT_OPERATION_INVALID:{effect_id}")
            if trigger_event == "another_friendly_item_used" \
                    and operation_type not in REACTIVE_ITEM_EFFECT_OPERATIONS:
                raise ExportError(f"EFFECT_REACTIVE_OPERATION_INVALID:{effect_id}")
            if trigger_event == BURN_RESPONSE_TRIGGER and (
                target_type != "self_item" or operation_type != "charge"
            ):
                raise ExportError(f"EFFECT_BURN_RESPONSE_CONTRACT_INVALID:{effect_id}")
            if trigger_event == CRIT_SUCCESS_RESPONSE_TRIGGER and (
                target_type != "self_item" or operation_type != "charge"
            ):
                raise ExportError(f"EFFECT_CRIT_SUCCESS_RESPONSE_CONTRACT_INVALID:{effect_id}")
            if condition_type == "source_item_can_crit" \
                    and operation_type != "gain_crit_chance_for_fight":
                raise ExportError(f"EFFECT_CRIT_GROWTH_TRIGGER_INVALID:{effect_id}")
            if condition_type == "source_item_ammo_depleted" and (
                trigger_event != "item_ready"
                or target_type != "owner_hero"
                or operation_type != "gain_shield"
            ):
                raise ExportError(f"EFFECT_AMMO_DEPLETION_CONTRACT_INVALID:{effect_id}")
            if trigger_event == "battle_start" \
                    and (target_type != "owner_hero" or operation_type != "gain_shield"):
                raise ExportError(f"EFFECT_BATTLE_START_CONTRACT_INVALID:{effect_id}")
            if operation_type == "deal_damage" and target_type != "selected_enemy":
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            if operation_type == "apply_burn" and (
                trigger_event != "item_ready"
                or conditions != [{"type": "always", "params": {}}]
                or target_type != "selected_enemy"
            ):
                raise ExportError(f"EFFECT_BURN_CONTRACT_INVALID:{effect_id}")
            if operation_type == "apply_poison" and (
                trigger_event != "item_ready"
                or conditions != [{"type": "always", "params": {}}]
                or target_type != "selected_enemy"
            ):
                raise ExportError(f"EFFECT_POISON_CONTRACT_INVALID:{effect_id}")
            if operation_type == "reload" and target_type != "self_item":
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            if operation_type == "charge" and not (
                target_type == "self_item" or (
                    target_type in DETERMINISTIC_FRIENDLY_ITEM_TARGETS | PARAMETERIZED_FRIENDLY_ITEM_TARGETS
                    and trigger_event == "item_ready"
                )
            ):
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            if operation_type == "gain_damage_for_fight":
                if target_type not in {"self_item", "trigger_source_item"} \
                        or trigger_event != "another_friendly_item_used" \
                        or len(conditions) not in {1, 2} \
                        or conditions[0].get("type") != "source_item_has_any_tag":
                    raise ExportError(f"EFFECT_DAMAGE_GROWTH_TRIGGER_INVALID:{effect_id}")
            if operation_type == "gain_crit_chance_for_fight":
                if target_type != "trigger_source_item" \
                        or trigger_event != "another_friendly_item_used" \
                        or conditions != [{"type": "source_item_can_crit", "params": {}}]:
                    raise ExportError(f"EFFECT_CRIT_GROWTH_TRIGGER_INVALID:{effect_id}")
            if operation_type == "apply_status" and target_type not in {"self_item", "first_enemy_item"}:
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            if operation_type in {"heal", "gain_shield"} and target_type != "owner_hero":
                raise ExportError(f"EFFECT_TARGET_OPERATION_MISMATCH:{effect_id}")
            params: dict[str, Any]
            if operation_type in {
                "deal_damage", "reload", "heal", "gain_shield", "gain_damage_for_fight",
            }:
                amount = _integer(filename, row, "amount", 1)
                params = {"amount": amount}
                if operation_type == "deal_damage":
                    params["canCrit"] = _boolean(filename, row, "can_crit")
                    if params["canCrit"] and amount > CRIT_DAMAGE_AMOUNT_MAX:
                        raise ExportError(f"EFFECT_CRIT_DAMAGE_AMOUNT_INVALID:{effect_id}")
                    if params["canCrit"] and (
                        trigger_event != "item_ready"
                        or conditions != [{"type": "always", "params": {}}]
                        or target_type != "selected_enemy"
                    ):
                        raise ExportError(f"EFFECT_CRIT_CONTRACT_INVALID:{effect_id}")
                elif row.get("can_crit", "").strip():
                    raise ExportError(f"EFFECT_CAN_CRIT_UNEXPECTED:{effect_id}")
                if row.get("stacks", "").strip() or row.get("status", "").strip() \
                        or row.get("ticks", "").strip() \
                        or row.get("crit_chance_bps_delta", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            elif operation_type == "gain_crit_chance_for_fight":
                crit_chance_bps_delta = _integer(
                    filename, row, "crit_chance_bps_delta", 1
                )
                if crit_chance_bps_delta > CRIT_CHANCE_SCALE_BPS:
                    raise ExportError(f"EFFECT_CRIT_GROWTH_DELTA_INVALID:{effect_id}")
                params = {"critChanceBpsDelta": crit_chance_bps_delta}
                if row.get("amount", "").strip() or row.get("stacks", "").strip() \
                        or row.get("can_crit", "").strip() or row.get("status", "").strip() \
                        or row.get("ticks", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            elif operation_type == "charge":
                params = {"ticks": _integer(filename, row, "ticks", 1)}
                if row.get("amount", "").strip() or row.get("can_crit", "").strip() \
                        or row.get("stacks", "").strip() or row.get("status", "").strip() \
                        or row.get("crit_chance_bps_delta", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            elif operation_type == "apply_burn":
                stacks = _integer(filename, row, "stacks", 1)
                if stacks > BURN_MAX_STACKS:
                    raise ExportError(f"EFFECT_BURN_STACKS_INVALID:{effect_id}")
                params = {"stacks": stacks}
                if row.get("amount", "").strip() or row.get("can_crit", "").strip() \
                        or row.get("status", "").strip() or row.get("ticks", "").strip() \
                        or row.get("crit_chance_bps_delta", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            elif operation_type == "apply_poison":
                stacks = _integer(filename, row, "stacks", 1)
                if stacks > POISON_MAX_STACKS:
                    raise ExportError(f"EFFECT_POISON_STACKS_INVALID:{effect_id}")
                params = {"stacks": stacks}
                if row.get("amount", "").strip() or row.get("can_crit", "").strip() \
                        or row.get("status", "").strip() or row.get("ticks", "").strip() \
                        or row.get("crit_chance_bps_delta", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            else:
                status = _require_text(filename, row, "status")
                if status not in ITEM_STATUSES:
                    raise ExportError(f"EFFECT_STATUS_INVALID:{effect_id}")
                params = {"status": status, "ticks": _integer(filename, row, "ticks", 1)}
                if row.get("amount", "").strip() or row.get("stacks", "").strip() \
                        or row.get("can_crit", "").strip() \
                        or row.get("crit_chance_bps_delta", "").strip():
                    raise ExportError(f"EFFECT_PARAMS_FORGED:{effect_id}")
            effect = {
                "effectId": effect_id,
                "priority": _integer(filename, row, "priority", 0),
                "trigger": {"event": trigger_event, "conditions": conditions},
                "target": {"type": target_type, "params": target_params},
                "operation": {"type": operation_type, "params": params},
            }
            profile["effects"].append(effect)
            actual_item_skill_effects[item_skill_id].add(effect_id)
            actual_item_skill_triggers[item_skill_id].add(trigger_event)
        for key, profile in self.item_profiles.items():
            if not profile["effects"]:
                raise ExportError(f"EFFECT_REQUIRED:{key[0]}:{key[1]}")
            if not any(effect["trigger"]["event"] == "item_ready" for effect in profile["effects"]):
                raise ExportError(f"ITEM_READY_EFFECT_REQUIRED:{key[0]}:{key[1]}")
            if any(
                effect["operation"]["type"] == "gain_damage_for_fight"
                for effect in profile["effects"]
            ) and not any(
                effect["trigger"]["event"] == "item_ready"
                and effect["operation"]["type"] == "deal_damage"
                for effect in profile["effects"]
            ):
                raise ExportError(f"ITEM_DAMAGE_GROWTH_ACTIVE_DAMAGE_REQUIRED:{key[0]}:{key[1]}")
            damage_effects = [
                effect for effect in profile["effects"]
                if effect["operation"]["type"] == "deal_damage"
            ]
            crit_effects = [
                effect for effect in damage_effects
                if effect["operation"]["params"].get("canCrit") is True
            ]
            crit_chance_bps = profile["critChanceBps"]
            if len(crit_effects) > 1 \
                    or (crit_chance_bps > 0 and len(crit_effects) != 1) \
                    or (crit_effects and len(damage_effects) != 1):
                raise ExportError(f"ITEM_CRIT_PROFILE_MISMATCH:{key[0]}:{key[1]}")
            poison_effects = [
                effect for effect in profile["effects"]
                if effect["operation"]["type"] == "apply_poison"
            ]
            if poison_effects and (len(poison_effects) != 1 \
                    or len(profile["effects"]) != 1 or crit_chance_bps != 0):
                raise ExportError(f"ITEM_POISON_PROFILE_MISMATCH:{key[0]}:{key[1]}")
            ammo_depletion_effects = [
                effect for effect in profile["effects"]
                if effect["trigger"]["conditions"]
                and effect["trigger"]["conditions"][0].get("type") == "source_item_ammo_depleted"
            ]
            if ammo_depletion_effects and (
                len(ammo_depletion_effects) != 1 or profile["ammo"].get("enabled") is not True
            ):
                raise ExportError(f"ITEM_AMMO_DEPLETION_PROFILE_MISMATCH:{key[0]}:{key[1]}")
            profile["effects"].sort(key=lambda value: (value["priority"], value["effectId"]))
        for item_skill_id, skill in item_skills.items():
            if actual_item_skill_effects.get(item_skill_id, set()) != skill["effectIds"]:
                raise ExportError(f"ITEM_SKILL_EFFECT_DIRECTORY_MISMATCH:{item_skill_id}")
            if actual_item_skill_triggers.get(item_skill_id, set()) != skill["triggerEvents"]:
                raise ExportError(f"ITEM_SKILL_TRIGGER_DIRECTORY_MISMATCH:{item_skill_id}")

    def _auras(self, items: list[dict[str, Any]], item_skills: dict[str, dict[str, Any]]) -> None:
        del items
        filename = "66_bz_item_auras.csv"
        seen_ids: set[str] = set()
        actual_item_skill_auras: dict[str, set[str]] = defaultdict(set)
        for row in self.tables[filename]:
            _formal(filename, row)
            aura_id = _require_id(filename, row, "aura_id")
            if aura_id in seen_ids:
                raise ExportError(f"DAMAGE_AURA_ID_DUPLICATE:{aura_id}")
            seen_ids.add(aura_id)
            item_id = _require_id(filename, row, "item_id")
            quality = _require_text(filename, row, "quality")
            profile = self.item_profiles.get((item_id, quality))
            if profile is None:
                raise ExportError(f"DAMAGE_AURA_ITEM_QUALITY_UNKNOWN:{aura_id}")
            item_skill_id = _require_id(filename, row, "item_skill_id")
            if self.item_skills.get(item_id) != item_skill_id or item_skill_id not in item_skills:
                raise ExportError(f"DAMAGE_AURA_ITEM_SKILL_MISMATCH:{aura_id}")
            target_type = _require_text(filename, row, "target_type")
            if target_type != DAMAGE_AURA_TARGET:
                raise ExportError(f"DAMAGE_AURA_TARGET_INVALID:{aura_id}")
            target_tags = _item_tags(filename, row, "target_tags")
            exclude_self = _boolean(filename, row, "target_exclude_self")
            if not exclude_self:
                raise ExportError(f"DAMAGE_AURA_EXCLUDE_SELF_INVALID:{aura_id}")
            operation_type = _require_text(filename, row, "operation_type")
            if operation_type != DAMAGE_AURA_OPERATION:
                raise ExportError(f"DAMAGE_AURA_OPERATION_INVALID:{aura_id}")
            amount = _integer(filename, row, "amount", 1)
            if amount > CRIT_DAMAGE_AMOUNT_MAX:
                raise ExportError(f"DAMAGE_AURA_AMOUNT_INVALID:{aura_id}")
            profile["auras"].append({
                "auraId": aura_id,
                "priority": _integer(filename, row, "priority", 0),
                "target": {
                    "type": target_type,
                    "params": {"tags": target_tags, "excludeSelf": exclude_self},
                },
                "operation": {"type": operation_type, "params": {"amount": amount}},
            })
            actual_item_skill_auras[item_skill_id].add(aura_id)
        if not seen_ids:
            raise ExportError("DAMAGE_AURA_CATALOG_REQUIRED")
        for profile in self.item_profiles.values():
            profile["auras"].sort(key=lambda value: (value["priority"], value["auraId"]))
        for item_skill_id, skill in item_skills.items():
            if actual_item_skill_auras.get(item_skill_id, set()) != skill["auraIds"]:
                raise ExportError(f"ITEM_SKILL_AURA_DIRECTORY_MISMATCH:{item_skill_id}")

    def _hero_skills(self) -> dict[str, dict[str, Any]]:
        filename = "62_bz_hero_skills.csv"
        grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
        seen_profile_effects: set[tuple[str, str, str]] = set()
        global_effect_ids: set[str] = set()
        for row in self.tables[filename]:
            _formal(filename, row)
            hero_skill_id = _require_id(filename, row, "hero_skill_id")
            grouped[hero_skill_id].append(row)
        if not grouped or set(grouped).intersection(self.item_skills.values()):
            raise ExportError("HERO_SKILL_CATALOG_INVALID")
        result: dict[str, dict[str, Any]] = {}
        priorities: set[int] = set()
        for hero_skill_id in sorted(grouped):
            rows = grouped[hero_skill_id]
            hero_id = _same(rows, filename, "hero_id")
            if not STABLE_ID_RE.fullmatch(hero_id):
                raise ExportError(f"HERO_SKILL_OWNER_INVALID:{hero_skill_id}")
            _require_chinese(filename, rows[0], "name_zh")
            _require_chinese(filename, rows[0], "description_zh")
            _same(rows, filename, "name_zh")
            _same(rows, filename, "description_zh")
            priority_text = _same(rows, filename, "priority")
            if not INTEGER_RE.fullmatch(priority_text) or int(priority_text) < 0:
                raise ExportError(f"HERO_SKILL_PRIORITY_INVALID:{hero_skill_id}")
            priority = int(priority_text)
            if priority in priorities:
                raise ExportError(f"HERO_SKILL_PRIORITY_DUPLICATE:{priority}")
            priorities.add(priority)
            if _same(rows, filename, "trigger_event") != HERO_SKILL_TRIGGER:
                raise ExportError(f"HERO_SKILL_TRIGGER_INVALID:{hero_skill_id}")
            if any(_boolean(filename, row, "reentrant") for row in rows):
                raise ExportError(f"HERO_SKILL_REENTRANT_FORBIDDEN:{hero_skill_id}")
            profiles: dict[str, dict[str, Any]] = {}
            for row in rows:
                quality = _require_text(filename, row, "quality")
                _require_chinese(filename, row, "effect_description_zh")
                effect_id = _require_id(filename, row, "effect_id")
                profile_key = (hero_skill_id, quality, effect_id)
                if quality not in QUALITIES or profile_key in seen_profile_effects:
                    raise ExportError(f"HERO_SKILL_PROFILE_INVALID:{hero_skill_id}:{quality}")
                seen_profile_effects.add(profile_key)
                if effect_id in global_effect_ids:
                    raise ExportError(f"HERO_SKILL_EFFECT_ID_DUPLICATE:{effect_id}")
                global_effect_ids.add(effect_id)
                if quality in profiles:
                    raise ExportError(f"HERO_SKILL_PROFILE_EFFECT_COUNT_INVALID:{hero_skill_id}:{quality}")
                target_type = _require_text(filename, row, "target_type")
                operation_type = _require_text(filename, row, "operation_type")
                if target_type not in HERO_SKILL_TARGETS:
                    raise ExportError(f"HERO_SKILL_TARGET_INVALID:{effect_id}")
                if operation_type not in HERO_SKILL_OPERATIONS:
                    raise ExportError(f"HERO_SKILL_OPERATION_INVALID:{effect_id}")
                amount = _integer(filename, row, "amount", 0)
                ticks = _integer(filename, row, "ticks", 0)
                if operation_type == "deal_damage":
                    valid = target_type == "opponent_hero" and amount > 0 and ticks == 0
                elif operation_type == "charge":
                    valid = target_type == "source_item" and amount == 0 and ticks > 0
                else:
                    valid = target_type == "owner_hero" and amount > 0 and ticks == 0
                if not valid:
                    raise ExportError(f"HERO_SKILL_EFFECT_PARAMS_INVALID:{effect_id}")
                profiles[quality] = {
                    "maxTriggersPerBattle": _integer(
                        filename, row, "max_triggers_per_battle", 1
                    ),
                    "effects": [{
                        "effectId": effect_id,
                        "targetType": target_type,
                        "operationType": operation_type,
                        "amount": amount,
                        "ticks": ticks,
                    }],
                }
            if sorted(profiles, key=QUALITIES.index) != QUALITIES:
                raise ExportError(f"HERO_SKILL_QUALITY_COVERAGE_INVALID:{hero_skill_id}")
            result[hero_skill_id] = {
                "heroSkillId": hero_skill_id,
                "heroId": hero_id,
                "priority": priority,
                "triggerEvent": HERO_SKILL_TRIGGER,
                "reentrant": False,
                "qualityProfiles": {quality: profiles[quality] for quality in QUALITIES},
            }
        return result

    def _hero_skill_loadouts(
        self,
        hero: dict[str, Any],
        hero_skills: dict[str, dict[str, Any]],
    ) -> dict[str, dict[str, list[dict[str, Any]]]]:
        filename = "63_bz_hero_skill_loadouts.csv"
        grouped: dict[str, dict[str, list[dict[str, Any]]]] = {
            "starter": defaultdict(list),
            "ghost_snapshot": defaultdict(list),
        }
        instance_ids: set[str] = set()
        for row in self.tables[filename]:
            _formal(filename, row)
            loadout_kind = _require_text(filename, row, "loadout_kind")
            if loadout_kind not in grouped:
                raise ExportError(f"HERO_SKILL_LOADOUT_KIND_INVALID:{loadout_kind}")
            loadout_id = _require_id(filename, row, "loadout_id")
            instance_id = _require_id(filename, row, "instance_id")
            if instance_id in instance_ids:
                raise ExportError(f"HERO_SKILL_INSTANCE_ID_DUPLICATE:{instance_id}")
            instance_ids.add(instance_id)
            hero_skill_id = _require_id(filename, row, "hero_skill_id")
            skill = hero_skills.get(hero_skill_id)
            if skill is None:
                raise ExportError(f"HERO_SKILL_LOADOUT_SKILL_UNKNOWN:{hero_skill_id}")
            quality = _require_text(filename, row, "quality")
            if quality not in skill["qualityProfiles"]:
                raise ExportError(f"HERO_SKILL_LOADOUT_QUALITY_INVALID:{instance_id}")
            source_type = _require_text(filename, row, "source_type")
            expected_source_type = (
                "starting_loadout" if loadout_kind == "starter" else "offline_snapshot"
            )
            source_id = _require_id(filename, row, "source_id")
            if source_type != expected_source_type or source_id != loadout_id:
                raise ExportError(f"HERO_SKILL_LOADOUT_SOURCE_INVALID:{instance_id}")
            if loadout_kind == "starter" and (
                loadout_id != hero["heroId"] or skill["heroId"] != hero["heroId"]
                or quality != "bronze"
            ):
                raise ExportError(f"HERO_STARTING_SKILL_INVALID:{instance_id}")
            grouped[loadout_kind][loadout_id].append({
                "instanceId": instance_id,
                "heroSkillId": hero_skill_id,
                "quality": quality,
                "sourceType": source_type,
                "sourceId": source_id,
                "acquiredDay": _integer(filename, row, "acquired_day", 1),
                "acquiredSeq": _integer(filename, row, "acquired_seq", 1),
            })
        starter_groups = grouped["starter"]
        if set(starter_groups) != {hero["heroId"]}:
            raise ExportError("HERO_STARTING_SKILL_LOADOUT_INVALID")
        for kind_groups in grouped.values():
            for loadout_id, instances in kind_groups.items():
                instances.sort(key=lambda value: (value["acquiredSeq"], value["instanceId"]))
                sequences = [value["acquiredSeq"] for value in instances]
                skill_ids = [value["heroSkillId"] for value in instances]
                if sequences != list(range(1, len(instances) + 1)) \
                        or len(skill_ids) != len(set(skill_ids)):
                    raise ExportError(f"HERO_SKILL_LOADOUT_ORDER_INVALID:{loadout_id}")
        starter_skill_ids = {value["heroSkillId"] for value in starter_groups[hero["heroId"]]}
        if not starter_skill_ids or not starter_skill_ids.issubset(set(hero_skills)):
            raise ExportError("HERO_STARTING_SKILL_COVERAGE_INVALID")
        return grouped

    def _hero_skill_training(
        self,
        hero: dict[str, Any],
        hero_skills: dict[str, dict[str, Any]],
        stalls: dict[str, dict[str, Any]],
        item_offer_ids: set[str],
        item_upgrade_ids: set[str],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        trainer_file = "64_bz_hero_skill_trainers.csv"
        offer_file = "65_bz_hero_skill_offers.csv"
        trainer_rows = _unique(self.tables[trainer_file], trainer_file, "trainer_id")
        trainers: dict[str, dict[str, Any]] = {}
        for trainer_id, row in trainer_rows.items():
            _formal(trainer_file, row)
            _require_chinese(trainer_file, row, "name_zh")
            _require_chinese(trainer_file, row, "description_zh")
            hero_id = _require_id(trainer_file, row, "hero_id")
            stall_id = _require_id(trainer_file, row, "stall_id")
            if trainer_id in set(hero_skills) | set(self.item_skills.values()) | set(stalls):
                raise ExportError(f"HERO_SKILL_TRAINER_ID_CROSS_DIRECTORY:{trainer_id}")
            if hero_id != hero["heroId"]:
                raise ExportError(f"HERO_SKILL_TRAINER_OWNER_INVALID:{trainer_id}")
            if stall_id not in stalls:
                raise ExportError(f"HERO_SKILL_TRAINER_STALL_UNKNOWN:{trainer_id}")
            trainers[trainer_id] = {
                "trainerId": trainer_id,
                "heroId": hero_id,
                "stallId": stall_id,
                "offerSlots": _integer(trainer_file, row, "offer_slots", 1),
                "offerIds": [],
            }
        if not trainers:
            raise ExportError("HERO_SKILL_TRAINER_CATALOG_REQUIRED")

        offers_by_trainer: dict[str, list[dict[str, Any]]] = defaultdict(list)
        offer_ids: set[str] = set()
        upgrade_ids: set[str] = set()
        learn_keys: set[tuple[str, str]] = set()
        for row in self.tables[offer_file]:
            _formal(offer_file, row)
            offer_id = _require_id(offer_file, row, "offer_id")
            if offer_id in offer_ids or offer_id in item_offer_ids \
                    or offer_id in trainers or offer_id in hero_skills \
                    or offer_id in self.item_skills.values():
                raise ExportError(f"HERO_SKILL_OFFER_ID_DUPLICATE:{offer_id}")
            offer_ids.add(offer_id)
            trainer_id = _require_id(offer_file, row, "trainer_id")
            trainer = trainers.get(trainer_id)
            if trainer is None:
                raise ExportError(f"HERO_SKILL_OFFER_TRAINER_UNKNOWN:{offer_id}")
            hero_skill_id = _require_id(offer_file, row, "hero_skill_id")
            skill = hero_skills.get(hero_skill_id)
            if skill is None:
                raise ExportError(f"HERO_SKILL_OFFER_SKILL_UNKNOWN:{offer_id}")
            if skill["heroId"] != trainer["heroId"]:
                raise ExportError(f"HERO_SKILL_OFFER_OWNER_INVALID:{offer_id}")
            _require_chinese(offer_file, row, "name_zh")
            _require_chinese(offer_file, row, "description_zh")
            action_type = _require_text(offer_file, row, "action_type")
            from_quality = row.get("from_quality", "")
            to_quality = _require_text(offer_file, row, "to_quality")
            if to_quality not in QUALITIES:
                raise ExportError(f"HERO_SKILL_OFFER_QUALITY_INVALID:{offer_id}")
            if action_type == "learn":
                if row.get("upgrade_id", "") or from_quality or to_quality != "bronze":
                    raise ExportError(f"HERO_SKILL_LEARN_ACTION_INVALID:{offer_id}")
                learn_key = (trainer_id, hero_skill_id)
                if learn_key in learn_keys:
                    raise ExportError(f"HERO_SKILL_LEARN_OFFER_DUPLICATE:{trainer_id}:{hero_skill_id}")
                learn_keys.add(learn_key)
                action = {"type": "learn", "toQuality": to_quality}
            elif action_type == "upgrade":
                upgrade_id = _require_id(offer_file, row, "upgrade_id")
                if upgrade_id in upgrade_ids or upgrade_id in item_upgrade_ids:
                    raise ExportError(f"HERO_SKILL_UPGRADE_ID_DUPLICATE:{upgrade_id}")
                upgrade_ids.add(upgrade_id)
                if from_quality not in QUALITIES \
                        or QUALITIES.index(from_quality) + 1 >= len(QUALITIES) \
                        or QUALITIES[QUALITIES.index(from_quality) + 1] != to_quality:
                    raise ExportError(f"HERO_SKILL_UPGRADE_TRANSITION_INVALID:{offer_id}")
                action = {
                    "type": "upgrade",
                    "upgradeId": upgrade_id,
                    "fromQuality": from_quality,
                    "toQuality": to_quality,
                }
            else:
                raise ExportError(f"HERO_SKILL_OFFER_ACTION_INVALID:{offer_id}")
            if _require_text(offer_file, row, "price_currency") != "gold":
                raise ExportError(f"HERO_SKILL_OFFER_CURRENCY_INVALID:{offer_id}")
            from_day = _integer(offer_file, row, "from_day", 1)
            to_day = _integer(offer_file, row, "to_day", 1)
            if to_day < from_day:
                raise ExportError(f"HERO_SKILL_OFFER_DAY_WINDOW_INVALID:{offer_id}")
            offers_by_trainer[trainer_id].append({
                "offerId": offer_id,
                "trainerId": trainer_id,
                "heroSkillId": hero_skill_id,
                "action": action,
                "price": {
                    "currency": "gold",
                    "amount": _integer(offer_file, row, "price_amount", 1),
                },
                "availability": {"fromDay": from_day, "toDay": to_day},
                "order": _integer(offer_file, row, "offer_order", 1),
            })
        if not offer_ids:
            raise ExportError("HERO_SKILL_OFFER_CATALOG_REQUIRED")

        trainer_skill_owners: dict[str, str] = {}
        ordered_offers: list[dict[str, Any]] = []
        for trainer_id, trainer in trainers.items():
            trainer_offers = offers_by_trainer.get(trainer_id, [])
            trainer_offers.sort(key=lambda value: (value["order"], value["offerId"]))
            orders = [value["order"] for value in trainer_offers]
            skill_ids = {value["heroSkillId"] for value in trainer_offers}
            if orders != list(range(1, len(trainer_offers) + 1)):
                raise ExportError(f"HERO_SKILL_OFFER_ORDER_INVALID:{trainer_id}")
            if len(skill_ids) != 1:
                raise ExportError(f"HERO_SKILL_TRAINER_SKILL_OWNERSHIP_INVALID:{trainer_id}")
            if trainer["offerSlots"] > len(trainer_offers):
                raise ExportError(f"HERO_SKILL_TRAINER_OFFER_SLOTS_INVALID:{trainer_id}")
            hero_skill_id = next(iter(skill_ids))
            if hero_skill_id in trainer_skill_owners:
                raise ExportError(f"HERO_SKILL_TRAINER_SKILL_DUPLICATE:{hero_skill_id}")
            trainer_skill_owners[hero_skill_id] = trainer_id
            trainer["offerIds"] = [value["offerId"] for value in trainer_offers]
            ordered_offers.extend(trainer_offers)
        if set(trainer_skill_owners) != set(hero_skills):
            raise ExportError("HERO_SKILL_TRAINER_SKILL_COVERAGE_INVALID")
        return (
            [trainers[trainer_id] for trainer_id in sorted(trainers)],
            sorted(ordered_offers, key=lambda value: value["offerId"]),
        )

    def _validate_hero_skill_training_reachability(
        self,
        hero_skills: dict[str, dict[str, Any]],
        starting_hero_skills: list[dict[str, Any]],
        trainers: list[dict[str, Any]],
        offers: list[dict[str, Any]],
        schedule: dict[str, Any],
        run_day_max: int,
    ) -> None:
        schedule_stalls = {
            node_id
            for hour in schedule["hours"]
            if hour["kind"] == "choice"
            for node_id in hour["nodeTypes"]
        }
        if any(trainer["stallId"] not in schedule_stalls for trainer in trainers):
            raise ExportError("HERO_SKILL_TRAINER_SCHEDULE_UNREACHABLE")
        if any(
            offer["availability"]["toDay"] > run_day_max
            for offer in offers
        ):
            raise ExportError("HERO_SKILL_OFFER_DAY_WINDOW_INVALID")
        starting_skill_ids = {value["heroSkillId"] for value in starting_hero_skills}
        learn_by_skill: dict[str, list[dict[str, Any]]] = defaultdict(list)
        upgrade_by_transition: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
        for offer in offers:
            action = offer["action"]
            if action["type"] == "learn":
                learn_by_skill[offer["heroSkillId"]].append(offer)
            else:
                upgrade_by_transition[(
                    offer["heroSkillId"], action["fromQuality"], action["toQuality"]
                )].append(offer)
        expected_learn_skills = set(hero_skills) - starting_skill_ids
        if set(learn_by_skill) != expected_learn_skills \
                or any(len(values) != 1 for values in learn_by_skill.values()):
            raise ExportError("HERO_SKILL_LEARN_PATH_INVALID")
        expected_transitions = {
            (hero_skill_id, QUALITIES[index], QUALITIES[index + 1])
            for hero_skill_id in hero_skills
            for index in range(len(QUALITIES) - 1)
        }
        if set(upgrade_by_transition) != expected_transitions \
                or any(len(values) != 1 for values in upgrade_by_transition.values()):
            raise ExportError("HERO_SKILL_UPGRADE_PATH_INVALID")

        reachable: dict[tuple[str, str], int] = {
            (value["heroSkillId"], value["quality"]): value["acquiredDay"]
            for value in starting_hero_skills
        }
        for hero_skill_id, skill_offers in learn_by_skill.items():
            offer = skill_offers[0]
            reachable[(hero_skill_id, offer["action"]["toQuality"])] = \
                offer["availability"]["fromDay"]
        changed = True
        while changed:
            changed = False
            for (hero_skill_id, from_quality, to_quality), skill_offers in upgrade_by_transition.items():
                source_day = reachable.get((hero_skill_id, from_quality))
                offer = skill_offers[0]
                if source_day is None:
                    continue
                target_day = max(source_day, offer["availability"]["fromDay"])
                if target_day <= offer["availability"]["toDay"] \
                        and target_day < reachable.get((hero_skill_id, to_quality), run_day_max + 1):
                    reachable[(hero_skill_id, to_quality)] = target_day
                    changed = True
        expected_profiles = {
            (hero_skill_id, quality)
            for hero_skill_id in hero_skills
            for quality in QUALITIES
        }
        if set(reachable) != expected_profiles \
                or any(day > run_day_max for day in reachable.values()):
            raise ExportError("HERO_SKILL_PROFILE_MAXIMUM_DAY_REACHABILITY_INVALID")

    def _hero(self) -> dict[str, Any]:
        filename = "45_bz_heroes.csv"
        rows = self.tables[filename]
        if len(rows) != 1:
            raise ExportError("BOOTSTRAP_HERO_SINGLETON_REQUIRED")
        row = rows[0]
        _formal(filename, row)
        hero_id = _require_id(filename, row, "hero_id")
        _require_chinese(filename, row, "name_zh")
        hero = {
            "heroId": hero_id,
            "level": _integer(filename, row, "start_level", 1),
            "experience": _integer(filename, row, "start_xp", 0),
            "prestige": _integer(filename, row, "start_prestige", 0),
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
        item_skills: dict[str, dict[str, Any]],
        hero_skills: dict[str, dict[str, Any]],
        starting_hero_skills: list[dict[str, Any]],
        hero_skill_trainers: list[dict[str, Any]],
        hero_skill_offers: list[dict[str, Any]],
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
                "heroSkillIds": sorted(hero_skills),
                "startingHeroSkills": starting_hero_skills,
            }],
            "itemSkills": [
                {
                    "itemSkillId": item_skill_id,
                    "triggerEvents": sorted(item_skills[item_skill_id]["triggerEvents"]),
                    "effectIds": sorted(item_skills[item_skill_id]["effectIds"]),
                    "auraIds": sorted(item_skills[item_skill_id]["auraIds"]),
                }
                for item_skill_id in sorted(item_skills)
            ],
            "heroSkills": [hero_skills[hero_skill_id] for hero_skill_id in sorted(hero_skills)],
            "heroSkillTrainers": hero_skill_trainers,
            "heroSkillOffers": hero_skill_offers,
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
        last_chance_rules: dict[str, Any],
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
            # The current 23-domain workbook is the finite v30 candidate source.
            # This adapter is its explicit one-way projection into executable v32.
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
            "crit_contract": CRIT_CONTRACT,
            "chance_scale_bps": str(CRIT_CHANCE_SCALE_BPS),
            "rounding_mode": CRIT_ROUNDING_MODE,
            "roll_scope": CRIT_ROLL_SCOPE,
            "draw_policy": CRIT_DRAW_POLICY,
            "crit_growth_stacking_policy": CRIT_GROWTH_STACKING_POLICY,
            "crit_growth_cap_policy": CRIT_GROWTH_CAP_POLICY,
            "crit_growth_timing_policy": CRIT_GROWTH_TIMING_POLICY,
            "crit_growth_eligible_target_policy": CRIT_GROWTH_ELIGIBLE_TARGET_POLICY,
            "crit_growth_rng_policy": CRIT_GROWTH_RNG_POLICY,
            "crit_success_response_evidence_policy": CRIT_SUCCESS_RESPONSE_EVIDENCE_POLICY,
            "crit_success_response_source_policy": CRIT_SUCCESS_RESPONSE_SOURCE_POLICY,
            "crit_success_response_timing_policy": CRIT_SUCCESS_RESPONSE_TIMING_POLICY,
            "crit_success_response_repeat_policy": CRIT_SUCCESS_RESPONSE_REPEAT_POLICY,
            "crit_success_response_terminal_policy": CRIT_SUCCESS_RESPONSE_TERMINAL_POLICY,
            "crit_success_response_rng_policy": CRIT_SUCCESS_RESPONSE_RNG_POLICY,
            "ammo_depletion_contract": AMMO_DEPLETION_CONTRACT,
            "ammo_depletion_trigger_policy": AMMO_DEPLETION_TRIGGER_POLICY,
            "ammo_depletion_evaluation_phase": AMMO_DEPLETION_EVALUATION_PHASE,
            "ammo_depletion_snapshot_policy": AMMO_DEPLETION_SNAPSHOT_POLICY,
            "ammo_depletion_repeat_policy": AMMO_DEPLETION_REPEAT_POLICY,
            "ammo_depletion_non_ammo_policy": AMMO_DEPLETION_NON_AMMO_POLICY,
            "ammo_depletion_reload_policy": AMMO_DEPLETION_RELOAD_POLICY,
            "ammo_depletion_rng_policy": AMMO_DEPLETION_RNG_POLICY,
            "burn_contract": BURN_CONTRACT,
            "burn_pulse_interval_ticks": str(BURN_PULSE_INTERVAL_TICKS),
            "burn_first_pulse_policy": BURN_FIRST_PULSE_POLICY,
            "burn_pulse_phase": BURN_PULSE_PHASE,
            "burn_damage_per_stack": str(BURN_DAMAGE_PER_STACK),
            "burn_decay_stacks_per_pulse": str(BURN_DECAY_STACKS_PER_PULSE),
            "burn_shield_policy": BURN_SHIELD_POLICY,
            "burn_resolution_order": BURN_RESOLUTION_ORDER,
            "burn_max_stacks": str(BURN_MAX_STACKS),
            "burn_stack_overflow_policy": BURN_STACK_OVERFLOW_POLICY,
            "poison_contract": POISON_CONTRACT,
            "poison_pulse_interval_ticks": str(POISON_PULSE_INTERVAL_TICKS),
            "poison_first_pulse_policy": POISON_FIRST_PULSE_POLICY,
            "poison_reapply_schedule_policy": POISON_REAPPLY_SCHEDULE_POLICY,
            "poison_pulse_phase": POISON_PULSE_PHASE,
            "poison_damage_per_stack": str(POISON_DAMAGE_PER_STACK),
            "poison_decay_stacks_per_pulse": str(POISON_DECAY_STACKS_PER_PULSE),
            "poison_shield_policy": POISON_SHIELD_POLICY,
            "poison_resolution_order": POISON_RESOLUTION_ORDER,
            "poison_heal_cleanse_policy": POISON_HEAL_CLEANSE_POLICY,
            "poison_crit_policy": POISON_CRIT_POLICY,
            "poison_max_stacks": str(POISON_MAX_STACKS),
            "poison_stack_overflow_policy": POISON_STACK_OVERFLOW_POLICY,
            "heal_status_cleanse_contract": HEAL_STATUS_CLEANSE_CONTRACT,
            "heal_status_cleanse_trigger_policy": HEAL_STATUS_CLEANSE_TRIGGER_POLICY,
            "heal_status_cleanse_heal_basis": HEAL_STATUS_CLEANSE_HEAL_BASIS,
            "heal_status_cleanse_scale_bps": str(HEAL_STATUS_CLEANSE_SCALE_BPS),
            "heal_status_cleanse_rounding_mode": HEAL_STATUS_CLEANSE_ROUNDING_MODE,
            "heal_status_cleanse_status_targets": ", ".join(HEAL_STATUS_CLEANSE_STATUS_TARGETS),
            "heal_status_cleanse_status_resolution_policy": HEAL_STATUS_CLEANSE_STATUS_RESOLUTION_POLICY,
            "heal_status_cleanse_poison_schedule_policy": HEAL_STATUS_CLEANSE_POISON_SCHEDULE_POLICY,
            "heal_status_cleanse_trace_emit_policy": HEAL_STATUS_CLEANSE_TRACE_EMIT_POLICY,
            "heal_status_cleanse_crit_policy": HEAL_STATUS_CLEANSE_CRIT_POLICY,
            "heal_status_cleanse_rng_policy": HEAL_STATUS_CLEANSE_RNG_POLICY,
            "damage_aura_contract": DAMAGE_AURA_CONTRACT,
            "damage_aura_evaluation_policy": DAMAGE_AURA_EVALUATION_POLICY,
            "damage_aura_target_snapshot_policy": DAMAGE_AURA_TARGET_SNAPSHOT_POLICY,
            "damage_aura_target_order": DAMAGE_AURA_TARGET_ORDER,
            "damage_aura_stacking_policy": DAMAGE_AURA_STACKING_POLICY,
            "damage_aura_damage_phase": DAMAGE_AURA_DAMAGE_PHASE,
            "damage_aura_source_lifecycle_policy": DAMAGE_AURA_SOURCE_LIFECYCLE_POLICY,
            "damage_aura_overflow_policy": DAMAGE_AURA_OVERFLOW_POLICY,
            "damage_aura_rng_policy": DAMAGE_AURA_RNG_POLICY,
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
            "pve_win_bonus_xp", "ghost_loss_prestige", "ghost_draw_prestige", "win_target",
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
                or globals_int["pve_win_bonus_xp"] < 0 \
                or any(globals_int[field] <= 0 for field in [
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
        damage_multiplier_text = _same(rows, filename, "damage_multiplier_bps")
        if not INTEGER_RE.fullmatch(damage_multiplier_text):
            raise ExportError("GAMEPLAY_INTEGER_INVALID:damage_multiplier_bps")
        damage_multiplier_bps = int(damage_multiplier_text)
        if damage_multiplier_bps <= CRIT_CHANCE_SCALE_BPS \
                or damage_multiplier_bps > CRIT_DAMAGE_MULTIPLIER_MAX_BPS:
            raise ExportError("GAMEPLAY_CRIT_DAMAGE_MULTIPLIER_INVALID")
        identity["critRules"] = {
            "contractId": CRIT_CONTRACT,
            "chanceScaleBps": CRIT_CHANCE_SCALE_BPS,
            "damageMultiplierBps": damage_multiplier_bps,
            "roundingMode": CRIT_ROUNDING_MODE,
            "rollScope": CRIT_ROLL_SCOPE,
            "drawPolicy": CRIT_DRAW_POLICY,
            "growthStackingPolicy": CRIT_GROWTH_STACKING_POLICY,
            "growthCapPolicy": CRIT_GROWTH_CAP_POLICY,
            "growthTimingPolicy": CRIT_GROWTH_TIMING_POLICY,
            "growthEligibleTargetPolicy": CRIT_GROWTH_ELIGIBLE_TARGET_POLICY,
            "growthRngPolicy": CRIT_GROWTH_RNG_POLICY,
            "successResponseEvidencePolicy": CRIT_SUCCESS_RESPONSE_EVIDENCE_POLICY,
            "successResponseSourcePolicy": CRIT_SUCCESS_RESPONSE_SOURCE_POLICY,
            "successResponseTimingPolicy": CRIT_SUCCESS_RESPONSE_TIMING_POLICY,
            "successResponseRepeatPolicy": CRIT_SUCCESS_RESPONSE_REPEAT_POLICY,
            "successResponseTerminalPolicy": CRIT_SUCCESS_RESPONSE_TERMINAL_POLICY,
            "successResponseRngPolicy": CRIT_SUCCESS_RESPONSE_RNG_POLICY,
        }
        identity["ammoDepletionRules"] = {
            "contractId": AMMO_DEPLETION_CONTRACT,
            "triggerPolicy": AMMO_DEPLETION_TRIGGER_POLICY,
            "evaluationPhase": AMMO_DEPLETION_EVALUATION_PHASE,
            "snapshotPolicy": AMMO_DEPLETION_SNAPSHOT_POLICY,
            "repeatPolicy": AMMO_DEPLETION_REPEAT_POLICY,
            "nonAmmoPolicy": AMMO_DEPLETION_NON_AMMO_POLICY,
            "reloadPolicy": AMMO_DEPLETION_RELOAD_POLICY,
            "rngPolicy": AMMO_DEPLETION_RNG_POLICY,
        }
        identity["burnRules"] = {
            "contractId": BURN_CONTRACT,
            "pulseIntervalTicks": BURN_PULSE_INTERVAL_TICKS,
            "firstPulsePolicy": BURN_FIRST_PULSE_POLICY,
            "pulsePhase": BURN_PULSE_PHASE,
            "damagePerStack": BURN_DAMAGE_PER_STACK,
            "decayStacksPerPulse": BURN_DECAY_STACKS_PER_PULSE,
            "shieldPolicy": BURN_SHIELD_POLICY,
            "resolutionOrder": BURN_RESOLUTION_ORDER,
            "maxStacks": BURN_MAX_STACKS,
            "stackOverflowPolicy": BURN_STACK_OVERFLOW_POLICY,
        }
        identity["poisonRules"] = {
            "contractId": POISON_CONTRACT,
            "pulseIntervalTicks": POISON_PULSE_INTERVAL_TICKS,
            "firstPulsePolicy": POISON_FIRST_PULSE_POLICY,
            "reapplySchedulePolicy": POISON_REAPPLY_SCHEDULE_POLICY,
            "pulsePhase": POISON_PULSE_PHASE,
            "damagePerStack": POISON_DAMAGE_PER_STACK,
            "decayStacksPerPulse": POISON_DECAY_STACKS_PER_PULSE,
            "shieldPolicy": POISON_SHIELD_POLICY,
            "resolutionOrder": POISON_RESOLUTION_ORDER,
            "healCleansePolicy": POISON_HEAL_CLEANSE_POLICY,
            "critPolicy": POISON_CRIT_POLICY,
            "maxStacks": POISON_MAX_STACKS,
            "stackOverflowPolicy": POISON_STACK_OVERFLOW_POLICY,
        }
        identity["healStatusCleanseRules"] = {
            "contractId": HEAL_STATUS_CLEANSE_CONTRACT,
            "triggerPolicy": HEAL_STATUS_CLEANSE_TRIGGER_POLICY,
            "healBasis": HEAL_STATUS_CLEANSE_HEAL_BASIS,
            "cleanseScaleBps": HEAL_STATUS_CLEANSE_SCALE_BPS,
            "roundingMode": HEAL_STATUS_CLEANSE_ROUNDING_MODE,
            "statusTargets": list(HEAL_STATUS_CLEANSE_STATUS_TARGETS),
            "statusResolutionPolicy": HEAL_STATUS_CLEANSE_STATUS_RESOLUTION_POLICY,
            "poisonSchedulePolicy": HEAL_STATUS_CLEANSE_POISON_SCHEDULE_POLICY,
            "traceEmitPolicy": HEAL_STATUS_CLEANSE_TRACE_EMIT_POLICY,
            "critPolicy": HEAL_STATUS_CLEANSE_CRIT_POLICY,
            "rngPolicy": HEAL_STATUS_CLEANSE_RNG_POLICY,
        }
        identity["damageAuraRules"] = {
            "contractId": DAMAGE_AURA_CONTRACT,
            "evaluationPolicy": DAMAGE_AURA_EVALUATION_POLICY,
            "targetSnapshotPolicy": DAMAGE_AURA_TARGET_SNAPSHOT_POLICY,
            "targetOrder": DAMAGE_AURA_TARGET_ORDER,
            "stackingPolicy": DAMAGE_AURA_STACKING_POLICY,
            "damagePhase": DAMAGE_AURA_DAMAGE_PHASE,
            "sourceLifecyclePolicy": DAMAGE_AURA_SOURCE_LIFECYCLE_POLICY,
            "overflowPolicy": DAMAGE_AURA_OVERFLOW_POLICY,
            "rngPolicy": DAMAGE_AURA_RNG_POLICY,
        }
        prestige_battle_kind = _same(rows, filename, "prestige_battle_kind")
        if prestige_battle_kind != "ghost":
            raise ExportError("PRESTIGE_POLICY_SCOPE_INVALID")
        last_chance_policy_id = _same(rows, filename, "last_chance_policy_id")
        if not STABLE_ID_RE.fullmatch(last_chance_policy_id) \
                or last_chance_policy_id != last_chance_rules["policyId"]:
            raise ExportError("LAST_CHANCE_POLICY_REFERENCE_INVALID")
        if last_chance_rules["trigger"]["battleKind"] != prestige_battle_kind:
            raise ExportError("LAST_CHANCE_TRIGGER_INVALID")
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
            "prestigePolicy": {
                "schema": PRESTIGE_POLICY_SCHEMA,
                "schemaVersion": PRESTIGE_POLICY_SCHEMA_VERSION,
                "affectedBattleKind": prestige_battle_kind,
                "lossAmount": globals_int["ghost_loss_prestige"],
                "drawAmount": globals_int["ghost_draw_prestige"],
            },
            "terminalRules": {
                "winTarget": globals_int["win_target"],
                "lastChancePolicyId": last_chance_policy_id,
            },
            "lastChanceRules": last_chance_rules,
        }, identity

    def _ghost_snapshots(
        self,
        content_revision: str,
        hero: dict[str, Any],
        hero_skills: dict[str, dict[str, Any]],
        ghost_loadouts: dict[str, list[dict[str, Any]]],
    ) -> dict[str, dict[str, Any]]:
        filename = "60_bz_ghost_snapshots.csv"
        grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
        global_instances: set[str] = set()
        for row in self.tables[filename]:
            _formal(filename, row)
            snapshot_id = _require_id(filename, row, "snapshot_id")
            grouped[snapshot_id].append(row)
        snapshots: dict[str, dict[str, Any]] = {}
        for snapshot_id in sorted(grouped):
            rows = grouped[snapshot_id]
            if _same(rows, filename, "schema") != GHOST_SNAPSHOT_SCHEMA \
                    or _same(rows, filename, "schema_version") != str(GHOST_SNAPSHOT_SCHEMA_VERSION):
                raise ExportError(f"GHOST_SNAPSHOT_SCHEMA_INVALID:{snapshot_id}")
            if _same(rows, filename, "match_source") != GHOST_MATCH_SOURCE:
                raise ExportError(f"GHOST_SNAPSHOT_MATCH_SOURCE_INVALID:{snapshot_id}")
            if _same(rows, filename, "opponent_content_revision") != content_revision:
                raise ExportError(f"GHOST_SNAPSHOT_CONTENT_REVISION_INVALID:{snapshot_id}")
            hero_id = _same(rows, filename, "hero_id")
            if hero_id != hero["heroId"]:
                raise ExportError(f"GHOST_SNAPSHOT_HERO_UNKNOWN:{snapshot_id}:{hero_id}")
            hero_level_text = _same(rows, filename, "hero_level")
            if not INTEGER_RE.fullmatch(hero_level_text) or int(hero_level_text) < 1:
                raise ExportError(f"GHOST_SNAPSHOT_HERO_LEVEL_INVALID:{snapshot_id}")
            day_match = re.fullmatch(r"ghost_snapshot_day_([0-9]{2})", snapshot_id)
            if day_match is None:
                raise ExportError(f"GHOST_SNAPSHOT_ID_INVALID:{snapshot_id}")
            day = int(day_match.group(1))
            expected_quality = (
                "bronze" if day <= 3 else "silver" if day <= 6
                else "gold" if day <= 9 else "diamond"
            )
            hero_skill_instances = ghost_loadouts.get(snapshot_id, [])
            ghost_skill_ids = {value["heroSkillId"] for value in hero_skill_instances}
            if not hero_skill_instances or len(ghost_skill_ids) != len(hero_skill_instances) \
                    or not ghost_skill_ids.issubset(set(hero_skills)):
                raise ExportError(f"GHOST_HERO_SKILL_LOADOUT_INVALID:{snapshot_id}")
            for value in hero_skill_instances:
                skill = hero_skills[value["heroSkillId"]]
                if skill["heroId"] != hero_id or value["sourceType"] != "offline_snapshot" \
                        or value["sourceId"] != snapshot_id or value["acquiredDay"] != day \
                        or value["quality"] != expected_quality:
                    raise ExportError(f"GHOST_HERO_SKILL_INSTANCE_INVALID:{value['instanceId']}")
            hero_hp_text = _same(rows, filename, "hero_hp")
            hero_max_text = _same(rows, filename, "hero_max_hp")
            if not INTEGER_RE.fullmatch(hero_hp_text) or not INTEGER_RE.fullmatch(hero_max_text):
                raise ExportError(f"GHOST_SNAPSHOT_HERO_HP_INVALID:{snapshot_id}")
            hero_hp, hero_max = int(hero_hp_text), int(hero_max_text)
            if hero_hp <= 0 or hero_max <= 0 or hero_hp > hero_max:
                raise ExportError(f"GHOST_SNAPSHOT_HERO_HP_INVALID:{snapshot_id}")
            instances: list[dict[str, Any]] = []
            for row in rows:
                instance_id = _require_id(filename, row, "instance_id")
                if instance_id in global_instances:
                    raise ExportError(f"GHOST_SNAPSHOT_INSTANCE_ID_DUPLICATE:{instance_id}")
                global_instances.add(instance_id)
                item_id = _require_id(filename, row, "item_id")
                quality = _require_text(filename, row, "quality")
                if (item_id, quality) not in self.item_profiles:
                    raise ExportError(f"GHOST_SNAPSHOT_ITEM_QUALITY_UNKNOWN:{snapshot_id}:{instance_id}")
                enchantment = row.get("enchantment", "")
                if enchantment != "":
                    raise ExportError(f"GHOST_SNAPSHOT_ENCHANTMENT_UNSUPPORTED:{snapshot_id}:{instance_id}")
                instances.append({
                    "instanceId": instance_id,
                    "itemId": item_id,
                    "quality": quality,
                    "enchantment": enchantment,
                    "location": "board",
                    "startSlot": _integer(filename, row, "start_slot", 0),
                })
            instances.sort(key=lambda value: (value["startSlot"], value["instanceId"]))
            self._validate_placements(instances, f"GHOST_SNAPSHOT:{snapshot_id}")
            build = {
                "hero": {
                    "heroId": hero_id,
                    "level": int(hero_level_text),
                    "hp": hero_hp,
                    "maxHp": hero_max,
                },
                "heroSkills": hero_skill_instances,
                "board": {"placements": [
                    {"instanceId": item["instanceId"], "itemId": item["itemId"], "startSlot": item["startSlot"]}
                    for item in instances
                ]},
                "itemInstances": [
                    {key: item[key] for key in ["instanceId", "itemId", "quality", "enchantment"]}
                    for item in instances
                ],
            }
            snapshots[snapshot_id] = {
                "schema": GHOST_SNAPSHOT_SCHEMA,
                "schemaVersion": GHOST_SNAPSHOT_SCHEMA_VERSION,
                "snapshotId": snapshot_id,
                "matchSource": GHOST_MATCH_SOURCE,
                "opponentContentRevision": content_revision,
                "buildHash": hashlib.sha256(
                    _canonical_json(_canonical_combat_build(build)).encode("utf-8")
                ).hexdigest(),
                "build": build,
            }
        if not snapshots:
            raise ExportError("GHOST_SNAPSHOT_CATALOG_REQUIRED")
        if set(ghost_loadouts) != set(snapshots):
            raise ExportError("GHOST_HERO_SKILL_LOADOUT_COVERAGE_INVALID")
        return snapshots

    def _encounters(
        self,
        rewards: dict[str, dict[str, Any]],
        run_day_max: int,
        ghost_snapshots: dict[str, dict[str, Any]],
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
        ghost_encounters = []
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
            enemy_id = row.get("enemy_id", "")
            snapshot_id = row.get("snapshot_id", "")
            if kind == "pve":
                if not STABLE_ID_RE.fullmatch(enemy_id) or snapshot_id != "":
                    raise ExportError(f"ENCOUNTER_PVE_REFERENCE_INVALID:{encounter_id}")
                if enemy_id not in enemies:
                    raise ExportError(f"ENCOUNTER_ENEMY_UNKNOWN:{encounter_id}")
            elif not STABLE_ID_RE.fullmatch(snapshot_id) or enemy_id != "":
                raise ExportError(f"ENCOUNTER_GHOST_REFERENCE_INVALID:{encounter_id}")
            elif snapshot_id not in ghost_snapshots:
                raise ExportError(f"ENCOUNTER_GHOST_SNAPSHOT_UNKNOWN:{encounter_id}")
            reward_id = _require_id(encounter_file, row, "reward_id")
            if reward_id not in rewards:
                raise ExportError(f"ENCOUNTER_REWARD_UNKNOWN:{encounter_id}")
            if kind == "pve":
                templates.append({
                    "encounterTemplateId": encounter_id,
                    "rewardId": reward_id,
                    "enemy": enemies[enemy_id],
                })
            else:
                ghost_encounters.append({
                    "encounterId": encounter_id,
                    "rewardId": reward_id,
                    "snapshotId": snapshot_id,
                })
            layer_references[day][kind].append(encounter_id)
        required_keys = {
            (day, hour, "pve" if hour == 3 else "ghost")
            for day in range(1, run_day_max + 1)
            for hour in [3, 6]
        }
        if seen_keys != required_keys:
            raise ExportError("BOOTSTRAP_ENCOUNTER_COVERAGE_INVALID")
        referenced_enemy_ids = {
            row["enemy_id"] for row in encounter_rows.values() if row.get("kind") == "pve"
        }
        if referenced_enemy_ids != set(enemies):
            raise ExportError("ENCOUNTER_ENEMY_REFERENCE_COVERAGE_INVALID")
        referenced_snapshot_ids = {
            row["snapshot_id"] for row in encounter_rows.values() if row.get("kind") == "ghost"
        }
        if referenced_snapshot_ids != set(ghost_snapshots):
            raise ExportError("ENCOUNTER_GHOST_SNAPSHOT_COVERAGE_INVALID")
        templates.sort(key=lambda value: value["encounterTemplateId"])
        ghost_encounters.sort(key=lambda value: value["encounterId"])
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
                "ghostEncounterIds": ghost_ids,
            })
        return {
            "templates": templates,
            "ghostEncounters": ghost_encounters,
            "layers": layers,
            "ghostSnapshots": [ghost_snapshots[snapshot_id] for snapshot_id in sorted(ghost_snapshots)],
        }

    def _new_run(self, hero: dict[str, Any], starters: list[dict[str, Any]]) -> dict[str, Any]:
        # v3 intentionally leaves ownedHeroSkills to the runtime initial-state builder;
        # executableCatalogs.heroes owns the formal starting instances.
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
                "lastChance": {
                    "status": "available",
                    "policyId": "",
                    "optionIds": [],
                    "selectedOptionId": "",
                },
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
    seen_quality_profiles: set[tuple[str, str]] = set()
    for row in tables["62_bz_hero_skills.csv"]:
        _formal("62_bz_hero_skills.csv", row)
        hero_skill_id = _require_id("62_bz_hero_skills.csv", row, "hero_skill_id")
        quality = _require_text("62_bz_hero_skills.csv", row, "quality")
        profile_key = (hero_skill_id, quality)
        if quality not in QUALITIES or profile_key in seen_quality_profiles:
            raise ExportError(f"DISPLAY_HERO_SKILL_QUALITY_PROFILE_INVALID:{hero_skill_id}:{quality}")
        seen_quality_profiles.add(profile_key)
        name_zh = _require_chinese("62_bz_hero_skills.csv", row, "name_zh")
        effect_description_zh = _require_chinese(
            "62_bz_hero_skills.csv", row, "effect_description_zh"
        )
        source_id = f"{hero_skill_id}.{quality}"
        entries.append({
            "displayId": f"hero_skill_quality_profiles.{source_id}",
            "domain": "hero_skill_quality_profiles",
            "sourceId": source_id,
            "nameZh": f"{name_zh}·{QUALITY_NAMES_ZH[quality]}",
            "descriptionZh": effect_description_zh,
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
    parser = argparse.ArgumentParser(description="Export strict original-pirate v32 runtime and display candidates from 23 BZ CSV domains")
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
            "PASS original-pirate v32 candidate "
            f"items={len(package['items'])} hours={len(package['runtimeBundle']['scheduleConfig']['hours'])} "
            f"shopTemplates={len(package['runtimeBundle']['generation']['shop']['templates'])} "
            f"battleTemplates={len(package['runtimeBundle']['generation']['battle']['templates'])} "
            f"ghostEncounters={len(package['runtimeBundle']['generation']['battle']['ghostEncounters'])} "
            f"ghostSnapshots={len(package['runtimeBundle']['generation']['battle']['ghostSnapshots'])} "
            f"displayEntries={len(display['entries'])} "
            f"revision={package['contentRevision']}"
        )
        return 0
    if args.out:
        output = Path(args.out)
        _write_atomic(output, text)
        print(f"exported original-pirate v32 candidate to {output}")
    else:
        sys.stdout.write(text)
    if args.display_out:
        display_output = Path(args.display_out)
        _write_atomic(display_output, display_text)
        print(f"exported original-pirate display candidate to {display_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
