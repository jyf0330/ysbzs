#!/usr/bin/env python3
"""Export planner-facing xlsx master rows into complete program CSV tables.

The master workbook intentionally keeps only human-editable columns. Existing
CSV files are used as the completion baseline for program-only and generated
columns, so a thin workbook can safely drive the current full CSV schema.
"""

import argparse
import csv
import posixpath
import re
import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

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

MASTER_ONLY_EXPORTS = [
    ("SHOP_STORES", "30_shop_stores.csv"),
    ("SHAPE_CATALOG", "27_shape_catalog.csv"),
    ("QUALITY_GROWTH", "28_quality_growth.csv"),
    ("QUALITY_UPGRADES", "29_quality_upgrades.csv"),
]

DOMAIN_SECTION_SHEETS = [
    "MECHANICS_QUALITY",
    "SHAPES_TRIALS",
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
    shop_by_id = by_key(master["SHOP_ITEMS"], "pet_id")
    mech_by_id = by_key(master["MECHANISMS"], "mechanism_id")
    baseline_pets, _baseline_pet_headers = read_csv(baseline_dir / "01_pets.csv")
    baseline_pets_by_id = by_key(baseline_pets, "宠物ID")
    baseline_monsters, _baseline_monster_headers = read_csv(baseline_dir / "02_monster_templates.csv")
    baseline_monsters_by_pet = by_key(baseline_monsters, "宠物ID")
    pet_effect_scores = {}
    for pet_id, pet in pets_by_id.items():
        score_row = dict(baseline_pets_by_id.get(pet_id, {}))
        for field, key in [("HP", "hp"), ("攻", "atk"), ("盾", "shield"), ("行动", "action")]:
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
        output = [dict(row) for row in rows]

        if filename == "01_pets.csv":
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
                row["盾"] = first_non_empty(pet.get("shield"), row.get("盾"))
                row["行动"] = first_non_empty(pet.get("action"), row.get("行动"))
                row["机制ID"] = sheet_value(pet, "mechanism_id", row.get("机制ID"), allow_blank=True)
                row["形状"] = first_non_empty(pet.get("shape_id"), row.get("形状"))
                row["效果分"] = format_number(pet_effect_scores.get(row.get("宠物ID", ""), panel_score(row)))
                row["标签"] = first_non_empty(build_pet_tags(pet, row.get("标签")), row.get("标签"))
                row["备注"] = first_non_empty(pet.get("note"), row.get("备注"))
                row["副属"] = "、".join(elements[1:])

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
            for row in output:
                shop = shop_by_id.get(row.get("宠物ID", ""))
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if pet:
                    row["名称(自动)"] = first_non_empty(pet.get("name"), row.get("名称(自动)"))
                    row["元素(自动)"] = pet_elements(pet)[0]
                    row["品质(自动)"] = first_non_empty(pet.get("tier"), row.get("品质(自动)"))
                    row["定位(自动)"] = sheet_value(pet, "role", row.get("定位(自动)"), allow_blank=True)
                    row["标签(自动)"] = first_non_empty(build_pet_tags(pet, row.get("标签(自动)")), row.get("标签(自动)"))
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
    for baseline_file in sorted(baseline_dir.glob("*.csv")):
        if baseline_file.name not in result:
            result[baseline_file.name] = read_csv(baseline_file)
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
    args = parser.parse_args(argv)

    master_path = Path(args.master)
    baseline_dir = Path(args.baseline_dir)
    out_dir = Path(args.out_dir)
    if not master_path.exists():
        raise SystemExit(f"missing master workbook: {master_path}")
    if not baseline_dir.exists():
        raise SystemExit(f"missing baseline csv dir: {baseline_dir}")

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

    copy_baseline_if_needed(baseline_dir, out_dir)
    for filename, (rows, headers) in generated.items():
        baseline_file = baseline_dir / filename
        has_bom = baseline_file.exists() and baseline_file.read_bytes().startswith(b"\xef\xbb\xbf")
        write_csv(out_dir / filename, rows, headers, bom=has_bom)
    print(f"exported {len(generated)} generated CSV tables from {master_path} to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
