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

## Stretch (only if time remains)
- [ ] Set `GOOGLE_API_KEY` to exercise the real Gemini semantic-parsing path live
      (currently verified via mocked LLM clients in tests + graceful-fallback in the
      live demo, per the spec's own LLM-minimization goal — a real key isn't required
      for correctness, only to see the 1-LLM-call-on-novel-text path fire for real)
- [ ] `mongodb-memory-server`-based test for a real Atlas connection string path
- [ ] Further visual polish against the mockup (Discover filters, Connections
      timestamps — currently a cosmetic placeholder per Agent H's notes since `Match`
      has no timestamp field yet)
