#!/bin/sh
# session-claim.sh — declare this session in the shared inter-session coordination channel and warn on a
# branch collision. This is the AWARENESS half of concurrent-session safety (the HARD half is
# slot-guard.sh, which blocks commits in the shared worktree). Implements a shared, append-only
# coordination-log ("chat between sessions") pattern.
#
# It (1) appends a human-readable claim to AGENT-COORDINATION.md (a gitignored shared scratch "chat"
# between parallel sessions), and (2) checks a machine registry (.session-slots/claims.tsv) for another
# RECENT session on the same branch — WARNING (or, with --strict, REFUSING: exit 2) if one is found.
#
# Usage:  scripts/orchestration/session-claim.sh [--strict] ["what this session owns / is doing"]
set -u

STRICT=0
[ "${1:-}" = "--strict" ] && { STRICT=1; shift; }
OWNS="${1:-(unspecified)}"

# Resolve repo root (dir containing docs/sdlc/project-config.json).
ROOT=""
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -f "$CLAUDE_PROJECT_DIR/docs/sdlc/project-config.json" ]; then
  ROOT="$CLAUDE_PROJECT_DIR"
else
  d=$(pwd); while [ "$d" != "/" ]; do
    [ -f "$d/docs/sdlc/project-config.json" ] && { ROOT="$d"; break; }; d=$(dirname "$d")
  done
fi
[ -n "$ROOT" ] || { echo "session-claim: cannot find project root"; exit 0; }

BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
# Identity: prefer SESSION_SLOT (exported by session-up.sh) — a STABLE per-session id. Else fall back to
# the controlling terminal (stable within one terminal session), then hostname+pid. A pure-$$ id would
# change every invocation and make a re-run over-warn about "colliding" with itself.
SID="${SESSION_SLOT:-}"
if [ -z "$SID" ]; then
  tty=$(ps -o tty= -p "$PPID" 2>/dev/null | tr -dc 'A-Za-z0-9')
  SID="${tty:-$(hostname 2>/dev/null || echo host)-$$}"
fi
NOW=$(date +%s)
NOW_H=$(date '+%Y-%m-%d %H:%M')
WINDOW=21600   # 6h — a claim older than this is treated as stale and pruned

SLOT_DIR="$ROOT/.session-slots"
mkdir -p "$SLOT_DIR" 2>/dev/null || true
CLAIMS="$SLOT_DIR/claims.tsv"
COORD="$ROOT/AGENT-COORDINATION.md"
TEMPLATE="$ROOT/docs/sdlc/AGENT-COORDINATION.template.md"
TAB=$(printf '\t')

# Prune stale entries; detect a live conflict (same branch, different session, within the window).
conflict=""
if [ -f "$CLAIMS" ]; then
  tmp="$CLAIMS.tmp.$$"; : > "$tmp"
  while IFS="$TAB" read -r ts csid cbranch; do
    [ -n "$ts" ] || continue
    case "$ts" in *[!0-9]*) continue ;; esac
    [ $((NOW - ts)) -gt "$WINDOW" ] && continue          # drop stale
    [ "$csid" = "$SID" ] && continue                     # drop my own prior entry (re-claim refreshes it)
    printf '%s\t%s\t%s\n' "$ts" "$csid" "$cbranch" >> "$tmp"
    [ "$cbranch" = "$BRANCH" ] && conflict="$csid"
  done < "$CLAIMS"
  mv "$tmp" "$CLAIMS"
fi

# Ensure the coordination "chat" file exists (seed from the tracked template, else a minimal header).
if [ ! -f "$COORD" ]; then
  if [ -f "$TEMPLATE" ]; then cp "$TEMPLATE" "$COORD"
  else printf '# AGENT-COORDINATION — shared channel between concurrent sessions\n\n## Messages\n' > "$COORD"; fi
fi

printf '%s\t%s\t%s\n' "$NOW" "$SID" "$BRANCH" >> "$CLAIMS"

if [ -n "$conflict" ]; then
  echo "⚠️  SESSION COLLISION: branch '$BRANCH' is already claimed by a recent session ('$conflict')." >&2
  echo "    Read $COORD and coordinate, or isolate: scripts/orchestration/session-up.sh <slot>" >&2
  { printf '\n### [%s] %s — COLLISION on `%s`\n' "$SID" "$NOW_H" "$BRANCH"
    printf 'Joined a branch already claimed by `%s`. Owns: %s\n' "$conflict" "$OWNS"; } >> "$COORD"
  [ "$STRICT" = 1 ] && exit 2
  exit 0
fi

{ printf '\n### [%s] %s\n' "$SID" "$NOW_H"
  printf 'Working on branch `%s`. Owns: %s\n' "$BRANCH" "$OWNS"; } >> "$COORD"
echo "session-claim: declared '$SID' on '$BRANCH' (owns: $OWNS) in $COORD"
