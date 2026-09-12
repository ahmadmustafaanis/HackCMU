# Agent notes

This repo is worked on by multiple coding agents (Claude, Codex, Cursor).

## Before you start

1. Read `AGENT_CHANGELOG.md` (newest first) so you do not redo or fight a
   recent change.
2. Read `CLAUDE.md` and the nested `CLAUDE.md` in the app you are touching.
3. Do not change `packages/shared-types` signatures without updating every
   caller.

## Before you open or update a PR

Append a dated entry to `AGENT_CHANGELOG.md`:

- What you changed and why
- The main files
- Anything the next agent should know (unfinished work, type-contract drift,
  env vars, follow-ups)

Check the box in `.github/PULL_REQUEST_TEMPLATE.md`. PRs without a changelog
entry are incomplete.
