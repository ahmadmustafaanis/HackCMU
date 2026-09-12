# Agent changelog

Every PR must add an entry here so Claude, Codex, and humans can see what
landed without reconstructing it from the diff.

Newest entries go at the top. Keep each entry short: intent, files, follow-ups.

## 2026-09-12 — Auth0 sign-in, route guards, and returning-user/logout fixes

- Added Auth0 as a third real sign-in option alongside Google/Guest, using
  `loginWithRedirect()` (not popup — auth0-react's popup path lacks the
  double-invoke protection the redirect path has, which under React
  StrictMode left the ID token uncached after a real login). New
  `POST /api/auth/auth0` verifies the ID token against the tenant's JWKS,
  mirroring the existing Google flow.
- Every route except `/` and `/login` now requires a verified session
  (`RequireAuth`), redirecting signed-out visitors to Welcome instead of
  rendering with a null student.
- Fixed two related bugs surfaced during manual testing: (1) all three
  sign-in paths always routed to `/onboarding` regardless of whether the
  account already had saved interests/vibes — now checked via
  `hasCompletedOnboarding()`; (2) "Reset Demo" only cleared our own app
  session, never Auth0's SSO cookie, so a later Auth0 sign-in could silently
  re-authenticate — fixed by tracking which provider signed the user in
  (`session.tsx`'s new `provider` field) rather than trusting
  `useAuth0().isAuthenticated`, which resets across a full reload whenever
  this tenant's silent re-auth check needs consent it can't get silently.
- Files: `apps/api/src/auth/auth0Auth.ts`, `apps/api/src/routes/auth.route.ts`,
  `apps/web/src/components/{Auth0SignInButton,RequireAuth}.tsx`,
  `apps/web/src/lib/onboarding.ts`, `apps/web/src/state/session.tsx`,
  `apps/web/src/pages/{Welcome,Login,Profile}.tsx`, `apps/web/src/main.tsx`,
  `apps/web/src/App.tsx`.
- Env vars: `AUTH0_DOMAIN`/`AUTH0_CLIENT_ID` (api) and
  `VITE_AUTH0_DOMAIN`/`VITE_AUTH0_CLIENT_ID` (web) — see `.env.example` in
  each app.
- Follow-up: this Auth0 tenant doesn't skip user consent for first-party
  apps, so every interactive Auth0 login re-shows the "Authorize App"
  screen; toggle "Skip User Consent" in the Auth0 dashboard's Advanced
  Settings if that's undesired for the demo.

## 2026-09-12 — Intent, location, activity lifecycle, and notifications

- Removed the deprecated onboarding availability step; added deterministic
  extraction for relative times and building aliases, including
  `treadmill in 10 mins at CUC`.
- Added configurable building coordinates, nearest-building map selection,
  explicit view-versus-join details, My Activities, start-only labels, durable
  host notifications, and synthetic start-time generation.
- Files: matching intent/config/routes, notifications, Home/Meetup/Discover/
  CampusHeatmap, shared API contracts, `README.md`, `SPEC.md`, and
  `match_spec.md`.
- Follow-up: replace browser polling with a production Web Push provider and
  add browser tests for geolocation permission flows.

## 2026-09-12 — Real OpenStreetMap under the campus heatmap

- Replaced the abstract SVG blobs with Leaflet + OSM tiles so Discover/Home
  show actual campus streets. Activity density is a `leaflet.heat` overlay;
  tapping a building still filters. “Show my location” uses the browser
  Geolocation API (no Mapbox/Google key).
- Files: `apps/web/package.json` (`leaflet`, `react-leaflet`, `leaflet.heat`),
  `CampusHeatmap.tsx`, `index.css`, `Home.tsx`
- Follow-up: geolocation needs user permission; off-campus users stay framed
  on CMU until they recenter.

## 2026-09-12 — Interactive campus heatmap on Discover / Home trending

- Discover and Home now plot open events as an SVG campus heatmap. Tapping a
  hot spot filters Discover (and Home navigates to `/discover?location=`).
  Blob size/color follow how many people have joined at that location.
- `Activity` gained optional `locationId` / `lat` / `lng`; `GET /api/activities`
  fills them from `locations.json`. No map SDK or API key.
- Files: `packages/shared-types/src/domain.ts`, `apps/api/src/routes/activities.route.ts`,
  `apps/web/src/components/CampusHeatmap.tsx`, `Discover.tsx`, `Home.tsx`,
  `ActivityFeedCard.tsx`
- Follow-up: heat is event-based, not live GPS; walking times are still the
  placeholder 5 min.

## 2026-09-12 — Agent changelog + Discover heatmap tracking

- Added this changelog, a PR template, `AGENTS.md`, and a Cursor rule so
  later PRs record what changed.
- Opened [#4](https://github.com/ahmadmustafaanis/HackCMU/issues/4) + branch
  `feat/discover-heatmap` for an interactive campus heatmap on Discover /
  Home trending. Heatmap UI is not implemented yet.
- Files: `AGENT_CHANGELOG.md`, `AGENTS.md`, `.github/PULL_REQUEST_TEMPLATE.md`,
  `.cursor/rules/agent-changelog.mdc`, `CLAUDE.md`, `TODOs.md`, `SPEC.md`
- Follow-up: implement heatmap on `feat/discover-heatmap` (see issue).
