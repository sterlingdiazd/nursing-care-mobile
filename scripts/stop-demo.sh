#!/usr/bin/env bash
# Stop the cloudflared quick-tunnel that start-demo.sh launched.
# Does NOT touch the expo process — kill that with Ctrl-C in its own terminal.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TUNNEL_PID_FILE="$REPO_ROOT/.demo-tunnel.pid"
TUNNEL_LOG_FILE="$REPO_ROOT/.demo-tunnel.log"
TUNNEL_URL_FILE="$REPO_ROOT/.demo-tunnel.url"

if [[ -f "$TUNNEL_PID_FILE" ]]; then
  PID="$(cat "$TUNNEL_PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" && echo "[stop-demo] Killed cloudflared (pid $PID)."
  else
    echo "[stop-demo] No cloudflared process at pid $PID."
  fi
  rm -f "$TUNNEL_PID_FILE"
else
  echo "[stop-demo] No tunnel pid file; nothing to stop."
fi

rm -f "$TUNNEL_LOG_FILE" "$TUNNEL_URL_FILE"
