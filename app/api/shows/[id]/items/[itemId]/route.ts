import { NextRequest, NextResponse } from "next/server"
import {
  AuctionError,
  claimItem,
  deleteItem,
  finalizeItem,
  getItem,
  getShow,
  placeBid,
  startItem,
} from "@/lib/store"
import { broadcastItem, toUserId } from "@/lib/stream-server"
import { EVT_AUCTION_UPDATE, EVT_ITEM_SOLD } from "@/lib/types"

export const runtime = "nodejs"

// All live mutations for one item flow through here. `action` selects the operation.
//   start    (seller)  open the item; auctions get a countdown
//   bid      (buyer)   place a bid above the floor; anti-snipe extends the clock
//   claim    (buyer)   buy-it-now — first claim wins
//   finalize (seller/timer)  close an auction: high bidder wins, else unsold
//   pass     (seller)  end an item with no sale
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params
  const show = getShow(id)
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const userId = toUserId(body.user_id ?? "")
  const isSeller = userId === show.seller_id

  try {
    switch (action) {
      case "start": {
        if (!isSeller) return forbidden()
        const item = startItem(id, itemId)
        await broadcastItem(show.channel_id, EVT_AUCTION_UPDATE, item)
        return NextResponse.json({ item })
      }
      case "bid": {
        if (!body.user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 })
        const item = placeBid(itemId, userId, body.user_name ?? body.user_id, Number(body.amount))
        await broadcastItem(show.channel_id, EVT_AUCTION_UPDATE, item)
        return NextResponse.json({ item })
      }
      case "claim": {
        if (!body.user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 })
        const item = claimItem(itemId, userId, body.user_name ?? body.user_id)
        await broadcastItem(show.channel_id, EVT_ITEM_SOLD, item)
        return NextResponse.json({ item })
      }
      case "finalize":
      case "pass": {
        if (!isSeller) return forbidden()
        const item = finalizeItem(itemId)
        await broadcastItem(
          show.channel_id,
          item.status === "sold" ? EVT_ITEM_SOLD : EVT_AUCTION_UPDATE,
          item,
        )
        return NextResponse.json({ item })
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (err) {
    if (err instanceof AuctionError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params
  const show = getShow(id)
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })
  const item = getItem(itemId)
  if (item && item.status !== "queued") {
    return NextResponse.json({ error: "Can only remove items that haven't gone live" }, { status: 400 })
  }
  deleteItem(itemId)
  return NextResponse.json({ ok: true })
}

function forbidden() {
  return NextResponse.json({ error: "Only the seller can do that" }, { status: 403 })
}
