// libSQL (Turso) connection + schema + catalog seed.
//
// One database holds both the read-only catalog (seeded from the curated Discogs slice) and the
// mutable app state (shows, items, bids, orders). We use @libsql/client so the same code runs
// against a local SQLite file in dev (file: URL) and a hosted Turso database in production
// (libsql:// URL) — Vercel's filesystem is ephemeral, so production state must live off-box.
//
// getClient() memoizes a single connected, migrated, seeded client. The init runs once per
// process; a promise (not a resolved client) is cached so concurrent callers share one init.

import { createClient, type Client, type InStatement } from "@libsql/client"
import fs from "node:fs"
import path from "node:path"
import { CATALOG } from "./catalog-seed"
import type { CatalogResult, Release } from "./types"

const SCHEMA = `
CREATE TABLE IF NOT EXISTS masters (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  style TEXT
);
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  position TEXT,
  title TEXT,
  duration TEXT
);
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY,
  master_id INTEGER NOT NULL,
  year INTEGER,
  country TEXT,
  label TEXT,
  catno TEXT,
  format TEXT,
  price_low REAL,
  price_median REAL,
  price_high REAL
);
CREATE INDEX IF NOT EXISTS idx_releases_master ON releases(master_id);

CREATE TABLE IF NOT EXISTS shows (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  seller_name TEXT,
  title TEXT NOT NULL,
  scheduled_at TEXT,
  genre_tags TEXT,
  cover_seed TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  call_id TEXT,
  channel_id TEXT,
  created_at TEXT,
  started_at TEXT
);
CREATE TABLE IF NOT EXISTS rsvps (
  show_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (show_id, user_id)
);
CREATE TABLE IF NOT EXISTS show_items (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  release_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  media_grade TEXT,
  sleeve_grade TEXT,
  notes TEXT,
  sell_mode TEXT NOT NULL DEFAULT 'auction',
  starting_bid REAL DEFAULT 0,
  buy_now_price REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  current_bid REAL,
  high_bidder TEXT,
  high_bidder_name TEXT,
  ends_at INTEGER,
  winner TEXT,
  winner_name TEXT,
  final_price REAL,
  checked_out INTEGER NOT NULL DEFAULT 0,
  order_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_show ON show_items(show_id);
CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  amount REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bids_item ON bids(item_id);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  show_id TEXT NOT NULL,
  subtotal REAL,
  shipping REAL,
  platform_fee REAL,
  seller_payout REAL,
  total REAL,
  status TEXT,
  created_at TEXT
);
`

// Additive, idempotent migrations for DBs created before a column existed.
// CREATE TABLE IF NOT EXISTS never alters an existing table, so we patch columns here.
async function migrate(client: Client) {
  const cols = await client.execute("PRAGMA table_info(shows)")
  if (!cols.rows.some((c) => c.name === "started_at")) {
    await client.execute("ALTER TABLE shows ADD COLUMN started_at TEXT")
  }
}

async function seedCatalog(client: Client) {
  const count = await client.execute("SELECT COUNT(*) AS n FROM masters")
  if (Number(count.rows[0].n) > 0) return

  const stmts: InStatement[] = []
  let releaseId = 1
  CATALOG.forEach((m, i) => {
    const masterId = i + 1
    // INSERT OR IGNORE on fixed-PK rows so a concurrent cold-start seed can't hard-error.
    stmts.push({
      sql: "INSERT OR IGNORE INTO masters (id, title, artist, year, genre, style) VALUES (?, ?, ?, ?, ?, ?)",
      args: [masterId, m.title, m.artist, m.year, m.genre, m.style],
    })
    for (const [position, title, duration] of m.tracks) {
      stmts.push({
        sql: "INSERT INTO tracks (master_id, position, title, duration) VALUES (?, ?, ?, ?)",
        args: [masterId, position, title, duration],
      })
    }
    for (const p of m.pressings) {
      // Derive a plausible market spread from the anchor price (the dumps carry no prices).
      const low = Math.max(5, Math.round(p.price * 0.55))
      const high = Math.round(p.price * 1.8)
      stmts.push({
        sql: `INSERT OR IGNORE INTO releases (id, master_id, year, country, label, catno, format, price_low, price_median, price_high)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [releaseId++, masterId, p.year, p.country, p.label, p.catno, p.format, low, p.price, high],
      })
    }
  })

  // One atomic batch. A concurrent instance that already seeded will trip the PK guard above
  // (count > 0) or the OR IGNORE; either way we never end up with a half-seeded catalog.
  try {
    await client.batch(stmts, "write")
  } catch (err) {
    console.error("catalog seed failed (likely a concurrent seed already ran):", err)
  }
}

async function init(): Promise<Client> {
  // Treat an empty value as unset (e.g. someone copied .env.example verbatim) and fall back to
  // a local file so dev works with no Turso account.
  const url = process.env.TURSO_DATABASE_URL || "file:data/vinylstream.db"
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined
  if (url.startsWith("file:")) {
    // Ensure the parent dir exists for local file-backed dev databases.
    const filePath = url.slice("file:".length)
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true })
  }
  const client = createClient({ url, authToken })
  await client.executeMultiple(SCHEMA)
  await migrate(client)
  await seedCatalog(client)
  return client
}

// Cache the init *promise* (not the resolved client) so concurrent first-callers share one init.
let _client: Promise<Client> | null = null

export function getClient(): Promise<Client> {
  const g = globalThis as unknown as { __vinylClient?: Promise<Client> }
  if (g.__vinylClient) return g.__vinylClient
  if (_client) return _client
  _client = init()
  g.__vinylClient = _client
  return _client
}

// ---- Catalog queries (read-only) ----

const CATALOG_SELECT = `
  SELECT r.*, m.title AS title, m.artist AS artist, m.genre AS genre, m.style AS style, m.year AS master_year
  FROM releases r JOIN masters m ON m.id = r.master_id
`

export async function searchCatalog(query: string, limit = 30): Promise<CatalogResult[]> {
  const db = await getClient()
  const q = query.trim()
  if (!q) {
    const rs = await db.execute({
      sql: `${CATALOG_SELECT} ORDER BY r.price_median DESC LIMIT ?`,
      args: [limit],
    })
    return rs.rows as unknown as CatalogResult[]
  }
  const like = `%${q}%`
  const rs = await db.execute({
    sql: `${CATALOG_SELECT}
       WHERE m.title LIKE ? OR m.artist LIKE ? OR r.catno LIKE ? OR m.genre LIKE ?
       ORDER BY
         CASE WHEN m.title LIKE ? OR m.artist LIKE ? THEN 0 ELSE 1 END,
         r.price_median DESC
       LIMIT ?`,
    args: [like, like, like, like, like, like, limit],
  })
  return rs.rows as unknown as CatalogResult[]
}

export async function getCatalogRelease(id: number): Promise<CatalogResult | undefined> {
  const db = await getClient()
  const rs = await db.execute({ sql: `${CATALOG_SELECT} WHERE r.id = ?`, args: [id] })
  return rs.rows[0] as unknown as CatalogResult | undefined
}

export async function getReleaseRaw(id: number): Promise<Release | undefined> {
  const db = await getClient()
  const rs = await db.execute({ sql: "SELECT * FROM releases WHERE id = ?", args: [id] })
  return rs.rows[0] as unknown as Release | undefined
}

export async function getTracksForRelease(releaseId: number) {
  const db = await getClient()
  const rel = await getReleaseRaw(releaseId)
  if (!rel) return []
  const rs = await db.execute({
    sql: "SELECT position, title, duration FROM tracks WHERE master_id = ? ORDER BY id",
    args: [rel.master_id],
  })
  return rs.rows as unknown as { position: string; title: string; duration: string }[]
}

export async function catalogStats() {
  const db = await getClient()
  const masters = await db.execute("SELECT COUNT(*) AS n FROM masters")
  const releases = await db.execute("SELECT COUNT(*) AS n FROM releases")
  return { masters: Number(masters.rows[0].n), releases: Number(releases.rows[0].n) }
}
