import { NextRequest, NextResponse } from "next/server"
import { getCart } from "@/lib/store"
import { getShow } from "@/lib/store"
import { toUserId } from "@/lib/stream-server"
import type { ShowItem } from "@/lib/types"

export const runtime = "nodejs"

// Wins accumulate across a show; the cart groups them by show for combined checkout.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("user_id")
  if (!raw) return NextResponse.json({ error: "user_id required" }, { status: 400 })
  const items = await getCart(toUserId(raw))

  const groups: Record<string, { showId: string; showTitle: string; items: ShowItem[] }> = {}
  for (const it of items) {
    if (!groups[it.show_id]) {
      groups[it.show_id] = {
        showId: it.show_id,
        showTitle: (await getShow(it.show_id))?.title ?? "Show",
        items: [],
      }
    }
    groups[it.show_id].items.push(it)
  }
  return NextResponse.json({ items, groups: Object.values(groups) })
}
