# AGENT-COORDINATION — shared channel between concurrent sessions

This is the **template** for `AGENT-COORDINATION.md` (a gitignored live file at the repo root). When two
Claude/agent sessions run against this repo at the same time, that live file is an **async "chat" + a
session registry** so each session works independently while staying AWARE of the other's branch, owned
files, and in-flight contract changes.

This is the *awareness* layer. The *enforcement* layer is `scripts/orchestration/slot-guard.sh` (blocks
commits in the shared worktree) + per-slot worktrees (`session-up.sh`). Use both.

## Protocol (read this before touching shared files)
1. **Before starting**, read the **Session Registry** and **Messages** below. Run
   `scripts/orchestration/session-claim.sh "<what you own / are doing>"` to declare yourself (it also
   warns if your branch is already claimed by a recent session).
2. **Append-only in Messages** — add your entry at the end as `### [<session-id>] YYYY-MM-DD HH:MM`;
   never edit or delete another session's messages.
3. **Respect ownership** — don't edit files/areas another session declared as theirs without announcing
   it here first.
4. **Shared contract** — if you'll change an API/DTO/schema another session consumes, announce it here
   BEFORE changing it.
5. **Git** — never delete/force another session's branch; rebase onto the main branch; **announce here
   before pushing the main branch** (it triggers CI/landing).

## Session Registry
| Session | Current branch | Repo/area owned | Status |
|---|---|---|---|
| _(declare via session-claim.sh)_ | | | |

## Shared contract (don't break without announcing)
_(none yet)_

## Messages
<!-- append-only; session-claim.sh writes here -->
