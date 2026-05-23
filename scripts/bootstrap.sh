#!/bin/bash
# bootstrap.sh — ClaudeInT 首次启动环境初始化
# 在 Android app 的 files 目录下安装 Node.js 和 Claude Code
set -euo pipefail

PREFIX="${CLAUDEINT_PREFIX:-$HOME}"
USR="$PREFIX/usr"
BIN="$USR/bin"
TMP="$PREFIX/tmp"
STAMP="$PREFIX/.bootstrapped"

log() { echo "[bootstrap] $*"; }

if [ -f "$STAMP" ] && [ -x "$BIN/node" ] && [ -x "$BIN/claude" ]; then
  log "already bootstrapped"
  exit 0
fi

mkdir -p "$BIN" "$TMP" "$USR/lib"

ARCH=$(uname -m)
case "$ARCH" in
  aarch64) NODE_ARCH="linux-arm64" ;;
  x86_64)  NODE_ARCH="linux-x64" ;;
  armv7l)  NODE_ARCH="linux-armv7l" ;;
  *)       log "unsupported arch: $ARCH"; exit 1 ;;
esac

NODE_VERSION="20.18.1"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${NODE_ARCH}.tar.xz"

# Install Node.js
if [ ! -x "$BIN/node" ]; then
  log "downloading Node.js v${NODE_VERSION} (${NODE_ARCH})..."
  curl -sL "$NODE_URL" -o "$TMP/node.tar.xz"
  log "extracting..."
  tar -xf "$TMP/node.tar.xz" -C "$TMP"
  cp "$TMP/node-v${NODE_VERSION}-${NODE_ARCH}/bin/node" "$BIN/"
  cp -r "$TMP/node-v${NODE_VERSION}-${NODE_ARCH}/lib/node_modules" "$USR/lib/"
  ln -sf "../lib/node_modules/npm/bin/npm-cli.js" "$BIN/npm"
  ln -sf "../lib/node_modules/npm/bin/npx-cli.js" "$BIN/npx"
  rm -rf "$TMP/node.tar.xz" "$TMP/node-v${NODE_VERSION}-${NODE_ARCH}"
  log "Node.js installed: $($BIN/node --version)"
fi

# Install Claude Code
if [ ! -x "$BIN/claude" ]; then
  log "installing Claude Code..."
  export PATH="$BIN:$PATH"
  npm install -g @anthropic-ai/claude-code --prefix "$USR" 2>&1 | tail -3
  if [ -x "$BIN/claude" ]; then
    log "Claude Code installed: $($BIN/claude --version 2>/dev/null | head -1)"
  else
    log "WARNING: claude binary not found after install"
  fi
fi

# Copy bridge files
BRIDGE_SRC="$PREFIX/bridge"
if [ -d "$BRIDGE_SRC" ] && [ -f "$BRIDGE_SRC/package.json" ]; then
  log "bridge already in place"
else
  log "NOTE: bridge files should be copied from APK assets on first run"
fi

date > "$STAMP"
log "bootstrap complete"
