# Hot Tracks V3

Hot Tracks V3 is a Next.js race-operations app for die-cast and small-track tournament management. It currently covers event setup, racer and car management, track builder flows, bracket generation, live match operations, results, championship standings, awards, and a mobile-first admin shell.

## Current Scope

- Driver and car management with expandable maintenance views
- Track builder and event/tournament setup
- Event roster management, seeding, and bracket generation
- Match timing entry and automatic winner calculation from elapsed times
- Event placements, championship standings, and awards views
- Email/password sign-in plus participant self-signup
- Light and dark theme options stored locally
- Optional photo-based car identification using the OpenAI Responses API

## Tech Stack

- Next.js 15 App Router
- TypeScript
- Local JSON-backed state in `data/phase1-state.json`
- Server Actions for mutations

## Environment

Copy the values from `.env.example` into `.env.local` and replace placeholders before running the app.

Required for secure sessions in production:

```env
SESSION_SECRET=replace_with_a_long_random_secret
```

Optional AI car identification:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_CAR_IDENTIFY_MODEL=gpt-5.4
```

Notes:

- `SESSION_SECRET` should be at least 16 characters.
- In development, the app falls back to a dev-only session secret if `SESSION_SECRET` is missing.
- `OPENAI_API_KEY` is only needed if you want `Identify From Photo`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

If a port is already busy during local review, start Next on another port, for example:

```bash
PORT=3003 NEXT_DISABLE_WEBPACK_CACHE=1 npm run dev
```

Production build check:

```bash
npm run build
```

## Security Notes

- Sessions are now signed before being stored in `hot_tracks_session`.
- The car photo identification route requires an authenticated `admin` or `host`.
- The car-identify route has a basic per-user rate limit.
- Existing cookies from older unsigned-session builds should be treated as invalid; sign in again after pulling newer changes.

## Repository Layout

- `app/`: App Router pages, layouts, API routes, and server actions
- `components/`: shared UI building blocks
- `lib/`: auth, state repository, domain operations, and view-model helpers
- `data/phase1-state.json`: mutable local state file used by the current app
- `phase_1_*.md`: planning, backlog, and reference docs from the Phase 1 buildout

## Known Limits

- Persistence is still file-backed, not database-backed
- Concurrent writes can still race because the app does not yet use a transactional data store
- Auth throttling and asynchronous password hashing are still future hardening work

