#!/bin/sh
# session-up.sh <slot 0-49> [branch]
#
# Brings up a hermetic per-session workspace so concurrent agent/terminal sessions never collide on a
# branch, working tree, debugger port, or scratch dir. Each session owns a numeric SLOT. Everything is
# DRIVEN BY docs/sdlc/project-config.json (session_isolation{kind,cdp_base_port,slot_dir,port_offsets},
# repos[], git.main_branch) — no stack-specific machinery is assumed.
#
# Per slot it provisions:
#   - one git worktree per repo on <main_branch>--s<slot> (or <branch>--s<slot>), under <repo>/worktrees/
#   - a CDP / remote-debug port = cdp_base_port + slot
#   - isolated scratch dirs under <slot_dir>/<slot>/ (logs, output, browser-profile)
#   - any configured generic port offsets (port_offsets: name -> base port; assigned base + slot)
#   - any configured untracked runtime symlinked in (session_isolation.link_into_slot: e.g. a venv,
#     a .env, a shared data dir) so the slot is runnable — empty by default (nothing is linked)
#
# What you open, you close: run session-down.sh <slot> when finished. Reads config with jq when
# available, with a grep/sed fallback (single-repo, defaults) otherwise.
set -u

SLOT="${1:-}"
BRANCH="${2:-}"
[ -n "$SLOT" ] || { echo "usage: session-up.sh <slot 0-49> [branch-name]"; exit 1; }
case "$SLOT" in ''|*[!0-9]*) echo "ABORT: slot must be an integer 0-49"; exit 1 ;; esac
[ "$SLOT" -le 49 ] || { echo "ABORT: slot must be an integer 0-49"; exit 1; }

# --- locate the repo/workspace root (dir containing docs/sdlc/project-config.json) ----------------
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

cfg_scalar() { # cfg_scalar <jq-filter> <grep-key> <default>
  v=""
  if [ "$HAVE_JQ" = 1 ]; then
    v=$(jq -r "$1 // empty" "$CFG" 2>/dev/null)
  elif [ -f "$CFG" ]; then
    v=$(grep -E "\"$2\"[[:space:]]*:" "$CFG" 2>/dev/null | head -1 \
        | sed -E 's/.*:[[:space:]]*"?([^",}]+)"?.*/\1/' | tr -d '[:space:]')
  fi
  [ -n "$v" ] && printf '%s\n' "$v" || printf '%s\n' "$3"
}
repo_paths() { # one relative path per line
  if [ "$HAVE_JQ" = 1 ]; then jq -r '.repos[].path' "$CFG" 2>/dev/null; else printf '.\n'; fi
}
port_offsets() { # "name base" per line (jq only; empty otherwise)
  [ "$HAVE_JQ" = 1 ] && jq -r '(.session_isolation.port_offsets // {}) | to_entries[] | "\(.key) \(.value)"' "$CFG" 2>/dev/null
}
link_resources() { # untracked runtime to symlink into each slot, one name per line (jq only; empty otherwise)
  [ "$HAVE_JQ" = 1 ] && jq -r '(.session_isolation.link_into_slot // [])[]' "$CFG" 2>/dev/null
}

MAIN=$(cfg_scalar '.git.main_branch' 'main_branch' 'main')
REMOTE=$(cfg_scalar '.git.remote' 'remote' 'origin')
CDP_BASE=$(cfg_scalar '.session_isolation.cdp_base_port' 'cdp_base_port' '9222')
SLOT_DIR=$(cfg_scalar '.session_isolation.slot_dir' 'slot_dir' '.session-slots')
KIND=$(cfg_scalar '.session_isolation.kind' 'kind' 'worktree+cdp')
LINKS=$(link_resources)   # untracked runtime to symlink into each slot (config-driven; empty by default)

# Base the slot off the LOCAL current branch by default (so the slot inherits this session's committed
# work), not the configured main / a stale origin. An explicit [branch] arg overrides this.
BRANCHBASE="${BRANCH:-$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$MAIN")}"
SLOTBRANCH="${BRANCHBASE}--s${SLOT}"
CDP_PORT=$((CDP_BASE + SLOT))

echo "[session ${SLOT}] root=${ROOT}"
echo "[session ${SLOT}] kind=${KIND} branch=${SLOTBRANCH} cdp_port=${CDP_PORT}"

# --- isolated scratch dirs ------------------------------------------------------------------------
SLOT_ROOT="$ROOT/$SLOT_DIR/$SLOT"
for sub in logs output browser-profile; do
  mkdir -p "$SLOT_ROOT/$sub" 2>/dev/null || true
done
echo "[session ${SLOT}] scratch dirs: ${SLOT_ROOT}/{logs,output,browser-profile}"

# --- port assignments (generic, config-driven) ---------------------------------------------------
# list_ports: every port this slot needs (CDP + configured offsets), one per line.
list_ports() {
  echo "$CDP_PORT"
  port_offsets | while IFS=' ' read -r name base; do
    [ -n "$name" ] || continue
    case "$base" in ''|*[!0-9]*) continue ;; esac
    echo $((base + SLOT))
  done
}
port_offsets | while IFS=' ' read -r name base; do
  [ -n "$name" ] || continue
  case "$base" in ''|*[!0-9]*) continue ;; esac
  echo "[session ${SLOT}] port ${name}=$((base + SLOT))"
done
# Pre-flight: warn (don't hard-fail) if a port this slot needs is already bound.
if command -v lsof >/dev/null 2>&1; then
  list_ports | while IFS= read -r p; do
    [ -n "$p" ] || continue
    if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "[session ${SLOT}] WARNING: port $p already in use — another session may hold this slot."
    fi
  done
fi

# --- per-repo git worktrees ----------------------------------------------------------------------
repo_paths | while IFS= read -r rp; do
  [ -n "$rp" ] || continue
  case "$rp" in
    /*) repo="$rp" ;;
    .)  repo="$ROOT" ;;
    *)  repo="$ROOT/$rp" ;;
  esac
  git -C "$repo" rev-parse --git-dir >/dev/null 2>&1 || { echo "  (skip ${rp}: not a git repo)"; continue; }

  # Pre-flight hygiene nudge: surface leftover worktrees so they get reaped instead of piling up.
  extra=$(( $(git -C "$repo" worktree list 2>/dev/null | wc -l) - 1 ))
  [ "$extra" -gt 0 ] && echo "  [pre-flight] ${rp} has ${extra} extra worktree(s) — run git-hygiene.sh / session-down.sh to reap stale ones."

  name=$(basename "$repo")
  wt_parent="$repo/worktrees"
  wt="$wt_parent/${name}--s${SLOT}"
  mkdir -p "$wt_parent" 2>/dev/null || true

  # Prefer the repo's LOCAL current HEAD as the base (so the slot includes this session's committed
  # work) rather than a stale origin/<main>. An explicit [branch] arg bases off that branch instead.
  if [ -n "$BRANCH" ]; then
    git -C "$repo" fetch "$REMOTE" "$BRANCH" --quiet 2>/dev/null || true
    base_ref="$REMOTE/$BRANCH"
    git -C "$repo" rev-parse --verify "$base_ref" >/dev/null 2>&1 || base_ref="$BRANCH"
  else
    base_ref=$(git -C "$repo" rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)
  fi
  git -C "$repo" rev-parse --verify "$base_ref" >/dev/null 2>&1 || base_ref="HEAD"

  if [ -d "$wt" ]; then
    echo "  (worktree ${name}--s${SLOT} already exists — skipping)"
  elif git -C "$repo" worktree add "$wt" -b "$SLOTBRANCH" "$base_ref" 2>/dev/null; then
    echo "  worktree: ${wt}  (branch ${SLOTBRANCH} off ${base_ref})"
  elif git -C "$repo" worktree add "$wt" "$SLOTBRANCH" 2>/dev/null; then
    echo "  worktree: ${wt}  (existing branch ${SLOTBRANCH})"
  else
    echo "  (could not create worktree for ${name} — branch may be checked out elsewhere; skipping)"
  fi

  # Make the slot RUNNABLE: symlink the untracked runtime listed in session_isolation.link_into_slot
  # (e.g. a Python venv, a .env, a shared data dir) from the canonical repo into the slot. This is
  # stack-specific, so it is CONFIG-DRIVEN and EMPTY BY DEFAULT (nothing is linked unless configured).
  # Only list resources safe to SHARE across worktrees — never a per-worktree build dir (e.g.
  # node_modules; run a fresh install instead). A shared MUTABLE file (e.g. a quota/rate ledger) is
  # only safe if its writer serializes its read-modify-write under a cross-process lock.
  if [ -d "$wt" ] && [ -n "$LINKS" ]; then
    for res in $LINKS; do
      [ -n "$res" ] || continue
      if [ -e "$repo/$res" ] && [ ! -e "$wt/$res" ]; then
        ln -s "$repo/$res" "$wt/$res" 2>/dev/null && echo "    linked ${res} -> $repo/$res" || true
      fi
    done
    # A dir-pattern .gitignore entry (e.g. `venv/`) does NOT match a SYMLINK named `venv`, so without
    # this the symlinks look like uncommitted work and block session-down from reaping the slot. Add
    # them to the git exclude (info/exclude resolves to the COMMON git dir for a linked worktree, i.e.
    # repo-wide — harmless, since these resources should be ignored in every worktree anyway).
    excl=$(git -C "$wt" rev-parse --git-path info/exclude 2>/dev/null || true)
    if [ -n "$excl" ]; then
      for res in $LINKS; do
        [ -n "$res" ] || continue
        grep -qxF "/$res" "$excl" 2>/dev/null || printf '/%s\n' "$res" >> "$excl"
      done
    fi
  fi
done

cat <<EOF

[session ${SLOT}] ready. Export these in the shell that runs this session's tools:
  export CDP_PORT=${CDP_PORT} SESSION_SLOT=${SLOT} SLOT_DIR=${SLOT_ROOT}
Work ONLY inside the isolated worktrees under <repo>/worktrees/*--s${SLOT}.
Tear down with: session-down.sh ${SLOT}
EOF
