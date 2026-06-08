#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="$ROOT_DIR/upstream/boardgame.io-main"
MANIFEST="$ROOT_DIR/upstream/BOARDGAME_IO_MAIN_FILE_MANIFEST.sha256"
if [[ ! -d "$UPSTREAM" ]]; then
  echo "FAIL: missing upstream/boardgame.io-main" >&2
  exit 1
fi
if [[ ! -f "$MANIFEST" ]]; then
  echo "FAIL: missing upstream manifest" >&2
  exit 1
fi
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
(cd "$UPSTREAM" && find . -type f | sort | while read -r f; do sha256sum "$f"; done) > "$TMP"
if ! diff -u "$MANIFEST" "$TMP" >/tmp/boardgameio_upstream_diff.txt; then
  echo "FAIL: upstream boardgame.io-main has been modified. Diff:" >&2
  cat /tmp/boardgameio_upstream_diff.txt >&2
  exit 1
fi
echo "PASS upstream boardgame.io-main unchanged"
