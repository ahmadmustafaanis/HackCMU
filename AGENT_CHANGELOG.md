# Agent changelog

Every PR must add an entry here so Claude, Codex, and humans can see what
landed without reconstructing it from the diff.

Newest entries go at the top. Keep each entry short: intent, files, follow-ups.

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
