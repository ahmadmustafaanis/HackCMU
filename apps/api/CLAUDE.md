# apps/api

Express + TypeScript backend: REST routes, MongoDB access, and the matching
algorithm (see `src/matching/CLAUDE.md` for that specifically).

## Structure

- `src/server.ts` — Express bootstrap, mounts routes, connects DB.
- `src/routes/` — one file per resource, thin (parse request → call a service → map response using `shared-types`' `api.ts` DTOs).
- `src/auth/` — real authentication: `googleAuth.ts` (verifies a Google ID token server-side), `auth0Auth.ts` (verifies an Auth0 Universal Login ID token against our tenant's JWKS), `session.ts` (signs/verifies our own JWT session tokens), `requireAuth.ts` (Express middleware setting the AUTHORITATIVE `req.userId`).
- `src/db/connection.ts` — Mongo connection (real URI or in-process `mongodb-memory-server`), index creation.
- `src/config/` — all tunable JSON (taxonomy/synonyms/durations/weights/thresholds/locations), loaded and validated at startup by `src/config/index.ts`. Change tuning here, not by editing scoring code.
- `src/matching/` — the algorithm. See its own `CLAUDE.md`.
- `src/seed/` — loads `scripts/synthetic-data/output/*.json` into Mongo for local demo.

## Conventions

- Every service implements an interface from `shared-types` (`services.ts`) — implementations are injectable/mockable, tests never make live network/LLM calls.
- **Auth**: `POST /api/auth/google` (Google Identity Services ID-token verification, see `src/auth/googleAuth.ts`) and `POST /api/auth/auth0` (Auth0 Universal Login ID-token verification against our tenant's JWKS, see `src/auth/auth0Auth.ts`) are the real paths — each upserts into `users` keyed by its own provider id (`googleId` / `auth0Id`), never stores the raw token, and issues a signed session JWT via `src/auth/session.ts`. `POST /api/auth/demo-login` is kept alongside them purely for local dev without either provider configured; prefer Google or Auth0 for anything real. Any route that used to trust a client-supplied `userId` should instead use `requireAuth` + `req.userId` — never trust a body/query `userId` for authorization.
- **Never leak sensitive user fields**: `googleId`/`auth0Id`/`email`/`emailVerified` live on the raw Mongo user document but must NEVER appear in an API response — every route that maps a user document to the public `Student` shape does it via an explicit field-by-field allowlist (`toStudent()`), never a `{ ...rest }` spread, specifically so adding a new internal-only field to the schema can't silently start leaking it.
- Env vars: see `.env.example`. `MONGODB_URI` unset → in-process Mongo. `GOOGLE_API_KEY`/`GEMINI_API_KEY` unset → semantic parser still works for structured/synonym/cached input, only novel free text degrades gracefully (no throw). `GOOGLE_CLIENT_ID` unset → `/api/auth/google` fails cleanly (demo-login still works). `AUTH0_DOMAIN`/`AUTH0_CLIENT_ID` unset → `/api/auth/auth0` fails cleanly (demo-login still works). `SESSION_JWT_SECRET` unset → an insecure dev-only fallback is used with a console warning; always set a real one outside local dev.
