import { NextRequest, NextResponse } from "next/server"
import { createShow, listShows, recentShowCount } from "@/lib/store"
import { getTenant, tenantUser } from "@/lib/tenant"
import { cleanLabel } from "@/lib/moderation"

export const runtime = "nodejs"

// Anti-spam: a sandbox can only create so many shows in a trailing window.
const SHOW_RATE_LIMIT = 10
const SHOW_RATE_WINDOW_MS = 10 * 60_000

export async function GET() {
  return NextResponse.json({ shows: await listShows(await getTenant()) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.seller_id) {
    return NextResponse.json({ error: "title and seller_id are required" }, { status: 400 })
  }
  const tenant = await getTenant()

  if ((await recentShowCount(tenant, SHOW_RATE_WINDOW_MS)) >= SHOW_RATE_LIMIT) {
    return NextResponse.json(
      { error: "You're creating shows too quickly — try again in a few minutes." },
      { status: 429 },
    )
  }

  const sellerName = cleanLabel(body.seller_name ?? body.seller_id)
  const show = await createShow({
    tenant_id: tenant,
    seller_id: tenantUser(tenant, cleanLabel(body.seller_id)),
    seller_name: sellerName,
    title: cleanLabel(String(body.title).slice(0, 120)),
    scheduled_at: body.scheduled_at ?? new Date().toISOString(),
    genre_tags: body.genre_tags ?? "",
  })
  return NextResponse.json({ show })
}
