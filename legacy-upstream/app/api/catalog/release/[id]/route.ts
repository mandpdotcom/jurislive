import { NextResponse } from "next/server"
import { getCatalogRelease, getTracksForRelease } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const releaseId = Number(id)
  const release = await getCatalogRelease(releaseId)
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 })
  return NextResponse.json({ release, tracks: await getTracksForRelease(releaseId) })
}
