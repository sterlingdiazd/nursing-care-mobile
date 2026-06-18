#!/bin/sh
# session-down.sh <slot>
#
# Disposes everything session-up.sh <slot> created: the per-session git worktrees for that slot and the
# isolated scratch dirs under <slot_dir>/<slot>/. "What you open, you close" — run at session end, and
# for any slot left behind by a killed session to reap orphans.
#
# Worktree reaping is driven by `git worktree list` (the authoritative source), NOT by guessing a path.
# A worktree belongs to this slot when its checked-out branch OR its directory ends in --s<slot>.
# Worktrees with uncommitted changes are SKIPPED with a warning — never force-removed (no work loss).
# Driven by docs/sdlc/project-config.json (repos[], git.main_branch/remote, session_isolation.slot_dir).
set -u

SLOT="${1:-}"
[ -n "$SLOT" ] || { echo "usage: session-down.sh <slot>"; exit 1; }
case "$SLOT" in ''|*[!0-9]*) echo "ABORT: slot must be an integer"; exit 1 ;; esac

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

MAIN=$(cfg_scalar '.git.main_branch' 'main_branch' 'main')
REMOTE=$(cfg_scalar '.git.remote' 'remote' 'origin')
SLOT_DIR=$(cfg_scalar '.session_isolation.slot_dir' 'slot_dir' '.session-slots')

echo "[session ${SLOT}] reaping worktrees on branches/dirs ending in --s${SLOT}..."
repo_paths | while IFS= read -r rp; do
  [ -n "$rp" ] || continue
  case "$rp" in /*) RP="$rp" ;; .) RP="$ROOT" ;; *) RP="$ROOT/$rp" ;; esac
  [ -e "$RP" ] || continue
  git -C "$RP" rev-parse --git-dir >/dev/null 2>&1 || continue
  primary=$(git -C "$RP" rev-parse --show-toplevel 2>/dev/null)
  git -C "$RP" fetch --quiet "$REMOTE" "$MAIN" 2>/dev/null || true   # fresh verdict ref, once per repo

  # Pair each worktree path with its branch via the porcelain stream.
  git -C "$RP" worktree list --porcelain \
    | awk '/^worktree /{wt=substr($0,10)} /^branch /{print wt"\t"substr($0,8)} /^detached/{print wt"\t(detached)"}' \
    | sed 's#\trefs/heads/#\t#' \
    | while IFS="$(printf '\t')" read -r wtpath branch; do
        [ -n "$wtpath" ] || continue
        [ "$wtpath" = "$primary" ] && continue          # never touch the primary worktree
        match=0
        case "$branch" in *--s${SLOT}) match=1 ;; esac
        case "$wtpath" in *--s${SLOT}) match=1 ;; esac
        [ "$match" = 1 ] || continue
        if [ -n "$(git -C "$wtpath" status --porcelain 2>/dev/null)" ]; then
          echo "  SKIP ${wtpath} — uncommitted changes; commit/land or remove manually with --force"
          continue
        fi
        if git -C "$RP" worktree remove "$wtpath" 2>/dev/null; then
          echo "  removed worktree ${wtpath} [${branch}]"
          if [ "$branch" = "(detached)" ]; then
            echo "    (detached worktree — no branch to delete)"
          else
            case "$branch" in
              backup/*) echo "    KEEP branch ${branch} — backup/* preserved" ;;
              *)
                if git -C "$RP" merge-base --is-ancestor "$branch" "$REMOTE/$MAIN" 2>/dev/null; then
                  git -C "$RP" branch -d "$branch" 2>/dev/null && echo "    deleted merged branch ${branch}" \
                    || echo "    KEEP branch ${branch} — 'branch -d' refused (local main stale?); run git-hygiene.sh then retry"
                else
                  echo "    KEEP branch ${branch} — not fully merged into ${REMOTE}/${MAIN} (preserved)"
                fi ;;
            esac
          fi
        else
          echo "  SKIP ${wtpath} — 'git worktree remove' failed"
        fi
      done
  git -C "$RP" worktree prune 2>/dev/null || true

  # Lifecycle ("I open it, I close it"): once NO slot worktrees remain for this repo, remove the
  # link_into_slot lines session-up added to the COMMON info/exclude (they are repo-wide). Keep them
  # while any slot still exists, since that exclude is shared across worktrees.
  if [ "$HAVE_JQ" = 1 ] && ! git -C "$RP" worktree list 2>/dev/null | grep -q -- '--s[0-9]'; then
    excl=$(git -C "$RP" rev-parse --git-path info/exclude 2>/dev/null || true)
    if [ -n "$excl" ] && [ -f "$excl" ]; then
      jq -r '(.session_isolation.link_into_slot // [])[]' "$CFG" 2>/dev/null | while IFS= read -r res; do
        [ -n "$res" ] || continue
        if grep -qxF "/$res" "$excl" 2>/dev/null; then
          tmpx="$excl.tmp.$$"
          grep -vxF "/$res" "$excl" > "$tmpx" 2>/dev/null && mv "$tmpx" "$excl" \
            && echo "  cleaned /$res from info/exclude (no slots remain)" || rm -f "$tmpx"
        fi
      done
    fi
  fi
done

# Clean this slot's scratch dirs (only if empty of uncommitted intent — they hold logs/output only).
SLOT_ROOT="$ROOT/$SLOT_DIR/$SLOT"
if [ -d "$SLOT_ROOT" ]; then
  rm -rf "$SLOT_ROOT" 2>/dev/null && echo "[session ${SLOT}] removed scratch dirs ${SLOT_ROOT}" \
    || echo "[session ${SLOT}] could not remove ${SLOT_ROOT} (remove manually)"
fi

echo "[session ${SLOT}] done. Verify clean: (per repo) git worktree list"
echo "[session ${SLOT}] tip: run git-hygiene.sh to ff-update ${MAIN} and prune any other merged branches."
