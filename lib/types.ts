// Shared domain types for VinylStream.
// The catalog types mirror the Discogs data model (master release -> specific pressings),
// so the curated demo DB and a production Discogs-dump ETL share one schema.

export type Track = {
  position: string
  title: string
  duration: string
}

/** A canonical release group — the "album", independent of pressing. */
export type Master = {
  id: number
  title: string
  artist: string
  year: number
  genre: string
  style: string
  tracks: Track[]
}

/** A specific physical pressing of a master (year/country/label/format), with a market price range. */
export type Release = {
  id: number
  master_id: number
  year: number
  country: string
  label: string
  catno: string
  format: string
  price_low: number
  price_median: number
  price_high: number
}

/** A release joined with its master — what catalog search returns. */
export type CatalogResult = Release & {
  title: string
  artist: string
  genre: string
  style: string
  master_year: number
}

export type ShowStatus = "scheduled" | "live" | "ended"

export type Show = {
  id: string
  seller_id: string
  seller_name: string
  title: string
  scheduled_at: string
  genre_tags: string // comma-separated
  cover_seed: string
  status: ShowStatus
  call_id: string
  channel_id: string
  created_at: string
  started_at: string | null // when the show flipped to live; null until then
  tenant_id: string | null // sandbox owner; shows are only ever listed back to their own tenant
  // computed
  item_count?: number
  rsvp_count?: number
}

export type SellMode = "auction" | "buynow"
export type ItemStatus = "queued" | "live" | "sold" | "unsold"

/** A record placed into a show's run order — canonical catalog data + the seller's own listing data. */
export type ShowItem = {
  id: string
  show_id: string
  release_id: number
  position: number
  media_grade: string
  sleeve_grade: string
  notes: string
  sell_mode: SellMode
  starting_bid: number
  buy_now_price: number
  status: ItemStatus
  current_bid: number | null
  high_bidder: string | null
  high_bidder_name: string | null
  ends_at: number | null // epoch ms
  winner: string | null
  winner_name: string | null
  final_price: number | null
  checked_out: number
  order_id: string | null
  // joined catalog data
  title: string
  artist: string
  genre: string
  release_year: number
  country: string
  label: string
  catno: string
  format: string
  price_low: number
  price_median: number
  price_high: number
}

export type Order = {
  id: string
  user_id: string
  show_id: string
  subtotal: number
  shipping: number
  platform_fee: number
  seller_payout: number
  total: number
  status: string
  created_at: string
}

// Condition grades follow the Goldmine standard used across collectible marketplaces.
export const GRADES = ["M", "NM", "VG+", "VG", "G+", "G"] as const
export type Grade = (typeof GRADES)[number]

// Stream Chat custom-event types carrying server-authoritative auction state.
// NB: Stream event-type strings cannot contain ".", so we use underscores.
export const EVT_AUCTION_UPDATE = "auction_update"
export const EVT_ITEM_SOLD = "item_sold"
export const EVT_SHOW_ENDED = "show_ended"
