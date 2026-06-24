#!/usr/bin/env python3
"""Export planner-facing xlsx master rows into complete program CSV tables.

The master workbook intentionally keeps only human-editable columns. Existing
CSV files are used as the completion baseline for program-only and generated
columns, so a thin workbook can safely drive the current full CSV schema.
"""

import argparse
import csv
import posixpath
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
    ("SHAPE_CATALOG", "27_shape_catalog.csv"),
    ("QUALITY_GROWTH", "28_quality_growth.csv"),
    ("QUALITY_UPGRADES", "29_quality_upgrades.csv"),
]

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


def shape_class_for_group(group):
    if group == "one":
        return "一格形状"
    if group == "two":
        return "二格形状"
    if group == "three":
        return "三格形状"
    return ""


def generated_sheet_table(master_path, sheet_name):
    rows = sheet_dicts(master_path, sheet_name)
    if not rows:
        return [], []
    headers = list(rows[0].keys())
    return rows, headers


def csv_sheet_name(filename):
    return Path(filename).stem


def generated_full_csv_sheets(master_path, baseline_dir):
    with zipfile.ZipFile(master_path) as zf:
        sheet_names = set(workbook_sheet_paths(zf).keys())
    result = {}
    for csv_file in sorted(baseline_dir.glob("*.csv")):
        sheet_name = csv_sheet_name(csv_file.name)
        if sheet_name not in sheet_names:
            continue
        rows, headers = generated_sheet_table(master_path, sheet_name)
        if rows and headers:
            result[csv_file.name] = (rows, headers)
    return result


def generated_tables(master_path, baseline_dir):
    master = {
        "PETS": sheet_dicts(master_path, "PETS"),
        "WAVES": sheet_dicts(master_path, "WAVES"),
        "SHOP_ITEMS": sheet_dicts(master_path, "SHOP_ITEMS"),
        "MECHANISMS": sheet_dicts(master_path, "MECHANISMS"),
        "TRIALS": sheet_dicts(master_path, "TRIALS"),
        "SHAPE_CATALOG": sheet_dicts(master_path, "SHAPE_CATALOG"),
    }

    pets_by_id = by_key(master["PETS"], "pet_id")
    shop_by_id = by_key(master["SHOP_ITEMS"], "pet_id")
    mech_by_id = by_key(master["MECHANISMS"], "mechanism_id")
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
    shapes_by_id = by_key(master["SHAPE_CATALOG"], "shape_id")

    result = generated_full_csv_sheets(master_path, baseline_dir)
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
                row["元素"] = first_non_empty(pet.get("element"), row.get("元素"))
                row["品质"] = first_non_empty(pet.get("tier"), row.get("品质"))
                row["定位"] = first_non_empty(pet.get("role"), row.get("定位"))
                row["HP"] = first_non_empty(pet.get("hp"), row.get("HP"))
                row["攻"] = first_non_empty(pet.get("atk"), row.get("攻"))
                row["盾"] = first_non_empty(pet.get("shield"), row.get("盾"))
                row["行动"] = first_non_empty(pet.get("action"), row.get("行动"))
                row["机制ID"] = first_non_empty(pet.get("mechanism_id"), row.get("机制ID"))
                row["形状"] = first_non_empty(pet.get("shape_id"), row.get("形状"))
                row["备注"] = first_non_empty(pet.get("note"), row.get("备注"))

        elif filename == "02_monster_templates.csv":
            for row in output:
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if not pet:
                    continue
                row["名称(自动)"] = first_non_empty(pet.get("name"), row.get("名称(自动)"))
                row["元素(自动)"] = first_non_empty(pet.get("element"), row.get("元素(自动)"))
                row["宠物定位(自动)"] = first_non_empty(pet.get("role"), row.get("宠物定位(自动)"))
                row["HP"] = first_non_empty(pet.get("hp"), row.get("HP"))
                row["攻"] = first_non_empty(pet.get("atk"), row.get("攻"))
                row["盾"] = first_non_empty(pet.get("shield"), row.get("盾"))
                row["行动"] = first_non_empty(pet.get("action"), row.get("行动"))
                row["机制ID"] = first_non_empty(pet.get("mechanism_id"), row.get("机制ID"))

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
                if not shop:
                    continue
                row["解锁日"] = first_non_empty(shop.get("unlock_day"), row.get("解锁日"))
                row["池档"] = first_non_empty(shop.get("tier_pool"), row.get("池档"))
                row["默认价"] = first_non_empty(shop.get("base_price"), row.get("默认价"))
                row["夜市权重"] = first_non_empty(shop.get("shop_weight"), row.get("夜市权重"))
                row["奖励权重"] = first_non_empty(shop.get("reward_weight"), row.get("奖励权重"))
                row["备注"] = first_non_empty(shop.get("note"), row.get("备注"))

        elif filename == "08_action_shapes.csv":
            for row in output:
                pet = pets_by_id.get(row.get("宠物ID", ""))
                if not pet:
                    continue
                sid, sname = shape_parts(first_non_empty(pet.get("shape_id"), row.get("形状ID")))
                shape = shapes_by_id.get(sid, {})
                row["名称(自动)"] = first_non_empty(pet.get("name"), row.get("名称(自动)"))
                row["元素(自动)"] = first_non_empty(pet.get("element"), row.get("元素(自动)"))
                row["定位(自动)"] = first_non_empty(pet.get("role"), row.get("定位(自动)"))
                row["形状ID"] = first_non_empty(sid, row.get("形状ID"))
                row["形状名"] = first_non_empty(shape.get("label"), sname, row.get("形状名"))
                row["形状分类"] = first_non_empty(shape_class_for_group(shape.get("group")), row.get("形状分类"))
                row["命中格数"] = first_non_empty(shape.get("cell_count"), row.get("命中格数"))
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
