import { NextRequest, NextResponse } from "next/server"
import { chatServer, videoServer } from "@/lib/stream-server"
import { getTenant, tenantUser } from "@/lib/tenant"

export const runtime = "nodejs"

// Upserts ONLY the requesting user (no demo seeding) and mints chat + video tokens in one call.
// The user id is namespaced to the visitor's sandbox so identities never collide across tenants.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("user_id")
  if (!raw) return NextResponse.json({ error: "user_id required" }, { status: 400 })

  const userId = tenantUser(await getTenant(), raw)
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
