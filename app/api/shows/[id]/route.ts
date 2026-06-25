import { NextResponse } from "next/server"
import { getShow, listItems, getCurrentItem } from "@/lib/store"
import { getTenant } from "@/lib/tenant"

export const runtime = "nodejs"

// Full snapshot used by the show landing page, the seller live console, and the watch screen.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const show = await getShow(id, await getTenant())
  if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })
  return NextResponse.json({
    show,
    items: await listItems(id),
    currentItem: (await getCurrentItem(id)) ?? null,
  })
}
