# Agent changelog

Every PR must add an entry here so Claude, Codex, and humans can see what
landed without reconstructing it from the diff.

Newest entries go at the top. Keep each entry short: intent, files, follow-ups.

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
