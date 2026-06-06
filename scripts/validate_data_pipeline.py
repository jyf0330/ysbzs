#!/usr/bin/env python3
import json
import sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'game-data-source' / 'yaml'
OUT = ROOT / 'external-data' / 'generated-json'

def fail(msg):
    print('[data:validate] ERROR:', msg, file=sys.stderr)
    return 1

def main():
    if not SRC.exists():
        return fail('缺少 game-data-source/yaml')
    if not OUT.exists():
        return fail('缺少 external-data/generated-json，请先运行 npm run data:rebuild')
    yaml_files = [p for p in SRC.rglob('*') if p.suffix.lower() in ('.yml', '.yaml')]
    if not yaml_files:
        return fail('game-data-source/yaml 下没有 YAML')
    for p in yaml_files:
        try:
            yaml.safe_load(p.read_text(encoding='utf-8'))
        except Exception as e:
            return fail(f'YAML 解析失败 {p.relative_to(ROOT)}: {e}')
    required = [
        'pal_units.json','shop_config.json','encounter_config.json','hero_config.json','relic_config.json','event_config.json','export_report.json',
        'action-slots/action_template_enriched.json','action-slots/action_growth_enriched.json','attack-shapes/attack_shape_master.json','attack-shapes/attack_shape_cells.json','attack-shapes/attack_shape_sd_replacement_22.json','legacy_data.json'
    ]
    for rel in required:
        if not (OUT / rel).exists():
            return fail(f'缺少生成文件: external-data/generated-json/{rel}')
    pal = json.loads((OUT/'pal_units.json').read_text(encoding='utf-8'))
    rep = json.loads((OUT/'export_report.json').read_text(encoding='utf-8'))
    tpl = json.loads((OUT/'action-slots/action_template_enriched.json').read_text(encoding='utf-8'))
    grw = json.loads((OUT/'action-slots/action_growth_enriched.json').read_text(encoding='utf-8'))
    if len(pal.get('pal_master', [])) != 127:
        return fail(f'pal_master 应为 127，实际 {len(pal.get("pal_master", []))}')
    if len(tpl) != 180:
        return fail(f'action_template_enriched 应为 180，实际 {len(tpl)}')
    if len(grw) != 720:
        return fail(f'action_growth_enriched 应为 720，实际 {len(grw)}')
    rc = rep.get('row_counts', {})
    for k, v in {'pal_master':127,'action_template':180,'action_growth':720}.items():
        if rc.get(k) != v:
            return fail(f'export_report.row_counts.{k} 应为 {v}，实际 {rc.get(k)}')
    print('[data:validate] 通过：game-data-source YAML 可解析，generated-json 完整，127/180/720 关键数量正确。')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
