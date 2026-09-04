"""Derived source identities and declared scope. Never review or rule acceptance."""
import copy
import hashlib
import json
import re

import export_master_to_csv as source
import bazaar_run_source_views as run_view

SCHEMA = "ysbzs.original-pirate-source-catalog.v2"
QUALITIES = ("bronze", "silver", "gold", "diamond")
HEADERS = ["item_id", "quality", "enchantment_id", "scope_id", "source_snapshot_id", "source_object_id"]
SKILL_HEADERS = ["hero_skill_id", "quality", "scope_id", "source_snapshot_id", "source_object_id"]
RUN_METADATA_FIELDS = ["parentSnapshotId", "artifactMetadata", "selectionScope", "evidenceUrl", "memberCount", "membersSha256"]
RUN_MEMBER_FIELDS = ["sourceType", "sourceUuid", "sourceHeroes", "spawningEligibility", "sourceQualities"]
LOCAL_FIELDS = ["source_kind", "source_revision", "captured_on", "license_note", "catalog_scope", "completeness", "catalog_status"]
EXTERNAL_FIELDS = source.REFERENCE_SNAPSHOT_HEADERS[1:]


def _exact(value, fields, code):
    if not isinstance(value, dict) or set(value) != set(fields):
        raise ValueError("SOURCE_" + code)


def _id(value):
    return isinstance(value, str) and re.fullmatch(r"[a-z][a-z0-9_.-]*", value) is not None


def scope_key(value):
    return (QUALITIES.index(value["quality"]), value.get("enchantmentId", ""), value["scopeId"])


def run_metadata(view, parent):
    return {"parentSnapshotId": view["parent_source_snapshot_id"], "artifactMetadata": external_snapshot(parent),
            "selectionScope": view["selection_scope"], "evidenceUrl": view["evidence_url"],
            "memberCount": view["member_count"], "membersSha256": view["members_sha256"]}


def canonical_catalog(catalog):
    result = copy.deepcopy(catalog)
    for snapshot in result.get("snapshots", []):
        snapshot["members"] = sorted(snapshot["members"], key=lambda m: (m["sourceType"], m["sourceUuid"]))
    result["snapshots"].sort(key=lambda s: s["snapshotId"])
    return result


def snapshot_digest(snapshot):
    payload = {key: value for key, value in snapshot.items() if key != "snapshotDigest"}
    payload["members"] = sorted(payload["members"], key=lambda m: (m["sourceType"], m["sourceUuid"]))
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def external_snapshot(row=None):
    if row is None:
        row = source.REFERENCE_SNAPSHOT_ROWS[source.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID]
    metadata = {key: row[key] for key in EXTERNAL_FIELDS}
    metadata["game_patch"] = metadata["game_patch"] or None
    return metadata


def expected_scopes(items, bundle):
    result = {i["itemId"]: {(q, "none", "battle_profile") for q in i["qualityProfiles"]} for i in items}
    for enchantment in bundle["executableCatalogs"]["enchantments"]:
        for profile in enchantment["profiles"]:
            result[profile["itemId"]].add((profile["quality"], enchantment["enchantmentId"], "battle_profile"))
    return result


def validate_sources(items, bundle):
    catalog = bundle.get("sourceCatalog")
    _exact(catalog, ["schema", "snapshots"], "CATALOG_FIELDS_INVALID")
    if catalog["schema"] != SCHEMA or not isinstance(catalog["snapshots"], list) or not catalog["snapshots"]:
        raise ValueError("SOURCE_CATALOG_INVALID")
    snapshots = {}
    for snapshot in catalog["snapshots"]:
        _exact(snapshot, ["snapshotId", "originKind", "metadata", "members", "snapshotDigest"], "SNAPSHOT_FIELDS_INVALID")
        sid = snapshot["snapshotId"]
        if not _id(sid) or sid in snapshots:
            raise ValueError("SOURCE_SNAPSHOT_ID_INVALID")
        metadata, members, kind = snapshot["metadata"], snapshot["members"], snapshot["originKind"]
        if not isinstance(members, list):
            raise ValueError("SOURCE_MEMBERS_INVALID")
        if kind == "local_original":
            _exact(metadata, LOCAL_FIELDS, "LOCAL_METADATA_INVALID")
            if any(not isinstance(metadata[k], str) or not metadata[k] for k in LOCAL_FIELDS) \
                    or metadata["source_kind"] != "local_original" or metadata["completeness"] != "bootstrap" \
                    or metadata["catalog_status"] != "formal" or not _id(metadata["source_revision"]) \
                    or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", metadata["captured_on"]) or members:
                raise ValueError("SOURCE_LOCAL_METADATA_INVALID")
        elif kind == "synthetic_fixture":
            _exact(metadata, ["fixtureId"], "FIXTURE_METADATA_INVALID")
            if metadata["fixtureId"] != sid or members:
                raise ValueError("SOURCE_FIXTURE_INVALID")
        elif kind == "external_run_view":
            _exact(metadata, RUN_METADATA_FIELDS, "RUN_METADATA_INVALID")
            expected_meta = run_metadata(run_view.view_row(source.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID),
                                        source.REFERENCE_SNAPSHOT_ROWS[source.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID])
            if sid != run_view.VIEW_ID or metadata != expected_meta:
                raise ValueError("SOURCE_RUN_VIEW_LOCK_INVALID")
            rows = []
            for member in members:
                _exact(member, RUN_MEMBER_FIELDS, "RUN_MEMBER_FIELDS_INVALID")
                if any(not isinstance(member[k], str) for k in RUN_MEMBER_FIELDS):
                    raise ValueError("SOURCE_RUN_MEMBER_VALUE_INVALID")
                rows.append(dict(zip(run_view.MEMBER_HEADERS, [sid] + [member[k] for k in RUN_MEMBER_FIELDS])))
            if len(rows) != 15 or run_view.member_digest(rows) != run_view.MEMBERS_SHA256:
                raise ValueError("SOURCE_RUN_MEMBER_SET_INVALID")
        elif kind == "external_reference":
            _exact(metadata, EXTERNAL_FIELDS, "EXTERNAL_METADATA_INVALID")
            if sid != source.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID or metadata != external_snapshot():
                raise ValueError("SOURCE_EXTERNAL_LOCK_INVALID")
            ids = []
            for member in members:
                _exact(member, ["sourceType", "sourceUuid"], "MEMBER_FIELDS_INVALID")
                uid = member["sourceUuid"]
                if member["sourceType"] != "item" or not isinstance(uid, str) or not re.fullmatch(
                    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uid
                ):
                    raise ValueError("SOURCE_MEMBER_ID_INVALID")
                ids.append(uid)
            if len(ids) != 140 or len(set(ids)) != 140 or hashlib.sha256("\n".join(sorted(ids)).encode()).hexdigest() != source.RELOCKED_LOCAL_CACHE_ITEM_ID_SET_SHA256:
                raise ValueError("SOURCE_MEMBER_SET_INVALID")
        else:
            raise ValueError("SOURCE_ORIGIN_KIND_INVALID")
        if snapshot["snapshotDigest"] != snapshot_digest(snapshot):
            raise ValueError("SOURCE_SNAPSHOT_DIGEST_MISMATCH")
        snapshots[sid] = snapshot
    expected = expected_scopes(items, bundle)
    used = set()
    definitions = [(item, "item", item["itemId"]) for item in items] + [
        (skill, "skill", skill["heroSkillId"]) for skill in bundle["executableCatalogs"]["heroSkills"]
    ]
    for item, source_type, object_id in definitions:
        binding = item.get("sourceBinding")
        _exact(binding, ["snapshotId", "snapshotDigest", "objectId", "declaredScopes"], "BINDING_FIELDS_INVALID")
        sid = binding["snapshotId"]
        if not isinstance(sid, str) or sid not in snapshots:
            raise ValueError("SOURCE_BINDING_SNAPSHOT_UNKNOWN")
        snapshot = snapshots[sid]
        used.add(sid)
        if binding["snapshotDigest"] != snapshot["snapshotDigest"]:
            raise ValueError("SOURCE_BINDING_DIGEST_MISMATCH")
        member = None
        if snapshot["originKind"] in ("external_reference", "external_run_view"):
            member = next((m for m in snapshot["members"] if m["sourceType"] == source_type and m["sourceUuid"] == binding["objectId"]), None)
            if member is None:
                raise ValueError("SOURCE_BINDING_OBJECT_UNKNOWN")
        elif binding["objectId"] != object_id:
            raise ValueError("SOURCE_BINDING_LOCAL_OBJECT_MISMATCH")
        if not isinstance(binding["declaredScopes"], list):
            raise ValueError("SOURCE_SCOPES_INVALID")
        scopes = []
        for scope in binding["declaredScopes"]:
            fields = ["quality", "scopeId"] if source_type == "skill" else ["quality", "enchantmentId", "scopeId"]
            _exact(scope, fields, "SCOPE_FIELDS_INVALID")
            if scope["quality"] not in QUALITIES or scope["scopeId"] != ("hero_skill_profile" if source_type == "skill" else "battle_profile"):
                raise ValueError("SOURCE_SCOPE_INVALID")
            if source_type == "item" and not _id(scope["enchantmentId"]):
                raise ValueError("SOURCE_SCOPE_INVALID")
            if member is not None and snapshot["originKind"] == "external_run_view" and scope["quality"] not in member["sourceQualities"].split('|'):
                raise ValueError("SOURCE_MEMBER_QUALITY_UNDECLARED")
            scopes.append((scope["quality"], scope["scopeId"]) if source_type == "skill" else (scope["quality"], scope["enchantmentId"], scope["scopeId"]))
        expected_set = {(q, "hero_skill_profile") for q in item["qualityProfiles"]} if source_type == "skill" else expected[object_id]
        if len(set(scopes)) != len(scopes) or set(scopes) != expected_set:
            raise ValueError("SOURCE_SCOPE_COVERAGE_INVALID")
    if used != set(snapshots):
        raise ValueError("SOURCE_CATALOG_UNUSED_SNAPSHOT")


def assemble_sources(tables, csv_dir, items, bundle):
    local = tables["56_bz_source_snapshot.csv"][0]
    local_id = local["snapshot_id"]
    available = {local_id: {"snapshotId": local_id, "originKind": "local_original", "metadata": {k: local[k] for k in LOCAL_FIELDS}, "members": []}}
    rows = tables["68_bz_item_source_bindings.csv"]
    skill_rows = tables["71_bz_hero_skill_source_bindings.csv"]
    if any(row["source_snapshot_id"] != local_id for row in rows + skill_rows):
        reference = {filename: source.read_csv(csv_dir / filename) for _, filename in source.REFERENCE_SOURCE_EXPORTS}
        source.validate_bazaar_reference_members(reference)
        sid = source.RELOCKED_LOCAL_CACHE_SNAPSHOT_ID
        snapshot_row = next(row for row in reference["66_bazaar_reference_snapshots.csv"][0] if row["source_snapshot_id"] == sid)
        available[sid] = {"snapshotId": sid, "originKind": "external_reference", "metadata": external_snapshot(snapshot_row), "members": [
            {"sourceType": row["source_type"], "sourceUuid": row["source_uuid"]}
            for row in reference["67_bazaar_reference_members.csv"][0]
        ]}
        if any(row["source_snapshot_id"] == run_view.VIEW_ID for row in rows + skill_rows):
            run_view.validate(reference)
            view = reference[run_view.VIEW_FILE][0][0]
            available[run_view.VIEW_ID] = {"snapshotId": run_view.VIEW_ID, "originKind": "external_run_view",
                "metadata": run_metadata(view, snapshot_row), "members": [
                    dict(zip(RUN_MEMBER_FIELDS, [r[k] for k in run_view.MEMBER_HEADERS[1:]]))
                    for r in reference[run_view.MEMBER_FILE][0]]}
    index = {item["itemId"]: item for item in items}
    used = set()
    for row in rows:
        item_id, sid, oid = row["item_id"], row["source_snapshot_id"], row["source_object_id"]
        if item_id not in index or sid not in available:
            raise ValueError("SOURCE_ROW_REFERENCE_UNKNOWN")
        item = index[item_id]
        if "sourceBinding" not in item:
            item["sourceBinding"] = {"snapshotId": sid, "snapshotDigest": snapshot_digest(available[sid]), "objectId": oid, "declaredScopes": []}
        binding = item["sourceBinding"]
        if binding["snapshotId"] != sid or binding["objectId"] != oid:
            raise ValueError("SOURCE_ROW_OBJECT_CHANGED")
        binding["declaredScopes"].append({"quality": row["quality"], "enchantmentId": row["enchantment_id"], "scopeId": row["scope_id"]})
        used.add(sid)
    skill_index = {k["heroSkillId"]: k for k in bundle["executableCatalogs"]["heroSkills"]}
    for row in skill_rows:
        skill_id, sid, oid = row["hero_skill_id"], row["source_snapshot_id"], row["source_object_id"]
        if skill_id not in skill_index or sid not in available:
            raise ValueError("SOURCE_SKILL_ROW_REFERENCE_UNKNOWN")
        skill = skill_index[skill_id]
        if "sourceBinding" not in skill:
            skill["sourceBinding"] = {"snapshotId": sid, "snapshotDigest": snapshot_digest(available[sid]), "objectId": oid, "declaredScopes": []}
        binding = skill["sourceBinding"]
        if binding["snapshotId"] != sid or binding["objectId"] != oid:
            raise ValueError("SOURCE_SKILL_ROW_OBJECT_CHANGED")
        binding["declaredScopes"].append({"quality": row["quality"], "scopeId": row["scope_id"]})
        used.add(sid)
    for sid in used:
        available[sid]["snapshotDigest"] = snapshot_digest(available[sid])
    bundle["sourceCatalog"] = {"schema": SCHEMA, "snapshots": [available[sid] for sid in sorted(used)]}
    validate_sources(items, bundle)
    for item in items:
        item["sourceBinding"]["declaredScopes"].sort(key=scope_key)
    for skill in skill_index.values():
        skill["sourceBinding"]["declaredScopes"].sort(key=scope_key)
    bundle["sourceCatalog"] = canonical_catalog(bundle["sourceCatalog"])
