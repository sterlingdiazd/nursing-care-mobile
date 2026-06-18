# Concurrent sessions — isolate first, one slot per session

Two (or more) agent/terminal sessions in the same repo at once will collide if they share a working
tree or branch — interleaved commits, one grabbing the other's uncommitted work. The rule is
**one session = one isolated slot**. Scales to N sessions (slots 0-49).

## Do this at the START of every session

```sh
scripts/orchestration/session-up.sh <slot>     # e.g. 1,2,3 — your own worktree + branch off LOCAL HEAD
                                                # (+ any session_isolation.link_into_slot symlinked in)
export SESSION_SLOT=<slot>                      # (session-up prints the exact exports)
scripts/orchestration/session-claim.sh "what you're working on"   # announce + warn on a branch collision
# ... do ALL work inside  worktrees/<repo>--s<slot>  ...
scripts/orchestration/session-down.sh <slot>   # at the end: reap the slot (what you open, you close)
```

Work ONLY inside your slot worktree. Never edit/commit in the shared canonical checkout.

## What enforces / supports this

- **slot-guard** (hard enforcement): a PreToolUse hook (wired by `/sdlc-init` — or
  `install-session-guards.sh` — into committed `.claude/settings.json`) that BLOCKS work in the shared
  canonical worktree of any repo listed in `project-config.json`. Strictness = `session_isolation.guard_mode`:
  `commits-only` (default) blocks `git commit/add/push/merge/rebase`; `all` also blocks `Edit`/`Write`.
  Escape hatch (rare, e.g. bootstrapping the guard itself): prefix the command with
  `ALLOW_SHARED_WORKTREE=1` — honored **only as a leading token**, so a token merely appearing inside a
  commit message or file path can't bypass it. Linked/slot worktrees are always allowed.
- **AGENT-COORDINATION.md** (awareness, not enforcement): a gitignored shared "chat" + session registry
  between concurrent sessions (template: `docs/sdlc/AGENT-COORDINATION.template.md`). `session-claim.sh`
  appends your branch + owned area and **warns — or, with `--strict`, refuses (exit 2)** — when another
  recent session already holds the same branch. Read it before touching shared files; announce shared
  changes (API, main-branch pushes) there first.

## Making the slot runnable

`session-up.sh` symlinks the untracked runtime listed in `session_isolation.link_into_slot` (e.g.
`["venv", ".env", "data"]` for a Python project) into each slot so it runs without a fresh setup. The
list is empty by default. Only list resources SAFE to share across worktrees — never a per-worktree
build dir like `node_modules` (run a fresh install in the slot instead), and only link a shared MUTABLE
file (e.g. a quota ledger) if its writer serializes its read-modify-write under a cross-process lock.

## Repurposing a session

You can repurpose a session (narrow task → broader work), but **re-isolate it into its own slot when
you do.** The failure mode to avoid is letting one *unisolated* session sprawl across many concerns on a
shared branch while another session runs — that stalls/clobbers the other session. Keep distinct
workstreams in distinct slots.

## If a guard misfires or its override seems broken

Guards read their override flag from the hook's environment, but Claude Code PreToolUse hooks do **not**
inherit a command's inline env — so a bare `FLAG=1 <command>` prefix is invisible to the hook. The
guards therefore also honor the flag as a **leading token in the command string**. If a guard still
blocks legitimate work, **stop and surface it** (report the block + that the override is/was broken, and
ask how to proceed) rather than routing around it — working around a guard erodes its value.
