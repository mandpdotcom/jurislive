import { NextRequest, NextResponse } from "next/server"
import { getShow, setShowStatus } from "@/lib/store"
import { broadcast, toUserId } from "@/lib/stream-server"
import { EVT_SHOW_ENDED } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const show = getShow(id)
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (toUserId(body.user_id ?? "") !== show.seller_id) {
    return NextResponse.json({ error: "Only the seller can end this show" }, { status: 403 })
  }

  setShowStatus(id, "ended")
  await broadcast(show.channel_id, EVT_SHOW_ENDED, { showId: id })
  return NextResponse.json({ show: getShow(id) })
}
