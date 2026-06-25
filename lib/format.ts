// Client-safe formatting + deterministic visual helpers (no node imports).

export function money(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export function moneyExact(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}

/** Stable 32-bit hash of a string. */
export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Two complementary hues + a label initial, derived from a seed — used to render record sleeves. */
export function sleeveColors(seed: string): { from: string; to: string; ink: string } {
  const h = hashCode(seed)
  const hue = h % 360
  const hue2 = (hue + 40 + (h % 60)) % 360
  return {
    from: `hsl(${hue} 62% 42%)`,
    to: `hsl(${hue2} 58% 24%)`,
    ink: `hsl(${hue} 70% 88%)`,
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

export function formatSchedule(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = Date.now()
  const diff = d.getTime() - now
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  if (diff > 0 && diff < 36e5) return `in ${Math.max(1, Math.round(diff / 6e4))} min`
  return d.toLocaleString("en-US", opts)
}

// Mirror of the server's bid-increment ladder (lib/store.ts) for client-side bid hints.
export function bidIncrement(current: number): number {
  if (current < 50) return 1
  if (current < 200) return 5
  return 10
}

export function nextMinBid(item: {
  current_bid: number | null
  starting_bid: number
}): number {
  return item.current_bid != null ? item.current_bid + bidIncrement(item.current_bid) : item.starting_bid
}

export const GRADE_LABELS: Record<string, string> = {
  M: "Mint",
  NM: "Near Mint",
  "VG+": "Very Good Plus",
  VG: "Very Good",
  "G+": "Good Plus",
  G: "Good",
}
