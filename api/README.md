# EmberRoot API

Cloudflare Worker API backed by D1 with a Durable Object WebSocket hub.

## Local setup

```txt
pnpm install
pnpm exec wrangler d1 migrations apply emberroot --local
pnpm dev
```

The development admin account is `admin` / `admin`. Before deployment, set
`AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `INGEST_API_KEY` as
Cloudflare secrets. Do not use the defaults outside local development.

## First remote deployment

```txt
pnpm exec wrangler d1 create emberroot
# Copy the returned database_id into wrangler.jsonc.
pnpm exec wrangler d1 migrations apply emberroot --remote
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put ADMIN_PASSWORD
pnpm exec wrangler secret put INGEST_API_KEY
pnpm deploy
```

Set `PUBLIC_API_BASE_URL` in the frontend deployment to the deployed Worker URL.
MQTT brokers should send telemetry to `POST /api/ingest/mqtt` with an
`X-API-Key` header; this is preferable to a long-lived MQTT TCP client inside a Worker.
