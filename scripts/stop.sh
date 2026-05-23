#!/bin/bash
# ClaudeInT — 停止所有服务
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
pkill -f "bridge/src/index.js" 2>/dev/null
pkill -f "flutter_ui/serve.js" 2>/dev/null
rm -f "$ROOT/.pids"
echo "[claudeint] all services stopped"
