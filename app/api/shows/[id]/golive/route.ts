import { NextRequest, NextResponse } from "next/server"
import { getShow, setShowStatus } from "@/lib/store"
import { ensureShowChannel, toUserId } from "@/lib/stream-server"

export const runtime = "nodejs"

// Seller flips a scheduled show to live. We create the show's chat channel here so that
// auction-state events have a channel to ride on. The video call itself is created by the
// seller's client on join({ create: true }).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const show = getShow(id)
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (toUserId(body.user_id ?? "") !== show.seller_id) {
    return NextResponse.json({ error: "Only the seller can start this show" }, { status: 403 })
  }

  await ensureShowChannel(show.channel_id, show.seller_id, show.title)
  setShowStatus(id, "live")
  return NextResponse.json({ show: getShow(id) })
}
