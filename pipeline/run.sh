#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

AUTO=${1:-}
PROMPT_FILE="prompt.md"
STATE_FILE="state.json"
OUTPUT_FILE="output.md"

# ---- helpers ----
get_state()    { jq -r '.state'    "$STATE_FILE"; }
get_message()  { jq -r '.message'  "$STATE_FILE"; }
get_round()    { jq -r '.round'    "$STATE_FILE"; }
set_state()    { local s="$1"; jq --arg s "$s" '.state = $s' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"; }
set_message()  { local m="$1"; jq --arg m "$m" '.message = $m' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"; }
inc_round()    { jq '.round += 1' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"; }

# ---- render prompts ----
STATE=$(get_state)
ROUND=$(get_round)

case "$STATE" in
  plan)
    echo "========================================"
    echo "  Round $((ROUND + 1)) · 方案（我的回合）"
    echo "========================================"
    echo ""
    echo "📥 读：      pipeline/prompt.md"
    echo "📤 写方案到：pipeline/output.md#Plan 区段"
    echo ""
    echo "完成后执行: ./pipeline/run.sh"
    echo ""
    echo "--- 给我的指令 ---"
    echo "读 pipeline/prompt.md，写方案到 pipeline/output.md 的 Plan 区段"
    echo ""
    inc_round
    set_state "review"
    ;;

  review)
    echo "========================================"
    echo "  Round ${ROUND} · 审查（Codex 回合）"
    echo "========================================"
    echo ""
    echo "📥 读：      pipeline/output.md#Plan"
    echo "📤 追加审查：pipeline/output.md#Review 区段"
    echo ""
    echo "完成后执行: ./pipeline/run.sh"
    echo ""
    echo "--- 给 Codex 的指令 ---"
    echo "读 pipeline/output.md 的 Plan 区段，审查方案完整性、技术可行性、风险"
    echo "将审查意见追加到 pipeline/output.md 的 Review 区段"
    echo ""
    set_state "implement"
    ;;

  implement)
    echo "========================================"
    echo "  Round ${ROUND} · 实现（我的回合）"
    echo "========================================"
    echo ""
    echo "📥 读：      pipeline/output.md#Plan + #Review"
    echo "📤 实现代码 + 写摘要到 output.md#Implementation"
    echo ""
    echo "完成后执行: ./pipeline/run.sh"
    echo ""
    echo "--- 给我的指令 ---"
    echo "读 pipeline/output.md 的方案和审查意见，实现代码"
    echo "改完之后写变更摘要到 output.md 的 Implementation 区段"
    echo ""
    set_state "verify"
    ;;

  verify)
    echo "========================================"
    echo "  Round ${ROUND} · 验证（Codex 回合）"
    echo "========================================"
    echo ""
    echo "📥 读：      pipeline/output.md#Implementation"
    echo "📤 跑测试 + 截图 → 追加到 output.md#Verification"
    echo ""
    echo "完成后执行: ./pipeline/run.sh"
    echo ""
    echo "--- 给 Codex 的指令 ---"
    echo "验证 pipeline/output.md 中 Implementation 的更改："
    echo "1. node test.js"
    echo "2. npm run check:all"
    echo "3. 浏览器截图（如涉及 UI）保存到 output/ 目录"
    echo "4. 结果追加到 pipeline/output.md 的 Verification 区段"
    echo ""
    set_state "fix"
    ;;

  fix)
    echo "========================================"
    echo "  Round ${ROUND} · 修复（我的回合）"
    echo "========================================"
    echo ""
    echo "📥 读：      pipeline/output.md#Verification"
    echo "📤 修问题 + 写修了啥到 output.md#Fixes"
    echo ""
    echo "完成后执行: ./pipeline/run.sh"
    echo ""
    echo "--- 给我的指令 ---"
    echo "读 pipeline/output.md 的 Verification 区段，修验证发现的问题"
    echo "修完后写摘要到 output.md 的 Fixes 区段"
    echo ""
    set_state "commit"
    ;;

  commit)
    echo "========================================"
    echo "  Round ${ROUND} · 收口（自动执行）"
    echo "========================================"
    echo ""
    COMMIT_MSG=$(head -5 "$PROMPT_FILE" | sed 's/^# //; s/^//' | head -3 | tr '\n' ' ')
    echo "🏷️   Commit message: ${COMMIT_MSG:-pipeline round $ROUND}"
    echo ""
    git -C .. add -A
    git -C .. diff --cached --stat
    echo ""
    if [ "$AUTO" = "--auto" ]; then
      git -C .. commit -m "${COMMIT_MSG:-pipeline round $ROUND}"
      echo "✅ auto 模式已提交"
    elif [ -t 0 ]; then
      echo -n "提交? [Y/n] "
      read -r CONFIRM
      if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
        echo "已跳过提交，状态重置为 plan。下次继续。"
      else
        git -C .. commit -m "${COMMIT_MSG:-pipeline round $ROUND}"
        echo "✅ 已提交"
      fi
    else
      echo "非交互终端，自动跳过提交。用 ./pipeline/run.sh --auto 强制提交"
    fi
    set_message "${COMMIT_MSG:-pipeline round $ROUND}"
    > "$OUTPUT_FILE"
    set_state "plan"
    echo ""
    echo "========================================"
    echo "  pipeline 已重置，下一轮 ready"
    echo "========================================"
    ;;

  *)
    echo "❌ 未知状态: $STATE"
    exit 1
    ;;
esac
