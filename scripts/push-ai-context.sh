#!/bin/bash
# 推送 ysbzs AI 上下文到独立分支
# 纯 plumbing 操作，不碰工作区/索引/当前分支
# 用法: bash scripts/push-ai-context.sh [提交说明]
#
# 外部 AI:
#   git clone --branch ai-context git@github.com:jyf0330/ysbzs.git

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "${PROJECT_DIR}"

BRANCH="ai-context"
MSG="${1:-AI 上下文同步 $(date +%Y-%m-%d_%H:%M)}"

echo "📤 推送 AI 上下文 → origin/${BRANCH}"
echo "   提交: ${MSG}"

# 用临时索引，不碰工作区
TMP_INDEX=$(mktemp /tmp/ysbzs-ai-index.XXXX)
export GIT_INDEX_FILE="$TMP_INDEX"
trap 'rm -f "$TMP_INDEX"' EXIT

git read-tree --empty

# 1) 已跟踪文件：直接从 git 仓库取 hash
git ls-files -s | git update-index --index-info

# 2) 未跟踪新文件：hash 后加入临时索引
git ls-files --others --exclude-standard -z -- docs/ tasks/ reports/ recordings/ |
  while IFS= read -r -d '' f; do
    hash=$(git hash-object -w "$f")
    echo "100644 $hash 0	$f"
  done | git update-index --index-info

# 3) 生成 tree + commit，推送
TREE=$(git write-tree)
COMMIT=$(git commit-tree -m "$MSG" "$TREE")
git push -f origin "$COMMIT:refs/heads/$BRANCH"

echo "✅ 已推送: origin/${BRANCH}"
echo "   外部 AI: git clone --branch ${BRANCH} git@github.com:jyf0330/ysbzs.git"
