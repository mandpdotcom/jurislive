import { NextRequest, NextResponse } from "next/server"
import { getShow, listItems, reorderItems } from "@/lib/store"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await getShow(id))) return NextResponse.json({ error: "Show not found" }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.orderedIds)) {
    return NextResponse.json({ error: "orderedIds array required" }, { status: 400 })
  }
  await reorderItems(id, body.orderedIds)
  return NextResponse.json({ items: await listItems(id) })
}
