import { NextRequest, NextResponse } from "next/server"
import { AuctionError, checkoutShow } from "@/lib/store"
import { getTenant, tenantUser } from "@/lib/tenant"

export const runtime = "nodejs"

// Mocked marketplace checkout. The data model (subtotal, platform fee, seller payout) follows
// the Stripe Connect destination-charge shape so a real integration drops in cleanly; here we
// just mark the wins paid and return the "card charged, payout queued" breakdown.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.user_id || !body?.show_id) {
    return NextResponse.json({ error: "user_id and show_id required" }, { status: 400 })
  }
  try {
    const result = await checkoutShow(tenantUser(await getTenant(), body.user_id), body.show_id)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AuctionError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
