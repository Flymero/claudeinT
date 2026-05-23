#!/bin/bash
# ClaudeInT — 一键启动 bridge + UI
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRIDGE_PORT="${BRIDGE_PORT:-3100}"
UI_PORT="${UI_PORT:-3080}"
BRIDGE_CWD="${BRIDGE_CWD:-$ROOT}"
PIDFILE="$ROOT/.pids"

cleanup() {
  if [ -f "$PIDFILE" ]; then
    while read -r pid; do
      kill "$pid" 2>/dev/null || true
    done < "$PIDFILE"
    rm -f "$PIDFILE"
  fi
  echo "[claudeint] stopped"
}

trap cleanup EXIT INT TERM

start_bridge() {
  BRIDGE_PORT="$BRIDGE_PORT" BRIDGE_CWD="$BRIDGE_CWD" \
    node "$ROOT/bridge/src/index.js" &
  echo $! >> "$PIDFILE"
}

start_ui() {
  UI_PORT="$UI_PORT" node "$ROOT/flutter_ui/serve.js" &
  echo $! >> "$PIDFILE"
}

watch_and_restart() {
  local name="$1"
  local start_fn="$2"
  local pid

  while true; do
    pid=$(sed -n "${3}p" "$PIDFILE" 2>/dev/null || echo "")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      sleep 3
    else
      echo "[claudeint] $name crashed, restarting..."
      $start_fn
      sleep 2
    fi
  done
}

# Kill any existing instances
pkill -f "bridge/src/index.js" 2>/dev/null || true
pkill -f "flutter_ui/serve.js" 2>/dev/null || true
sleep 1
rm -f "$PIDFILE"

echo "[claudeint] starting..."
echo "  Bridge: ws://localhost:$BRIDGE_PORT (cwd: $BRIDGE_CWD)"
echo "  UI:     http://localhost:$UI_PORT"
echo ""

start_bridge
start_ui

sleep 1

# Verify
if curl -s -o /dev/null http://127.0.0.1:$UI_PORT; then
  echo "[claudeint] UI ready"
else
  echo "[claudeint] WARNING: UI not responding"
fi

echo "[claudeint] running. Press Ctrl+C to stop."
echo ""

# Keep alive — restart crashed processes
while true; do
  for pid in $(cat "$PIDFILE" 2>/dev/null); do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "[claudeint] process $pid died, restarting all..."
      cleanup
      rm -f "$PIDFILE"
      sleep 1
      start_bridge
      start_ui
      sleep 1
      break
    fi
  done
  sleep 3
done
