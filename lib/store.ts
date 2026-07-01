// App-state data layer: shows, run-order items, the server-authoritative auction engine,
// cart, and (mocked) checkout. All auction state lives here on the server — clients send
// intents and read state back; the video stream and chat channel never hold the source of truth.

import type { Client, InArgs, Transaction } from "@libsql/client"
import { getClient } from "./db"
import type { Order, SellMode, Show, ShowItem } from "./types"

export const AUCTION_SECONDS = 30
// Demo safeguard: a show that never gets explicitly ended (host just closes the tab)
// stops being treated as live this long after it started, so stale live shows disappear.
export const MAX_LIVE_MINUTES = 120
const EXTEND_WINDOW_MS = 10_000 // anti-snipe: a late bid bumps the clock back up to this
const PLATFORM_FEE_RATE = 0.1 // 10% marketplace commission (Stripe Connect destination-charge shape)
const SHIPPING_FLAT = 6

// A query runs against either the pooled client or an open interactive transaction; helpers take
// a DB so the same read can serve a plain lookup or a step inside a multi-statement transaction.
type DB = Client | Transaction

async function one<T>(db: DB, sql: string, args: InArgs = []): Promise<T | undefined> {
  const rs = await db.execute({ sql, args })
  return rs.rows[0] as T | undefined
}
async function many<T>(db: DB, sql: string, args: InArgs = []): Promise<T[]> {
  const rs = await db.execute({ sql, args })
  return rs.rows as unknown as T[]
}
async function run(db: DB, sql: string, args: InArgs = []): Promise<void> {
  await db.execute({ sql, args })
}

// Run body inside a write transaction, committing on success and rolling back on throw.
async function tx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  const t = await (await getClient()).transaction("write")
  try {
    const result = await fn(t)
    await t.commit()
    return result
  } catch (err) {
    await t.rollback().catch(() => {})
    throw err
  } finally {
    t.close()
  }
}

export function bidIncrement(current: number): number {
  if (current < 50) return 1
  if (current < 200) return 5
  return 10
}

function newId(prefix: string): string {
  // Avoid Math.random reproducibility constraints elsewhere; this runs only on the server at request time.
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

const ITEM_SELECT = `
  SELECT si.*, m.title AS title, m.artist AS artist, m.genre AS genre,
         r.year AS release_year, r.country, r.label, r.catno, r.format,
         r.price_low, r.price_median, r.price_high
  FROM show_items si
  JOIN releases r ON r.id = si.release_id
  JOIN masters m ON m.id = r.master_id
`

// ---- Shows ----

export async function createShow(input: {
  tenant_id: string
  seller_id: string
  seller_name: string
  title: string
  scheduled_at: string
  genre_tags: string
}): Promise<Show> {
  const db = await getClient()
  const id = newId("show")
  await run(
    db,
    `INSERT INTO shows (id, seller_id, seller_name, title, scheduled_at, genre_tags, cover_seed, status, call_id, channel_id, created_at, tenant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
    [
      id,
      input.seller_id,
      input.seller_name,
      input.title,
      input.scheduled_at,
      input.genre_tags,
      id, // cover_seed
      id, // call_id
      id, // channel_id
      new Date().toISOString(),
      input.tenant_id,
    ],
  )
  return (await getShow(id, input.tenant_id))!
}

/**
 * A show left in `live` (the host never ended it) is reported as `ended` once it's older
 * than MAX_LIVE_MINUTES. We compute this on read rather than mutating the row, so it also
 * cleans up shows that went live before `started_at` was recorded (falling back to created_at).
 */
function withLiveExpiry(show: Show): Show {
  if (show.status === "live") {
    const since = Date.parse(show.started_at ?? show.created_at)
    if (Number.isFinite(since) && Date.now() - since > MAX_LIVE_MINUTES * 60_000) {
      show.status = "ended"
    }
  }
  return show
}

// Scoped to a tenant: a visitor can only ever read shows in their own sandbox. This also gates
// every show-mutation route (golive/end/rsvp/reorder/items), which 404 when getShow returns
// undefined for a show outside the caller's tenant.
export async function getShow(id: string, tenant: string): Promise<Show | undefined> {
  const db = await getClient()
  const show = await one<Show>(db, "SELECT * FROM shows WHERE id = ? AND tenant_id = ?", [id, tenant])
  if (!show) return undefined
  withLiveExpiry(show)
  show.item_count = Number(
    (await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM show_items WHERE show_id = ?", [id]))!.n,
  )
  show.rsvp_count = Number(
    (await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM rsvps WHERE show_id = ?", [id]))!.n,
  )
  return show
}

export async function listShows(tenant: string): Promise<Show[]> {
  const db = await getClient()
  const shows = await many<Show>(
    db,
    `SELECT * FROM shows
       WHERE tenant_id = ?
       ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                datetime(scheduled_at) ASC`,
    [tenant],
  )
  // Downgrade stale live shows, then re-apply the status ordering they were sorted by.
  const rank: Record<Show["status"], number> = { live: 0, scheduled: 1, ended: 2 }
  shows.forEach(withLiveExpiry)
  shows.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] || Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at),
  )
  for (const s of shows) {
    s.item_count = Number(
      (await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM show_items WHERE show_id = ?", [s.id]))!
        .n,
    )
    s.rsvp_count = Number(
      (await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM rsvps WHERE show_id = ?", [s.id]))!.n,
    )
  }
  return shows
}

/** How many shows a tenant created within the trailing window — used to rate-limit creation. */
export async function recentShowCount(tenant: string, withinMs: number): Promise<number> {
  const db = await getClient()
  const since = new Date(Date.now() - withinMs).toISOString()
  const row = await one<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM shows WHERE tenant_id = ? AND created_at > ?",
    [tenant, since],
  )
  return Number(row!.n)
}

// Sandboxes are ephemeral: a cron deletes shows (and everything hanging off them) older than this.
export const SANDBOX_TTL_MS = 24 * 60 * 60_000

/** Delete shows older than `olderThanMs` and cascade to their items, bids, orders, and rsvps. */
export async function deleteStaleShows(olderThanMs = SANDBOX_TTL_MS): Promise<number> {
  const db = await getClient()
  const cutoff = new Date(Date.now() - olderThanMs).toISOString()
  const stale = await many<{ id: string }>(db, "SELECT id FROM shows WHERE created_at < ?", [cutoff])
  if (stale.length === 0) return 0

  // No foreign keys, so cascade by hand: bids -> items -> orders/rsvps -> shows, scoped to the
  // stale shows. One atomic batch keeps the delete all-or-nothing.
  const staleShows = "SELECT id FROM shows WHERE created_at < ?"
  await db.batch(
    [
      { sql: `DELETE FROM bids WHERE item_id IN (SELECT id FROM show_items WHERE show_id IN (${staleShows}))`, args: [cutoff] },
      { sql: `DELETE FROM show_items WHERE show_id IN (${staleShows})`, args: [cutoff] },
      { sql: `DELETE FROM orders WHERE show_id IN (${staleShows})`, args: [cutoff] },
      { sql: `DELETE FROM rsvps WHERE show_id IN (${staleShows})`, args: [cutoff] },
      { sql: "DELETE FROM shows WHERE created_at < ?", args: [cutoff] },
    ],
    "write",
  )
  return stale.length
}

export async function setShowStatus(id: string, status: Show["status"]): Promise<void> {
  const db = await getClient()
  if (status === "live") {
    // Record the live-start time so the show can be expired after MAX_LIVE_MINUTES.
    await run(db, "UPDATE shows SET status = ?, started_at = ? WHERE id = ?", [
      status,
      new Date().toISOString(),
      id,
    ])
  } else {
    await run(db, "UPDATE shows SET status = ? WHERE id = ?", [status, id])
  }
}

export async function rsvp(showId: string, userId: string): Promise<number> {
  const db = await getClient()
  await run(db, "INSERT OR IGNORE INTO rsvps (show_id, user_id) VALUES (?, ?)", [showId, userId])
  return Number(
    (await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM rsvps WHERE show_id = ?", [showId]))!.n,
  )
}

export async function hasRsvp(showId: string, userId: string): Promise<boolean> {
  const db = await getClient()
  return !!(await one(db, "SELECT 1 FROM rsvps WHERE show_id = ? AND user_id = ?", [showId, userId]))
}

// ---- Items / run order ----

export async function addItem(input: {
  show_id: string
  release_id: number
  media_grade: string
  sleeve_grade: string
  notes: string
  sell_mode: SellMode
  starting_bid: number
  buy_now_price: number
}): Promise<ShowItem> {
  const db = await getClient()
  const id = newId("item")
  const maxRow = await one<{ m: number | null }>(
    db,
    "SELECT MAX(position) AS m FROM show_items WHERE show_id = ?",
    [input.show_id],
  )
  const pos = (maxRow?.m ?? 0) + 1
  await run(
    db,
    `INSERT INTO show_items (id, show_id, release_id, position, media_grade, sleeve_grade, notes, sell_mode, starting_bid, buy_now_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
    [
      id,
      input.show_id,
      input.release_id,
      pos,
      input.media_grade,
      input.sleeve_grade,
      input.notes,
      input.sell_mode,
      input.starting_bid,
      input.buy_now_price,
    ],
  )
  return (await getItem(id))!
}

async function getItemWith(db: DB, id: string): Promise<ShowItem | undefined> {
  return one<ShowItem>(db, `${ITEM_SELECT} WHERE si.id = ?`, [id])
}

export async function getItem(id: string): Promise<ShowItem | undefined> {
  return getItemWith(await getClient(), id)
}

export async function listItems(showId: string): Promise<ShowItem[]> {
  const db = await getClient()
  return many<ShowItem>(db, `${ITEM_SELECT} WHERE si.show_id = ? ORDER BY si.position ASC`, [showId])
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getClient()
  await run(db, "DELETE FROM show_items WHERE id = ? AND status = 'queued'", [id])
}

export async function reorderItems(showId: string, orderedIds: string[]): Promise<void> {
  const db = await getClient()
  await db.batch(
    orderedIds.map((id, i) => ({
      sql: "UPDATE show_items SET position = ? WHERE id = ? AND show_id = ?",
      args: [i + 1, id, showId],
    })),
    "write",
  )
}

/** The item currently in front of the audience (live), if any. */
export async function getCurrentItem(showId: string): Promise<ShowItem | undefined> {
  const db = await getClient()
  return one<ShowItem>(
    db,
    `${ITEM_SELECT} WHERE si.show_id = ? AND si.status = 'live' ORDER BY si.position LIMIT 1`,
    [showId],
  )
}

// ---- Auction engine (server-authoritative) ----

export class AuctionError extends Error {}

/** Seller brings an item to the front and opens it. Closes any other live item first. */
export async function startItem(showId: string, itemId: string): Promise<ShowItem> {
  const item = await getItem(itemId)
  if (!item || item.show_id !== showId) throw new AuctionError("Item not found")
  if (item.status === "sold") throw new AuctionError("Item already sold")

  await tx(async (t) => {
    // Any other live item that has bids gets finalized; otherwise it returns to the queue.
    const live = await many<{ id: string; high_bidder: string | null }>(
      t,
      "SELECT id, high_bidder FROM show_items WHERE show_id = ? AND status = 'live' AND id != ?",
      [showId, itemId],
    )
    for (const l of live) {
      if (l.high_bidder) await finalizeItemInternal(t, l.id)
      else await run(t, "UPDATE show_items SET status = 'queued', ends_at = NULL WHERE id = ?", [l.id])
    }
    const endsAt = item.sell_mode === "auction" ? Date.now() + AUCTION_SECONDS * 1000 : null
    await run(t, "UPDATE show_items SET status = 'live', ends_at = ? WHERE id = ?", [endsAt, itemId])
  })
  return (await getItem(itemId))!
}

export async function placeBid(
  itemId: string,
  userId: string,
  userName: string,
  amount: number,
): Promise<ShowItem> {
  return tx(async (t) => {
    const item = await getItemWith(t, itemId)
    if (!item) throw new AuctionError("Item not found")
    if (item.sell_mode !== "auction") throw new AuctionError("This item is buy-it-now only")
    if (item.status !== "live") throw new AuctionError("Bidding is not open on this item")
    if (item.ends_at && Date.now() > item.ends_at) throw new AuctionError("Auction has ended")

    const floor =
      item.current_bid != null
        ? item.current_bid + bidIncrement(item.current_bid)
        : item.starting_bid
    if (amount < floor) throw new AuctionError(`Bid must be at least $${floor}`)

    let endsAt = item.ends_at!
    if (endsAt - Date.now() < EXTEND_WINDOW_MS) endsAt = Date.now() + EXTEND_WINDOW_MS // anti-snipe

    await run(
      t,
      "UPDATE show_items SET current_bid = ?, high_bidder = ?, high_bidder_name = ?, ends_at = ? WHERE id = ?",
      [amount, userId, userName, endsAt, itemId],
    )
    await run(
      t,
      "INSERT INTO bids (item_id, user_id, user_name, amount, created_at) VALUES (?, ?, ?, ?, ?)",
      [itemId, userId, userName, amount, Date.now()],
    )
    return (await getItemWith(t, itemId))!
  })
}

/** Buy-it-now: first claim wins. Works on auction items too (instant buy at buy_now_price if set). */
export async function claimItem(
  itemId: string,
  userId: string,
  userName: string,
): Promise<ShowItem> {
  return tx(async (t) => {
    const item = await getItemWith(t, itemId)
    if (!item) throw new AuctionError("Item not found")
    if (item.status === "sold") throw new AuctionError("Already sold")
    if (item.status !== "live") throw new AuctionError("Item is not available to claim yet")
    if (!item.buy_now_price || item.buy_now_price <= 0)
      throw new AuctionError("No buy-it-now price on this item")
    await run(
      t,
      "UPDATE show_items SET status = 'sold', winner = ?, winner_name = ?, final_price = ?, ends_at = NULL WHERE id = ?",
      [userId, userName, item.buy_now_price, itemId],
    )
    return (await getItemWith(t, itemId))!
  })
}

async function finalizeItemInternal(t: Transaction, itemId: string): Promise<void> {
  const item = await getItemWith(t, itemId)
  if (!item || item.status === "sold" || item.status === "unsold") return
  if (item.high_bidder) {
    await run(
      t,
      "UPDATE show_items SET status = 'sold', winner = ?, winner_name = ?, final_price = ?, ends_at = NULL WHERE id = ?",
      [item.high_bidder, item.high_bidder_name, item.current_bid, itemId],
    )
  } else {
    await run(t, "UPDATE show_items SET status = 'unsold', ends_at = NULL WHERE id = ?", [itemId])
  }
}

/** Close an auction: high bidder wins, or it goes unsold. Idempotent. */
export async function finalizeItem(itemId: string): Promise<ShowItem> {
  await tx((t) => finalizeItemInternal(t, itemId))
  return (await getItem(itemId))!
}

// ---- Cart & checkout (mocked Stripe Connect shape) ----

export async function getCart(userId: string): Promise<ShowItem[]> {
  const db = await getClient()
  return many<ShowItem>(
    db,
    `${ITEM_SELECT} WHERE si.winner = ? AND si.checked_out = 0 ORDER BY si.show_id, si.position`,
    [userId],
  )
}

export async function checkoutShow(
  userId: string,
  showId: string,
): Promise<{ order: Order; items: ShowItem[] }> {
  return tx(async (t) => {
    const items = await many<ShowItem>(
      t,
      `${ITEM_SELECT} WHERE si.winner = ? AND si.show_id = ? AND si.checked_out = 0 ORDER BY si.position`,
      [userId, showId],
    )
    if (items.length === 0) throw new AuctionError("Nothing to check out for this show")

    const subtotal = items.reduce((s, i) => s + (i.final_price ?? 0), 0)
    const shipping = SHIPPING_FLAT
    const platform_fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100
    const seller_payout = Math.round((subtotal - platform_fee) * 100) / 100
    const total = Math.round((subtotal + shipping) * 100) / 100
    const orderId = newId("ord")

    await run(
      t,
      `INSERT INTO orders (id, user_id, show_id, subtotal, shipping, platform_fee, seller_payout, total, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
      [orderId, userId, showId, subtotal, shipping, platform_fee, seller_payout, total, new Date().toISOString()],
    )

    for (const it of items) {
      await run(t, "UPDATE show_items SET checked_out = 1, order_id = ? WHERE id = ?", [orderId, it.id])
    }

    const order = (await one<Order>(t, "SELECT * FROM orders WHERE id = ?", [orderId]))!
    return { order, items }
  })
}

export async function listOrders(userId: string): Promise<Order[]> {
  const db = await getClient()
  return many<Order>(
    db,
    "SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC",
    [userId],
  )
}
