Generate Drizzle migration
```
npx drizzle-kit generate
```

Running Drizzle Migrations
```
 npx drizzle-kit push --config=./drizzle.config.ts
```

## Garmin Sync API Endpoint

`/api/sync/garmin` triggers the Garmin activities sync (`src/services/garmin/sync.ts`). It is designed to be called by a Vercel cron job (see `vercel.json`, currently hourly) and supports both `GET` and `POST`.

### Authentication

The request must present the shared secret from the `CRON_SECRET` environment variable, either as a header or query string:

```bash
# Header (recommended)
curl -X POST https://<your-app>.vercel.app/api/sync/garmin \
  -H "Authorization: Bearer $CRON_SECRET"

# Query string (note: query strings can appear in logs, prefer the header)
curl "https://<your-app>.vercel.app/api/sync/garmin?token=$CRON_SECRET"
```

Generate a strong secret with: `openssl rand -hex 32`

### Date range

The sync accepts optional `startDate` and `endDate` query parameters (`YYYY-MM-DD`, both inclusive) that are forwarded to the Garmin activity search API:

```bash
curl "https://<your-app>.vercel.app/api/sync/garmin?token=$CRON_SECRET&startDate=2026-11-13&endDate=2026-11-14"
```

When omitted, they default to **the previous day and the current day** in the user's timezone (see `TIMEZONE` below), so an hourly cron picks up yesterday's completed activities plus today's in-progress ones. Malformed dates (or `startDate` after `endDate`) return `400`.

### Environment variables

| Variable | Purpose |
| :--- | :--- |
| `CRON_SECRET` | Shared secret required to call the sync endpoint. If unset, the endpoint refuses all requests (503). |
| `GARMIN_API_KEY` | Garmin Personal API key, used to obtain an access token. |
| `DATABASE_URL` | Neon/Postgres connection string. |
| `TIMEZONE` | IANA timezone of the user (e.g. `America/Chicago`). Used to compute the default date range — Vercel functions run on UTC, so set this or "today" will be wrong for part of every day. Falls back to the system timezone when unset. |

Set these in `.env.local` for local development and in the Vercel project settings for production.

### Single-flight behavior

Only one sync can run at a time, enforced by a row in the `sync_locks` table (Postgres), which works across serverless function instances:

- `200` — sync ran; response includes `fetched` and `synced` activity counts.
- `400` — malformed `startDate`/`endDate`.
- `401` — missing or invalid secret.
- `409` — a sync is already in progress (includes `Retry-After: 60`).
- `503` — `CRON_SECRET` not configured, or the lock state could not be checked.
- `500` — the sync itself failed (details in the response and function logs).

If a function crashes or hits Vercel's timeout mid-sync, its lock expires after 10 minutes and the next cron run re-claims it. If your sync regularly takes longer than Vercel's default function timeout, raise `maxDuration` for the route (e.g. in Vercel project settings or a `functions` entry in `vercel.json`).