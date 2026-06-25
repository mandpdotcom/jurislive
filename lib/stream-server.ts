// Server-side Stream clients + helpers.
//
// Secrets stay server-side (RULES: env vars are server-side only). The auction's source of
// truth is our SQLite store; we *broadcast* each authoritative state change to watchers by
// sending a custom event on the show's Stream Chat channel — "bid events ride the same
// realtime channel as chat", exactly as the concept describes, while the server stays canonical.

import { StreamChat } from "stream-chat"
import { StreamClient } from "@stream-io/node-sdk"
import { EVT_AUCTION_UPDATE, EVT_ITEM_SOLD, EVT_SHOW_ENDED, type ShowItem } from "./types"

const apiKey = process.env.STREAM_API_KEY!
const apiSecret = process.env.STREAM_API_SECRET!

// System actor that authors auction events (so they aren't attributed to a buyer/seller).
export const SYSTEM_USER_ID = "vinylstream_system"

export const chatServer = StreamChat.getInstance(apiKey, apiSecret)
export const videoServer = new StreamClient(apiKey, apiSecret)

export { apiKey }

/** Sanitize a username into a valid Stream user id (lowercase, [a-z0-9_-]). */
export function toUserId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 64) || "guest"
}

let systemEnsured = false
async function ensureSystemUser() {
  if (systemEnsured) return
  await chatServer.upsertUsers([{ id: SYSTEM_USER_ID, name: "VinylStream", role: "user" }])
  systemEnsured = true
}

/** Create (idempotently) the livestream chat channel for a show. Called when the seller goes live. */
export async function ensureShowChannel(channelId: string, sellerId: string, title: string) {
  await ensureSystemUser()
  const channel = chatServer.channel("livestream", channelId, {
    created_by_id: sellerId,
    members: [sellerId, SYSTEM_USER_ID],
    // custom channel data
    show_title: title,
  } as Record<string, unknown>)
  await channel.create()
  return channel
}

type EventKind = typeof EVT_AUCTION_UPDATE | typeof EVT_ITEM_SOLD | typeof EVT_SHOW_ENDED

/**
 * Broadcast authoritative auction state to everyone watching the show's channel.
 * Payload is JSON-stringified into `data` so nested objects survive the event pipe intact.
 */
export async function broadcast(channelId: string, kind: EventKind, payload: unknown) {
  try {
    await ensureSystemUser()
    const channel = chatServer.channel("livestream", channelId)
    const event = { type: kind, user_id: SYSTEM_USER_ID, data: JSON.stringify(payload) }
    await channel.sendEvent(event as unknown as Parameters<typeof channel.sendEvent>[0])
  } catch (err) {
    // A failed broadcast must not fail the underlying mutation — clients also poll /state on load.
    console.error(`broadcast ${kind} failed:`, err)
  }
}

export function broadcastItem(channelId: string, kind: EventKind, item: ShowItem) {
  return broadcast(channelId, kind, { item })
}
