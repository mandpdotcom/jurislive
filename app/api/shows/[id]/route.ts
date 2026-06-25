import { NextResponse } from "next/server"
import { getShow, listItems, getCurrentItem } from "@/lib/store"

export const runtime = "nodejs"

// Full snapshot used by the show landing page, the seller live console, and the watch screen.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const show = getShow(id)
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })
  return NextResponse.json({
    show,
    items: listItems(id),
    currentItem: getCurrentItem(id) ?? null,
  })
}
