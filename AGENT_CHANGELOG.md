# Agent changelog

Every PR must add an entry here so Claude, Codex, and humans can see what
landed without reconstructing it from the diff.

Newest entries go at the top. Keep each entry short: intent, files, follow-ups.

## 2026-09-12 — Profile scroll

- Profile was a flex column whose last card (`overflow-hidden` settings)
  shrunk instead of overflowing, so Sign Out sat under the tab bar with
  nothing to scroll. Content now sizes naturally inside `feed-scroll`.
- Files: `apps/web/src/pages/Profile.tsx`, `apps/web/src/index.css`.

## 2026-09-12 — Created-event clarity, end times, and peer ratings

- When search creates an event, Match Results now says so plainly: new-event
  banner, host copy, and a start–end time so it doesn't look like a match.
- Events expose `startTime`/`endTime` and a start–end label. After start they
  leave Home/Discover/matching/join. My Activities still shows them so the
  group can chat, then rate after `endTime`.
- After an event ends, each participant rates every other participant 1–5
  (Uber-style). Averages show on Profile / person pages.
- Files: shared-types Activity/Student/API, event repository + tests,
  `peerRatingService`, activities/recommend routes, MatchResults/Meetup/
  Feedback/Activities/Profile/Home, `StarRating`.
- Follow-up: no reminder when rating opens; no minimum-rating threshold
  before a public average is shown.

## 2026-09-12 — Messages tab, activity group chat rooms, join-status fix, and email notification hooks

- Added a Messages tab (bottom nav) listing both 1:1 match conversations and
  activity group chat rooms. A match thread only appears once someone's
  actually sent a message in it (an accepted match with no messages yet
  stays off the list); an activity thread appears as soon as you've joined
  it, regardless of message history — joining is itself the deliberate act
  there, unlike a match, which can exist without you ever having chosen it.
- Added a group chat room per activity, reusing the existing chat
  infrastructure with `conversationId === eventId` rather than a new
  system. Access is now enforced server-side via `event.participantIds`
  (chat previously had no membership check at all — any authenticated user
  could read/post to any conversationId). A "💬 Group chat" button appears
  on the activity page once you're a participant; `Chat.tsx` shows the
  activity title/participant count and each message's sender name for
  group rooms, and is otherwise unchanged for the legacy 1:1 view.
- Fixed `Activity.status` ("open"/"joined"/"completed") — it used to
  reflect only whether the event was globally at capacity, not whether the
  viewer had actually joined, so "My Activities" showed "joined" by
  coincidence (whenever the event happened to fill up) rather than
  reflecting your own participation. Now viewer-aware.
- Added a "👑 Hosting" tag on activity cards so "My Activities" visually
  distinguishes activities you host from ones you merely joined.
- Added (console-logged, not yet wired to a real provider) email
  notifications: when your own match request actually pairs you into an
  event, and when someone joins an event you host — the latter path
  previously only fired for the manual "Join activity" button, never for
  the auto-join-through-matching path, which is the more common way people
  actually join activities.
- Files: `apps/web/src/pages/Messages.tsx` (new), `apps/web/src/pages/Chat.tsx`,
  `apps/web/src/components/ChatBubble.tsx`, `apps/web/src/pages/Meetup.tsx`,
  `apps/web/src/components/{TabBar,ActivityFeedCard}.tsx`,
  `apps/web/src/pages/Discover.tsx`, `apps/web/src/App.tsx`,
  `apps/api/src/routes/{chat,activities,match}.route.ts`,
  `apps/api/src/notifications/notificationService.ts`, `apps/api/src/server.ts`.
- Follow-up: email delivery is console-log-only for now (no provider
  configured — see `sendEmailNotification` in `notificationService.ts`);
  swap in Resend/SES/SMTP when ready, the (userId, subject, body) call
  sites won't need to change. Also worth revisiting: matching currently
  gives every activity type (including "coffee") a shared capacity of 4 —
  if a genuinely 1:1-only match type is wanted, that's a
  `matchingService.ts`/seed-template change, not yet done.

## 2026-09-12 — Hybrid merge: Carnegie visual system + Auth0/matching/intent + integrated Home/Discover

- Performed manual hybrid merge combining `origin/main` backend (Auth0 authentication, JWT verification, 2-question onboarding, matching algorithm and post-match event join logic, notifications, debug route, locations) with `yuxuan_changes_clean` visual language (Carnegie `#C41230` palette, stroke icon set in `Icons.tsx`, Newsreader + Source Sans 3 typography).
- Replaced the components under Home's search bar with the Discover layout (when-filter chips, location pills, category segmented tabs, `CampusHeatmap`, and an interactive feed of `ActivityFeedCard`s with click-through to `/meetup/:id`).
- Kept search bar & intent matching from main (free-text NLP extraction, location pills, time dropdown, activity button selection, live "Already happening" recommendations, and "Find people" matching action) styled with Carnegie tokens and stroke icons.
- Retained Auth0 + Google + Guest login on Welcome and Login screens with `hasCompletedOnboarding()` checks, `RequireAuth` route guards, and provider-aware logout in `Profile.tsx`.
- Files: `Home.tsx`, `Welcome.tsx`, `Login.tsx`, `Profile.tsx`, `OnboardingWizard.tsx`, `CampusHeatmap.tsx`, `ActivityButtonGrid.tsx`, `ActivityFeedCard.tsx`, `TrendingCard.tsx`, `TabBar.tsx`, `App.tsx`, `index.css`, `Icons.tsx`, `apps/api/`, `packages/shared-types/`.
- Follow-up: test full end-to-end interactive flows with a running dev server.

## 2026-09-12 — Equal-length Home / Discover shells

- Home always shows 8 activity tiles (suggestions first, then defaults) in a
  4×2 grid. Discover keeps filters + map fixed and scrolls the feed inside
  the phone shell so pages no longer grow with list length.
- Files: `ActivityButtonGrid.tsx`, `Home.tsx`, `Discover.tsx`, `index.css`,
  `Icons.tsx`
- Follow-up: other tab pages already inner-scroll; confirm they still fit
  the new fixed `100svh` shell.

## 2026-09-12 — Web Interface Guidelines fix list

- Skip link + `<main>`, theme-color, font preload, labeled search/chat inputs,
  focus rings restored (dropped `outline-none`), Discover URL state for
  when/category/q, keyboard hotspot list on the map, Activities tab → `/matches`.
- Files: `index.html`, `App.tsx`, `index.css`, `Discover.tsx`, `Chat.tsx`,
  `CampusHeatmap.tsx`, `TabBar.tsx`, `Welcome.tsx`, `MatchResults.tsx`,
  `ActivitySetup.tsx`, `Feedback.tsx`, `Home.tsx`
- Follow-up: remaining screens still use em dashes in copy not touched here.

## 2026-09-12 — Carnegie red / black / white visual system

- Light operate UI: Carnegie `#C41230` on warm white, tinted black type,
  Fraunces + Source Sans 3, stroke icons, press feedback. No tartan plaid.
- Files: `apps/web/src/index.css`, `index.html`, `Icons.tsx`, `Button.tsx`,
  `Card.tsx`, `TabBar.tsx`, `Welcome.tsx`, `Home.tsx`, `Discover.tsx`, `DESIGN.md`
- Follow-up: remaining screens still have some emoji in copy; tab “Activities”
  still routes to Discover.

## 2026-09-12 — Impeccable skill + type/click/zoom follow-through

- Installed `.cursor/skills/impeccable`. Fonts now apply to buttons, inputs, and
  map chrome (they previously fell back to system UI). Map +/- are branded
  pressable controls; clicks scale 0.95 with shadow.
- Files: `.cursor/skills/impeccable/`, `apps/web/src/index.css`, `CampusHeatmap.tsx`
- Follow-up: `/impeccable init` still needed for PRODUCT.md.

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

## 2026-09-12 — Matched event results and activity freshness

- Filtered expired/closed My Activities records, added now-plus-30-minute
  defaults, and replaced person-centric match results with event details and
  explicit join success state.
- Fixed free-text relative-time precedence, tightened building alias matching,
  requested Home geolocation on load, and removed capacity/spot copy in favor
  of `N going`.
- Files: matching availability/repository/routes, MatchResults/Home/heatmap,
  shared API contracts, README.md, SPEC.md, and tests.
- Follow-up: add browser-level coverage for permission-denied geolocation and
  the matched-event join flow.

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
