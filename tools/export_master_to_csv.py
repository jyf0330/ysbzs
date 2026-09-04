#!/usr/bin/env python3
"""Export planner-facing xlsx master rows into complete program CSV tables.

The master workbook intentionally keeps only human-editable columns. Existing
CSV files are used as the completion baseline for program-only and generated
columns, so a thin workbook can safely drive the current full CSV schema.
"""

import argparse
import csv
import hashlib
import posixpath
import re
import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
import bazaar_run_source_views as run_source_views

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MASTER = ROOT / "xlsx" / "ysbzs_master.xlsx"
DEFAULT_CSV_DIR = ROOT / "data" / "csv"

GENERATED_FILES = [
    "01_pets.csv",
    "02_monster_templates.csv",
    "03_monster_waves.csv",
    "04_mechanisms.csv",
    "06_shop_rewards.csv",
    "08_action_shapes.csv",
    "13_day7_beast_trial.csv",
]

ORIGINAL_PIRATE_EXPORTS = [
    ("BZ_GAMEPLAY", "44_bz_gameplay.csv"),
    ("BZ_HEROES", "45_bz_heroes.csv"),
    ("BZ_ITEMS", "46_bz_items.csv"),
    ("BZ_ITEM_EFFECTS", "47_bz_item_effects.csv"),
    ("BZ_ITEM_SKILLS", "48_bz_item_skills.csv"),
    ("BZ_STALLS", "49_bz_stalls.csv"),
    ("BZ_STALL_OFFERS", "50_bz_stall_offers.csv"),
    ("BZ_EVENTS", "51_bz_events.csv"),
    ("BZ_EVENT_OPTIONS", "52_bz_event_options.csv"),
    ("BZ_ENCOUNTERS", "53_bz_encounters.csv"),
    ("BZ_ENEMIES", "54_bz_enemies.csv"),
    ("BZ_REWARDS", "55_bz_rewards.csv"),
    ("BZ_SOURCE_SNAPSHOT", "56_bz_source_snapshot.csv"),
    ("BZ_ITEM_UPGRADES", "57_bz_item_upgrades.csv"),
    ("BZ_ENCHANTMENTS", "58_bz_enchantments.csv"),
    ("BZ_LEVEL_UP_CHOICES", "59_bz_level_up_choices.csv"),
    ("BZ_GHOST_SNAPSHOTS", "60_bz_ghost_snapshots.csv"),
    ("BZ_LAST_CHANCE_CHOICES", "61_bz_last_chance_choices.csv"),
    ("BZ_HERO_SKILLS", "62_bz_hero_skills.csv"),
    ("BZ_HERO_SKILL_LOADOUTS", "63_bz_hero_skill_loadouts.csv"),
    ("BZ_HERO_SKILL_TRAINERS", "64_bz_hero_skill_trainers.csv"),
    ("BZ_HERO_SKILL_OFFERS", "65_bz_hero_skill_offers.csv"),
    ("BZ_ITEM_AURAS", "66_bz_item_auras.csv"),
    ("BZ_ITEM_SOURCE_BINDINGS", "68_bz_item_source_bindings.csv"),
    ("BZ_HERO_SKILL_SOURCE_BINDINGS", "71_bz_hero_skill_source_bindings.csv"),
    ("BZ_HERO_SKILL_AURAS", "72_bz_hero_skill_auras.csv"),
]

REFERENCE_SOURCE_EXPORTS = [
    ("BAZAAR_OBJECTS", "34_bazaar_objects.csv"),
    ("BAZAAR_REFERENCE_SNAPSHOTS", "66_bazaar_reference_snapshots.csv"),
    ("BAZAAR_REFERENCE_MEMBERS", "67_bazaar_reference_members.csv"),
    (run_source_views.VIEW_SHEET, run_source_views.VIEW_FILE),
    (run_source_views.MEMBER_SHEET, run_source_views.MEMBER_FILE),
]

REFERENCE_MEMBER_HEADERS = ["source_snapshot_id", "source_type", "source_uuid"]

REFERENCE_SNAPSHOT_HEADERS = [
    "source_snapshot_id", "snapshot_role", "source_kind", "source_namespace",
    "game_id", "hero_scope", "game_patch", "game_build", "steam_app_id",
    "steam_announcement_gid", "published_at_utc", "captured_on", "official_api_url",
    "official_announcement_url", "raw_content_hash_algorithm", "raw_content_hash_subject",
    "raw_content_sha256", "record_count", "license_status", "usage_scope",
    "rule_verification_policy", "catalog_status", "unresolved_fields",
]

REFERENCE_OBJECT_HEADERS = [
    "object_id", "object_no", "source_type", "source_snapshot_id",
    "current_version_boundary_snapshot_id", "identity_confirmed", "rule_verified",
    "rule_unresolved_fields", "source_slug", "source_name", "source_tier", "source_size",
    "source_tags", "source_relation_count", "source_stall_ids", "local_shop_count",
    "local_shop_ids", "primary_enchant", "pet_id", "pet_name", "source_url",
    "source_effect", "design_note", "owner_hero_id", "catalog_status", "build_tags",
    "tag_references",
]

LEGACY_CATALOG_HASH_FIELDS = [
    "object_id", "object_no", "source_type", "source_slug", "source_name", "source_tier",
    "source_size", "source_tags", "source_relation_count", "source_stall_ids",
    "local_shop_count", "local_shop_ids", "primary_enchant", "pet_id", "pet_name",
    "source_url", "source_effect", "design_note", "owner_hero_id", "build_tags",
    "tag_references",
]

CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID = "snapshot_the_bazaar_patch_18_0_boundary"
LEGACY_CATALOG_SNAPSHOT_ID = "snapshot_vanessa_legacy_catalog_v1"
LOCAL_CACHE_SNAPSHOT_ID = "snapshot_vanessa_local_cache_24720155_398715e6"
RELOCKED_LOCAL_CACHE_SNAPSHOT_ID = "snapshot_vanessa_local_cache_25079259_db8914ab"
OFFICIAL_PATCH_18_CONTENT_SHA256 = "c3d70877395c8fcd6b64f36a72cfd2ce46583f4b493588bd8e4e955ca6d71681"
LEGACY_CATALOG_SHA256 = "44d1f157bd4f27d4fe3cd12827f67a9b2cd8d64fbd2e03032c10fff1dd7c4cb9"
LOCAL_CACHE_GAMEDATA_SHA256 = "352c635cda5acf8af7ab91a81fa73a5d33c3e6beec19ffd9e29dbd17d8a89d31"
LOCAL_CACHE_ITEM_ID_SET_SHA256 = "ac97522afdae6d9f0174b4c695bc272252adcc6ad9aea924853712e43d6d9708"
LOCAL_CACHE_SKILL_ID_SET_SHA256 = "66cacbf986415cf6218e98254274d4b58c528136186e7fc7b632d0b01588d81b"
RELOCKED_LOCAL_CACHE_GAMEDATA_SHA256 = "7d8df658ebce967edf59ab8d0c889fa266f56917b87336928694cdce54246ee9"
RELOCKED_LOCAL_CACHE_ITEM_ID_SET_SHA256 = "b18e167f48956a4ef63dcb4a2ba265c05cc7c6aac87739a737c45acea35af7bd"
RELOCKED_LOCAL_CACHE_SKILL_ID_SET_SHA256 = "66cacbf986415cf6218e98254274d4b58c528136186e7fc7b632d0b01588d81b"
LOCAL_CACHE_RULE_VERIFICATION_POLICY = (
    f"identity_set_locked:item_id_set_sha256={LOCAL_CACHE_ITEM_ID_SET_SHA256};"
    f"skill_id_set_sha256={LOCAL_CACHE_SKILL_ID_SET_SHA256};"
    "per_record_rule_semantics_and_live_trace_required"
)
RELOCKED_LOCAL_CACHE_RULE_VERIFICATION_POLICY = (
    f"identity_set_locked:item_id_set_sha256={RELOCKED_LOCAL_CACHE_ITEM_ID_SET_SHA256};"
    f"skill_id_set_sha256={RELOCKED_LOCAL_CACHE_SKILL_ID_SET_SHA256};"
    "per_record_rule_semantics_and_live_trace_required"
)
LOCAL_CACHE_ID_SET_LOCKS = {
    LOCAL_CACHE_SNAPSHOT_ID: (
        LOCAL_CACHE_ITEM_ID_SET_SHA256,
        LOCAL_CACHE_SKILL_ID_SET_SHA256,
    ),
    RELOCKED_LOCAL_CACHE_SNAPSHOT_ID: (
        RELOCKED_LOCAL_CACHE_ITEM_ID_SET_SHA256,
        RELOCKED_LOCAL_CACHE_SKILL_ID_SET_SHA256,
    ),
}

REFERENCE_SNAPSHOT_ROWS = {
    CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID: {
        "source_snapshot_id": CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID,
        "snapshot_role": "current_version_boundary",
        "source_kind": "official_steam_announcement",
        "source_namespace": "steam_community_announcements",
        "game_id": "the_bazaar",
        "hero_scope": "",
        "game_patch": "18.0",
        "game_build": "",
        "steam_app_id": "1617400",
        "steam_announcement_gid": "1842846814441157",
        "published_at_utc": "2026-09-02T17:45:15Z",
        "captured_on": "2026-09-03",
        "official_api_url": "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1617400&count=100&maxlength=0&format=json",
        "official_announcement_url": "https://store.steampowered.com/news/app/1617400/view/1842846814441157",
        "raw_content_hash_algorithm": "sha256",
        "raw_content_hash_subject": "steam_newsitem.contents_utf8",
        "raw_content_sha256": OFFICIAL_PATCH_18_CONTENT_SHA256,
        "record_count": "0",
        "license_status": "unverified",
        "usage_scope": "reference_only",
        "rule_verification_policy": "boundary_only_no_catalog_binding",
        "catalog_status": "reference_reserved",
        "unresolved_fields": "game_build,license_terms",
    },
    LEGACY_CATALOG_SNAPSHOT_ID: {
        "source_snapshot_id": LEGACY_CATALOG_SNAPSHOT_ID,
        "snapshot_role": "legacy_catalog_binding",
        "source_kind": "external_legacy_catalog",
        "source_namespace": "bazaar_source_audit",
        "game_id": "the_bazaar",
        "hero_scope": "vanessa",
        "game_patch": "",
        "game_build": "",
        "steam_app_id": "",
        "steam_announcement_gid": "",
        "published_at_utc": "",
        "captured_on": "2026-09-03",
        "official_api_url": "",
        "official_announcement_url": "",
        "raw_content_hash_algorithm": "sha256",
        "raw_content_hash_subject": "canonical_csv_utf8:34_bazaar_objects:legacy_fields_v1",
        "raw_content_sha256": LEGACY_CATALOG_SHA256,
        "record_count": "369",
        "license_status": "unverified",
        "usage_scope": "reference_only",
        "rule_verification_policy": "per_record_required",
        "catalog_status": "reference_reserved",
        "unresolved_fields": "game_patch,game_build,published_at_utc,official_rule_source,license_terms",
    },
    LOCAL_CACHE_SNAPSHOT_ID: {
        "source_snapshot_id": LOCAL_CACHE_SNAPSHOT_ID,
        "snapshot_role": "build_bound_catalog_candidate",
        "source_kind": "local_installed_server_cache",
        "source_namespace": "tempo_prod_cache_gamedata",
        "game_id": "the_bazaar",
        "hero_scope": "vanessa",
        "game_patch": "",
        "game_build": "steam_build_24720155+steam_lastupdated_epoch_1787836957+client_1.0.11980-prod-macos-arm64-d75a8ee9+gamedata_etag_398715e6296f400e5d7aa829f8f8ed35",
        "steam_app_id": "1617400",
        "steam_announcement_gid": "",
        "published_at_utc": "",
        "captured_on": "2026-09-03",
        "official_api_url": "",
        "official_announcement_url": "",
        "raw_content_hash_algorithm": "sha256",
        "raw_content_hash_subject": "local_cache_GameData.db_raw_bytes:bytes=41197568:mtime_epoch=1788062922:manifest_observed_epoch=1788342470",
        "raw_content_sha256": LOCAL_CACHE_GAMEDATA_SHA256,
        "record_count": "276",
        "license_status": "unverified",
        "usage_scope": "reference_only",
        "rule_verification_policy": LOCAL_CACHE_RULE_VERIFICATION_POLICY,
        "catalog_status": "reference_reserved",
        "unresolved_fields": "game_patch,explicit_patch_build_binding,license_terms,merchant_package_identity",
    },
    RELOCKED_LOCAL_CACHE_SNAPSHOT_ID: {
        "source_snapshot_id": RELOCKED_LOCAL_CACHE_SNAPSHOT_ID,
        "snapshot_role": "build_bound_catalog_candidate",
        "source_kind": "local_installed_server_cache",
        "source_namespace": "tempo_prod_cache_gamedata",
        "game_id": "the_bazaar",
        "hero_scope": "vanessa",
        "game_patch": "",
        "game_build": "steam_build_25079259+steam_lastupdated_epoch_1788421691+client_1.0.12221-prod-macos-arm64-adc9ca50+gamedata_etag_db8914ab78bb1832b18bb89e9f5d8113",
        "steam_app_id": "1617400",
        "steam_announcement_gid": "",
        "published_at_utc": "",
        "captured_on": "2026-09-03",
        "official_api_url": "",
        "official_announcement_url": "",
        "raw_content_hash_algorithm": "sha256",
        "raw_content_hash_subject": "local_cache_GameData.db_raw_bytes:bytes=41586688:mtime_epoch=1788411702:manifest_observed_epoch=1788445021",
        "raw_content_sha256": RELOCKED_LOCAL_CACHE_GAMEDATA_SHA256,
        "record_count": "278",
        "license_status": "unverified",
        "usage_scope": "reference_only",
        "rule_verification_policy": RELOCKED_LOCAL_CACHE_RULE_VERIFICATION_POLICY,
        "catalog_status": "reference_reserved",
        "unresolved_fields": "game_patch,explicit_patch_build_binding,license_terms,merchant_package_identity",
    },
}

MASTER_ONLY_EXPORTS = [
    ("SHOP_STORES", "30_shop_stores.csv"),
    ("SHAPE_CATALOG", "27_shape_catalog.csv"),
    ("QUALITY_GROWTH", "28_quality_growth.csv"),
    ("QUALITY_UPGRADES", "29_quality_upgrades.csv"),
    ("ENCHANTMENTS", "32_enchantment_types.csv"),
    ("PET_ENCHANTMENTS", "33_pet_enchantments.csv"),
    *REFERENCE_SOURCE_EXPORTS,
    ("SHOP_MAPPING", "35_bazaar_shop_mapping.csv"),
    ("HERO_CATALOG", "41_hero_catalog.csv"),
    ("TAG_CATALOG", "42_bazaar_tag_catalog.csv"),
    ("HERO_SKILLS", "43_hero_skills.csv"),
    *ORIGINAL_PIRATE_EXPORTS,
]

DOMAIN_SECTION_SHEETS = [
    "MECHANICS_QUALITY",
    "SHAPES_TRIALS",
    "ATTRIBUTES_EFFECTS",
    "ROUTE",
    "ECONOMY_EVENTS",
    "RULES",
    "PROGRESSION_TRIALS",
]

PETS_REDESIGN_SHEET = "PETS_REDESIGN_V3_19形状"

SHOP_PRICE_BY_QUALITY = {
    "青铜": "2",
    "白银": "4",
    "黄金": "6",
    "钻石": "8",
}
SHOP_PRICE_BY_TIER_POOL = {
    "pT1": SHOP_PRICE_BY_QUALITY["青铜"],
    "pT2": SHOP_PRICE_BY_QUALITY["白银"],
    "pT3": SHOP_PRICE_BY_QUALITY["黄金"],
    "pT4": SHOP_PRICE_BY_QUALITY["钻石"],
}
LEGACY_PLACEHOLDERS = {"44"}
ROLE_TAGS = {"经济", "坦克", "治疗", "输出", "控制", "机动", "召唤", "防御", "牵制"}
PAL_ELEMENTS = ["无", "火", "水", "草", "雷", "冰", "地", "暗", "龙"]
LEGACY_ELEMENT_MAP = {"风": "无", "土": "地"}

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
NS_PKG_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def cell_col_index(ref):
    letters = "".join(ch for ch in str(ref or "") if ch.isalpha()).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return max(0, idx - 1)


def read_shared_strings(zf):
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    out = []
    for si in root.findall(f"{NS_MAIN}si"):
        parts = [node.text or "" for node in si.iter(f"{NS_MAIN}t")]
        out.append("".join(parts))
    return out


def workbook_sheet_paths(zf):
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_by_id = {}
    for rel in rels.findall(f"{NS_PKG_REL}Relationship"):
        target = rel.attrib.get("Target", "")
        if not target.startswith("/"):
            target = posixpath.normpath(posixpath.join("xl", target))
        else:
            target = target.lstrip("/")
        rel_by_id[rel.attrib.get("Id")] = target

    paths = {}
    for sheet in workbook.findall(f".//{NS_MAIN}sheet"):
        name = sheet.attrib.get("name")
        rid = sheet.attrib.get(f"{NS_REL}id")
        if name and rid in rel_by_id:
            paths[name] = rel_by_id[rid]
    return paths


def read_sheet_rows(xlsx_path, sheet_name):
    with zipfile.ZipFile(xlsx_path) as zf:
        shared = read_shared_strings(zf)
        paths = workbook_sheet_paths(zf)
        if sheet_name not in paths:
            return []
        root = ET.fromstring(zf.read(paths[sheet_name]))
    rows = []
    for row_node in root.findall(f".//{NS_MAIN}row"):
        values = []
        for cell in row_node.findall(f"{NS_MAIN}c"):
            idx = cell_col_index(cell.attrib.get("r"))
            while len(values) <= idx:
                values.append("")
            ctype = cell.attrib.get("t")
            value = ""
            if ctype == "inlineStr":
                value = "".join(t.text or "" for t in cell.iter(f"{NS_MAIN}t"))
            else:
                v = cell.find(f"{NS_MAIN}v")
                if v is not None and v.text is not None:
                    value = v.text
                    if ctype == "s":
                        try:
                            value = shared[int(value)]
                        except (ValueError, IndexError):
                            pass
            values[idx] = str(value).strip()
        if any(values):
            rows.append(values)
    return rows


def sheet_dicts(xlsx_path, sheet_name):
    rows = read_sheet_rows(xlsx_path, sheet_name)
    if not rows:
        return []
    headers = [str(h).strip() for h in rows[0]]
    out = []
    for raw in rows[1:]:
        item = {}
        for i, header in enumerate(headers):
            if header:
                item[header] = raw[i].strip() if i < len(raw) else ""
        if any(str(v).strip() for v in item.values()):
            out.append(item)
    return out


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader), list(reader.fieldnames or [])


def csv_text(rows, headers):
    from io import StringIO

    buf = StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({h: row.get(h, "") for h in headers})
    return buf.getvalue()


def validate_bazaar_reference_source_lock(tables):
    object_filename = "34_bazaar_objects.csv"
    snapshot_filename = "66_bazaar_reference_snapshots.csv"
    if object_filename not in tables or snapshot_filename not in tables:
        raise ValueError("BAZAAR_REFERENCE_SOURCE_LOCK_TABLES_REQUIRED")
    object_rows, object_headers = tables[object_filename]
    snapshot_rows, snapshot_headers = tables[snapshot_filename]
    if object_headers != REFERENCE_OBJECT_HEADERS:
        raise ValueError("BAZAAR_REFERENCE_OBJECT_SCHEMA_INVALID")
    if snapshot_headers != REFERENCE_SNAPSHOT_HEADERS:
        raise ValueError("BAZAAR_REFERENCE_SNAPSHOT_SCHEMA_INVALID")
    if [row.get("source_snapshot_id", "") for row in snapshot_rows] != [
        CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID,
        LEGACY_CATALOG_SNAPSHOT_ID,
        LOCAL_CACHE_SNAPSHOT_ID,
        RELOCKED_LOCAL_CACHE_SNAPSHOT_ID,
    ]:
        raise ValueError("BAZAAR_REFERENCE_SNAPSHOT_IDENTITY_INVALID")
    for row in snapshot_rows:
        snapshot_id = row.get("source_snapshot_id", "")
        if snapshot_id in LOCAL_CACHE_ID_SET_LOCKS:
            local_policy_match = re.fullmatch(
                r"identity_set_locked:item_id_set_sha256=([0-9a-f]{64});"
                r"skill_id_set_sha256=([0-9a-f]{64});"
                r"per_record_rule_semantics_and_live_trace_required",
                row.get("rule_verification_policy", ""),
            )
            if (
                local_policy_match is None
                or local_policy_match.groups() != LOCAL_CACHE_ID_SET_LOCKS[snapshot_id]
            ):
                raise ValueError("BAZAAR_REFERENCE_LOCAL_ID_SET_LOCK_INVALID")
        if row != REFERENCE_SNAPSHOT_ROWS.get(snapshot_id):
            raise ValueError(f"BAZAAR_REFERENCE_SNAPSHOT_FIELDS_INVALID:{snapshot_id}")

    if len(object_rows) != 369:
        raise ValueError("BAZAAR_REFERENCE_OBJECT_COUNT_INVALID")
    object_ids = [row.get("object_id", "") for row in object_rows]
    if len(set(object_ids)) != len(object_ids) or any(not object_id for object_id in object_ids):
        raise ValueError("BAZAAR_REFERENCE_OBJECT_ID_INVALID")
    try:
        object_numbers = [int(row.get("object_no", "")) for row in object_rows]
    except ValueError as exc:
        raise ValueError("BAZAAR_REFERENCE_OBJECT_NUMBER_INVALID") from exc
    if object_numbers != list(range(1, 370)):
        raise ValueError("BAZAAR_REFERENCE_OBJECT_ORDER_INVALID")
    type_counts = {
        source_type: sum(row.get("source_type") == source_type for row in object_rows)
        for source_type in ("item", "skill", "merchant_package")
    }
    if type_counts != {"item": 138, "skill": 138, "merchant_package": 93}:
        raise ValueError("BAZAAR_REFERENCE_OBJECT_TYPE_COVERAGE_INVALID")
    for row in object_rows:
        object_id = row.get("object_id", "")
        if row.get("source_snapshot_id") != LEGACY_CATALOG_SNAPSHOT_ID:
            raise ValueError(f"BAZAAR_REFERENCE_OBJECT_LEGACY_BINDING_INVALID:{object_id}")
        if row.get("current_version_boundary_snapshot_id") != CURRENT_VERSION_BOUNDARY_SNAPSHOT_ID:
            raise ValueError(f"BAZAAR_REFERENCE_OBJECT_BOUNDARY_BINDING_INVALID:{object_id}")
        if row.get("identity_confirmed") != "true" or row.get("rule_verified") != "false":
            raise ValueError(f"BAZAAR_REFERENCE_OBJECT_VERIFICATION_INVALID:{object_id}")
        if not row.get("rule_unresolved_fields", "").strip():
            raise ValueError(f"BAZAAR_REFERENCE_OBJECT_UNRESOLVED_REQUIRED:{object_id}")
        if row.get("catalog_status") != "reference_reserved":
            raise ValueError(f"BAZAAR_REFERENCE_OBJECT_STATUS_INVALID:{object_id}")
        if not row.get("source_url", "").strip() or not row.get("source_effect", "").strip():
            raise ValueError(f"BAZAAR_REFERENCE_OBJECT_EVIDENCE_REQUIRED:{object_id}")

    legacy_payload = [
        {field: row.get(field, "") for field in LEGACY_CATALOG_HASH_FIELDS}
        for row in object_rows
    ]
    actual_hash = hashlib.sha256(
        csv_text(legacy_payload, LEGACY_CATALOG_HASH_FIELDS).encode("utf-8")
    ).hexdigest()
    if actual_hash != LEGACY_CATALOG_SHA256:
        raise ValueError("BAZAAR_REFERENCE_LEGACY_CATALOG_HASH_INVALID")


def validate_bazaar_reference_members(tables):
    """Validate complete reference-only identities, never executable rules.

    The existing snapshot lock owns build/version/artifact and ID-set hashes.
    Members contain no duplicated source metadata or self-attested review state.
    """
    validate_bazaar_reference_source_lock(tables)
    filename = "67_bazaar_reference_members.csv"
    if filename not in tables:
        raise ValueError("BAZAAR_REFERENCE_MEMBERS_TABLE_REQUIRED")
    rows, headers = tables[filename]
    if headers != REFERENCE_MEMBER_HEADERS:
        raise ValueError("BAZAAR_REFERENCE_MEMBERS_SCHEMA_INVALID")
    if len(rows) != 140:
        raise ValueError("BAZAAR_REFERENCE_MEMBERS_COUNT_INVALID")
    ids = []
    for row in rows:
        if set(row) != set(REFERENCE_MEMBER_HEADERS):
            raise ValueError("BAZAAR_REFERENCE_MEMBERS_SCHEMA_INVALID")
        if row["source_snapshot_id"] != RELOCKED_LOCAL_CACHE_SNAPSHOT_ID:
            raise ValueError("BAZAAR_REFERENCE_MEMBER_SNAPSHOT_INVALID")
        if row["source_type"] != "item":
            raise ValueError("BAZAAR_REFERENCE_MEMBER_TYPE_INVALID")
        source_uuid = row["source_uuid"]
        if not isinstance(source_uuid, str) or not re.fullmatch(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", source_uuid
        ):
            raise ValueError("BAZAAR_REFERENCE_MEMBER_UUID_INVALID")
        ids.append(source_uuid)
    if len(set(ids)) != len(ids):
        raise ValueError("BAZAAR_REFERENCE_MEMBER_UUID_DUPLICATE")
    actual_hash = hashlib.sha256("\n".join(sorted(ids)).encode("utf-8")).hexdigest()
    if actual_hash != RELOCKED_LOCAL_CACHE_ITEM_ID_SET_SHA256:
        raise ValueError("BAZAAR_REFERENCE_MEMBERS_HASH_INVALID")


def validate_bazaar_run_source_views(tables):
    run_source_views.validate(tables)


def write_csv(path, rows, headers, bom=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = csv_text(rows, headers)
    if bom:
        text = "\ufeff" + text
    path.write_text(text, encoding="utf-8")


def by_key(rows, key):
    return {row.get(key, ""): row for row in rows if row.get(key, "")}


def first_non_empty(*values):
    for value in values:
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return ""


def sheet_value(row, key, fallback="", allow_blank=False):
    if allow_blank and key in row:
        return "" if row.get(key) is None else str(row.get(key)).strip()
    return first_non_empty(row.get(key), fallback)


def blank_legacy_placeholder(value):
    text = "" if value is None else str(value).strip()
    return "" if text in LEGACY_PLACEHOLDERS else text


def split_pool_count(expr):
    raw = str(expr or "").strip()
    if not raw:
        return "", ""
    if "-" in raw:
        left, right = raw.rsplit("-", 1)
        if right.strip().isdigit() and left.strip():
            return left.strip(), right.strip()
    return raw, ""


def combine_pool_count(pool, count):
    pool = str(pool or "").strip()
    count = str(count or "").strip()
    return f"{pool}-{count}" if pool and count else pool


def parse_stat_override(raw):
    out = {}
    for part in str(raw or "").replace("；", ";").split(";"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        out[key.strip()] = value.strip()
    return out


def format_stat_override(row):
    parts = []
    for key in ["HP", "攻", "防", "盾", "行动"]:
        value = row.get(key, "")
        if str(value).strip():
            parts.append(f"{key}={str(value).strip()}")
    return ";".join(parts)


def trial_position(row):
    rr = str(row.get("行(1-8)", "")).strip()
    cc = str(row.get("列(1-8)", "")).strip()
    return f"{rr},{cc}" if rr or cc else ""


def shape_parts(shape_text):
    raw = str(shape_text or "").strip()
    if not raw:
        return "", ""
    parts = raw.split(None, 1)
    return parts[0], parts[1] if len(parts) > 1 else ""


def normalize_shape_id(shape_text):
    raw = str(shape_text or "").strip()
    if not raw:
        return ""
    match = re.search(r"(\d{1,2})", raw)
    if not match:
        return raw
    return f"{int(match.group(1)):02d}"


def normalize_shape_text(shape_text):
    sid = normalize_shape_id(shape_text)
    return f"{sid} 形状{sid}" if re.fullmatch(r"\d{2}", sid or "") else str(shape_text or "").strip()


def shape_class_for_group(group):
    if group == "one":
        return "一格形状"
    if group == "two":
        return "二格形状"
    if group == "three":
        return "三格形状"
    return ""


def shape_size_from_shape_id(shape_id):
    sid = normalize_shape_id(shape_id)
    if not sid.isdigit():
        return ""
    n = int(sid)
    if n <= 4:
        return "一格"
    if n <= 12:
        return "两格"
    return "三格"


def body_size_text(value, shape_text=""):
    raw = str(value or "").strip()
    if raw in {"1", "1.0", "一格", "小型"}:
        return "一格"
    if raw in {"2", "2.0", "两格", "中型"}:
        return "两格"
    if raw in {"3", "3.0", "三格", "大型"}:
        return "三格"
    return shape_size_from_shape_id(shape_text) or raw


def to_number(value, fallback=0):
    try:
        text = str(value).strip()
        if text == "":
            return fallback
        return float(text)
    except (TypeError, ValueError):
        return fallback


def format_number(value):
    n = to_number(value, 0)
    return str(int(n)) if abs(n - int(n)) < 1e-9 else f"{n:.1f}".rstrip("0").rstrip(".")


def panel_score(row):
    hp = to_number(row.get("HP"), 0)
    atk = to_number(row.get("攻"), 0)
    defense = to_number(row.get("防"), 0)
    shield = to_number(row.get("盾"), 0)
    action = to_number(row.get("行动"), 0)
    return hp + 3 * (atk + defense) + 5 * (shield + action)


def split_list_text(value):
    return [x.strip() for x in re.split(r"[,，、]", str(value or "")) if x.strip()]


def unique_join(values, sep="、"):
    out = []
    seen = set()
    for value in values:
        text = str(value or "").strip()
        if text and text not in seen:
            out.append(text)
            seen.add(text)
    return sep.join(out)


def pet_elements(pet):
    primary = split_list_text(pet.get("element"))
    secondary = split_list_text(pet.get("secondary_element"))
    values = [*primary, *secondary]
    out = []
    for value in values:
        canonical = LEGACY_ELEMENT_MAP.get(value, value)
        if canonical in PAL_ELEMENTS and canonical not in out:
            out.append(canonical)
    return out or ["无"]


def build_pet_tags(pet, old_tags=""):
    old_tag_parts = split_list_text(old_tags)
    if "role" in pet and not str(pet.get("role") or "").strip():
        old_tag_parts = [tag for tag in old_tag_parts if tag not in ROLE_TAGS]
    return unique_join([
        *pet_elements(pet),
        pet.get("role"),
        pet.get("old_role"),
        *old_tag_parts,
    ])


def build_shop_pools(existing, pet, tier_pool):
    explicit = split_list_text(pet.get("shop_store_ids"))
    if explicit:
        return ", ".join(unique_preserve(explicit))
    pools = split_list_text(existing)
    if "role" in pet and not str(pet.get("role") or "").strip():
        pools = [pool for pool in pools if not pool.startswith("role_")]
    elements = pet_elements(pet)
    role = pet.get("role", "")
    old_role = pet.get("old_role", "")
    if "night_base" not in pools:
        pools.insert(0, "night_base")
    additions = []
    for element in elements:
        additions.append(f"elem_{element}")
    if old_role:
        additions.append(f"role_{old_role}")
    if role and role != old_role:
        additions.append(f"role_{role}")
    if tier_pool:
        additions.append(f"tier_{tier_pool}")
    out = []
    seen = set()
    for pool in [*pools, *additions]:
        if pool and pool not in seen:
            out.append(pool)
            seen.add(pool)
    return ", ".join(out)


def unique_preserve(values):
    out = []
    seen = set()
    for value in values:
        text = str(value or "").strip()
        if text and text not in seen:
            out.append(text)
            seen.add(text)
    return out


def pet_id_sort_key(pet_id):
    match = re.search(r"(\d+)$", str(pet_id or ""))
    return int(match.group(1)) if match else 10**9


def expand_pet_rows(filename, rows, headers, pets_by_id):
    """Make the four one-row-per-pet program tables follow the workbook roster."""
    id_field = {
        "01_pets.csv": "宠物ID",
        "02_monster_templates.csv": "宠物ID",
        "06_shop_rewards.csv": "宠物ID",
        "08_action_shapes.csv": "宠物ID",
    }.get(filename)
    if not id_field:
        return rows
    existing = {str(row.get(id_field, "")).strip() for row in rows}
    for pet_id in sorted(pets_by_id, key=pet_id_sort_key):
        if pet_id in existing:
            continue
        pet = pets_by_id[pet_id]
        row = {header: "" for header in headers}
        row[id_field] = pet_id
        tier = str(pet.get("tier", "")).strip()
        tier_pool = {"青铜": "pT1", "白银": "pT2", "黄金": "pT3", "钻石": "pT4"}.get(tier, "pT1")
        if filename == "01_pets.csv":
            row["编号"] = f"No.{pet_id_sort_key(pet_id):03d}"
            row["防"] = first_non_empty(pet.get("def"))
            row["范围"] = f"攻击{first_non_empty(pet.get('attack_grid_count'), '1')}格"
            row["动作"] = "攻击"
            row["技能"] = str(pet.get("source_object_id", "")).strip()
            row["可召"] = "—"
        elif filename == "02_monster_templates.csv":
            row["阶段"] = {"青铜": "前期", "白银": "中期", "黄金": "后期", "钻石": "首领"}.get(tier, "中期")
            row["敌方定位"] = "小怪" if tier != "钻石" else "精英"
            row["防"] = "0"
        elif filename == "06_shop_rewards.csv":
            row["商品类型"] = "宠物"
            row["商店状态"] = "启用"
            row["解锁日"] = "1"
            row["池档"] = tier_pool
            row["夜市权重"] = "100"
            row["元素店权重"] = "100"
            row["定位店权重"] = "100"
            row["品质店权重"] = "100"
            row["奖励权重"] = "60"
            row["奖励池(自动)"] = f"reward_{tier_pool}"
        elif filename == "08_action_shapes.csv":
            row["方向"] = "默认向右"
            row["槽数"] = "3"
            row["基础层数"] = "1"
            row["行动类型"] = "攻击"
            row["技能"] = str(pet.get("source_object_id", "")).strip()
            row["接入状态"] = "正式"
        rows.append(row)
    return sorted(rows, key=lambda row: pet_id_sort_key(row.get(id_field)))


def shop_price_for_quality(quality, tier_pool=""):
    return SHOP_PRICE_BY_QUALITY.get(str(quality or "").strip()) or SHOP_PRICE_BY_TIER_POOL.get(str(tier_pool or "").strip(), "")


def normalize_pet_id_token(token):
    raw = str(token or "").strip()
    if not raw:
        return ""
    if raw.startswith("pal_"):
        return raw
    if raw.isdigit():
        return f"pal_{int(raw):03d}"
    return raw


def parse_pet_pool_ids(pool):
    ids = []
    for token in split_list_text(pool):
        if "~" in token:
            left, right = token.split("~", 1)
        elif re.fullmatch(r"\d+\s*-\s*\d+", token):
            left, right = re.split(r"\s*-\s*", token, 1)
        else:
            ids.append(normalize_pet_id_token(token))
            continue
        if str(left).strip().isdigit() and str(right).strip().isdigit():
            a, b = int(left), int(right)
            step = 1 if a <= b else -1
            ids.extend(f"pal_{n:03d}" for n in range(a, b + step, step))
        else:
            ids.extend([normalize_pet_id_token(left), normalize_pet_id_token(right)])
    return [x for x in ids if x]


def parse_quality_weights(raw):
    parts = [to_number(x, 0) for x in split_list_text(raw)]
    labels = ["青铜", "白银", "黄金", "钻石"]
    return {label: parts[i] if i < len(parts) else 0 for i, label in enumerate(labels)}


def quality_expected_multiplier(raw):
    weights = parse_quality_weights(raw)
    total = sum(max(0, value) for value in weights.values())
    if total <= 0:
        return 1
    multipliers = {"青铜": 1, "白银": 1.5, "黄金": 2, "钻石": 2.5}
    return sum((max(0, weights[label]) / total) * multipliers[label] for label in multipliers)


def update_wave_generated_columns(row, pet_scores):
    pool, count_text = split_pool_count(row.get("宠物池-数量", ""))
    pet_ids = parse_pet_pool_ids(pool)
    scores = [to_number(pet_scores.get(pid), None) for pid in pet_ids]
    scores = [score for score in scores if score is not None]
    if not scores:
        return
    count = to_number(count_text, 1)
    avg = sum(scores) / len(scores)
    quality_mult = quality_expected_multiplier(row.get("品质权重", ""))
    threat = avg * count * quality_mult
    if "出怪数(当前计算值)" in row:
        row["出怪数(当前计算值)"] = format_number(count)
    if "品质期望倍率(当前计算值)" in row:
        row["品质期望倍率(当前计算值)"] = format_number(round(quality_mult, 4))
    if "候选池平均效果分(当前计算值)" in row:
        row["候选池平均效果分(当前计算值)"] = format_number(round(avg, 1))
    if "本行威胁(当前计算值)" in row:
        row["本行威胁(当前计算值)"] = format_number(round(threat, 1))
    if "威胁计算说明" in row:
        row["威胁计算说明"] = "本行威胁=候选池平均效果分×出怪数×品质期望倍率；品质权重顺序=青铜,白银,黄金,钻石"


def pet_mechanic_score(row, pet):
    raw = str(pet.get("mechanism_id") or row.get("机制ID") or "").strip()
    if raw in {"", "none", "REVIEW"}:
        return 0
    return to_number(row.get("机制分"), 0)


def normalize_redesign_pets(rows):
    normalized = []
    for row in rows:
        pet_id = str(row.get("pet_id", "")).strip()
        if not pet_id:
            continue
        shape_text = normalize_shape_text(row.get("official_shape"))
        note = unique_join([
            row.get("design_note"),
            row.get("v3_change_note"),
        ], sep="；")
        normalized.append({
            "pet_id": pet_id,
            "name": str(row.get("name", "")).strip(),
            "element": str(row.get("element", "")).strip(),
            "tier": str(row.get("tier", "")).strip(),
            "role": str(row.get("new_role", "")).strip(),
            "old_role": str(row.get("old_role", "")).strip(),
            "body_size": body_size_text(row.get("body_size"), shape_text),
            "hp": format_number(row.get("hp")),
            "atk": format_number(row.get("atk")),
            "def": format_number(row.get("def")),
            "shield": format_number(row.get("shield")),
            "action": format_number(row.get("action")),
            "cell_count": format_number(row.get("cell_count")),
            "mechanism_id": first_non_empty(row.get("mechanism_id")),
            "shape_id": shape_text,
            "note": note,
        })
    return normalized


def generated_sheet_table(master_path, sheet_name):
    rows = sheet_dicts(master_path, sheet_name)
    if not rows:
        if sheet_name == "BZ_HERO_SKILL_AURAS":
            raw = read_sheet_rows(master_path, sheet_name)
            return [], raw[0] if raw else []
        return [], []
    headers = list(rows[0].keys())
    return rows, headers


def trim_trailing_empty(values):
    out = [str(value).strip() for value in values]
    while out and out[-1] == "":
        out.pop()
    return out


def table_from_rows(rows):
    if not rows:
        return [], []
    headers = trim_trailing_empty(rows[0])
    width = len(headers)
    out = []
    for raw in rows[1:]:
        raw = trim_trailing_empty(raw)[:width]
        item = {}
        for i, header in enumerate(headers):
            if header:
                item[header] = raw[i].strip() if i < len(raw) else ""
        if any(str(v).strip() for v in item.values()):
            out.append(item)
    return out, headers


def generated_domain_section_tables(master_path):
    result = {}
    for sheet_name in DOMAIN_SECTION_SHEETS:
        rows = read_sheet_rows(master_path, sheet_name)
        current_name = ""
        current_rows = []
        for row in rows + [["#csv"]]:
            marker = str(row[0]).strip() if row else ""
            if marker == "#csv":
                if current_name:
                    table_rows, headers = table_from_rows(current_rows)
                    if headers:
                        result[current_name] = (table_rows, headers)
                current_name = str(row[1]).strip() if len(row) > 1 else ""
                current_rows = []
                continue
            if current_name:
                current_rows.append(row)
    return result


def generated_tables(master_path, baseline_dir):
    # Reference identities fail closed even if an unrelated legacy formula fails later.
    generated_reference_source_tables(master_path)
    redesign_pets = normalize_redesign_pets(sheet_dicts(master_path, PETS_REDESIGN_SHEET))
    domain_sections = generated_domain_section_tables(master_path)
    master = {
        "PETS": redesign_pets or sheet_dicts(master_path, "PETS"),
        "WAVES": sheet_dicts(master_path, "WAVES"),
        "SHOP_ITEMS": sheet_dicts(master_path, "SHOP_ITEMS"),
        "MECHANISMS": sheet_dicts(master_path, "MECHANISMS"),
        "TRIALS": sheet_dicts(master_path, "TRIALS"),
        "SHAPE_CATALOG": sheet_dicts(master_path, "SHAPE_CATALOG"),
    }

    pets_by_id = by_key(master["PETS"], "pet_id")
    required_pet_stats = ("hp", "atk", "def", "shield", "action")
    for pet_id, pet in pets_by_id.items():
        for stat in required_pet_stats:
            value = str(pet.get(stat, "")).strip()
            if not value:
                raise ValueError(f"pet {pet_id} missing required base stat {stat}")
            try:
                float(value)
            except ValueError as exc:
                raise ValueError(f"pet {pet_id} has non-numeric base stat {stat}: {value}") from exc
    shop_by_id = by_key(master["SHOP_ITEMS"], "pet_id")
    mech_by_id = by_key(master["MECHANISMS"], "mechanism_id")
    baseline_pets, _baseline_pet_headers = read_csv(baseline_dir / "01_pets.csv")
    baseline_pets_by_id = by_key(baseline_pets, "宠物ID")
    baseline_monsters, _baseline_monster_headers = read_csv(baseline_dir / "02_monster_templates.csv")
    baseline_monsters_by_pet = by_key(baseline_monsters, "宠物ID")
    pet_effect_scores = {}
    for pet_id, pet in pets_by_id.items():
        score_row = dict(baseline_pets_by_id.get(pet_id, {}))
        for field, key in [("HP", "hp"), ("攻", "atk"), ("防", "def"), ("盾", "shield"), ("行动", "action")]:
            if pet.get(key) not in (None, ""):
                score_row[field] = pet.get(key)
        pet_effect_scores[pet_id] = panel_score(score_row) + pet_mechanic_score(baseline_monsters_by_pet.get(pet_id, {}), pet)
    waves_by_key = {
        (r.get("wave_id", ""), r.get("round", "")): r
        for r in master["WAVES"]
        if r.get("wave_id", "")
    }
    trials_by_key = {
        (r.get("trial_id", ""), r.get("row_type", ""), r.get("unit_side", ""), r.get("pet_id", ""), r.get("position", "")): r
        for r in master["TRIALS"]
        if r.get("trial_id", "")
    }
    result = domain_sections
    shape_rows, _shape_headers = result.get("27_shape_catalog.csv", generated_sheet_table(master_path, "SHAPE_CATALOG"))
    shapes_by_id = by_key(shape_rows, "shape_id")

    for filename in GENERATED_FILES:
        if filename in result:
            continue
        rows, headers = read_csv(baseline_dir / filename)
        output = expand_pet_rows(filename, [dict(row) for row in rows], headers, pets_by_id)

        if filename == "01_pets.csv":
            for field in ["技能序列", "特性序列", "owner_hero_id", "catalog_status", "build_tags", "tag_references"]:
                if field not in headers:
                    headers.append(field)
            for row in output:
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if not pet:
                    continue
                row["名称"] = first_non_empty(pet.get("name"), row.get("名称"))
                elements = pet_elements(pet)
                row["元素"] = elements[0]
                row["品质"] = first_non_empty(pet.get("tier"), row.get("品质"))
                row["定位"] = sheet_value(pet, "role", row.get("定位"), allow_blank=True)
                row["体型"] = first_non_empty(pet.get("body_size"), row.get("体型"))
                row["HP"] = first_non_empty(pet.get("hp"), row.get("HP"))
                row["攻"] = first_non_empty(pet.get("atk"), row.get("攻"))
                row["防"] = first_non_empty(pet.get("def"), row.get("防"))
                row["盾"] = first_non_empty(pet.get("shield"), row.get("盾"))
                row["行动"] = first_non_empty(pet.get("action"), row.get("行动"))
                row["机制ID"] = sheet_value(pet, "mechanism_id", row.get("机制ID"), allow_blank=True)
                row["形状"] = first_non_empty(pet.get("shape_id"), row.get("形状"))
                row["效果分"] = format_number(pet_effect_scores.get(row.get("宠物ID", ""), panel_score(row)))
                row["标签"] = first_non_empty(build_pet_tags(pet, row.get("标签")), row.get("标签"))
                row["备注"] = first_non_empty(pet.get("note"), row.get("备注"))
                row["副属"] = "、".join(elements[1:])
                row["技能序列"] = first_non_empty(pet.get("skill_ids"), row.get("技能序列"))
                row["特性序列"] = first_non_empty(pet.get("trait_ids"), row.get("特性序列"))
                row["owner_hero_id"] = sheet_value(pet, "owner_hero_id", "", allow_blank=True)
                row["catalog_status"] = first_non_empty(pet.get("catalog_status"), "reserved")
                row["build_tags"] = sheet_value(pet, "build_tags", "", allow_blank=True)
                row["tag_references"] = sheet_value(pet, "tag_references", "", allow_blank=True)

        elif filename == "02_monster_templates.csv":
            for field in ["移动力", "攻击次数"]:
                if field not in headers:
                    headers.append(field)
            for row in output:
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if not pet:
                    continue
                row["名称(自动)"] = first_non_empty(pet.get("name"), row.get("名称(自动)"))
                row["元素(自动)"] = pet_elements(pet)[0]
                row["体型(自动)"] = first_non_empty(pet.get("body_size"), row.get("体型(自动)"))
                row["宠物定位(自动)"] = sheet_value(pet, "role", row.get("宠物定位(自动)"), allow_blank=True)
                row["HP"] = first_non_empty(pet.get("hp"), row.get("HP"))
                row["攻"] = first_non_empty(pet.get("atk"), row.get("攻"))
                row["防"] = first_non_empty(pet.get("def"), row.get("防"))
                row["盾"] = first_non_empty(pet.get("shield"), row.get("盾"))
                row["行动"] = first_non_empty(pet.get("action"), row.get("行动"))
                row["移动力"] = first_non_empty(pet.get("enemy_move_range"), row.get("移动力"), pet.get("action"), row.get("行动"))
                row["攻击次数"] = first_non_empty(pet.get("enemy_attack_count"), row.get("攻击次数"), pet.get("action"), row.get("行动"))
                row["机制ID"] = sheet_value(pet, "mechanism_id", row.get("机制ID"), allow_blank=True)
                row["面板分"] = format_number(panel_score(row))
                row["机制分"] = format_number(pet_mechanic_score(row, pet))
                for field in ["机制参数", "克制", "推荐日", "备注"]:
                    row[field] = blank_legacy_placeholder(row.get(field))

        elif filename == "03_monster_waves.csv":
            output_by_key = {
                (row.get("波次ID", ""), row.get("回合", "")): row
                for row in output
                if row.get("波次ID", "")
            }
            for key, wave in waves_by_key.items():
                if key in output_by_key:
                    continue
                row = {header: "" for header in headers}
                row["波次ID"], row["回合"] = key
                output.append(row)
                output_by_key[key] = row
            for row in output:
                key = (row.get("波次ID", ""), row.get("回合", ""))
                wave = waves_by_key.get(key)
                if not wave:
                    continue
                row["天数"] = first_non_empty(wave.get("day"), row.get("天数"))
                row["时段"] = first_non_empty(wave.get("period"), row.get("时段"))
                row["回合"] = first_non_empty(wave.get("round"), row.get("回合"))
                row["宠物池-数量"] = first_non_empty(combine_pool_count(wave.get("enemy_pool"), wave.get("count")), row.get("宠物池-数量"))
                row["品质权重"] = first_non_empty(wave.get("quality_weights"), row.get("品质权重"))
                row["本行威胁(当前计算值)"] = first_non_empty(wave.get("target_threat"), row.get("本行威胁(当前计算值)"))
                row["填写说明"] = first_non_empty(wave.get("design_goal"), row.get("填写说明"))
                update_wave_generated_columns(row, pet_effect_scores)

        elif filename == "04_mechanisms.csv":
            for row in output:
                mech = mech_by_id.get(row.get("机制ID", ""))
                if not mech:
                    continue
                row["机制名"] = first_non_empty(mech.get("name"), row.get("机制名"))
                row["分类"] = first_non_empty(mech.get("category"), row.get("分类"))
                row["触发"] = first_non_empty(mech.get("trigger"), row.get("触发"))
                row["效果"] = first_non_empty(mech.get("effect_summary"), row.get("效果"))
                row["机制分"] = first_non_empty(mech.get("score"), row.get("机制分"))
                row["接入状态"] = first_non_empty(mech.get("status"), row.get("接入状态"))
                row["备注"] = first_non_empty(mech.get("note"), row.get("备注"))

        elif filename == "06_shop_rewards.csv":
            if "catalog_status" not in headers:
                headers.append("catalog_status")
            for row in output:
                shop = shop_by_id.get(row.get("宠物ID", ""))
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if pet:
                    row["名称(自动)"] = first_non_empty(pet.get("name"), row.get("名称(自动)"))
                    row["元素(自动)"] = pet_elements(pet)[0]
                    row["品质(自动)"] = first_non_empty(pet.get("tier"), row.get("品质(自动)"))
                    row["定位(自动)"] = sheet_value(pet, "role", row.get("定位(自动)"), allow_blank=True)
                    row["标签(自动)"] = first_non_empty(build_pet_tags(pet, row.get("标签(自动)")), row.get("标签(自动)"))
                    row["catalog_status"] = first_non_empty(pet.get("catalog_status"), "reserved")
                    if row["catalog_status"] != "playable":
                        row["商店状态"] = "保留"
                if not shop:
                    if pet:
                        row["商店池(自动)"] = build_shop_pools(row.get("商店池(自动)"), pet, row.get("池档"))
                    for field in ["出现条件", "备注"]:
                        row[field] = blank_legacy_placeholder(row.get(field))
                    continue
                row["解锁日"] = first_non_empty(shop.get("unlock_day"), row.get("解锁日"))
                row["池档"] = first_non_empty(shop.get("tier_pool"), row.get("池档"))
                row["默认价"] = first_non_empty(shop.get("base_price"), row.get("默认价"))
                public_quality_price = shop_price_for_quality(row.get("品质(自动)"), row.get("池档"))
                if public_quality_price:
                    row["默认价"] = public_quality_price
                    row["价格覆盖"] = public_quality_price
                row["夜市权重"] = first_non_empty(shop.get("shop_weight"), row.get("夜市权重"))
                row["奖励权重"] = first_non_empty(shop.get("reward_weight"), row.get("奖励权重"))
                if pet:
                    row["商店池(自动)"] = build_shop_pools(row.get("商店池(自动)"), pet, row.get("池档"))
                row["备注"] = first_non_empty(shop.get("note"), row.get("备注"))
                for field in ["出现条件", "备注"]:
                    row[field] = blank_legacy_placeholder(row.get(field))

        elif filename == "08_action_shapes.csv":
            for row in output:
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if not pet:
                    continue
                sid, sname = shape_parts(first_non_empty(pet.get("shape_id"), row.get("形状ID")))
                shape = shapes_by_id.get(sid, {})
                row["名称(自动)"] = first_non_empty(pet.get("name"), row.get("名称(自动)"))
                elements = pet_elements(pet)
                row["元素(自动)"] = elements[0]
                slot_count = max(1, int(first_non_empty(row.get("槽数"), "3")))
                for slot_index in range(1, min(3, slot_count) + 1):
                    row[f"槽{slot_index}元素"] = elements[(slot_index - 1) % len(elements)]
                row["定位(自动)"] = sheet_value(pet, "role", row.get("定位(自动)"), allow_blank=True)
                row["形状ID"] = first_non_empty(sid, row.get("形状ID"))
                row["形状名"] = first_non_empty(shape.get("label"), sname, row.get("形状名"))
                row["形状分类"] = first_non_empty(shape_class_for_group(shape.get("group")), row.get("形状分类"))
                row["命中格数"] = first_non_empty(shape.get("cell_count"), row.get("命中格数"))
                row["机制ID"] = sheet_value(pet, "mechanism_id", row.get("机制ID"), allow_blank=True)
                row["备注"] = first_non_empty(
                    shape.get("note") and f"新19形状；所有作用格默认结算{shape.get('settle_count', '3')}次。{shape.get('note')}",
                    row.get("备注")
                )

        elif filename == "13_day7_beast_trial.csv":
            for row in output:
                pos = trial_position(row)
                key = (row.get("配置ID", ""), row.get("类型", ""), row.get("阵营", ""), row.get("宠物ID", ""), pos)
                trial = trials_by_key.get(key)
                if not trial:
                    continue
                stats = parse_stat_override(trial.get("stat_override", ""))
                row["品质覆盖"] = first_non_empty(trial.get("quality_override"), row.get("品质覆盖"))
                row["行(1-8)"], row["列(1-8)"] = (trial.get("position", pos).split(",", 1) + [""])[:2] if "," in trial.get("position", pos) else (row.get("行(1-8)", ""), row.get("列(1-8)", ""))
                for field in ["HP", "攻", "防", "盾", "行动"]:
                    row[field] = first_non_empty(stats.get(field), row.get(field))
                row["关键规则"] = first_non_empty(trial.get("rule_note"), row.get("关键规则"))
                row["备注"] = first_non_empty(trial.get("note"), row.get("备注"))

        result[filename] = (output, headers)

    for sheet_name, filename in MASTER_ONLY_EXPORTS:
        if filename in result:
            continue
        rows, headers = generated_sheet_table(master_path, sheet_name)
        if rows and headers:
            result[filename] = (rows, headers)
    validate_bazaar_run_source_views(result)
    run_source_views.canonicalize(result)
    member_rows, member_headers = result["67_bazaar_reference_members.csv"]
    result["67_bazaar_reference_members.csv"] = (
        sorted(member_rows, key=lambda row: row["source_uuid"]), member_headers
    )
    for baseline_file in sorted(baseline_dir.glob("*.csv")):
        if baseline_file.name not in result:
            result[baseline_file.name] = read_csv(baseline_file)
    return result


def generated_original_pirate_tables(master_path):
    result = {}
    for sheet_name, filename in ORIGINAL_PIRATE_EXPORTS:
        rows, headers = generated_sheet_table(master_path, sheet_name)
        if (not rows and filename != "72_bz_hero_skill_auras.csv") or not headers:
            raise ValueError(f"master workbook missing original-pirate sheet rows: {sheet_name}")
        result[filename] = (rows, headers)
    return result


def generated_reference_source_tables(master_path):
    result = {}
    for sheet_name, filename in REFERENCE_SOURCE_EXPORTS:
        rows, headers = generated_sheet_table(master_path, sheet_name)
        if not rows or not headers:
            raise ValueError(f"master workbook missing reference-source sheet rows: {sheet_name}")
        result[filename] = (rows, headers)
    validate_bazaar_run_source_views(result)
    run_source_views.canonicalize(result)
    member_rows, member_headers = result["67_bazaar_reference_members.csv"]
    result["67_bazaar_reference_members.csv"] = (
        sorted(member_rows, key=lambda row: row["source_uuid"]), member_headers
    )
    return result


def copy_baseline_if_needed(baseline_dir, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    if baseline_dir.resolve() == out_dir.resolve():
        return
    for src in sorted(baseline_dir.glob("*.csv")):
        shutil.copy2(src, out_dir / src.name)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export xlsx/ysbzs_master.xlsx into data/csv/*.csv")
    parser.add_argument("--master", default=str(DEFAULT_MASTER))
    parser.add_argument("--baseline-dir", default=str(DEFAULT_CSV_DIR))
    parser.add_argument("--out-dir", default=str(DEFAULT_CSV_DIR))
    parser.add_argument("--check", action="store_true", help="Fail if generated CSV differs from baseline files")
    parser.add_argument(
        "--original-pirate-only",
        action="store_true",
        help="Export/check only the original-pirate BZ domains without evaluating legacy formula domains",
    )
    parser.add_argument(
        "--reference-source-lock-only",
        action="store_true",
        help="Export/check only the strict Bazaar external-reference source-lock domains",
    )
    args = parser.parse_args(argv)

    master_path = Path(args.master)
    baseline_dir = Path(args.baseline_dir)
    out_dir = Path(args.out_dir)
    if not master_path.exists():
        raise SystemExit(f"missing master workbook: {master_path}")
    if not baseline_dir.exists():
        raise SystemExit(f"missing baseline csv dir: {baseline_dir}")

    if args.original_pirate_only and args.reference_source_lock_only:
        parser.error("--original-pirate-only and --reference-source-lock-only are mutually exclusive")
    if args.original_pirate_only:
        generated = generated_original_pirate_tables(master_path)
        baseline_csv_files = sorted(filename for _sheet_name, filename in ORIGINAL_PIRATE_EXPORTS)
    elif args.reference_source_lock_only:
        generated = generated_reference_source_tables(master_path)
        baseline_csv_files = sorted(filename for _sheet_name, filename in REFERENCE_SOURCE_EXPORTS)
    else:
        generated = generated_tables(master_path, baseline_dir)
        baseline_csv_files = sorted(path.name for path in baseline_dir.glob("*.csv"))
    missing_exports = [filename for filename in baseline_csv_files if filename not in generated]
    if missing_exports:
        print("FAIL master workbook missing CSV source sheets:", ", ".join(missing_exports), file=sys.stderr)
        return 1
    if args.check:
        diffs = []
        for filename in baseline_csv_files:
            rows, headers = generated[filename]
            expected = csv_text(rows, headers)
            current = (baseline_dir / filename).read_text(encoding="utf-8-sig")
            if expected != current:
                diffs.append(filename)
        if diffs:
            print("FAIL master export drift:", ", ".join(diffs), file=sys.stderr)
            return 1
        print("PASS master export matches generated CSV tables")
        return 0

    if not args.original_pirate_only and not args.reference_source_lock_only:
        copy_baseline_if_needed(baseline_dir, out_dir)
    for filename, (rows, headers) in generated.items():
        baseline_file = baseline_dir / filename
        has_bom = baseline_file.exists() and baseline_file.read_bytes().startswith(b"\xef\xbb\xbf")
        write_csv(out_dir / filename, rows, headers, bom=has_bom)
    print(f"exported {len(generated)} generated CSV tables from {master_path} to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
