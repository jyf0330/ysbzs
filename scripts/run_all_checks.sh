#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT_DIR/scripts/verify_no_upstream_edits.sh"
(cd "$ROOT_DIR/apps/ysbzs" && npm test && npm run check:csv && npm run check:day7 && npm run check:dom && npm run check:all)
(cd "$ROOT_DIR/boardgameio-adapter" && npm install --no-audit --no-fund >/dev/null && npm run check:adapter)
(cd "$ROOT_DIR/apps/ysbzs-boardgameio" && npm install --no-audit --no-fund >/dev/null && npm run check:all)
echo "PASS all checks"
