#!/bin/bash
# test-stream.sh — 验证 Claude Code stream-json 输出解析
# 用法: ./scripts/test-stream.sh [prompt]
# 默认 prompt 会触发一个简单的文件操作，方便观察 tool_use 事件

set -euo pipefail

PROMPT="${1:-"读取当前目录的 README.md 文件并告诉我项目名称"}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== ClaudeInT stream-json 解析验证 ==="
echo "Project: $PROJECT_DIR"
echo "Prompt: $PROMPT"
echo "========================================="
echo ""

# 运行 Claude Code，以 stream-json 格式输出
# --print 表示非交互模式，执行完即退出
claude --print \
  --output-format stream-json \
  --verbose \
  --max-turns 3 \
  "$PROMPT" \
  2>/dev/null | while IFS= read -r line; do
    # 跳过空行
    [ -z "$line" ] && continue

    # 提取事件类型
    type=$(echo "$line" | python3 -c "
import sys, json
try:
    obj = json.loads(sys.stdin.read())
    print(obj.get('type', 'unknown'))
except:
    print('parse_error')
" 2>/dev/null)

    case "$type" in
      "system")
        echo "[SYSTEM] 会话初始化"
        ;;
      "assistant")
        # 提取文本内容
        text=$(echo "$line" | python3 -c "
import sys, json
obj = json.loads(sys.stdin.read())
for block in obj.get('message', {}).get('content', []):
    if block.get('type') == 'text':
        print(block['text'][:100])
        break
" 2>/dev/null)
        echo "[ASSISTANT] $text"
        ;;
      "content_block_start"|"content_block_delta"|"content_block_stop")
        # streaming 块事件
        echo "[STREAM] $type"
        ;;
      "result")
        echo "[RESULT] 执行完成"
        # 提取 cost 信息
        echo "$line" | python3 -c "
import sys, json
obj = json.loads(sys.stdin.read())
cost = obj.get('cost_usd', 0)
duration = obj.get('duration_ms', 0)
turns = obj.get('num_turns', 0)
print(f'  Cost: \${cost:.4f} | Duration: {duration}ms | Turns: {turns}')
" 2>/dev/null
        ;;
      "tool_use"|"tool_result")
        # 工具调用事件 — 这是我们最关心的
        echo "$line" | python3 -c "
import sys, json
obj = json.loads(sys.stdin.read())
t = obj.get('type')
if t == 'tool_use':
    tool = obj.get('tool', 'unknown')
    print(f'[TOOL_USE] {tool}')
else:
    print(f'[TOOL_RESULT]')
" 2>/dev/null
        ;;
      "parse_error")
        echo "[RAW] ${line:0:80}..."
        ;;
      *)
        echo "[EVENT:$type] ${line:0:60}..."
        ;;
    esac
done

echo ""
echo "=== 验证完成 ==="
