import { NextRequest, NextResponse } from "next/server"
import { getShow, rsvp } from "@/lib/store"
import { toUserId } from "@/lib/stream-server"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getShow(id)) return NextResponse.json({ error: "Show not found" }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!body?.user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 })
  const rsvp_count = rsvp(id, toUserId(body.user_id))
  return NextResponse.json({ rsvp_count })
}
