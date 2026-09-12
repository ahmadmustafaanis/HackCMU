# Build Checklist

## Phase 0 — Scaffold (done)
- [x] Monorepo skeleton (npm workspaces, `apps/web` via Vite, `apps/api`)
- [x] `packages/shared-types` — domain types, matching types, service interfaces, API contract
- [x] `apps/api/src/config/*.json` + validated loader
- [x] `apps/api/src/db/connection.ts` (mongodb-memory-server / real URI)
- [x] `apps/api/src/shared/withFallback.ts`
- [x] CLAUDE.md hierarchy (root, apps/api, apps/api/src/matching, apps/api/src/matching/repository, apps/web)
- [x] Synthetic data generator (`scripts/synthetic-data`) — script + README + sample output generated

## Phase 1 — Backend (parallel agents A–D, done)
- [x] Agent A — taxonomy graph, synonym layer, Gemini `SemanticParser` + semantic cache
- [x] Agent B — time resolution + timeScore, `LocationService` + locationScore, `AvailabilityService`, `UserProfileService`
- [x] Agent C — `MongoEventRepository` (atomic join/create), idempotency store, cache service, racing-join test
- [x] Agent D — scoring/ranking, `recommendationService`, `matchingService`, matches/chat/connections/feedback services + routes

## Phase 2 — Frontend (parallel agents E–H, done)
- [x] Agent E — Welcome, Login, onboarding wizard
- [x] Agent F — Home, Activity Setup, Matching loading screen
- [x] Agent G — Match Results, Person profile, Chat
- [x] Agent H — Meetup, Feedback, Success, Discover, Connections, own Profile tab

## Phase 3 — Integration (done)
- [x] Wire frontend API client to real backend routes
- [x] Resolve Phase 1/2 interface drift:
  - Fixed `db/connection.ts`'s `ensureIndexes()` — an explicit `{unique:true}` on the
    `idempotencyKeys._id` index spec is rejected by MongoDB; removed it (implicit `_id`
    index is already unique). Two agents had independently found and defensively
    worked around this without touching the frozen file — good sign the parallel-safety
    rule worked as intended.
  - Rewired `server.ts`: swapped every Agent-D "TEMPORARY fake" for the real
    Agent A/B/C implementations (Gemini `SemanticParser`, `MongoEventRepository`,
    real `LocationService`/`AvailabilityService`/`UserProfileService`, real
    `InMemoryCacheService`/`MongoIdempotencyStore`, real taxonomy/time scoring
    functions), and seeded 6 named demo students + 5 open events so match results
    show real, resolvable people (not dangling participant ids).
  - Fixed a duplicate-Match-record bug found during manual testing: `match.route.ts`
    created a fresh `matches` row on every HTTP call even when the underlying join
    was internally deduped — wrapped the whole route body in the same idempotency
    mechanism so repeated calls (React StrictMode's dev double-effect, a retry, a
    double-tap) return one cached response instead of duplicating bookkeeping rows.
  - Fixed a sessionStorage key mismatch between `Matching.tsx` (writer) and
    `MatchResults.tsx` (reader) that silently defeated the intended handoff.
  - Fixed the "Invite" flow mis-reporting `ALREADY_JOINED` (you're already in this
    group, from the original MATCHED outcome) as "that invite has expired" —
    now correctly reported as accepted.
- [x] Full backend test suite green (`npm test` — 97/97 across 16 files, incl. the
  Mongo-backed concurrency race test)
- [x] Seeded demo data, manual click-through of the whole flow in-browser: Welcome →
  demo login → onboarding (3 steps) → Home (real suggested activities + trending) →
  Activity Setup (Coffee) → Matching (staged animation) → Match Results (real scores
  + reasons, e.g. "You're nearby · You both like Coffee") → Invite → Chat (send/receive
  working, conversation-starter chip)
- [x] Confirmed LLM-minimization live: structured/synonym requests make 0 Gemini
  calls; a novel free-text phrase with no `GOOGLE_API_KEY` set degrades gracefully
  to PENDING rather than erroring — matches the spec's required failure behavior

## Phase 4 — Real Auth: Sign in with Google + secure sessions (done)
- [x] `apps/api/src/auth/googleAuth.ts` — verifies a Google Identity Services ID
  token server-side (audience-checked against `GOOGLE_CLIENT_ID`) via `google-auth-library`
- [x] `apps/api/src/auth/session.ts` — signs/verifies our own JWT session tokens
  (`SESSION_JWT_SECRET`, 30-day expiry), replacing the old meaningless opaque
  `randomUUID()` token that nothing ever verified
- [x] `apps/api/src/auth/requireAuth.ts` — Express middleware setting the
  AUTHORITATIVE `req.userId` from a verified `Authorization: Bearer` token
- [x] `POST /api/auth/google` — upserts into `users` keyed by `googleId` (unique+sparse
  index), stores only derived profile fields (name/email/picture/emailVerified) and
  NEVER the raw Google token; `GET /api/auth/me` validates a session for real
- [x] Fixed a latent privacy bug while wiring this in: `auth/onboarding/profile`
  routes previously mapped Mongo user docs to the public `Student` shape via a blind
  `{ ...rest }` spread — harmless while the schema had no sensitive fields, but would
  have silently leaked `googleId`/`email` the moment they were added. Replaced with an
  explicit field-by-field allowlist in all three.
- [x] Applied `requireAuth` (and, where relevant, an ownership check on the `:userId`
  path param) to every route that used to trust a client-supplied `userId`: match,
  invite, onboarding, profile, matches, connections, chat send, feedback
- [x] Frontend: `GoogleSignInButton` (renders Google's own button via the Identity
  Services script; falls back to a clear "not configured" note if `VITE_GOOGLE_CLIENT_ID`
  is unset, rather than a broken button), `api/client.ts` attaches `Authorization: Bearer`
  on every request, `session.tsx` validates a stored session against `GET /api/auth/me`
  on load instead of trusting localStorage blindly
- [x] Found and fixed a real race during manual testing: the "already signed in, skip
  to Home" redirect effect was keyed on `student` as well as `restoring`, so it could
  fire right after a BRAND NEW sign-in's `setSession` call and race the intended
  `navigate("/onboarding")` — re-keyed to fire only once, on the `restoring` transition
- [x] `apps/api/.env.example` / `apps/web/.env.example` document `GOOGLE_CLIENT_ID` +
  `VITE_GOOGLE_CLIENT_ID` (same value, both places) and `SESSION_JWT_SECRET`, with
  exact setup steps for the Google Cloud Console side
- [x] 8 new backend tests (`session.test.ts`, `requireAuth.test.ts`) — 105/105 total
- [ ] **Needs a real `GOOGLE_CLIENT_ID`** to actually exercise the Google sign-in path
  live (demo-login still works without it) — see `.env.example` for setup steps

## Stretch (only if time remains)
- [x] Interactive dynamic campus heatmap on Discover + Home “Trending Around
      CMU” (`feat/discover-heatmap`). Open events plot from `locations.json`
      lat/lng now attached to `Activity`.
- [ ] Set `GOOGLE_API_KEY`/`GEMINI_API_KEY` to exercise the real Gemini semantic-parsing
      path live (already verified live in this session — see conversation — this is just
      a reminder that it needs a valid key/model id to keep working)
- [ ] `mongodb-memory-server`-based test for a real Atlas connection string path
- [ ] Further visual polish against the mockup (Discover filters, Connections
      timestamps — currently a cosmetic placeholder per Agent H's notes since `Match`
      has no timestamp field yet)
- [ ] `GET /api/chat/:conversationId` doesn't yet verify the caller is actually a
      participant of that conversation (no conversation-membership model beyond the
      `conversationId === matchId` convention) — a known, documented gap in `chat.route.ts`
