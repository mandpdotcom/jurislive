import { NextRequest, NextResponse } from "next/server"
import { searchCatalog, catalogStats } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  const results = await searchCatalog(q)
  return NextResponse.json({ results, stats: await catalogStats() })
}
