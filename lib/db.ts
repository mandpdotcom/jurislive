// SQLite connection + schema + catalog seed.
//
// One file holds both the read-only catalog (seeded from the curated Discogs slice) and the
// mutable app state (shows, items, bids, orders). better-sqlite3 is synchronous, which suits
// Next.js route handlers. A global singleton avoids reopening the DB / re-running the schema
// on every hot reload in dev.

import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import { CATALOG } from "./catalog-seed"
import type { CatalogResult, Release } from "./types"

const DB_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DB_DIR, "vinylstream.db")

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
function migrate(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(shows)").all() as { name: string }[]
  if (!cols.some((c) => c.name === "started_at")) {
    db.exec("ALTER TABLE shows ADD COLUMN started_at TEXT")
  }
}

function seedCatalog(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM masters").get() as { n: number }).n
  if (count > 0) return

  const insMaster = db.prepare(
    "INSERT INTO masters (id, title, artist, year, genre, style) VALUES (?, ?, ?, ?, ?, ?)",
  )
  const insTrack = db.prepare(
    "INSERT INTO tracks (master_id, position, title, duration) VALUES (?, ?, ?, ?)",
  )
  const insRelease = db.prepare(
    `INSERT INTO releases (id, master_id, year, country, label, catno, format, price_low, price_median, price_high)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const seed = db.transaction(() => {
    let releaseId = 1
    CATALOG.forEach((m, i) => {
      const masterId = i + 1
      insMaster.run(masterId, m.title, m.artist, m.year, m.genre, m.style)
      for (const [position, title, duration] of m.tracks) {
        insTrack.run(masterId, position, title, duration)
      }
      for (const p of m.pressings) {
        // Derive a plausible market spread from the anchor price (the dumps carry no prices).
        const low = Math.max(5, Math.round(p.price * 0.55))
        const high = Math.round(p.price * 1.8)
        insRelease.run(
          releaseId++,
          masterId,
          p.year,
          p.country,
          p.label,
          p.catno,
          p.format,
          low,
          p.price,
          high,
        )
      }
    })
  })
  seed()
}

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  const g = globalThis as unknown as { __vinylDb?: Database.Database }
  if (g.__vinylDb) return g.__vinylDb
  if (_db) return _db

  fs.mkdirSync(DB_DIR, { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.exec(SCHEMA)
  migrate(db)
  seedCatalog(db)

  _db = db
  g.__vinylDb = db
  return db
}

// ---- Catalog queries (read-only) ----

const CATALOG_SELECT = `
  SELECT r.*, m.title AS title, m.artist AS artist, m.genre AS genre, m.style AS style, m.year AS master_year
  FROM releases r JOIN masters m ON m.id = r.master_id
`

export function searchCatalog(query: string, limit = 30): CatalogResult[] {
  const db = getDb()
  const q = query.trim()
  if (!q) {
    return db
      .prepare(`${CATALOG_SELECT} ORDER BY r.price_median DESC LIMIT ?`)
      .all(limit) as CatalogResult[]
  }
  const like = `%${q}%`
  return db
    .prepare(
      `${CATALOG_SELECT}
       WHERE m.title LIKE ? OR m.artist LIKE ? OR r.catno LIKE ? OR m.genre LIKE ?
       ORDER BY
         CASE WHEN m.title LIKE ? OR m.artist LIKE ? THEN 0 ELSE 1 END,
         r.price_median DESC
       LIMIT ?`,
    )
    .all(like, like, like, like, like, like, limit) as CatalogResult[]
}

export function getCatalogRelease(id: number): CatalogResult | undefined {
  const db = getDb()
  return db.prepare(`${CATALOG_SELECT} WHERE r.id = ?`).get(id) as CatalogResult | undefined
}

export function getReleaseRaw(id: number): Release | undefined {
  return getDb().prepare("SELECT * FROM releases WHERE id = ?").get(id) as Release | undefined
}

export function getTracksForRelease(releaseId: number) {
  const db = getDb()
  const rel = getReleaseRaw(releaseId)
  if (!rel) return []
  return db
    .prepare("SELECT position, title, duration FROM tracks WHERE master_id = ? ORDER BY id")
    .all(rel.master_id) as { position: string; title: string; duration: string }[]
}

export function catalogStats() {
  const db = getDb()
  const masters = (db.prepare("SELECT COUNT(*) AS n FROM masters").get() as { n: number }).n
  const releases = (db.prepare("SELECT COUNT(*) AS n FROM releases").get() as { n: number }).n
  return { masters, releases }
}
