import { NextRequest, NextResponse } from "next/server"
import { chatServer, videoServer, toUserId } from "@/lib/stream-server"

export const runtime = "nodejs"

// Upserts ONLY the requesting user (no demo seeding) and mints chat + video tokens in one call.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("user_id")
  if (!raw) return NextResponse.json({ error: "user_id required" }, { status: 400 })

  const userId = toUserId(raw)
  const name = raw

  await Promise.all([
    chatServer.upsertUsers([{ id: userId, name, role: "user" }]),
    videoServer.upsertUsers([{ id: userId, name, role: "user" }]),
  ])

  return NextResponse.json({
    apiKey: process.env.STREAM_API_KEY,
    userId,
    name,
    chatToken: chatServer.createToken(userId),
    videoToken: videoServer.generateUserToken({ user_id: userId }),
  })
}
