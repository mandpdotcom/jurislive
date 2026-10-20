import { NextRequest, NextResponse } from "next/server"
import { getShow, listItems, reorderItems } from "@/lib/store"
import { getTenant } from "@/lib/tenant"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await getShow(id, await getTenant())))
    return NextResponse.json({ error: "Show not found" }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.orderedIds)) {
    return NextResponse.json({ error: "orderedIds array required" }, { status: 400 })
  }
  await reorderItems(id, body.orderedIds)
  return NextResponse.json({ items: await listItems(id) })
}
