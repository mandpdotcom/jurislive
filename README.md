# VinylStream — Live Shopping Demo

A live shopping app for vinyl records, in the style of Whatnot, built with **[Stream Video](https://getstream.io/video/)** and **[Stream Chat](https://getstream.io/chat/)** on Next.js. Sellers go live, run a crate of records as timed auctions or buy-it-now listings, and buyers bid in real time while watching the stream.

It's a compact, readable reference for wiring Stream's livestream + chat SDKs into a real transactional flow: **auction state is server-authoritative** and broadcast to viewers as custom events on the show's chat channel — "bids ride the same realtime channel as chat" — while the server stays the single source of truth.

## What it demonstrates

- **Stream Video** livestreaming — a seller hosts, viewers watch a low-latency stream.
- **Stream Chat** — live chat per show, plus a custom-event channel that carries authoritative auction updates (current bid, sold, show ended).
- **Server-authoritative auctions** — bidding, anti-snipe clock extension, buy-it-now, and finalization all run in the backend (`lib/store.ts`), never trusting the client.
- **A realistic catalog** — listings are bound to specific Discogs pressings (master → release), so the demo data mirrors a production Discogs ETL (see `scripts/etl-discogs.ts`).
- **A safe public sandbox** — every visitor gets their own isolated sandbox (see below).

## Tech stack

- Next.js (App Router) + React + TypeScript + Tailwind
- Stream Video & Stream Chat (React SDKs on the client, Node SDK on the server)
- libSQL / [Turso](https://turso.tech) for storage (a local SQLite file in dev; hosted in production)

## Getting started

### 1. Prerequisites

- Node.js 20+
- A free [Stream](https://getstream.io) account (for the API key + secret)

### 2. Configure environment

Copy the example and fill in your Stream credentials:

```bash
cp .env.example .env
```

```ini
STREAM_API_KEY=your_key
STREAM_API_SECRET=your_secret
```

For **local development you can leave the Turso variables unset** — the app falls back to a local SQLite file at `data/vinylstream.db`, created and seeded automatically on first run.

### 3. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign in with any display name, then either browse the seeded shows or host your own.

> **Tip:** every browser tab is an independent user, so you can play seller in one tab and buyer in another to see the live auction flow end to end.

## How it works

- **`lib/db.ts`** — libSQL connection, schema, and catalog seed. One `getClient()` serves both the read-only catalog and mutable app state.
- **`lib/store.ts`** — the data layer and the auction engine. All bidding/checkout logic lives here and runs inside transactions.
- **`lib/stream-server.ts`** — server-side Stream clients; mints tokens and broadcasts auction events onto each show's chat channel.
- **`app/api/*`** — thin route handlers that validate input, call the store, and broadcast.
- **`app/watch`, `app/seller`, `app/shows`** — the viewer, seller console, and show pages.

### Per-visitor sandbox

Because this is a public demo, each visitor is isolated. On first visit, a Next.js proxy (`proxy.ts`) sets an anonymous `sb_<random>` cookie — a **tenant**. Shows are stored against that tenant and only ever listed back to it, and user identities are namespaced (`<tenant>__<name>`), so two visitors who both pick "DJ" can neither see each other's shows nor collide. Display names and show titles are run through a light profanity filter, show creation is rate-limited, and a daily cron prunes sandboxes older than 24h.

## Deploying to Vercel

The local SQLite file won't persist on Vercel's ephemeral filesystem, so production uses a hosted libSQL database (Turso). No code changes — just environment variables.

1. Create a Turso database and grab its credentials:

   ```bash
   turso db create vinylstream
   turso db show vinylstream --url      # -> libsql://vinylstream-<org>.turso.io
   turso db tokens create vinylstream   # -> auth token
   ```

2. Set these environment variables in your Vercel project:

   | Variable | Purpose |
   |---|---|
   | `STREAM_API_KEY` / `STREAM_API_SECRET` | Stream credentials |
   | `TURSO_DATABASE_URL` | `libsql://…` database URL |
   | `TURSO_AUTH_TOKEN` | Turso auth token |
   | `CRON_SECRET` | Bearer secret for the cleanup cron (`openssl rand -hex 32`) |

3. Deploy. The schema and catalog seed run automatically on first request, and the daily sandbox-cleanup cron is wired via `vercel.json`.

> The cleanup cron is scheduled daily to fit Vercel's Hobby tier; bump the frequency in `vercel.json` on Pro if you want tighter cleanup.

## Project layout

```
app/            Next.js routes (pages + API handlers)
components/     UI components (incl. shadcn/ui in components/ui)
lib/            data layer, auction engine, Stream server, tenant isolation
scripts/        illustrative Discogs ETL (production catalog path)
docs/           concept write-up
```

See [`docs/vinylstream-concept.md`](docs/vinylstream-concept.md) for the product concept behind the demo.

## License

MIT — see [LICENSE](LICENSE).
