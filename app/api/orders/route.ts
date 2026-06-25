import { NextRequest, NextResponse } from "next/server"
import { listOrders } from "@/lib/store"
import { getTenant, tenantUser } from "@/lib/tenant"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("user_id")
  if (!raw) return NextResponse.json({ error: "user_id required" }, { status: 400 })
  return NextResponse.json({ orders: await listOrders(tenantUser(await getTenant(), raw)) })
}
