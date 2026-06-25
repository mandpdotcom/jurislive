import { NextRequest, NextResponse } from "next/server"
import { listOrders } from "@/lib/store"
import { toUserId } from "@/lib/stream-server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("user_id")
  if (!raw) return NextResponse.json({ error: "user_id required" }, { status: 400 })
  return NextResponse.json({ orders: listOrders(toUserId(raw)) })
}
