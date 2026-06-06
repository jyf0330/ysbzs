#!/usr/bin/env python3
"""Build runtime JSON from game-data-source/tables.

No third-party xlsx dependency: reads simple .xlsx cells through zip/xml.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
from posixpath import normpath

ROOT = Path(__file__).resolve().parents[1]
DATA_SOURCE = ROOT / "game-data-source"
TABLES = DATA_SOURCE / "tables"
OUT = ROOT / "external-data" / "generated-json"

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"

EL_MAP = {"火": "fire", "水": "water", "风": "wind", "土": "earth", "地": "earth", "fire": "fire", "water": "water", "wind": "wind", "earth": "earth"}
EL_CN = {"fire": "火", "water": "水", "wind": "风", "earth": "土"}
SIZE_MAP = {"小型": "small", "中型": "medium", "大型": "large", "small": "small", "medium": "medium", "large": "large"}
SIZE_CN = {"small": "小型", "medium": "中型", "large": "大型"}
SIZE_SLOTS = {"small": 1, "medium": 2, "large": 3}
QUALITY_TIER = {"青铜": 1, "白银": 2, "黄金": 3, "钻石": 4, "bronze": 1, "silver": 2, "gold": 3, "diamond": 4}
QUALITY_UNLOCK = {"青铜": 1, "白银": 3, "黄金": 5, "钻石": 7}


def cell_col(ref: str) -> int:
    m = re.match(r"([A-Z]+)", ref or "")
    if not m:
        return 0
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def resolve_target(target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    if target.startswith("xl/"):
        return target
    return normpath("xl/" + target)


def read_xlsx(path: Path, sheet_name: str | None = None) -> list[dict[str, object]]:
    if not path.exists():
        raise FileNotFoundError(path)
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        sheets = wb.findall("main:sheets/main:sheet", NS)
        chosen = None
        for sh in sheets:
            if sheet_name is None or sh.attrib.get("name") == sheet_name:
                chosen = sh
                break
        if chosen is None:
            chosen = sheets[0]
        sheet_path = resolve_target(relmap[chosen.attrib[RID]])

        shared: list[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("main:si", NS):
                shared.append("".join(t.text or "" for t in si.findall(".//main:t", NS)))

        root = ET.fromstring(z.read(sheet_path))
        matrix: list[list[object]] = []
        for row in root.findall("main:sheetData/main:row", NS):
            vals: list[object] = []
            for c in row.findall("main:c", NS):
                col_i = cell_col(c.attrib.get("r", ""))
                while len(vals) <= col_i:
                    vals.append("")
                value: object = ""
                t = c.attrib.get("t")
                if t == "inlineStr":
                    value = "".join(x.text or "" for x in c.findall(".//main:t", NS))
                else:
                    v = c.find("main:v", NS)
                    if v is not None:
                        raw = v.text or ""
                        if t == "s":
                            value = shared[int(raw)] if raw != "" else ""
                        elif t == "b":
                            value = raw == "1"
                        else:
                            # keep numeric looking values as int/float where safe
                            try:
                                f = float(raw)
                                value = int(f) if f.is_integer() else f
                            except Exception:
                                value = raw
                vals[col_i] = value
            if any(str(v).strip() for v in vals):
                matrix.append(vals)
        if not matrix:
            return []
        headers = [str(x).strip() for x in matrix[0]]
        rows: list[dict[str, object]] = []
        for raw in matrix[1:]:
            item = {}
            for i, h in enumerate(headers):
                if h:
                    item[h] = raw[i] if i < len(raw) else ""
            if any(str(v).strip() for v in item.values()):
                rows.append(item)
        return rows


def read_json(rel: str, fallback):
    p = OUT / rel
    if not p.exists():
        return fallback
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(rel: str, payload):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def copy_runtime_static():
    # Legacy compatibility JSON is now generated from game-data-source/yaml/compat/*.yaml.
    return []


def s(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def n(v, default=0):
    text = s(v).replace("—", "").replace("-", "").strip()
    if text == "":
        return default
    try:
        f = float(text)
        return int(f) if f.is_integer() else f
    except Exception:
        return default


def price_for(size: str, quality: str) -> int:
    tier = QUALITY_TIER.get(quality, 1)
    base = {"small": 2, "medium": 3, "large": 4}.get(size, 3)
    return base * tier


def action_type_from(row: dict) -> tuple[str, str, str]:
    raw = s(row.get("动作")) + " " + s(row.get("定位")) + " " + s(row.get("机制"))
    skill = s(row.get("技能"))
    if "召" in raw or "summon" in skill.lower():
        return "summon", "summon", skill or "summon_from_cell"
    if "治" in raw or "回复" in raw or "heal" in skill.lower():
        return "support", "heal", skill or "heal_allied_summon"
    if "阻" in raw or "防" in raw or "盾" in raw or "坦" in raw:
        return "block", "guard", skill
    if "控" in raw or "推" in raw or "牵制" in raw:
        return "control", "control", skill
    return "field", "aoe_attack", skill


def build_shape_index():
    master = read_json("attack-shapes/attack_shape_master.json", {"items": []})
    by_id = {}
    for item in master.get("items", []):
        by_id[s(item.get("shape_id"))] = item
        by_id[s(item.get("shape_name"))] = item
        by_id[str(item.get("shape_sn"))] = item
    return by_id


def resolve_shape(row: dict, shapes: dict):
    raw = s(row.get("形状"))
    # examples: A1 单点刺 / B1 横扫三格 / T1 标准前置T
    key = raw.split()[0] if raw else "A1"
    item = shapes.get(key)
    if not item and raw:
        for k, v in shapes.items():
            if k and k in raw:
                item = v
                break
    if not item:
        item = shapes.get("A1") or {"shape_sn": 1, "shape_id": "A1", "shape_name": "单点刺", "cat": "line", "requires_full_fit": True}
    return item


def find_table(patterns: list[str]) -> Path:
    for pat in patterns:
        xs = sorted(TABLES.glob(pat))
        if xs:
            return xs[0]
    raise FileNotFoundError("未找到表: " + " | ".join(patterns))


def build_pal_runtime():
    pal_table = find_table(["*宠物总表*127*机制ID版*.xlsx", "*宠物主表*127*.xlsx", "*宠物总表*127*.xlsx"])
    rows = read_xlsx(pal_table)
    if len(rows) < 100:
        raise RuntimeError(f"宠物表行数异常: {pal_table} -> {len(rows)}")

    shapes = build_shape_index()
    pal_master = []
    pal_stats = []
    work = []
    usage = []
    action_tpl = []
    action_growth = []
    shop_source = []

    for row in rows:
        uid = s(row.get("内部ID")) or ("pal_" + re.sub(r"\D", "", s(row.get("编号"))).zfill(3))
        if not uid:
            continue
        el = EL_MAP.get(s(row.get("元素")), "wind")
        quality = s(row.get("品质")) or "青铜"
        size = SIZE_MAP.get(s(row.get("体型")), "medium")
        shape = resolve_shape(row, shapes)
        action_type, slot_role, skill_ref = action_type_from(row)
        hp = int(n(row.get("HP"), 10))
        atk = int(n(row.get("攻"), 1))
        df = int(n(row.get("防"), 0))
        shield = int(n(row.get("盾"), 0))
        ap = int(n(row.get("行动"), 3))
        tags = s(row.get("标签"))
        tags_list = [x.strip() for x in re.split(r"[,，、]", tags) if x.strip()] or [EL_CN[el], s(row.get("定位")) or "通用"]

        pal_master.append({
            "unit_id": uid,
            "pal_no": s(row.get("编号")),
            "pal_name": s(row.get("名称")) or uid,
            "pal_elements_raw": s(row.get("元素")),
            "ysbzs_element": el,
            "ysbzs_element_cn": EL_CN[el],
            "secondary_element_tags": s(row.get("副属")),
            "size": size,
            "size_cn": SIZE_CN[size],
            "size_slots": SIZE_SLOTS[size],
            "food": 2,
            "work_raw": "",
            "pal_rarity_raw": quality,
            "shop_quality_base": quality,
            "role": s(row.get("定位")),
            "auto_tags": "、".join(tags_list),
            "mechanism_no": s(row.get("机制编号")),
            "mechanism_id": s(row.get("机制ID")),
            "mechanism_review": s(row.get("机制复查")),
            "source_url": "",
            "legal_note": "数据来源: game-data-source/tables/01_宠物主表_127_策划管理版.xlsx"
        })
        pal_stats.append({
            "unit_id": uid,
            "ysbzs_hp": hp,
            "ysbzs_atk": atk,
            "ysbzs_def": df,
            "ysbzs_shield": shield,
            "ysbzs_ap": ap,
            "target_score": n(row.get("目标分"), 0),
            "total_score": n(row.get("总强度"), 0),
            "score_delta": n(row.get("差值"), 0),
            "panel_score": n(row.get("面板分"), 0),
            "mechanism_score": n(row.get("机制分"), 0),
        })
        work.append({"unit_id": uid, "work_note": s(row.get("机制")), "can_summon": s(row.get("可召")) in ("是", "yes", "true", "1")})
        usage.append({"unit_id": uid, "can_player": True, "can_shop": True, "can_reward": True, "can_enemy": True})

        for slot in (1, 2, 3):
            action_tpl.append({
                "unit_id": uid,
                "slot": slot,
                "shape_sn": shape.get("shape_sn", 1),
                "shape_id": shape.get("shape_id", "A1"),
                "shape_name": shape.get("shape_name", "单点刺"),
                "shape_cat": shape.get("cat", "line"),
                "shape_status": shape.get("status", "core"),
                "requires_full_fit": bool(shape.get("requires_full_fit", True)),
                "slot_role": slot_role,
                "el": el,
                "sn": shape.get("shape_sn", 1),
                "dir": "right",
                "action_type": action_type,
                "skill_ref": skill_ref,
            })
            for level in (1, 2, 3, 4):
                value = max(1, int(math.ceil(atk * (0.45 + 0.15 * level))))
                summon_count = 1 if action_type == "summon" else 0
                action_growth.append({
                    "unit_id": uid,
                    "slot": slot,
                    "level": level,
                    "shape_sn_base": 0,
                    "damage_value": value,
                    "effect_value": 0,
                    "tier": level,
                    "layers": level,
                    "value": value,
                    "summon_count": summon_count,
                    "summon_hp": int(max(4, round(hp * (0.25 + 0.08 * level)))) if summon_count else 0,
                })

        price = price_for(size, quality)
        shop_source.append({
            "unit_id": uid,
            "name": s(row.get("名称")) or uid,
            "size": size,
            "size_cn": SIZE_CN[size],
            "quality": quality,
            "element": el,
            "role": s(row.get("定位")),
            "slot_index": 1,
            "price": price,
            "refund": max(1, price // 2),
            "unlock_day": QUALITY_UNLOCK.get(quality, 1),
            "poolTier": QUALITY_TIER.get(quality, 1),
            "tags": tags_list,
        })

    # 当前运行时/测试仍以 60 个完整行动槽 Pal 为正式可出战/商店池；127 先进入主表与数值表。
    runtime_usage = usage[:60]
    runtime_shop_source = shop_source[:60]

    # 保持旧行动槽文件 180/720，用来兼容当前运行时与测试；127 扩充先落到主表/数值源。
    old_action_tpl = read_json("action-slots/action_template_enriched.json", [])
    old_action_growth = read_json("action-slots/action_growth_enriched.json", [])
    pal_units = {
        "pal_master": pal_master,
        "pal_stats_ysbzs": pal_stats,
        "pal_work_suitability": work,
        "unit_usage": runtime_usage,
        "action_template": old_action_tpl,
        "action_growth": old_action_growth,
    }
    write_json("pal_units.json", pal_units)

    shop = read_json("shop_config.json", {"shop_rule": [], "shop_source": [], "shop_runtime": {}})
    shop["shop_source"] = runtime_shop_source
    write_json("shop_config.json", shop)

    return {
        "pal_master": len(pal_master),
        "pal_stats_ysbzs": len(pal_stats),
        "pal_work_suitability": len(work),
        "unit_usage": len(runtime_usage),
        "action_template": len(old_action_tpl),
        "action_growth": len(old_action_growth),
        "shop_source": len(runtime_shop_source),
    }


def normalize_auxiliary_json():
    # Create stable short names from supplemental YAML output.
    copies = [
        ("monster_templates.json", "monster_templates.json"),
        ("monster_waves.json", "monster_waves.json"),
        ("mechanism_mapping.json", "mechanism_mapping.json"),
        ("event_config_new_20260605.json", "event_config_new_20260605.json"),
    ]
    counts = {}
    for src, dst in copies:
        p = OUT / src
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            write_json(dst, data)
            if isinstance(data, dict):
                for k, v in data.items():
                    if isinstance(v, list):
                        counts[dst.replace(".json", "") + "." + k] = len(v)
                        break
    return counts




def generated_table_counts():
    counts = {}
    event = read_json("event_config.json", {})
    relic = read_json("relic_config.json", {})
    hero = read_json("hero_config.json", {})
    encounter = read_json("encounter_config.json", {})
    if isinstance(event, dict):
        for key in ["event_master", "event_option", "event_reward", "event_condition"]:
            if isinstance(event.get(key), list): counts[key] = len(event[key])
    if isinstance(relic, dict):
        for key in ["relic_master", "relic_effect", "relic_source"]:
            if isinstance(relic.get(key), list): counts[key] = len(relic[key])
    if isinstance(hero, dict):
        for key in ["hero_master", "hero_starting_config", "hero_level_rule", "hero_level_reward", "hero_bias"]:
            if isinstance(hero.get(key), list): counts[key] = len(hero[key])
    if isinstance(encounter, dict):
        for key in ["encounter_wave"]:
            if isinstance(encounter.get(key), list): counts[key] = len(encounter[key])
    return counts

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    copy_runtime_static()
    row_counts = {}
    row_counts.update(generated_table_counts())
    row_counts.update(build_pal_runtime())
    row_counts.update(normalize_auxiliary_json())

    # keep old report fields when present, then override row_counts and source.
    old = read_json("export_report.json", {})
    old_counts = old.get("row_counts", {}) if isinstance(old, dict) else {}
    report = {
        "ok": True,
        "generated_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "source": "game-data-source",
        "source_tables_dir": "game-data-source/tables",
        "source_yaml_dir": "game-data-source/yaml",
        "errors": [],
        "row_counts": {**old_counts, **row_counts},
    }
    write_json("export_report.json", report)
    print("[data-source-runtime] generated pal_master:", row_counts.get("pal_master"))
    print("[data-source-runtime] generated action_template:", row_counts.get("action_template"))
    print("[data-source-runtime] generated action_growth:", row_counts.get("action_growth"))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[data-source-runtime] ERROR:", e, file=sys.stderr)
        sys.exit(1)
