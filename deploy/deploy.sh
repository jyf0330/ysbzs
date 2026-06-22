#!/bin/bash
# 元素背包史 · 部署到 sts2-cloud
# 用法: bash deploy/deploy.sh

set -euo pipefail

REMOTE_HOST="124.222.83.113"
REMOTE_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/workspace/ysbzs"
WWW_DIR="/var/www/ysbzs"
SSH_KEY="$HOME/.ssh/web.pem"
SSH_CMD="ssh -i $SSH_KEY"
RSYNC_CMD="rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude '*.log' \
  --exclude 'output/' \
  --exclude 'upstream/' \
  -e \"$SSH_CMD\""

echo "=== 1. Sync project to workspace ==="
eval "$RSYNC_CMD ./ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo ""
echo "=== 2. Build local-engine + sync web static ==="
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "
  set -e
  cd $REMOTE_DIR
  npm install --silent 2>/dev/null
  node tools/build_local_engine_bundle.cjs
  rsync -avz --delete web/ $WWW_DIR/ 2>&1 | tail -1
"

echo ""
echo "=== 3. Restart pm2 ==="
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "pm2 restart ysbzs-ui"

echo ""
echo "=== 4. Verify ==="
sleep 1
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "curl -s http://127.0.0.1:4173/api/health"

echo ""
echo "✅ Deployed: http://124.222.83.113/ysbzs/"
