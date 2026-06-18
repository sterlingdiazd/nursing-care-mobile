#!/bin/sh
# slot-guard.sh — Claude Code PreToolUse guard (config-driven, project-agnostic).
#
# Enforces "every interactive session isolates by default": BLOCKS edits/commits/pushes that target a
# configured repo's SHARED canonical (main) worktree, forcing work into an isolated slot worktree
# created by session-up.sh <slot>. Guarded repos are read from docs/sdlc/project-config.json (repos[]).
# Linked/slot worktrees (their --git-dir differs from --git-common-dir) are always allowed.
#
# Decision (PreToolUse contract): exit 0 = allow, exit 2 = block (stderr shown to the agent).
# Override a single command/edit with:  ALLOW_SHARED_WORKTREE=1
set -u

[ "${ALLOW_SHARED_WORKTREE:-}" = "1" ] && exit 0

input=$(cat 2>/dev/null || true)
[ -n "$input" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0   # without jq we cannot reliably parse the event; fail open

tool=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null || true)

path=""
case "$tool" in
  Write|Edit|MultiEdit|NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null || true)
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
    # Honor the escape hatch only as a LEADING env-assignment (PreToolUse hooks don't inherit a
    # command's inline env, so the env check at the top can't see it). Anchored so an incidental
    # occurrence (commit message, echoed string, heredoc, file path) can't bypass the guard.
    case "$cmd" in 'ALLOW_SHARED_WORKTREE=1 '*|'ALLOW_SHARED_WORKTREE=1') exit 0 ;; esac
    # Canonicalize for CLASSIFICATION ONLY (this string is never executed): join `\<newline>` line
    # continuations, then strip quote/backslash chars — so quote-removal forms (git "commit",
    # git c""ommit, git 'commit') and continuations classify IDENTICALLY to the bare command. You
    # cannot reliably parse a shell command with regex; canonicalizing first closes that class of
    # evasion. (Belt-and-suspenders guard; ALLOW_SHARED_WORKTREE=1 stays the sanctioned escape.)
    cmd=$(printf '%s' "$cmd" | awk '{ if (sub(/\\$/,"")) printf "%s", $0; else print }')
    cmd=$(printf '%s' "$cmd" | tr -d "$(printf '\47\42\134')")
    # Block only when a git WRITE (commit/add/push/merge/rebase) is the LEADING command of some
    # &&/||/;/| segment. Matching the bare substring "git commit" would over-block commands that
    # merely MENTION it (a commit message, an echoed string, a heredoc, or a file path), so classify
    # each segment by its leading command (after peeling a leading env-assignment / simple wrapper).
    is_git_write=0; gitC=""
    set -f
    OLDIFS=$IFS
    # Split on the shell control operators AND on command-substitution openers ($( and backtick): a
    # `$(git commit)` actually EXECUTES git commit, so its contents must be classified like any segment.
    segs=$(printf '%s' "$cmd" | sed -E 's/&&/\n/g; s/\|\|/\n/g; s/;/\n/g; s/\|/\n/g; s/[$]\(/\n/g; s/`/\n/g')
    while IFS= read -r seg; do
      seg=$(printf '%s' "$seg" | sed -E 's/^[[:space:]]*[({]*[[:space:]]*//')   # strip leading space/( /{ wrappers
      IFS=' '; set -- $seg; IFS="$OLDIFS"
      while [ $# -gt 0 ]; do                                   # peel leading env-assignment / wrappers
        case "$1" in
          [A-Za-z_]*=*) shift ;;
          sudo|command|time|nice|env|builtin|exec) shift ;;
          *) break ;;
        esac
      done
      [ $# -gt 0 ] || continue
      [ "${1##*/}" = git ] || continue                         # the segment's leading command must BE git
      shift
      sub=""; segC=""
      while [ $# -gt 0 ]; do                                   # find subcommand, capturing a -C <dir> target
        case "$1" in
          -C) segC="${2:-}"; shift; shift 2>/dev/null || true ;;
          -c|--git-dir|--work-tree|--namespace|--exec-path) shift; shift 2>/dev/null || true ;;
          -*) shift ;;
          *) sub=$1; break ;;
        esac
      done
      sub=${sub%%[!A-Za-z-]*}                                  # strip trailing wrapper metachars: `commit)` -> `commit`
      case "$sub" in commit|add|push|merge|rebase) is_git_write=1; gitC="$segC"; break ;; esac
    done <<SEGS
$segs
SEGS
    IFS=$OLDIFS; set +f
    [ "$is_git_write" = 1 ] || exit 0
    # Judge the `-C <dir>` target if present, else $PWD — so `git -C <slot> commit` run from the shared
    # root is evaluated against the slot (allowed), not the shared worktree.
    if [ -n "$gitC" ]; then
      case "$gitC" in /*) path="$gitC" ;; *) path="$PWD/$gitC" ;; esac
    else
      path="$PWD"
    fi
    ;;
  *) exit 0 ;;
esac
[ -n "$path" ] || exit 0

# Resolve a directory to evaluate (the file's parent, or the path itself if it is a dir).
dir="$path"
[ -d "$dir" ] || dir=$(dirname "$path")
[ -d "$dir" ] || exit 0

# Outside any git repo -> not our concern.
top=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)
[ -n "$top" ] || exit 0

# Locate config relative to the repo we are in (walk up for docs/sdlc/project-config.json).
ROOT=""
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -f "$CLAUDE_PROJECT_DIR/docs/sdlc/project-config.json" ]; then
  ROOT="$CLAUDE_PROJECT_DIR"
else
  d="$top"
  while [ "$d" != "/" ]; do
    [ -f "$d/docs/sdlc/project-config.json" ] && { ROOT="$d"; break; }
    d=$(dirname "$d")
  done
fi
[ -n "$ROOT" ] || exit 0
CFG="$ROOT/docs/sdlc/project-config.json"
[ -f "$CFG" ] || exit 0

# Is $top one of the configured repos? Compare absolute, symlink-resolved paths.
abstop=$(cd "$top" 2>/dev/null && pwd -P) || abstop="$top"
guarded=0
jq -r '.repos[].path' "$CFG" 2>/dev/null | while IFS= read -r rp; do
  [ -n "$rp" ] || continue
  case "$rp" in /*) repo="$rp" ;; .) repo="$ROOT" ;; *) repo="$ROOT/$rp" ;; esac
  absrepo=$(cd "$repo" 2>/dev/null && pwd -P) || absrepo="$repo"
  [ "$absrepo" = "$abstop" ] && { echo MATCH; break; }
done | grep -q MATCH && guarded=1
[ "$guarded" = 1 ] || exit 0

# Belt-and-suspenders: in a linked worktree --git-dir != --git-common-dir -> isolated -> allow.
absgitdir=$(git -C "$dir" rev-parse --path-format=absolute --git-dir 2>/dev/null || true)
commondir=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
[ -n "$absgitdir" ] && [ -n "$commondir" ] && [ "$absgitdir" != "$commondir" ] && exit 0

# Editing/committing in a guarded repo's SHARED main worktree -> BLOCK.
echo "BLOCKED by slot-guard: '$top' is the SHARED main worktree (another session's WIP may live here)." >&2
echo "Isolate first:  scripts/session-up.sh <slot>   then work in  <repo>/worktrees/$(basename "$top")--s<slot>" >&2
echo "One-off override:  prefix the command with  ALLOW_SHARED_WORKTREE=1" >&2
exit 2
