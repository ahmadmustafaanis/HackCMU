# Scotty's Circle Specification

## 1. Product Summary

Scotty's Circle is a campus social-discovery application. A student chooses an
activity, time, and location, and the system finds compatible students already
planning that activity or creates an open meetup for others to join.

The repository is an npm-workspaces monorepo with three application-facing
areas:

- `apps/web`: React, Vite, TypeScript, and Tailwind user interface.
- `apps/api`: Express, TypeScript, MongoDB persistence, REST routes, and all
  recommendation/matching logic.
- `packages/shared-types`: the shared domain, API, and service contracts.

The standalone `scripts/synthetic-data` package generates realistic demo data;
it is not part of the runtime request path.

## 2. Architecture

```text
Browser
  |
  | typed fetch through apps/web/src/api/client.ts
  v
Express API (apps/api/src/server.ts)
  |
  +-- REST route adapters
  |     +-- auth, onboarding, profile
  |     +-- activities, recommend, match, matches
  |     +-- chat, connections, feedback
  |
  +-- Domain services
  |     +-- matching and recommendation orchestration
  |     +-- chat, matches, feedback, profile services
  |
  +-- Matching modules
  |     +-- intent, semantic, taxonomy, time, location
  |     +-- availability, scoring, repository, cache
  |     +-- idempotency and observability
  |
  v
MongoDB or mongodb-memory-server
```

Routes are intentionally thin: they parse request DTOs, construct shared
types, call an injected service, and map the result to a shared response type.
The server composes concrete implementations at startup. Service interfaces in
`packages/shared-types/src/services.ts` keep those implementations replaceable
and make tests independent of live LLM/network calls.

## 3. User Flow

### 3.1 Session and onboarding

1. `/` renders `Welcome`.
2. `/login` calls `POST /api/auth/demo-login`, which returns a demo `Student`
   and session token. The web app stores both in local storage through
   `SessionProvider`.
3. `/onboarding/*` runs a three-step wizard:
   - select one or more interests;
   - select one to three vibes;
   - select availability windows.
4. The final step calls `POST /api/onboarding`, updates the local student, and
   navigates to `/home`.

Authentication is deliberately demo-only. The token is a client-side session
marker; there is no CMU SSO or authorization layer in this implementation.

### 3.2 Home and activity selection

`Home` is the primary signed-in surface. It initially shows a compact free-text
intent field and the trending feed. Focusing the field expands the draft
controls for profile-derived activity buttons, time, and canonical location;
the panel can be collapsed with Back or X without losing the draft. Selecting
an activity triggers debounced read-only recommendations below the controls.
Recommendation, trending, and Discover cards are clickable and open meetup
details. The bottom-tab navigation reaches Home, Discover, Activities,
Connections, and Profile.

Selecting an activity opens `/activity/:type/setup`. The two-step setup screen
collects:

- a preset such as meeting someone new, coffee with one person, or a small
  group;
- optional free text;
- a time of now, 30 minutes, one hour, or a selected future time;
- a canonical campus location or Anywhere.

The page builds `StructuredIntentInput`, stores it under
`scottys-circle:pendingMatch`, and navigates to `/matching` with the same
payload in router state.

### 3.3 Matching and results

`Matching` displays a staged five-item progress animation while making one
`POST /api/match` request. The request is authoritative: it may resolve free
text, resolve a time, rank open events, join an existing event, or create a
new event.

The response is cached in session storage under
`scottys-circle:lastMatch`; the pending request is removed. After the staged
animation completes, the app navigates to `/matches`.

`MatchResults` first reads the cached response and falls back to
`GET /api/matches/:userId`. It loads profiles for the returned participant
records and renders the first result as featured and the rest as alternatives.
Users can:

- open `/people/:id` for a profile;
- invite/join a specific event through `POST /api/activities/:eventId/invite`;
- continue to `/chat/:matchId` after an accepted invite.

### 3.4 Meetup, chat, feedback, and secondary surfaces

- `/meetup/:eventId` displays meetup details.
- `/chat/:matchId` loads history and posts messages through the chat routes.
- `/feedback/:eventId` submits a `great`, `good`, or `okay` rating.
- `/success/:matchId` is the post-action confirmation surface.
- `/discover` shows open/trending activities from `GET /api/activities`, plus
  an interactive campus heatmap of open-event density. `Activity` includes
  optional `locationId` / `lat` / `lng` filled from `apps/api/src/config/locations.json`.
- `/connections` loads accepted/connected relationships.
- `/profile` shows the current student profile and session controls.

## 4. Frontend Modules

### Application and state

- `src/main.tsx`: React entry point and provider setup.
- `src/App.tsx`: route table and fallback redirect.
- `src/state/session.tsx`: `SessionProvider`, local-storage hydration, login,
  profile updates, and logout.
- `src/api/client.ts`: the only browser-side fetch boundary. It imports all
  request and response types from `shared-types`.
- `src/index.css`: global mobile-first layout and visual language.

### Pages

`Welcome`, `Login`, and `onboarding/OnboardingWizard` handle entry and profile
setup. `Home`, `ActivitySetup`, and `Matching` handle activity creation and
matching. `MatchResults`, `PersonProfile`, `Chat`, `Meetup`, `Feedback`, and
`Success` handle the meetup lifecycle. `Discover`, `Connections`, and `Profile`
provide browse, relationship, and account views.

### Shared components

- `Button`, `Card`: common controls and containers.
- `ActivityButtonGrid`: activity choices and activity metadata.
- `ActivityFeedCard`, `TrendingCard`: activity/discover feed presentation.
- `PersonCard`: match result rows and invite actions.
- `ChatBubble`: message rendering.
- `FeedbackEmojiPicker`: feedback selection.
- `OnboardingStepper`: selectable onboarding options.
- `TabBar`: bottom navigation.
- `Stub`: placeholder support for unfinished visual surfaces.

The web app is mobile-first, centered with a constrained wide-screen shell,
and uses a maroon/cardinal primary palette with rounded cards and a paw mark.

## 5. REST API

All routes are mounted under `/api`. The exact DTOs live in
`packages/shared-types/src/api.ts`.

| Method and path | Purpose |
| --- | --- |
| `POST /auth/demo-login` | Create a demo session and return a `Student` plus token. |
| `POST /onboarding` | Merge interests, vibes, and availability into a profile. |
| `GET /profile/:id` | Return one student profile. |
| `GET /activities/suggestions?userId=...` | Return deterministic activity-button suggestions. |
| `GET /activities` | Return up to 50 currently open events for Discover. |
| `POST /activities/:eventId/invite` | Atomically attempt to join one event and update a match record. |
| `POST /recommend` | Read-only, structured-only ranked event recommendations. |
| `POST /match` | Resolve intent and perform authoritative join-or-create matching. |
| `GET /matches/:userId` | Return stored match records for a student. |
| `GET /chat/:conversationId` | Return chat history. |
| `POST /chat/:conversationId` | Append and return one chat message. |
| `GET /connections/:userId` | Return connection records. |
| `POST /feedback` | Persist meetup feedback and return `{ ok: true }`. |

The API maps richer internal `EventRecord` values to user-facing `Activity`,
`Match`, and recommendation DTOs. For example, event status `OPEN` maps to UI
status `open`, and location IDs are formatted to canonical campus names.

## 6. Shared Contracts

### Domain types

`domain.ts` defines `Student`, `Interest`, `Vibe`, `Match`, `Activity`, and
`ChatMessage`. These are the shapes rendered by the frontend.

### Matching types

`matching.ts` defines the internal algorithm contract:

- `NormalizedIntent`: canonical activities, categories, tags, optional ISO time,
  locations, and optional source text.
- `EventRecord`: authoritative event state, participants, capacity, host, vibe,
  status, and expiration.
- `ScoreBreakdown` and `ScoredCandidate`: explainable ranking output.
- `JoinResult`: successful join or a precise failure reason.
- `MatchResult`: `MATCHED` or `PENDING`, with the selected event and optional
  score/breakdown.
- `SemanticParseResult`: the only output shape allowed from semantic parsing.

### Service types

`services.ts` defines injectable interfaces for event persistence, cache,
semantic parsing, availability, location, profile lookup, metrics,
recommendation, and authoritative matching. These interfaces also document
the important structural restrictions, especially that recommendation has no
semantic parser, availability resolver, or repository write dependency.

## 7. Matching and Recommendation Algorithms

### 7.1 Intent construction and semantic resolution

`intent/buildNormalizedIntent.ts` is a pure constructor. It fills optional
arrays with defaults but does not interpret text.

For the authoritative match path, `matchingService.ts` merges `sourceText`
using `SemanticParser`:

1. Empty text returns no parse.
2. Text is normalized by `semantic/normalizeText.ts`.
3. `semantic/synonymLookup.ts` checks deterministic configured synonyms and
   returns confidence `1.0` without an LLM call.
4. A normalized-text semantic cache is checked.
5. On a cache miss, `llmClient.ts` makes one Gemini Flash call using the schema
   in `llmSchema.ts`.
6. Successful results are cached; any LLM failure returns `null`.

Parsed activity, category, and tags are unioned into structured fields. Existing
structured fields always win because semantic parsing only adds values. The LLM
never ranks, performs time arithmetic, calculates distance, checks capacity,
authorizes a user, joins an event, or creates an event.

### 7.2 Time resolution

The match route accepts absolute ISO time directly. Relative phrases remain
available to the matching path and are resolved by `time/resolveTime.ts`.

Resolution order is:

1. use explicit `startTime` and derive `endTime` from configured activity
   duration when necessary;
2. ask `AvailabilityService` for the user's next available slot when no time
   was given;
3. fall back to now through the configured activity duration if availability
   lookup fails.

`time/timeScore.ts` scores overlapping windows by overlap divided by union. If
   windows do not overlap, the score decays linearly with the gap over the
   configured tolerance. Missing intent time is neutral at `0.5`.

### 7.3 Taxonomy similarity

`taxonomy/taxonomyGraph.ts` compares a requested activity with a candidate:

1. exact activity;
2. parent-child taxonomy relationship;
3. sibling or explicitly related activities;
4. same category;
5. unrelated or unknown.

The best similarity across all requested activity IDs is used. Unknown IDs
degrade to zero rather than throwing.

### 7.4 Location scoring

`location/locationService.ts` uses canonical campus locations from
`config/locations.json`. GPS coordinates are mapped to the nearest canonical
location with the Haversine distance formula. Pairwise compatibility uses the
best requested location and distance buckets:

- exact location: `1.0`;
- very nearby, within 150 m: `0.9`;
- nearby, within 500 m: `0.7`;
- same campus, within 2 km: `0.5`;
- beyond campus or unknown: `0.0`.

No selected location is neutral at `0.5`.

### 7.5 Candidate scoring

`scoring/scoreCandidate.ts` combines five deterministic sub-scores:

```text
total = 0.40 * activity
      + 0.25 * time
      + 0.20 * location
      + 0.10 * tags
      + 0.05 * eventQuality
```

`tagScore.ts` measures tag compatibility, and `eventQualityScore.ts` rewards
event quality factors such as available capacity and event state. The scoring
function is pure given its injected taxonomy, time, and location collaborators.

### 7.6 Read-only recommendation path

`recommendationService.ts` is structurally read-only and LLM-free:

1. Empty activity input returns no results.
2. A five-minute bucketed cache key is built from activities, locations, and
   tags.
3. Cached scored candidates are returned when present.
4. Otherwise, the repository retrieves at most 50 open, unexpired, non-full
   candidates.
5. Candidates are scored, sorted descending, limited to the top 10, and cached
   for 15 seconds.

`suggestActivities` ranks preferred activities first, then activities whose
taxonomy category matches profile interests, while selecting at most one
activity per category. It falls back to workout, coding, drawing, studying, and
coffee when the profile is unavailable. The result is deterministic and does
not require an LLM.

### 7.7 Authoritative match path

`matchingService.ts` executes this pipeline:

1. Claim a request idempotency key.
2. Merge semantic text into the normalized intent, if present.
3. Resolve the concrete time window.
4. Retrieve bounded open candidates.
5. Score and sort candidates descending.
6. Stop considering candidates below the `0.70` match threshold.
7. Attempt an atomic join on each qualifying candidate in order.
8. If a candidate was filled, closed, or expired during ranking, continue to
   the next candidate.
9. If no candidate can be joined, create a new open event with the requester as
   its first participant.

Created events have capacity four and expire two hours after creation. Their
title, activity, category, tags, location, duration, source text, host, and
vibe come from the resolved intent and the authoritative user profile.

The route then creates `Match` bookkeeping records for the other participants,
computes shared interests from profiles, and derives human-readable reasons
from the score breakdown.

## 8. Persistence, Consistency, and Failure Behavior

### MongoDB

`db/connection.ts` connects to `MONGODB_URI` when configured. Without it, the
development and test environment uses an in-process `mongodb-memory-server`.
Indexes are initialized at startup/best effort. `server.ts` seeds six named
demo students and five open events so a fresh run has resolvable match data.

`repository/mongoEventRepository.ts` stores events in the `events` collection
with Mongo `_id` mapped to the public event ID. Every read independently checks
`status`, `expiresAt > now`, and fullness where relevant; it does not rely on a
background expiry sweep.

### Atomic joining

`joinIfValid` is one `findOneAndUpdate`. Its filter simultaneously verifies:

- the event exists and is `OPEN`;
- it has not expired;
- it is not full;
- the user is not already a participant.

The update appends the participant and recomputes count, fullness, and status
from the current document. A follow-up read is used only to explain a failed
join as `NOT_FOUND`, `NOT_OPEN`, `EXPIRED`, `ALREADY_JOINED`, or `FULL`; it never
decides whether the mutation is allowed.

### Idempotency

`idempotency/idempotencyStore.ts` claims a key with one `insertOne` against the
unique Mongo `_id` index. A duplicate-key error means another request owns the
work; the duplicate caller polls for the stored result instead of running the
operation again. Failed work releases the claim for retry.

The matching service derives a fallback key from user and intent contents in a
one-minute bucket when the client supplies none. The match route wraps the full
HTTP side effect in a separate route-level idempotency key so retries,
double-taps, and React development double effects do not duplicate match rows.

### Cache and observability

`cache/cacheService.ts` and `cache/cacheKeys.ts` provide in-memory TTL caching
for semantic parses and recommendations. Semantic results live for 30 days;
recommendation results live for 15 seconds.

`observability/metricsService.ts` tracks LLM calls, cache hits, candidate
counts, recommendation latency, match scores/outcomes, and the LLM-per-request
ratio. Logging rules in the matching module require raw free text and full
profile records to stay out of logs; keys and inputs are hashed or truncated.

LLM failure is non-fatal. Structured input, synonym hits, and cached text work
without `GOOGLE_API_KEY`; novel free text falls back to structured fields and
can produce a `PENDING` event rather than an error.

`routes/debug.route.ts` exposes a read-only `/api/debug/database` snapshot in
non-production environments. It includes bounded views of the users, events,
matches, chat, feedback, connections, and idempotency collections. The web
route `/debug/database` renders those collections as a simple development
dashboard; production requests receive `404` from the API.

## 9. Configuration

`apps/api/src/config/index.ts` loads and validates JSON configuration at
startup. Configuration, rather than scoring code, is the tuning surface:

- `taxonomy.json`: canonical activities, categories, parents, and relationships.
- `synonyms.json`: deterministic free-text aliases.
- `durations.json`: activity durations and default duration.
- `locations.json`: canonical campus spots and coordinates.
- `weights.json`: scoring weights and taxonomy similarity values.
- `thresholds.json`: match threshold, candidate limits, cache TTLs, time
  tolerance, idempotency TTL, and location buckets.

The loader verifies that weights sum to one, scores and thresholds are bounded,
taxonomy references exist, and every taxonomy activity has a duration or a
default.

## 10. Synthetic Data and Seeding

`scripts/synthetic-data/generate_data.py` is a dependency-free Python generator
for synthetic users and activities. It can produce JSONL for `mongoimport` and
pretty JSON arrays for inspection. Generated locations cluster around weighted
Pittsburgh hotspots and generated interests/keywords share a controlled
vocabulary.

The generated vocabulary is intentionally independent from the matching
taxonomy. It provides realistic seed/demo volume and is not required for the
algorithm's controlled canonical IDs.

## 11. Testing and Operations

From the repository root:

```bash
npm install
npm run dev
npm run dev:api
npm run dev:web
npm test
npm run seed
npm run build
```

The backend tests live beside their modules under `apps/api/src/**/*.test.ts`.
They cover taxonomy, semantic normalization and parsing, time and location,
availability, profile access, scoring, repository behavior, matching,
recommendation, cache keys, and idempotency. The repository concurrency test
races joins at capacity-minus-one and asserts that exactly one succeeds.

The documented integration state reports 97 backend tests passing across 16
files and a manual browser flow through login, onboarding, home, coffee setup,
matching, results, invite, and chat.

## 12. Intentional Boundaries and Gaps

The following are deliberately outside this implementation:

- real CMU SSO or production authorization;
- real Google Calendar or SIO integration;
- push notifications;
- production deployment configuration;
- a real Gemini-key live-path check in the default demo;
- a real Atlas connection-path test;
- Discover filters and connection timestamps, which remain cosmetic or limited
  by the current `Match` contract.
- Production authentication/authorization for the debug dashboard; the
   dashboard is intentionally restricted to non-production environments.

These boundaries are product constraints, not accidental omissions. Changes to
the frozen shared contracts must update every importing workspace and all API
callers together.

## 13. Current Activity Experience

Onboarding is intentionally two steps: interests and vibes. Availability is
selected per activity rather than stored as a deprecated onboarding step.

Home is the intent entry surface. Its focused draft can include free text,
activity buttons, a relative/absolute time, and a canonical building. The map
uses Leaflet/OpenStreetMap and browser geolocation when permission is granted.
`apps/web/src/config/buildings.json` contains frontend building coordinates;
the API `config/locations.json` contains authoritative IDs, names, aliases,
and coordinates. The nearest building becomes selected, with CUC as fallback.
Natural-language aliases such as `CUC`, `Hunt`, and `Gates` are resolved
deterministically.

The activity lifecycle is explicitly view-first:

```text
activity card -> event details -> Back OR Join activity -> My Activities
```

`GET /api/activities` remains the open-event feed for recommendations.
`GET /api/activities/mine` returns events where the authenticated user is a
participant. The duplicate Discover/Activities tab is replaced by **My
Activities**; `/discover` redirects to `/activities`.

Joining uses one atomic repository operation. On success, the member is added
to the event and a durable `notifications` record is created for the host.
`GET /api/notifications` exposes those records to the host, and the web app
requests browser notification permission and displays the latest join event
when supported. This is a provider-ready boundary rather than a claim of
production Web Push delivery.

All user-facing activity time labels display event start only. Synthetic
activity generation emits `start_time` and `duration_minutes`; runtime event
records retain end time for matching calculations.