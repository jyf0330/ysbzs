#!/bin/bash
# 打包 ysbzs 完整 AI 上下文 → tar.gz
# 用法: bash scripts/pack-ai-context.sh [输出路径]
# 默认输出: ../ysbzs-ai-context-$(date +%Y%m%d).tar.gz
#
# 包含：
#   1) git 跟踪的所有文件（源码 + 配置 + 文档）
#   2) docs/ tasks/ reports/ recordings/ 等目录（含未跟踪的新文件）
#   排除媒体文件（*.webm *.png）和 .DS_Store。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT="${1:-${PROJECT_DIR}/../ysbzs-ai-context-$(date +%Y%m%d).tar.gz}"

echo "📦 打包 ysbzs AI 上下文"
echo "   源: ${PROJECT_DIR}"
echo "   目标: ${OUTPUT}"

cd "${PROJECT_DIR}"

# 生成 null 分隔的文件列表：git 跟踪文件 + 文档目录（含未跟踪新文件）
FILELIST=$(mktemp /tmp/ysbzs-pack-files.XXXX)
git ls-files -z > "$FILELIST"
printf '%s\0' docs/ tasks/ reports/ recordings/ >> "$FILELIST"

tar czf "${OUTPUT}" \
  --null -T "$FILELIST" \
  --exclude='*.webm' --exclude='*.png' --exclude='.DS_Store' \
  || true

rm -f "$FILELIST"

echo "✅ 完成: $(du -sh "${OUTPUT}" | cut -f1)"
