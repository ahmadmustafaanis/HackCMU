# apps/web

React + Vite + TypeScript + Tailwind CSS. Mobile-first: design for a
~390-430px wide viewport, centered with a max-width card on wider screens
(see `src/index.css` / Tailwind config for the container pattern).

## Structure

- `src/pages/` — one component per screen (see the plan's screen map: Welcome, Login, onboarding wizard, Home, Activity Setup, Matching, Match Results, Person, Chat, Meetup, Feedback, Success, Discover, Connections, Profile).
- `src/components/` — shared UI (Card, Button, ActivityButtonGrid, PersonCard, ChatBubble, TabBar, CampusHeatmap).
  `CampusHeatmap` uses Leaflet + OpenStreetMap (no paid map key).
- `src/api/client.ts` — typed fetch wrapper against `apps/api`, using the exact request/response types from `shared-types/src/api.ts`. Don't hand-rewrite response shapes — import the types.
- `src/state/` — session/user context (demo auth token, current draft intent while building an activity request).

## Visual language (from the mockup)

Deep maroon/cardinal primary color, rounded cards, a paw-print mark, a
bottom tab bar (Home / Discover / Activities / Connections / Profile).
Faithfully match palette, layout structure, iconography, and flow — this is
not required to be a pixel-accurate reproduction of the mockup file.

## Conventions

- All API calls go through `src/api/client.ts`; components don't call `fetch` directly.
- Real sign-in options are Google (`GoogleSignInButton` → `POST /api/auth/google`) and Auth0 (`Auth0SignInButton` → `POST /api/auth/auth0`, via `@auth0/auth0-react`'s `Auth0Provider` in `main.tsx`); `POST /api/auth/demo-login` ("Continue as Guest") is kept for local dev without either configured. All three return the same `{ student, sessionToken }` shape, stored by `state/session.tsx`.
- Every route except `/` (Welcome) and `/login` is wrapped in `components/RequireAuth.tsx` (see `App.tsx`), which redirects to `/` when there's no verified session — add new authenticated pages inside that `<Route>` group, not alongside it.
