import { NextRequest, NextResponse } from "next/server"
import { createShow, listShows } from "@/lib/store"
import { getTenant, tenantUser } from "@/lib/tenant"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ shows: await listShows(await getTenant()) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.seller_id) {
    return NextResponse.json({ error: "title and seller_id are required" }, { status: 400 })
  }
  const tenant = await getTenant()
  const show = await createShow({
    tenant_id: tenant,
    seller_id: tenantUser(tenant, body.seller_id),
    seller_name: body.seller_name ?? body.seller_id,
    title: String(body.title).slice(0, 120),
    scheduled_at: body.scheduled_at ?? new Date().toISOString(),
    genre_tags: body.genre_tags ?? "",
  })
  return NextResponse.json({ show })
}
