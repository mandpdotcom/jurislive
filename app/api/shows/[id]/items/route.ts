import { NextRequest, NextResponse } from "next/server"
import { addItem, getShow, listItems } from "@/lib/store"
import { getReleaseRaw } from "@/lib/db"
import { GRADES, type SellMode } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json({ items: await listItems(id) })
}

// Seller adds a chosen pressing to the show's run order, with their own listing data.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await getShow(id))) return NextResponse.json({ error: "Show not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const releaseId = Number(body?.release_id)
  if (!releaseId || !(await getReleaseRaw(releaseId))) {
    return NextResponse.json({ error: "Valid release_id required" }, { status: 400 })
  }

  const sell_mode: SellMode = body.sell_mode === "buynow" ? "buynow" : "auction"
  const media_grade = GRADES.includes(body.media_grade) ? body.media_grade : "VG+"
  const sleeve_grade = GRADES.includes(body.sleeve_grade) ? body.sleeve_grade : "VG+"

  const item = await addItem({
    show_id: id,
    release_id: releaseId,
    media_grade,
    sleeve_grade,
    notes: String(body.notes ?? "").slice(0, 280),
    sell_mode,
    starting_bid: Math.max(0, Number(body.starting_bid) || 0),
    buy_now_price: Math.max(0, Number(body.buy_now_price) || 0),
  })
  return NextResponse.json({ item })
}
