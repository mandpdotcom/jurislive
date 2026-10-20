import { createClient, type Client, type Transaction } from "@libsql/client"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { studies, sales, lots } from "./fixtures"

// Additive namespace: upstream tables and any existing data are never dropped or altered.
export const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS jl_studies (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, city TEXT NOT NULL,
 initials TEXT NOT NULL, color TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jl_sales (
 id TEXT PRIMARY KEY, study_id TEXT NOT NULL REFERENCES jl_studies(id), title TEXT NOT NULL,
 category TEXT NOT NULL, city TEXT NOT NULL, image TEXT NOT NULL, scheduled_label TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('ready','live','paused','ended'))
);
CREATE TABLE IF NOT EXISTS jl_lots (
 id TEXT PRIMARY KEY, sale_id TEXT NOT NULL REFERENCES jl_sales(id), study_id TEXT NOT NULL REFERENCES jl_studies(id),
 number INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, image TEXT NOT NULL,
 estimate_low INTEGER NOT NULL, estimate_high INTEGER NOT NULL, starting_cents INTEGER NOT NULL CHECK(starting_cents>0),
 increment_cents INTEGER NOT NULL CHECK(increment_cents>0), current_cents INTEGER, high_bidder TEXT,
 status TEXT NOT NULL CHECK(status IN ('queued','live','closed')), ends_at INTEGER, version INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS jl_one_live_lot ON jl_lots(sale_id) WHERE status='live';
CREATE INDEX IF NOT EXISTS jl_lots_sale ON jl_lots(sale_id,study_id);
CREATE TABLE IF NOT EXISTS jl_sessions (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK(role IN ('buyer','auctioneer')),
 study_id TEXT REFERENCES jl_studies(id), name TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS jl_bids (
 id TEXT PRIMARY KEY, lot_id TEXT NOT NULL REFERENCES jl_lots(id), sale_id TEXT NOT NULL, study_id TEXT NOT NULL,
 session_id TEXT NOT NULL REFERENCES jl_sessions(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 alias TEXT NOT NULL, created_at INTEGER NOT NULL, request_id TEXT NOT NULL, UNIQUE(session_id,request_id)
);
CREATE INDEX IF NOT EXISTS jl_bids_sale ON jl_bids(sale_id,created_at);
CREATE TABLE IF NOT EXISTS jl_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, study_id TEXT NOT NULL, actor TEXT NOT NULL,
 action TEXT NOT NULL, entity TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL,
 prev_hash TEXT NOT NULL, hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jl_audit_study ON jl_audit(study_id,id);
CREATE TRIGGER IF NOT EXISTS jl_audit_no_update BEFORE UPDATE ON jl_audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
CREATE TRIGGER IF NOT EXISTS jl_audit_no_delete BEFORE DELETE ON jl_audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
`
async function init(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || process.env.JURISLIVE_LOCAL_DB || "file:data/jurislive.db"
  if (process.env.VERCEL && (!process.env.TURSO_DATABASE_URL || url.startsWith("file:"))) {
    throw new Error("TURSO_REQUIRED")
  }
  if (url.startsWith("file:")) mkdirSync(dirname(resolve(url.slice(5))), { recursive: true })
  const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined })
  if (url.startsWith("file:")) await db.executeMultiple("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")
  await db.executeMultiple(SCHEMA)
  await db.batch([
    ...studies.map(s => ({ sql: "INSERT OR IGNORE INTO jl_studies(id,slug,name,city,initials,color,description) VALUES(?,?,?,?,?,?,?)", args: [s.id,s.slug,s.name,s.city,s.initials,s.color,s.description] })),
    ...sales.map(s => ({ sql: "INSERT OR IGNORE INTO jl_sales(id,study_id,title,category,city,image,scheduled_label,status) VALUES(?,?,?,?,?,?,?,?)", args: [s.id,s.study_id,s.title,s.category,s.city,s.image,s.scheduled_label,s.status] })),
    ...lots.map(l => ({ sql: "INSERT OR IGNORE INTO jl_lots(id,sale_id,study_id,number,title,description,image,estimate_low,estimate_high,starting_cents,increment_cents,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", args: [l.id,l.sale_id,l.study_id,l.number,l.title,l.description,l.image,l.estimate_low,l.estimate_high,l.starting_cents,l.increment_cents,l.status] })),
  ], "write")
  return db
}
let client: Promise<Client> | undefined
export function getDB() { return client ??= init().catch(e => { client = undefined; throw e }) }
// Local libSQL's synchronous SQLite driver must not begin a second writer while the
// first async transaction is suspended. Queue per process; the DB transaction remains
// the correctness boundary across Vercel instances (a JS mutex alone is NOT sufficient).
let writer: Promise<void> = Promise.resolve()
export async function transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const previous = writer
  let release!: () => void
  writer = new Promise<void>(resolve => { release = resolve })
  await previous
  try {
    const tx = await (await getDB()).transaction("write")
    try { const result = await fn(tx); await tx.commit(); return result }
    catch (e) { await tx.rollback().catch(() => {}); throw e }
    finally { tx.close() }
  } finally { release() }
}
