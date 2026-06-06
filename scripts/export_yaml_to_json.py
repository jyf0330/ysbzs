#!/usr/bin/env python3
import json
import sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'game-data-source' / 'yaml'
OUT = ROOT / 'external-data' / 'generated-json'

def main():
    files = sorted([p for p in SRC.rglob('*') if p.suffix.lower() in ('.yml', '.yaml')])
    if not files:
        print('[yaml-export] game-data-source/yaml/ 下未找到 YAML 文件', file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    ok = 0
    fail = 0
    print(f'[yaml-export] 发现 {len(files)} 个 YAML 文件，开始导出...')
    for p in files:
        rel = p.relative_to(SRC)
        dst = (OUT / rel).with_suffix('.json')
        try:
            data = yaml.safe_load(p.read_text(encoding='utf-8'))
            if data is None:
                print(f'  ⚠ {rel} 为空，跳过')
                continue
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f'  ✓ {rel} → {dst.relative_to(OUT)}')
            ok += 1
        except Exception as e:
            print(f'  ✗ {rel} 失败: {e}', file=sys.stderr)
            fail += 1
    print('\n═══════════════════════════════════════')
    print(f'  成功: {ok}')
    print(f'  失败: {fail}')
    print(f'  输出: {OUT}')
    print('═══════════════════════════════════════')
    return 1 if fail else 0

if __name__ == '__main__':
    raise SystemExit(main())
