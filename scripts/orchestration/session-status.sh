#!/bin/sh
# session-status.sh
#
# Shows what each session slot currently holds (scratch dirs + git worktrees) so you can spot
# collisions and reap orphans left by killed sessions (session-down.sh <slot>). Project-agnostic:
# reads docs/sdlc/project-config.json (repos[], session_isolation.slot_dir).
set -u

resolve_root() {
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -f "$CLAUDE_PROJECT_DIR/docs/sdlc/project-config.json" ]; then
    printf '%s\n' "$CLAUDE_PROJECT_DIR"; return 0
  fi
  d=$(pwd)
  while [ "$d" != "/" ]; do
    [ -f "$d/docs/sdlc/project-config.json" ] && { printf '%s\n' "$d"; return 0; }
    d=$(dirname "$d")
  done
  printf '%s\n' "$(pwd)"
}
ROOT=$(resolve_root)
CFG="$ROOT/docs/sdlc/project-config.json"
HAVE_JQ=0; command -v jq >/dev/null 2>&1 && [ -f "$CFG" ] && HAVE_JQ=1

cfg_scalar() {
  v=""
  if [ "$HAVE_JQ" = 1 ]; then v=$(jq -r "$1 // empty" "$CFG" 2>/dev/null)
  elif [ -f "$CFG" ]; then
    v=$(grep -E "\"$2\"[[:space:]]*:" "$CFG" 2>/dev/null | head -1 \
        | sed -E 's/.*:[[:space:]]*"?([^",}]+)"?.*/\1/' | tr -d '[:space:]')
  fi
  [ -n "$v" ] && printf '%s\n' "$v" || printf '%s\n' "$3"
}
repo_paths() { if [ "$HAVE_JQ" = 1 ]; then jq -r '.repos[].path' "$CFG" 2>/dev/null; else printf '.\n'; fi; }

SLOT_DIR=$(cfg_scalar '.session_isolation.slot_dir' 'slot_dir' '.session-slots')

echo "=== active slot scratch dirs (${SLOT_DIR}/<slot>) ==="
if [ -d "$ROOT/$SLOT_DIR" ]; then
  for d in "$ROOT/$SLOT_DIR"/*; do
    [ -d "$d" ] || continue
    echo "  slot $(basename "$d")  ($d)"
  done
else
  echo "  (none)"
fi
echo
echo "=== git worktrees (repo--s<slot>) ==="
repo_paths | while IFS= read -r rp; do
  [ -n "$rp" ] || continue
  case "$rp" in /*) RP="$rp" ;; .) RP="$ROOT" ;; *) RP="$ROOT/$rp" ;; esac
  git -C "$RP" rev-parse --git-dir >/dev/null 2>&1 || continue
  out=$(git -C "$RP" worktree list 2>/dev/null | grep -- "--s[0-9]")
  [ -n "$out" ] && { echo "  [${rp}]"; printf '%s\n' "$out" | sed 's/^/    /'; }
done
echo
echo "(reap an orphaned slot with: session-down.sh <slot>)"
