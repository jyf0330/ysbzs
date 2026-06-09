#!/usr/bin/env python3
"""Build the first planner-facing master workbook from current CSV truth."""

import csv
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "data" / "csv"
OUT = ROOT / "xlsx" / "ysbzs_master.xlsx"


def read_csv(name):
    with (CSV_DIR / name).open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def split_pool_count(expr):
    raw = str(expr or "").strip()
    if "-" not in raw:
        return raw, ""
    left, right = raw.rsplit("-", 1)
    if right.strip().isdigit() and left.strip():
        return left.strip(), right.strip()
    return raw, ""


def trial_position(row):
    rr = str(row.get("行(1-8)", "")).strip()
    cc = str(row.get("列(1-8)", "")).strip()
    return f"{rr},{cc}" if rr or cc else ""


def stat_override(row):
    parts = []
    for key in ["HP", "攻", "防", "盾", "行动"]:
        value = str(row.get(key, "")).strip()
        if value:
            parts.append(f"{key}={value}")
    return ";".join(parts)


def add_sheet(wb, title, headers, rows, widths=None):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for row in rows:
        ws.append([row.get(h, "") for h in headers])
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    header_fill = PatternFill("solid", fgColor="1F4E78")
    header_font = Font(color="FFFFFF", bold=True)
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    for i, header in enumerate(headers, start=1):
        width = (widths or {}).get(header)
        if width is None:
            sample = [str(header)] + [str(row.get(header, "")) for row in rows[:30]]
            width = min(max(max(len(s) for s in sample) + 2, 10), 34)
        ws.column_dimensions[get_column_letter(i)].width = width
    return ws


def main():
    pets = read_csv("01_pets.csv")
    waves = read_csv("03_monster_waves.csv")
    shop = read_csv("06_shop_rewards.csv")
    mechanisms = read_csv("04_mechanisms.csv")
    trials = read_csv("13_day7_beast_trial.csv")

    wb = Workbook()
    default = wb.active
    wb.remove(default)

    readme = wb.create_sheet("README")
    readme_rows = [
        ("用途", "这是人类策划入口；程序完整数据仍输出到 data/csv/*.csv。"),
        ("日常维护", "优先改 PETS / WAVES / SHOP_ITEMS / MECHANISMS / TRIALS 里的人工字段。"),
        ("导出", "npm run data:export"),
        ("校验", "npm run check:csv"),
        ("边界", "自动列、程序冗余列、16-23 规则展开表不放进日常主表。"),
    ]
    readme.append(["项目", "说明"])
    for row in readme_rows:
        readme.append(row)
    readme.column_dimensions["A"].width = 16
    readme.column_dimensions["B"].width = 86
    readme.freeze_panes = "A2"
    for cell in readme[1]:
        cell.fill = PatternFill("solid", fgColor="1F4E78")
        cell.font = Font(color="FFFFFF", bold=True)

    add_sheet(
        wb,
        "PETS",
        ["pet_id", "name", "element", "tier", "role", "hp", "atk", "shield", "action", "mechanism_id", "shape_id", "note"],
        [
            {
                "pet_id": r.get("宠物ID", ""),
                "name": r.get("名称", ""),
                "element": r.get("元素", ""),
                "tier": r.get("品质", ""),
                "role": r.get("定位", ""),
                "hp": r.get("HP", ""),
                "atk": r.get("攻", ""),
                "shield": r.get("盾", ""),
                "action": r.get("行动", ""),
                "mechanism_id": r.get("机制ID", ""),
                "shape_id": r.get("形状", ""),
                "note": r.get("备注", ""),
            }
            for r in pets
        ],
        widths={"pet_id": 12, "mechanism_id": 26, "shape_id": 18, "note": 26},
    )

    add_sheet(
        wb,
        "WAVES",
        ["wave_id", "day", "period", "round", "enemy_pool", "count", "quality_weights", "target_threat", "design_goal", "fail_penalty", "reward_note", "note"],
        [
            {
                "wave_id": r.get("波次ID", ""),
                "day": r.get("天数", ""),
                "period": r.get("时段", ""),
                "round": r.get("回合", ""),
                "enemy_pool": split_pool_count(r.get("宠物池-数量", ""))[0],
                "count": split_pool_count(r.get("宠物池-数量", ""))[1],
                "quality_weights": r.get("品质权重", ""),
                "target_threat": r.get("本行威胁(当前计算值)", ""),
                "design_goal": r.get("填写说明", ""),
                "fail_penalty": "",
                "reward_note": "",
                "note": "",
            }
            for r in waves
        ],
        widths={"wave_id": 22, "enemy_pool": 28, "quality_weights": 18, "design_goal": 36, "note": 26},
    )

    add_sheet(
        wb,
        "SHOP_ITEMS",
        ["pet_id", "unlock_day", "tier_pool", "base_price", "shop_weight", "reward_weight", "role_tag", "note"],
        [
            {
                "pet_id": r.get("宠物ID", ""),
                "unlock_day": r.get("解锁日", ""),
                "tier_pool": r.get("池档", ""),
                "base_price": r.get("默认价", ""),
                "shop_weight": r.get("夜市权重", ""),
                "reward_weight": r.get("奖励权重", ""),
                "role_tag": r.get("定位(自动)", ""),
                "note": r.get("备注", ""),
            }
            for r in shop
        ],
        widths={"pet_id": 12, "role_tag": 16, "note": 28},
    )

    add_sheet(
        wb,
        "MECHANISMS",
        ["mechanism_id", "name", "category", "trigger", "effect_summary", "score", "status", "note"],
        [
            {
                "mechanism_id": r.get("机制ID", ""),
                "name": r.get("机制名", ""),
                "category": r.get("分类", ""),
                "trigger": r.get("触发", ""),
                "effect_summary": r.get("效果", ""),
                "score": r.get("机制分", ""),
                "status": r.get("接入状态", ""),
                "note": r.get("备注", ""),
            }
            for r in mechanisms
        ],
        widths={"mechanism_id": 28, "effect_summary": 44, "note": 32},
    )

    add_sheet(
        wb,
        "TRIALS",
        ["trial_id", "row_type", "unit_side", "pet_id", "quality_override", "position", "stat_override", "rule_note", "note"],
        [
            {
                "trial_id": r.get("配置ID", ""),
                "row_type": r.get("类型", ""),
                "unit_side": r.get("阵营", ""),
                "pet_id": r.get("宠物ID", ""),
                "quality_override": r.get("品质覆盖", ""),
                "position": trial_position(r),
                "stat_override": stat_override(r),
                "rule_note": r.get("关键规则", ""),
                "note": r.get("备注", ""),
            }
            for r in trials
        ],
        widths={"trial_id": 22, "row_type": 18, "pet_id": 16, "stat_override": 30, "rule_note": 42, "note": 34},
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
