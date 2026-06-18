#!/bin/sh
# git-hygiene.sh — idempotent local git cleanup across all repos in docs/sdlc/project-config.json.
#
# Fixes the drift that accumulates because work lands from slot worktrees (which advance origin/<main>)
# while the canonical <main> checkout is never pulled, and merged branches are never pruned. For every
# repo it:
#   1. fetches <remote>/<main>,
#   2. fast-forwards the <main> worktree to <remote>/<main> (only if main is checked out and clean),
#   3. prunes local branches fully merged into <remote>/<main> — EXCEPT <main> and backup/*, and never
#      a branch currently checked out in a worktree,
#   4. prunes stale worktree administrative refs.
#
# SAFE BY DESIGN: never uses --force / reset --hard / -D; never deletes a branch with unmerged commits
# or a backup/*; prints anything needing manual attention. Re-running is a no-op. Run at session end
# (after session-down.sh) and any time `git status` shows repos behind origin.
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

MAIN=$(cfg_scalar '.git.main_branch' 'main_branch' 'main')
REMOTE=$(cfg_scalar '.git.remote' 'remote' 'origin')

repo_paths | while IFS= read -r rp; do
  [ -n "$rp" ] || continue
  case "$rp" in /*) RP="$rp" ;; .) RP="$ROOT" ;; *) RP="$ROOT/$rp" ;; esac
  [ -e "$RP" ] || continue
  git -C "$RP" rev-parse --git-dir >/dev/null 2>&1 || continue
  echo "==== ${rp} ===="

  if ! git -C "$RP" fetch --quiet "$REMOTE" "$MAIN" 2>/dev/null; then
    echo "  fetch failed — skipping repo"; continue
  fi
  OM=$(git -C "$RP" rev-parse "$REMOTE/$MAIN" 2>/dev/null)
  [ -n "$OM" ] || { echo "  no ${REMOTE}/${MAIN} — skipping"; continue; }
  cur=$(git -C "$RP" rev-parse --abbrev-ref HEAD)

  # 2. ff-update main when it is the checked-out branch here and the tree is clean.
  if [ "$cur" = "$MAIN" ]; then
    if [ "$(git -C "$RP" rev-parse "$MAIN")" = "$OM" ]; then
      echo "  ${MAIN} already up to date ($(echo "$OM" | cut -c1-9))"
    elif [ -n "$(git -C "$RP" status --porcelain)" ]; then
      echo "  ${MAIN} worktree dirty — skipped ff (commit/stash first)"
    elif git -C "$RP" merge-base --is-ancestor "$MAIN" "$REMOTE/$MAIN" 2>/dev/null; then
      git -C "$RP" merge --ff-only "$REMOTE/$MAIN" >/dev/null 2>&1 \
        && echo "  ${MAIN} ff-updated -> $(echo "$OM" | cut -c1-9)" || echo "  ${MAIN} ff failed"
    else
      echo "  ${MAIN} DIVERGED from ${REMOTE}/${MAIN} — manual review (do NOT force)"
    fi
  else
    echo "  NOTE: '${MAIN}' not checked out here (on '${cur}') — run from the ${MAIN} worktree to ff it"
  fi

  # 3. prune local branches fully merged into <remote>/<main> (keep main + backup/* + checked-out).
  git -C "$RP" for-each-ref --format='%(refname:short)' refs/heads/ | while IFS= read -r b; do
    [ -n "$b" ] || continue
    [ "$b" = "$MAIN" ] && continue
    case "$b" in backup/*) continue ;; esac
    if git -C "$RP" merge-base --is-ancestor "$b" "$REMOTE/$MAIN" 2>/dev/null; then
      if git -C "$RP" worktree list --porcelain | grep -qx "branch refs/heads/${b}"; then
        echo "  KEEP ${b} — merged but checked out in a worktree (remove the worktree first)"
      else
        git -C "$RP" branch -d "$b" >/dev/null 2>&1 && echo "  pruned merged branch ${b}" \
          || echo "  could not prune ${b}"
      fi
    elif [ -z "$(git -C "$RP" cherry "$REMOTE/$MAIN" "$b" 2>/dev/null | grep '^+')" ]; then
      # Cherry-equivalent on <remote>/<main> (landed via rebase/squash). REPORT only; never auto-delete.
      echo "  REVIEW ${b} — appears merged via rebase/squash (no unique commits); delete manually if confirmed"
    else
      echo "  KEEP ${b} — has unmerged commits"
    fi
  done

  # 4. drop stale worktree admin refs.
  git -C "$RP" worktree prune 2>/dev/null || true
done

echo "git-hygiene: done."
