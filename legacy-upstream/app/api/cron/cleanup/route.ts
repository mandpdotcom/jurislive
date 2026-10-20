import { NextRequest, NextResponse } from "next/server"
import { deleteStaleShows } from "@/lib/store"

export const runtime = "nodejs"

// Scheduled by vercel.json to prune ephemeral sandboxes. Vercel Cron sends the configured
// CRON_SECRET as a Bearer token; we reject anything else so the endpoint can't be triggered
// by the public. (If CRON_SECRET is unset — e.g. local dev — the check is skipped.)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const deleted = await deleteStaleShows()
  return NextResponse.json({ deleted })
}
