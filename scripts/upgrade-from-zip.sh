#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="jyf0330/gpt-file"
MEMO_FILE="$HOME/Desktop/ysbzs-sync-memory.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TMPDIR=""; TMPZIP=""
cleanup() { [ -n "$TMPDIR" ] && rm -rf "$TMPDIR" 2>/dev/null || true; [ -n "$TMPZIP" ] && rm -f "$TMPZIP" 2>/dev/null || true; }
trap cleanup EXIT
[ ! -d "$PROJECT_DIR/.git" ] && { echo "❌ 不是 git 仓库"; exit 1; }
cd "$PROJECT_DIR"
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
[ "$DIRTY" -ne 0 ] && { echo "❌ 工作区不干净（${DIRTY}脏），请先 git stash 或 git-c"; git status --short; exit 1; }
echo "✅ 工作区干净"
ZIP=""; NOTE=""
if [ $# -ge 1 ] && [ -n "$1" ]; then
  ZIP="$1"; NOTE="本地: $ZIP"
  [ ! -f "$ZIP" ] && { echo "❌ ZIP 不存在"; exit 1; }
else
  echo "🌐 从 github.com/$REPO ..."
  INFO=$(curl -sf "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null || true)
  [ -z "$INFO" ] && { echo "❌ API 不通"; exit 1; }
  ZIP_URL=$(echo "$INFO" | grep -oP '"zipball_url"[^"]*"[^"]*"' | head -1 | grep -oP 'https://[^"]+' || true)
  UPLOAD_AT=$(echo "$INFO" | grep -oP '"created_at"[^"]*"[^"]*"' | head -1 | grep -oP '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' || true)
  TAG=$(echo "$INFO" | grep -oP '"tag_name"[^"]*"[^"]*"' | head -1 | grep -oP '"[^"]*"$' | tr -d '"' || echo "?")
  [ -z "$ZIP_URL" ] && { echo "❌ 无下载地址"; exit 1; }
  if [ -n "$UPLOAD_AT" ]; then
    AGE=$(( ($(date +%s) - $(date -j -f "%Y-%m-%dT%H:%M:%S" "$UPLOAD_AT" +%s 2>/dev/null || echo 0)) / 3600 ))
    echo "  tag=$TAG upload=${AGE}h ago"
    [ "$AGE" -ge 1 ] && { echo "⏸️  超1h暂停，等指令"; echo -e "\n---\n⏸️  $TIMESTAMP — 暂停\n  来源: $REPO $TAG\n  原因: 超1h" >> "$MEMO_FILE"; exit 1; }
  fi
  TMPZIP=$(mktemp /tmp/ysbzs-github-XXXXXX.zip)
  curl -sfL "$ZIP_URL" -o "$TMPZIP"
  ZIP="$TMPZIP"; NOTE="GitHub: $REPO tag=$TAG"
fi
TMPDIR=$(mktemp -d)
unzip -q -o "$ZIP" -d "$TMPDIR"
SRC=$(find "$TMPDIR" -maxdepth 2 -type d ! -path "$TMPDIR" | head -1)
[ -z "$SRC" ] && exit 1
cp "$SRC"/*.js "$PROJECT_DIR/" 2>/dev/null || true
cp "$SRC"/*.html "$PROJECT_DIR/" 2>/dev/null || true
[ -d "$SRC/external-data" ] && cp -r "$SRC/external-data"/* "$PROJECT_DIR/external-data/" 2>/dev/null || true
[ -d "$SRC/docs" ] && cp -r "$SRC/docs"/* "$PROJECT_DIR/docs/" 2>/dev/null || true
[ -d "$SRC/tasks" ] && cp -r "$SRC/tasks"/* "$PROJECT_DIR/tasks/" 2>/dev/null || true
[ -f "$SRC/AGENTS.md" ] && cp "$SRC/AGENTS.md" "$PROJECT_DIR/"
[ -f "$SRC/CLAUDE.md" ] && cp "$SRC/CLAUDE.md" "$PROJECT_DIR/"
HASH=""
if git add -A 2>/dev/null && ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "chore: sync from $NOTE"
  HASH=$(git rev-parse --short HEAD 2>/dev/null || true)
fi
echo "🔍 验收..."
P=true; node test.js 2>&1 | tail -3 || P=false
node playable_run.js 2>&1 | tail -1 || true
mkdir -p "$(dirname "$MEMO_FILE")"
echo -e "\n---\n✅  $TIMESTAMP — 同步\n  来源: $NOTE${HASH:+ 提交: $HASH}\n  验收: $($P && echo ✅ || echo ⚠️)" >> "$MEMO_FILE"
$P && echo "✅ OK" || echo "⚠️ FAIL"
