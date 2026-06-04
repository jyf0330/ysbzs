#!/bin/bash
# usage: bash scripts/upgrade-from-zip.sh [zip_path]
#   不传参 → 从 github.com/jyf0330/gpt-file 最新 zip 拉取
#   传参    → 从本地 zip 替换
#
# 同步操作记到 ~/Desktop/ysbzs-sync-memory.md

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="jyf0330/gpt-file"
MEMO_FILE="$HOME/Desktop/ysbzs-sync-memory.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "❌ 不是 git 仓库: $PROJECT_DIR"
  exit 1
fi
cd "$PROJECT_DIR"

# ─── 1. 检查工作区 ───
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" -ne 0 ]; then
  echo "❌ 工作区不干净（$DIRTY 个脏文件），请先 git stash 或 git-c 收口。"
  git status --short
  exit 1
fi
echo "✅ 工作区干净"

# ─── 2. 确定 zip 来源 ───
ZIP=""
SOURCE_NOTE=""

if [ $# -ge 1 ] && [ -n "$1" ]; then
  # 指定本地 zip
  ZIP="$1"
  SOURCE_NOTE="本地: $ZIP"
  if [ ! -f "$ZIP" ]; then
    echo "❌ ZIP 文件不存在: $ZIP"
    exit 1
  fi
  echo "📦 使用本地 zip: $ZIP"
else
  # 从 GitHub 拉取最新 release zip
  echo "🌐 从 github.com/$REPO 获取最新 zip ..."
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
  INFO=$(curl -sf "$API_URL" 2>/dev/null || true)
  if [ -z "$INFO" ]; then
    echo "❌ 无法访问 GitHub API: $API_URL"
    echo "   可手动传参: bash scripts/upgrade-from-zip.sh /path/to/xxx.zip"
    exit 1
  fi

  ZIP_URL=$(echo "$INFO" | grep -oP '"zipball_url"[^"]*"[^"]*"' | head -1 | grep -oP 'https://[^"]+' || true)
  UPLOAD_AT=$(echo "$INFO" | grep -oP '"created_at"[^"]*"[^"]*"' | head -1 | grep -oP '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' || true)
  TAG=$(echo "$INFO" | grep -oP '"tag_name"[^"]*"[^"]*"' | head -1 | grep -oP '"[^"]*"$' | tr -d '"' || echo "unknown")

  if [ -z "$ZIP_URL" ]; then
    echo "❌ 未找到最新 release 的 zip 下载地址"
    exit 1
  fi

  # 检查上传时间
  if [ -n "$UPLOAD_AT" ]; then
    UPLOAD_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$UPLOAD_AT" +%s 2>/dev/null || date -d "$UPLOAD_AT" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    AGE=$(( (NOW_EPOCH - UPLOAD_EPOCH) / 3600 ))  # 小时
    echo "  tag: $TAG"
    echo "  上传时间: $UPLOAD_AT（${AGE}小时前）"
    if [ "$UPLOAD_EPOCH" -gt 0 ] && [ "$AGE" -ge 1 ]; then
      echo ""
      echo "⏸️  最新 release 上传于 ${AGE} 小时前（超过 1 小时），暂停等待指令。"
      echo "   手动确认后重新运行，或传参指定本地 zip。"
      # 记到记忆包
      {
        echo ""
        echo "---"
        echo "⏸️  **$TIMESTAMP** — 暂停于 GitHub 下载（$TAG, ${AGE}h old）"
        echo "  来源: $REPO release $TAG"
        echo "  原因: 上传超过 1 小时，等待人工确认"
      } >> "$MEMO_FILE"
      exit 1
    fi
    echo "✅ 上传在 1 小时内，继续..."
  fi

  echo "⬇️  下载 $REPO @ $TAG ..."
  TMPZIP=$(mktemp /tmp/ysbzs-github-XXXXXX.zip)
  curl -sfL "$ZIP_URL" -o "$TMPZIP"
  ZIP="$TMPZIP"
  SOURCE_NOTE="GitHub: $REPO tag=$TAG uploaded=$UPLOAD_AT"
  echo "✅ 下载完成"
fi

# ─── 3. 解压 ───
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR $TMPZIP" EXIT

echo "📦 解压 ..."
unzip -q -o "$ZIP" -d "$TMPDIR"

SRC="$TMPDIR/ysbzs-master"
if [ ! -d "$SRC" ]; then
  SRC=$(find "$TMPDIR" -maxdepth 2 -type d -name "ysbzs-master" 2>/dev/null | head -1)
fi
if [ ! -d "$SRC" ]; then
  SRC=$(find "$TMPDIR" -maxdepth 2 -type d ! -path "$TMPDIR" | head -1)
fi

if [ ! -d "$SRC" ]; then
  echo "❌ 解压后未找到源目录"
  exit 1
fi
echo "📂 源目录: $SRC"

# ─── 4. 替换文件 ───
echo "📝 替换 *.js *.html ..."
cp "$SRC"/*.js "$PROJECT_DIR/" 2>/dev/null || true
cp "$SRC"/*.html "$PROJECT_DIR/" 2>/dev/null || true

if [ -d "$SRC/external-data" ]; then
  echo "📝 替换 external-data ..."
  cp -r "$SRC/external-data"/* "$PROJECT_DIR/external-data/" 2>/dev/null || true
fi
if [ -d "$SRC/docs" ]; then
  echo "📝 替换 docs ..."
  cp -r "$SRC/docs"/* "$PROJECT_DIR/docs/" 2>/dev/null || true
fi
if [ -d "$SRC/tasks" ]; then
  echo "📝 替换 tasks ..."
  cp -r "$SRC/tasks"/* "$PROJECT_DIR/tasks/" 2>/dev/null || true
fi
[ -f "$SRC/AGENTS.md" ] && cp "$SRC/AGENTS.md" "$PROJECT_DIR/"
[ -f "$SRC/CLAUDE.md" ] && cp "$SRC/CLAUDE.md" "$PROJECT_DIR/"
if [ -d "$SRC/e2e" ]; then
  cp -r "$SRC/e2e"/* "$PROJECT_DIR/e2e/" 2>/dev/null || true
fi

# ─── 5. 提交 ───
GIT_HASH=""
if git add -A 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  echo "ℹ️  文件无变化，跳过提交"
else
  echo "📝 提交到 git ..."
  git add -A 2>/dev/null || true
  COMMIT_MSG="chore: sync from $SOURCE_NOTE"
  if git commit -m "$COMMIT_MSG" 2>/dev/null; then
    GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || true)
    echo "✅ 提交: $GIT_HASH"
  else
    echo "ℹ️  无可提交变更"
  fi
fi

# ─── 6. 验收 ───
echo ""
echo "🔍 验收..."
PASS_ALL=true
node test.js 2>&1 | tail -3 || PASS_ALL=false
node gpt_test.js 2>&1 | grep -E "总计|通过|失败" | head -3 || PASS_ALL=false
node playable_run.js 2>&1 | tail -1 || PASS_ALL=false
node playable_day1.js 2>&1 | tail -1 || PASS_ALL=false

# ─── 7. 记记忆包 ───
echo ""
echo "📝 写入记忆包: $MEMO_FILE"
{
  echo ""
  echo "---"
  echo "✅  **$TIMESTAMP** — 同步完成"
  echo "  来源: $SOURCE_NOTE"
  if [ -n "$GIT_HASH" ]; then echo "  提交: \`$GIT_HASH\`"; fi
  if $PASS_ALL; then
    echo "  验收: ✅ 全部通过"
  else
    echo "  验收: ⚠️  有失败，请检查"
  fi
} >> "$MEMO_FILE"

if $PASS_ALL; then
  echo "✅ 完成"
else
  echo "⚠️  部分验收未通过，请检查输出"
fi
