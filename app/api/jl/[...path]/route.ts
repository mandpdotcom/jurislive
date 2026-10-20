import { NextRequest, NextResponse } from "next/server"
import { authenticate, catalog, control, createSession, DomainError, getAudit, placeBid, state, updateStudy } from "@/lib/jurislive/engine"
import { broadcastState, streamToken } from "@/lib/jurislive/stream"
import type { DemoPersona } from "@/lib/jurislive/types"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30
type Ctx = {params:Promise<{path:string[]}>}
const reply = (body:unknown,status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}})
async function run(req:NextRequest,ctx:Ctx) {
  try {
    const {path} = await ctx.params, [resource,id] = path
    if (path.length > 2) throw new DomainError("Route introuvable.",404)
    if (req.method === "GET") {
      if (resource === "catalog" && !id) return reply(await catalog())
      if (resource === "state" && id) return reply(await state(id))
      if (resource === "health") return reply({demo:true,video_configured:!!(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET),turso_configured:!!process.env.TURSO_DATABASE_URL})
      if (resource === "audit" && id) return reply({events:await getAudit(await authenticate(req.headers.get("authorization")?.replace(/^Bearer /,"") ?? ""),id)})
      throw new DomainError("Route introuvable.",404)
    }
    if (!req.headers.get("content-type")?.includes("application/json")) throw new DomainError("Format JSON requis.",415)
    if (Number(req.headers.get("content-length") ?? 0) > 8192) throw new DomainError("Requête trop volumineuse.",413)
    const raw = await req.text()
    if (raw.length > 8192) throw new DomainError("Requête trop volumineuse.",413)
    let b: Record<string,unknown>
    try { b = JSON.parse(raw); if (!b || Array.isArray(b) || typeof b !== "object") throw Error() }
    catch { throw new DomainError("JSON invalide.") }
    if (resource === "session" && !id && req.method === "POST") return reply(await createSession(b.persona as DemoPersona),201)
    const s = await authenticate(req.headers.get("authorization")?.replace(/^Bearer /,"") ?? "")
    if (resource === "bid" && id && req.method === "POST") {
      const result = await placeBid(s,id,String(b.lot_id ?? ""),b.amount_cents as number,String(b.request_id ?? ""))
      await broadcastState(id)
      return reply(result)
    }
    if (resource === "control" && id && req.method === "POST") {
      const result = await control(s,id,String(b.action ?? ""),typeof b.lot_id === "string" ? b.lot_id : undefined)
      await broadcastState(id)
      return reply(result)
    }
    if (resource === "study" && id && req.method === "PATCH") return reply(await updateStudy(s,id,b.name as string,b.color as string))
    if (resource === "stream" && id && req.method === "POST") return reply(await streamToken(s,id))
    throw new DomainError("Action indisponible en démonstration.",404)
  } catch (e) {
    if (e instanceof DomainError) return reply({error:e.message,demo:true},e.status)
    console.error("JURISLIVE request failed:",e instanceof Error ? e.name : "unknown")
    return reply({error:"Service indisponible. Vérifiez la configuration serveur (Turso ou GetStream). Aucune offre n'est validée par cette réponse.",demo:true},503)
  }
}
export const GET = run
export const POST = run
export const PATCH = run
