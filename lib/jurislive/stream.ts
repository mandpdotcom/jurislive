import { StreamClient } from "@stream-io/node-sdk"
import { StreamChat } from "stream-chat"
import { DomainError, authorizeStudy, state } from "./engine"
import type { Session } from "./types"

// Lazy construction: browsing and simulated auctions never require Stream credentials.
function clients() {
  const apiKey = process.env.STREAM_API_KEY, secret = process.env.STREAM_API_SECRET
  if (!apiKey || !secret) throw new DomainError("GetStream n'est pas configuré. La simulation d'enchères reste disponible.",503)
  return {apiKey,video:new StreamClient(apiKey,secret),chat:StreamChat.getInstance(apiKey,secret)}
}
export async function streamToken(session: Session, saleId: string) {
  const {sale} = await state(saleId)
  if (session.role === "auctioneer") authorizeStudy(session,sale.study_id)
  const {apiKey,video,chat} = clients()
  const userId = `jl_${session.id.replace(/-/g,"")}`, callId = `jl_${saleId}`
  const isHost = session.role === "auctioneer"
  await video.upsertUsers([{id:userId,name:session.name,role:"user"}])
  await chat.upsertUsers([{id:userId,name:session.name,role:"user"}])
  const call = video.video.call("livestream",callId)
  if (isHost) {
    await call.getOrCreate({data:{created_by_id:userId,members:[{user_id:userId,role:"host"}]}})
    await call.updateCallMembers({update_members:[{user_id:userId,role:"host"}]})
  } else {
    // A buyer cannot create a call or elevate their membership to host.
    await call.get()
    await call.updateCallMembers({update_members:[{user_id:userId,role:"user"}]})
  }
  // "messaging" members-only channel; auction events are invalidation signals,
  // never trusted state. Client always re-reads the authoritative API.
  const channel = chat.channel("messaging",callId)
  if (isHost) {
    const hostChannel = chat.channel("messaging",callId,{created_by_id:userId,members:[userId]})
    await hostChannel.create()
  }
  await channel.addMembers([userId])
  return {
    apiKey,userId,name:session.name,callId,isHost,
    videoToken:video.generateCallToken({user_id:userId,call_cids:[`livestream:${callId}`],validity_in_seconds:900}),
    chatToken:chat.createToken(userId,Math.floor(Date.now()/1000)+900),
  }
}
export async function broadcastState(saleId: string) {
  if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) return
  try {
    const {chat} = clients()
    await chat.channel("messaging",`jl_${saleId}`).sendEvent({type:"auction_update",sale_id:saleId} as unknown as Parameters<ReturnType<typeof chat.channel>["sendEvent"]>[0])
  } catch {
    // Mutation is committed. Polling (1.5s) reconciles even if the transport fails.
    console.warn("JURISLIVE: broadcast unavailable; authoritative polling remains active")
  }
}
