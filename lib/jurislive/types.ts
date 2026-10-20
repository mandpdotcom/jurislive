export type Study = { id: string; slug: string; name: string; city: string; initials: string; color: string; description: string }
export type Sale = { id: string; study_id: string; title: string; category: string; city: string; image: string; scheduled_label: string; status: "ready" | "live" | "paused" | "ended"; lot_count?: number }
export type Lot = { id: string; sale_id: string; study_id: string; number: number; title: string; description: string; image: string; estimate_low: number; estimate_high: number; starting_cents: number; increment_cents: number; current_cents: number | null; high_bidder: string | null; status: "queued" | "live" | "closed"; ends_at: number | null; version: number }
export type Session = { id: string; role: "buyer" | "auctioneer"; study_id: string | null; name: string; expires_at: number }
export type Bid = { id: string; lot_id: string; amount_cents: number; alias: string; created_at: number }
export type Audit = { id: number; study_id: string; actor: string; action: string; entity: string; payload: string; created_at: number; prev_hash: string; hash: string }
export type SaleState = { sale: Sale; study: Study; lots: Lot[]; bids: Bid[]; server_time: number; video_configured: boolean; storage: "turso" | "local" | "unconfigured"; demo: true }
export type Catalog = { studies: Study[]; sales: Sale[]; lots: Lot[]; demo: true; read_only?: boolean }
export type DemoPersona = "buyer" | "paris" | "lyon" | "bordeaux"
export const money = (cents: number | null | undefined) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format((cents ?? 0) / 100)
