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


def read_csv_rows(name):
    with (CSV_DIR / name).open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.reader(f))


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


def add_domain_sheet(wb, title, sections):
    ws = wb.create_sheet(title)
    section_fill = PatternFill("solid", fgColor="7030A0")
    header_fill = PatternFill("solid", fgColor="1F4E78")
    section_font = Font(color="FFFFFF", bold=True)
    header_font = Font(color="FFFFFF", bold=True)
    for csv_name, description in sections:
        ws.append(["#csv", csv_name, description])
        section_row = ws.max_row
        for cell in ws[section_row]:
            cell.fill = section_fill
            cell.font = section_font
            cell.alignment = Alignment(vertical="center", wrap_text=True)
        rows = read_csv_rows(csv_name)
        if rows:
            ws.append(rows[0])
            for cell in ws[ws.max_row]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            for row in rows[1:]:
                ws.append(row)
        ws.append([])
    ws.freeze_panes = "A2"
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    for col_idx in range(1, ws.max_column + 1):
        sample = [str(ws.cell(r, col_idx).value or "") for r in range(1, min(ws.max_row, 80) + 1)]
        width = min(max(max((len(s) for s in sample), default=8) + 2, 10), 36)
        ws.column_dimensions[get_column_letter(col_idx)].width = width
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

    add_domain_sheet(wb, "ROUTE", [
        ("24_node_schedule.csv", "每日路线排程：每天节点/固定战顺序。"),
        ("25_node_pool.csv", "每日路线节点池：商店、奖励、事件、休整节点候选。"),
        ("26_encounter_pool.csv", "路线战斗遭遇池：固定战/遭遇到波次时段的映射。"),
    ])

    add_domain_sheet(wb, "ECONOMY_EVENTS", [
        ("05_events.csv", "外层事件、商店事件、战斗后事件。"),
        ("07_relic_blessings.csv", "遗物/祝福奖励池。"),
        ("10_initial_roster.csv", "开局阵容和站位。"),
    ])

    add_domain_sheet(wb, "RULES", [
        ("00_maintenance_guide.csv", "维护入口说明。"),
        ("09_cross_validation.csv", "跨表校验摘要。"),
        ("11_hero_domains.csv", "英雄领域与全局领域规则。"),
        ("12_element_reactions.csv", "元素反应规则。"),
        ("14_quality_multipliers.csv", "品质倍率。"),
        ("18_effect_objects.csv", "持续效果对象。"),
        ("19_triggers.csv", "触发器定义。"),
        ("20_modifiers.csv", "修饰器定义。"),
        ("21_element_packet_rules.csv", "元素包规则。"),
        ("22_element_conversion_rules.csv", "元素转换规则。"),
        ("23_trigger_order_rules.csv", "触发排序规则。"),
    ])

    add_domain_sheet(wb, "PROGRESSION_TRIALS", [
        ("15_summon_trial_questions.csv", "召唤试炼题库。"),
        ("16_trial_action_plan.csv", "试炼行动脚本。"),
        ("17_trial_victory_rules.csv", "试炼胜负规则。"),
        ("27_shape_catalog.csv", "19 个战斗形状目录。"),
        ("28_quality_growth.csv", "品质成长数值。"),
        ("29_quality_upgrades.csv", "品质升级质变。"),
    ])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
