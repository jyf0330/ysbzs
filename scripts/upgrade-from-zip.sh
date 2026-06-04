#!/bin/bash
# usage: bash scripts/upgrade-from-zip.sh /path/to/ysbzs-master-XXXXX.zip
#
# 从 zip 包替换项目文件，要求工作区干净（无 dirty 文件）。

set -euo pipefail

ZIP="$1"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ZIP" ]; then
  echo "❌ ZIP 文件不存在: $ZIP"
  exit 1
fi

# 1. 检查工作区是否干净
cd "$PROJECT_DIR"
DIRTY=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$DIRTY" -ne 0 ]; then
  echo "❌ 工作区不干净（$DIRTY 个脏文件），请先 git stash 或 git-c 收口。"
  git status --short
  exit 1
fi

echo "✅ 工作区干净"

# 2. 解压到临时目录
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo "📦 解压 $ZIP ..."
unzip -q -o "$ZIP" -d "$TMPDIR"

SRC="$TMPDIR/ysbzs-master"
if [ ! -d "$SRC" ]; then
  # 可能有不同的顶层目录名
  SRC=$(find "$TMPDIR" -maxdepth 1 -type d | tail -1)
fi

echo "📂 源目录: $SRC"

# 3. 替换 JS / HTML
echo "📝 替换 JS 和 HTML ..."
cp "$SRC"/*.js "$PROJECT_DIR/" 2>/dev/null || true
cp "$SRC"/*.html "$PROJECT_DIR/" 2>/dev/null || true

# 4. 替换 external-data
if [ -d "$SRC/external-data" ]; then
  echo "📝 替换 external-data ..."
  cp -r "$SRC/external-data"/* "$PROJECT_DIR/external-data/" 2>/dev/null || true
fi

# 5. 替换 docs
if [ -d "$SRC/docs" ]; then
  echo "📝 替换 docs ..."
  cp -r "$SRC/docs"/* "$PROJECT_DIR/docs/" 2>/dev/null || true
fi

# 6. 替换 tasks
if [ -d "$SRC/tasks" ]; then
  echo "📝 替换 tasks ..."
  cp -r "$SRC/tasks"/* "$PROJECT_DIR/tasks/" 2>/dev/null || true
fi

# 7. 替换 AGENTS.md / CLAUDE.md
[ -f "$SRC/AGENTS.md" ] && cp "$SRC/AGENTS.md" "$PROJECT_DIR/"
[ -f "$SRC/CLAUDE.md" ] && cp "$SRC/CLAUDE.md" "$PROJECT_DIR/"

# 8. 替换 e2e
if [ -d "$SRC/e2e" ]; then
  cp -r "$SRC/e2e"/* "$PROJECT_DIR/e2e/" 2>/dev/null || true
fi

echo ""
echo "✅ 替换完成，运行验收..."

# 9. 运行验收
cd "$PROJECT_DIR"
node test.js 2>&1 | tail -3
node gpt_test.js 2>&1 | grep -E "总计|通过|失败|运行" | head -5
node playable_run.js 2>&1 | tail -1
node playable_day1.js 2>&1 | tail -1
echo ""

echo "✅ 全部完成"
