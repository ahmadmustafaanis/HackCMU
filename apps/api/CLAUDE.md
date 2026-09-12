# apps/api

Express + TypeScript backend: REST routes, MongoDB access, and the matching
algorithm (see `src/matching/CLAUDE.md` for that specifically).

## Structure

- `src/server.ts` — Express bootstrap, mounts routes, connects DB.
- `src/routes/` — one file per resource, thin (parse request → call a service → map response using `shared-types`' `api.ts` DTOs).
- `src/db/connection.ts` — Mongo connection (real URI or in-process `mongodb-memory-server`), index creation.
- `src/config/` — all tunable JSON (taxonomy/synonyms/durations/weights/thresholds/locations), loaded and validated at startup by `src/config/index.ts`. Change tuning here, not by editing scoring code.
- `src/matching/` — the algorithm. See its own `CLAUDE.md`.
- `src/seed/` — loads `scripts/synthetic-data/output/*.json` into Mongo for local demo.

## Conventions

- Every service implements an interface from `shared-types` (`services.ts`) — implementations are injectable/mockable, tests never make live network/LLM calls.
- Auth is mocked: `POST /api/auth/demo-login` creates a session with no real identity check. Don't build real CMU SSO here.
- Env vars: see `.env.example`. `MONGODB_URI` unset → in-process Mongo. `GOOGLE_API_KEY` unset → semantic parser still works for structured/synonym/cached input, only novel free text degrades gracefully (no throw).
