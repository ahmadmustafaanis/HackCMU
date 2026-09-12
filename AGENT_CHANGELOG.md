# Agent changelog

Every PR must add an entry here so Claude, Codex, and humans can see what
landed without reconstructing it from the diff.

Newest entries go at the top. Keep each entry short: intent, files, follow-ups.

## 2026-09-12 — Agent changelog + Discover heatmap tracking

- Added this changelog, a PR template, `AGENTS.md`, and a Cursor rule so
  later PRs record what changed.
- Opened [#4](https://github.com/ahmadmustafaanis/HackCMU/issues/4) + branch
  `feat/discover-heatmap` for an interactive campus heatmap on Discover /
  Home trending. Heatmap UI is not implemented yet.
- Files: `AGENT_CHANGELOG.md`, `AGENTS.md`, `.github/PULL_REQUEST_TEMPLATE.md`,
  `.cursor/rules/agent-changelog.mdc`, `CLAUDE.md`, `TODOs.md`, `SPEC.md`
- Follow-up: implement heatmap on `feat/discover-heatmap` (see issue).
