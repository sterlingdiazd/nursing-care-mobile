#!/usr/bin/env bash
# start-demo.sh
#
# One-shot demo launcher: auto-discovers the laptop's network identity, optionally
# brings up a cloudflared tunnel, sets every relevant resolver env var, then starts
# Expo with a flushed cache. The phone gets multiple working URLs to probe.
#
# What it sets (the mobile resolver in src/services/apiBaseUrl.ts probes these
# in priority order):
#
#   EXPO_PUBLIC_API_BASE_URL   = the highest-confidence URL (cloudflared tunnel
#                                if available, otherwise http://<lan-ip>:5050)
#   EXPO_PUBLIC_DEMO_TUNNEL_URL = same tunnel URL as a redundant baked candidate
#   EXPO_PUBLIC_API_HOSTNAME    = laptop hostname stripped of .local. The resolver
#                                turns this into http://<hostname>.local:5050 so
#                                the URL survives DHCP renewals on the same Wi-Fi.
#   EXPO_PUBLIC_API_PORT        = backend port (default 5050)
#
# Usage:
#   ./scripts/start-demo.sh           # auto everything, prefers tunnel
#   ./scripts/start-demo.sh --no-tunnel  # skip cloudflared even if installed
#   ./scripts/start-demo.sh --port 5050  # override backend port
#
# Stop the tunnel separately when done with ./scripts/stop-demo.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TUNNEL_PID_FILE="$REPO_ROOT/.demo-tunnel.pid"
TUNNEL_LOG_FILE="$REPO_ROOT/.demo-tunnel.log"
TUNNEL_URL_FILE="$REPO_ROOT/.demo-tunnel.url"

USE_TUNNEL=1
PORT="${EXPO_PUBLIC_API_PORT:-5050}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-tunnel) USE_TUNNEL=0; shift ;;
    --port) PORT="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

log() { printf "[start-demo] %s\n" "$*"; }
warn() { printf "[start-demo] WARN: %s\n" "$*" >&2; }
fail() { printf "[start-demo] ERROR: %s\n" "$*" >&2; exit 1; }

# --- Detect laptop hostname (Bonjour/mDNS friendly) -------------------------
RAW_HOSTNAME="$(hostname 2>/dev/null || echo "")"
SHORT_HOSTNAME="${RAW_HOSTNAME%.local}"
if [[ -z "$SHORT_HOSTNAME" ]]; then
  warn "Could not determine laptop hostname; mDNS strategy will be skipped on device."
fi

# --- Detect LAN IP ----------------------------------------------------------
LAN_IP=""
for iface in en0 en1 en2; do
  candidate="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  if [[ -n "$candidate" ]]; then
    LAN_IP="$candidate"
    LAN_IFACE="$iface"
    break
  fi
done
if [[ -z "$LAN_IP" ]]; then
  # Fallback: parse from `ifconfig` on macOS.
  LAN_IP="$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' || true)"
  LAN_IFACE="${LAN_IFACE:-auto}"
fi
[[ -z "$LAN_IP" ]] && warn "Could not detect a LAN IP; LAN strategy will fall back to last-known-good only."

# --- Verify backend is up on $PORT before starting expo --------------------
if ! curl -sf --max-time 2 "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
  warn "Backend not responding on http://localhost:${PORT}/api/health."
  warn "Start it first (e.g. \`dotnet run --project NursingCareBackend\`), then re-run this script."
fi

# --- Optionally start a cloudflared quick-tunnel ----------------------------
TUNNEL_URL=""
if [[ "$USE_TUNNEL" -eq 1 ]]; then
  if command -v cloudflared >/dev/null 2>&1; then
    log "Starting cloudflared quick-tunnel for http://localhost:${PORT}..."
    : >"$TUNNEL_LOG_FILE"
    cloudflared tunnel --url "http://localhost:${PORT}" --no-autoupdate >"$TUNNEL_LOG_FILE" 2>&1 &
    TUNNEL_PID=$!
    echo "$TUNNEL_PID" >"$TUNNEL_PID_FILE"

    # Wait up to 25s for the URL to appear in the log.
    for _ in $(seq 1 50); do
      sleep 0.5
      TUNNEL_URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG_FILE" | head -1 || true)"
      [[ -n "$TUNNEL_URL" ]] && break
    done

    if [[ -n "$TUNNEL_URL" ]]; then
      echo "$TUNNEL_URL" >"$TUNNEL_URL_FILE"
      log "Tunnel up at $TUNNEL_URL (pid $TUNNEL_PID)"
    else
      warn "Tunnel did not produce a URL within 25s. See $TUNNEL_LOG_FILE."
      warn "Continuing without tunnel; the device will use the LAN candidates."
      kill "$TUNNEL_PID" 2>/dev/null || true
      rm -f "$TUNNEL_PID_FILE"
    fi
  else
    log "cloudflared not installed; skipping tunnel."
    log "Install it later with: brew install cloudflared"
  fi
fi

# --- Build the env vars and start expo --------------------------------------
EXPO_PUBLIC_API_PORT="$PORT"
EXPO_PUBLIC_API_HOSTNAME="${SHORT_HOSTNAME}"

if [[ -n "$TUNNEL_URL" ]]; then
  EXPO_PUBLIC_API_BASE_URL="$TUNNEL_URL"
  EXPO_PUBLIC_DEMO_TUNNEL_URL="$TUNNEL_URL"
elif [[ -n "$LAN_IP" ]]; then
  EXPO_PUBLIC_API_BASE_URL="http://${LAN_IP}:${PORT}"
  EXPO_PUBLIC_DEMO_TUNNEL_URL=""
else
  EXPO_PUBLIC_API_BASE_URL=""
  EXPO_PUBLIC_DEMO_TUNNEL_URL=""
fi

export EXPO_PUBLIC_API_PORT
export EXPO_PUBLIC_API_HOSTNAME
export EXPO_PUBLIC_API_BASE_URL
export EXPO_PUBLIC_DEMO_TUNNEL_URL

cat <<EOF

[start-demo] Resolver candidates (priority order, the phone will pick the first that responds 200 on /api/health):

  1. Manual override        — set on-device from Menú -> Diagnóstico (overrides everything below)
  2. EXPO_PUBLIC_API_BASE_URL ${EXPO_PUBLIC_API_BASE_URL:-<not set>}
  3. EXPO_PUBLIC_DEMO_TUNNEL_URL ${EXPO_PUBLIC_DEMO_TUNNEL_URL:-<not set>}
  4. Metro debugger host    — auto-detected at runtime
  5. Expo Linking host      — auto-detected at runtime
  6. mDNS hostname          ${SHORT_HOSTNAME:+http://${SHORT_HOSTNAME}.local:${PORT}}
  7. Last-known-good        — picked up from AsyncStorage
  8. localhost              — web/simulator only

  Laptop hostname: ${SHORT_HOSTNAME:-<unknown>}
  LAN IP (${LAN_IFACE:-auto}):  ${LAN_IP:-<unknown>}
  Tunnel:          ${TUNNEL_URL:-<none>}

Starting expo with these envs and a flushed Metro cache...

EOF

cd "$REPO_ROOT"
exec npx expo start --clear
