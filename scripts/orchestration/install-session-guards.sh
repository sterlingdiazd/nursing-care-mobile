#!/usr/bin/env bash
# install-session-guards.sh — wire the concurrent-session slot-guard for THIS repo. Idempotent.
#
# Registers scripts/orchestration/slot-guard.sh as a Claude Code PreToolUse hook so it BLOCKS work in the
# SHARED canonical worktree (forcing isolation via session-up.sh <slot>). Strictness is read from
# docs/sdlc/project-config.json -> session_isolation.guard_mode:
#   - "commits-only" (default): wire the Bash matcher only -> blocks git commit/add/push/merge/rebase
#     in the shared worktree; Edit/Write stay UNblocked.
#   - "all": also wire Write|Edit|MultiEdit|NotebookEdit -> blocks file edits in the shared worktree too.
# One-off override:  ALLOW_SHARED_WORKTREE=1 <command>   (honored only as a LEADING token).
# Writes only <repo>/.claude/settings.json (committed, so the guard is shared with every session/clone).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # scripts/orchestration -> repo root
GUARD="$ROOT/scripts/orchestration/slot-guard.sh"
SETTINGS="$ROOT/.claude/settings.json"
CFG="$ROOT/docs/sdlc/project-config.json"
# Use the documented portable variable — Claude Code expands $CLAUDE_PROJECT_DIR at hook-run time — so
# the committed, shared settings.json is NOT pinned to one machine's absolute path.
GUARD_CMD='bash "$CLAUDE_PROJECT_DIR/scripts/orchestration/slot-guard.sh"'

[ -f "$GUARD" ] || { echo "ABORT: $GUARD not found"; exit 1; }
chmod +x "$ROOT/scripts/orchestration/"*.sh 2>/dev/null || true
command -v jq >/dev/null || { echo "NOTE: jq not found — wire slot-guard.sh as a PreToolUse Bash hook in $SETTINGS manually."; exit 0; }

# Strictness -> matcher list.
MODE="commits-only"
[ -f "$CFG" ] && MODE="$(jq -r '(.session_isolation.guard_mode // "commits-only")' "$CFG" 2>/dev/null || echo commits-only)"
if [ "$MODE" = "all" ]; then
  MATCHERS='["Bash","Write|Edit|MultiEdit|NotebookEdit"]'
else
  MODE="commits-only"; MATCHERS='["Bash"]'
fi

mkdir -p "$(dirname "$SETTINGS")"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
if ! jq empty "$SETTINGS" 2>/dev/null; then
  echo "NOTE: $SETTINGS is not strict JSON; wire slot-guard.sh as a PreToolUse hook manually."; exit 0
fi

tmp="$(mktemp)"
if jq --arg cmd "$GUARD_CMD" --argjson matchers "$MATCHERS" '
      def stripguard:                                  # remove any prior slot-guard entries (idempotent)
        map(.hooks = ((.hooks // []) | map(select((.command // "") | contains("slot-guard.sh") | not))))
        | map(select((.hooks // []) | length > 0));
      .hooks = (.hooks // {})
      | .hooks.PreToolUse = (
          ((.hooks.PreToolUse // []) | stripguard) as $base
          | reduce $matchers[] as $m ($base;
              if any(.[]?; .matcher == $m)
              then map(if .matcher == $m then .hooks += [{"type":"command","command":$cmd,"timeout":5}] else . end)
              else . + [{"matcher":$m,"hooks":[{"type":"command","command":$cmd,"timeout":5}]}] end))
    ' "$SETTINGS" > "$tmp" 2>/dev/null && jq empty "$tmp" 2>/dev/null; then
  mv "$tmp" "$SETTINGS"
  echo "✅ slot-guard wired (guard_mode=$MODE) in $SETTINGS"
else
  rm -f "$tmp"
  echo "WARN: could not edit $SETTINGS automatically; wire slot-guard.sh as a PreToolUse hook manually."
fi

cat <<EOF

Active for NEW sessions (and on settings reload):
  - guard_mode=$MODE — blocks git commit/add/push/merge/rebase$([ "$MODE" = all ] && echo " AND file edits") in the SHARED main worktree.
  - Override once:    ALLOW_SHARED_WORKTREE=1 <command>   (leading token)
  - Isolate properly: scripts/orchestration/session-up.sh <slot>
  - Disable:          remove the slot-guard entries from $SETTINGS
EOF
