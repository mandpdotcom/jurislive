import { NextRequest, NextResponse } from "next/server"
import { getShow, setShowStatus } from "@/lib/store"
import { broadcast } from "@/lib/stream-server"
import { getTenant, tenantUser } from "@/lib/tenant"
import { EVT_SHOW_ENDED } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenant = await getTenant()
  const show = await getShow(id, tenant)
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (tenantUser(tenant, body.user_id ?? "") !== show.seller_id) {
    return NextResponse.json({ error: "Only the seller can end this show" }, { status: 403 })
  }

  await setShowStatus(id, "ended")
  await broadcast(show.channel_id, EVT_SHOW_ENDED, { showId: id })
  return NextResponse.json({ show: await getShow(id, tenant) })
}
