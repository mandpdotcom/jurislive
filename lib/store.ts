// App-state data layer: shows, run-order items, the server-authoritative auction engine,
// cart, and (mocked) checkout. All auction state lives here on the server — clients send
// intents and read state back; the video stream and chat channel never hold the source of truth.

import { getDb } from "./db"
import type { Order, SellMode, Show, ShowItem } from "./types"

export const AUCTION_SECONDS = 30
// Demo safeguard: a show that never gets explicitly ended (host just closes the tab)
// stops being treated as live this long after it started, so stale live shows disappear.
export const MAX_LIVE_MINUTES = 120
const EXTEND_WINDOW_MS = 10_000 // anti-snipe: a late bid bumps the clock back up to this
const PLATFORM_FEE_RATE = 0.1 // 10% marketplace commission (Stripe Connect destination-charge shape)
const SHIPPING_FLAT = 6

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

export function createShow(input: {
  seller_id: string
  seller_name: string
  title: string
  scheduled_at: string
  genre_tags: string
}): Show {
  const db = getDb()
  const id = newId("show")
  db.prepare(
    `INSERT INTO shows (id, seller_id, seller_name, title, scheduled_at, genre_tags, cover_seed, status, call_id, channel_id, created_at)
     VALUES (@id, @seller_id, @seller_name, @title, @scheduled_at, @genre_tags, @cover_seed, 'scheduled', @id, @id, @created_at)`,
  ).run({
    id,
    seller_id: input.seller_id,
    seller_name: input.seller_name,
    title: input.title,
    scheduled_at: input.scheduled_at,
    genre_tags: input.genre_tags,
    cover_seed: id,
    created_at: new Date().toISOString(),
  })
  return getShow(id)!
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

export function getShow(id: string): Show | undefined {
  const db = getDb()
  const show = db.prepare("SELECT * FROM shows WHERE id = ?").get(id) as Show | undefined
  if (!show) return undefined
  withLiveExpiry(show)
  show.item_count = (
    db.prepare("SELECT COUNT(*) AS n FROM show_items WHERE show_id = ?").get(id) as { n: number }
  ).n
  show.rsvp_count = (
    db.prepare("SELECT COUNT(*) AS n FROM rsvps WHERE show_id = ?").get(id) as { n: number }
  ).n
  return show
}

export function listShows(): Show[] {
  const db = getDb()
  const shows = db
    .prepare(
      `SELECT * FROM shows
       ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                datetime(scheduled_at) ASC`,
    )
    .all() as Show[]
  // Downgrade stale live shows, then re-apply the status ordering they were sorted by.
  const rank: Record<Show["status"], number> = { live: 0, scheduled: 1, ended: 2 }
  shows.forEach(withLiveExpiry)
  shows.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] || Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at),
  )
  for (const s of shows) {
    s.item_count = (
      db.prepare("SELECT COUNT(*) AS n FROM show_items WHERE show_id = ?").get(s.id) as {
        n: number
      }
    ).n
    s.rsvp_count = (
      db.prepare("SELECT COUNT(*) AS n FROM rsvps WHERE show_id = ?").get(s.id) as { n: number }
    ).n
  }
  return shows
}

export function setShowStatus(id: string, status: Show["status"]): void {
  const db = getDb()
  if (status === "live") {
    // Record the live-start time so the show can be expired after MAX_LIVE_MINUTES.
    db.prepare("UPDATE shows SET status = ?, started_at = ? WHERE id = ?").run(
      status,
      new Date().toISOString(),
      id,
    )
  } else {
    db.prepare("UPDATE shows SET status = ? WHERE id = ?").run(status, id)
  }
}

export function rsvp(showId: string, userId: string): number {
  const db = getDb()
  db.prepare("INSERT OR IGNORE INTO rsvps (show_id, user_id) VALUES (?, ?)").run(showId, userId)
  return (db.prepare("SELECT COUNT(*) AS n FROM rsvps WHERE show_id = ?").get(showId) as { n: number })
    .n
}

export function hasRsvp(showId: string, userId: string): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM rsvps WHERE show_id = ? AND user_id = ?")
    .get(showId, userId)
}

// ---- Items / run order ----

export function addItem(input: {
  show_id: string
  release_id: number
  media_grade: string
  sleeve_grade: string
  notes: string
  sell_mode: SellMode
  starting_bid: number
  buy_now_price: number
}): ShowItem {
  const db = getDb()
  const id = newId("item")
  const pos =
    ((
      db.prepare("SELECT MAX(position) AS m FROM show_items WHERE show_id = ?").get(input.show_id) as {
        m: number | null
      }
    ).m ?? 0) + 1
  db.prepare(
    `INSERT INTO show_items (id, show_id, release_id, position, media_grade, sleeve_grade, notes, sell_mode, starting_bid, buy_now_price, status)
     VALUES (@id, @show_id, @release_id, @position, @media_grade, @sleeve_grade, @notes, @sell_mode, @starting_bid, @buy_now_price, 'queued')`,
  ).run({ id, position: pos, ...input })
  return getItem(id)!
}

export function getItem(id: string): ShowItem | undefined {
  return getDb().prepare(`${ITEM_SELECT} WHERE si.id = ?`).get(id) as ShowItem | undefined
}

export function listItems(showId: string): ShowItem[] {
  return getDb()
    .prepare(`${ITEM_SELECT} WHERE si.show_id = ? ORDER BY si.position ASC`)
    .all(showId) as ShowItem[]
}

export function deleteItem(id: string): void {
  getDb().prepare("DELETE FROM show_items WHERE id = ? AND status = 'queued'").run(id)
}

export function reorderItems(showId: string, orderedIds: string[]): void {
  const db = getDb()
  const upd = db.prepare("UPDATE show_items SET position = ? WHERE id = ? AND show_id = ?")
  db.transaction(() => {
    orderedIds.forEach((id, i) => upd.run(i + 1, id, showId))
  })()
}

/** The item currently in front of the audience (live), if any. */
export function getCurrentItem(showId: string): ShowItem | undefined {
  return getDb()
    .prepare(`${ITEM_SELECT} WHERE si.show_id = ? AND si.status = 'live' ORDER BY si.position LIMIT 1`)
    .get(showId) as ShowItem | undefined
}

// ---- Auction engine (server-authoritative) ----

export class AuctionError extends Error {}

/** Seller brings an item to the front and opens it. Closes any other live item first. */
export function startItem(showId: string, itemId: string): ShowItem {
  const db = getDb()
  const item = getItem(itemId)
  if (!item || item.show_id !== showId) throw new AuctionError("Item not found")
  if (item.status === "sold") throw new AuctionError("Item already sold")

  db.transaction(() => {
    // Any other live item that has bids gets finalized; otherwise it returns to the queue.
    const live = db
      .prepare("SELECT * FROM show_items WHERE show_id = ? AND status = 'live' AND id != ?")
      .all(showId, itemId) as { id: string; high_bidder: string | null }[]
    for (const l of live) {
      if (l.high_bidder) finalizeItemInternal(l.id)
      else db.prepare("UPDATE show_items SET status = 'queued', ends_at = NULL WHERE id = ?").run(l.id)
    }
    const endsAt = item.sell_mode === "auction" ? Date.now() + AUCTION_SECONDS * 1000 : null
    db.prepare("UPDATE show_items SET status = 'live', ends_at = ? WHERE id = ?").run(endsAt, itemId)
  })()
  return getItem(itemId)!
}

export function placeBid(
  itemId: string,
  userId: string,
  userName: string,
  amount: number,
): ShowItem {
  const db = getDb()
  return db.transaction(() => {
    const item = getItem(itemId)
    if (!item) throw new AuctionError("Item not found")
    if (item.sell_mode !== "auction") throw new AuctionError("This item is buy-it-now only")
    if (item.status !== "live") throw new AuctionError("Bidding is not open on this item")
    if (item.ends_at && Date.now() > item.ends_at) throw new AuctionError("Auction has ended")

    const floor = item.current_bid != null
      ? item.current_bid + bidIncrement(item.current_bid)
      : item.starting_bid
    if (amount < floor) throw new AuctionError(`Bid must be at least $${floor}`)

    let endsAt = item.ends_at!
    if (endsAt - Date.now() < EXTEND_WINDOW_MS) endsAt = Date.now() + EXTEND_WINDOW_MS // anti-snipe

    db.prepare(
      "UPDATE show_items SET current_bid = ?, high_bidder = ?, high_bidder_name = ?, ends_at = ? WHERE id = ?",
    ).run(amount, userId, userName, endsAt, itemId)
    db.prepare(
      "INSERT INTO bids (item_id, user_id, user_name, amount, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(itemId, userId, userName, amount, Date.now())
    return getItem(itemId)!
  })()
}

/** Buy-it-now: first claim wins. Works on auction items too (instant buy at buy_now_price if set). */
export function claimItem(itemId: string, userId: string, userName: string): ShowItem {
  const db = getDb()
  return db.transaction(() => {
    const item = getItem(itemId)
    if (!item) throw new AuctionError("Item not found")
    if (item.status === "sold") throw new AuctionError("Already sold")
    if (item.status !== "live") throw new AuctionError("Item is not available to claim yet")
    if (!item.buy_now_price || item.buy_now_price <= 0)
      throw new AuctionError("No buy-it-now price on this item")
    db.prepare(
      "UPDATE show_items SET status = 'sold', winner = ?, winner_name = ?, final_price = ?, ends_at = NULL WHERE id = ?",
    ).run(userId, userName, item.buy_now_price, itemId)
    return getItem(itemId)!
  })()
}

function finalizeItemInternal(itemId: string): void {
  const db = getDb()
  const item = getItem(itemId)
  if (!item || item.status === "sold" || item.status === "unsold") return
  if (item.high_bidder) {
    db.prepare(
      "UPDATE show_items SET status = 'sold', winner = ?, winner_name = ?, final_price = ?, ends_at = NULL WHERE id = ?",
    ).run(item.high_bidder, item.high_bidder_name, item.current_bid, itemId)
  } else {
    db.prepare("UPDATE show_items SET status = 'unsold', ends_at = NULL WHERE id = ?").run(itemId)
  }
}

/** Close an auction: high bidder wins, or it goes unsold. Idempotent. */
export function finalizeItem(itemId: string): ShowItem {
  finalizeItemInternal(itemId)
  return getItem(itemId)!
}

// ---- Cart & checkout (mocked Stripe Connect shape) ----

export function getCart(userId: string): ShowItem[] {
  return getDb()
    .prepare(
      `${ITEM_SELECT} WHERE si.winner = ? AND si.checked_out = 0 ORDER BY si.show_id, si.position`,
    )
    .all(userId) as ShowItem[]
}

export function checkoutShow(userId: string, showId: string): { order: Order; items: ShowItem[] } {
  const db = getDb()
  return db.transaction(() => {
    const items = db
      .prepare(
        `${ITEM_SELECT} WHERE si.winner = ? AND si.show_id = ? AND si.checked_out = 0 ORDER BY si.position`,
      )
      .all(userId, showId) as ShowItem[]
    if (items.length === 0) throw new AuctionError("Nothing to check out for this show")

    const subtotal = items.reduce((s, i) => s + (i.final_price ?? 0), 0)
    const shipping = SHIPPING_FLAT
    const platform_fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100
    const seller_payout = Math.round((subtotal - platform_fee) * 100) / 100
    const total = Math.round((subtotal + shipping) * 100) / 100
    const orderId = newId("ord")

    db.prepare(
      `INSERT INTO orders (id, user_id, show_id, subtotal, shipping, platform_fee, seller_payout, total, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
    ).run(orderId, userId, showId, subtotal, shipping, platform_fee, seller_payout, total, new Date().toISOString())

    const mark = db.prepare("UPDATE show_items SET checked_out = 1, order_id = ? WHERE id = ?")
    for (const it of items) mark.run(orderId, it.id)

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as Order
    return { order, items }
  })()
}

export function listOrders(userId: string): Order[] {
  return getDb()
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC")
    .all(userId) as Order[]
}
