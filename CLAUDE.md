# Scotty's Circle

Campus social-discovery app: turn "I want to do something" into an in-person
meetup with compatible students nearby.

## Workspaces (npm workspaces monorepo)

- `apps/web` — React + Vite + TypeScript + Tailwind frontend. See `apps/web/CLAUDE.md`.
- `apps/api` — Express + TypeScript backend, MongoDB, matching algorithm. See `apps/api/CLAUDE.md`.
- `packages/shared-types` — the frozen API/domain contract both apps import. Treat as load-bearing; changing a signature here requires updating every caller.
- `scripts/synthetic-data` — standalone Python generator for demo/seed data. See its own README.md.

## Commands

- `npm install` (root) — installs all workspaces.
- `npm run dev` — runs both the API (port 4000) and the web app (Vite dev server) concurrently.
- `npm run dev:api` / `npm run dev:web` — run one side only.
- `npm test` — runs the backend test suite (Vitest, incl. concurrency tests against a real in-process MongoDB).
- `npm run seed` — seeds MongoDB from `scripts/synthetic-data/output/*.json` (or generates fresh demo data if absent).
- `npm run build` — builds shared-types, then api, then web.

## Architecture

- The matching/recommendation algorithm lives entirely in `apps/api/src/matching/` — see its nested `CLAUDE.md` for the algorithm's design invariants before touching anything there.
- MongoDB runs via `mongodb-memory-server` automatically in dev (real Mongo engine, zero setup); set `MONGODB_URI` to point at a real cluster instead — same repository code either way (`apps/api/src/db/connection.ts`).
- The one LLM call in this app (Gemini Flash, via `@google/genai`) lives inside `apps/api/src/matching/semantic/` and is called only on a synonym+cache miss for free text — see the matching module's `CLAUDE.md`.

## Conventions

- TypeScript strict mode everywhere. No comments unless they explain a non-obvious *why*.
- Backend tests: Vitest, in `apps/api/src/**/*.test.ts`.
- Don't add UI/auth/deployment complexity beyond what's specced — auth is intentionally mocked (see `apps/api/CLAUDE.md`).
- Every PR must append an entry to `AGENT_CHANGELOG.md` (see `AGENTS.md` and
  `.github/PULL_REQUEST_TEMPLATE.md`) so later agents can see what landed.

## Boundaries

- No real CMU SSO, no real Google Calendar/SIO integration, no push notifications — all intentionally mocked/deferred per the approved plan.
- Don't change `packages/shared-types` signatures without checking every workspace that imports them.

See `TODOs.md` for the current build phase checklist.
