# Scotty's Circle

Scotty's Circle helps CMU students turn an activity idea into a small,
compatible in-person meetup.

## Structure

- `apps/web` - React/Vite frontend with Home, My Activities, event details,
  chat, profile, and onboarding screens.
- `apps/api` - Express API, MongoDB persistence, authentication, deterministic
  matching, recommendations, and notifications.
- `packages/shared-types` - shared domain and REST contracts.
- `scripts/synthetic-data` - dependency-free synthetic users/activity generator.

## Run Locally

```bash
npm install
npm run dev
```

The API runs on port 4000 and the Vite app runs on its normal development port.
Without `MONGODB_URI`, the API uses `mongodb-memory-server`. Set
`SESSION_JWT_SECRET` in `apps/api/.env` for a real local session secret. Google
and Gemini integrations are optional for local development.

Useful commands:

```bash
npm test
npm run build
npm run seed
```

## Product Flow

1. Sign in with Google or use demo login.
2. Complete the two-step onboarding flow: interests and vibes.
3. Focus the Home intent field, optionally choose an activity, time, and
   building, then view read-only recommendations.
4. Select an event to view details. Viewing never joins the event.
5. Choose **Join activity** to atomically join it. The event then appears in
   **My Activities**, and the host receives a notification record.

Relative phrases such as `treadmill in 10 mins at CUC` are extracted
before semantic parsing. Time and building aliases are deterministic; the LLM
is reserved for novel activity meaning.

## Developer Dashboard

In non-production environments, `/debug/database` displays bounded snapshots of
Mongo collections for debugging. It is read-only and intentionally disabled by
the API in production.
