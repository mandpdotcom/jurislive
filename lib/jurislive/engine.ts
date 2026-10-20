// Derived from GetStream VinylStream MIT auction engine (lib/store.ts).
// Retains transactions, server clock, bid-floor checks and 10-second anti-sniping.
// Adds membership checks, integer cents, scoped lookups, idempotency and chained audit.
import { createHash, randomBytes, randomUUID } from "node:crypto"
import type { Client, Transaction, InArgs } from "@libsql/client"
import { getDB, transaction } from "./db"
import type { Audit, Catalog, DemoPersona, Lot, Sale, SaleState, Session, Study } from "./types"
import {studies as fixtureStudies,sales as fixtureSales,lots as fixtureLots} from "./fixtures"

type DB = Client | Transaction
export class DomainError extends Error { constructor(message: string, public status = 400) { super(message) } }
const hash = (s: string) => createHash("sha256").update(s).digest("hex")
async function one<T>(db: DB, sql: string, args: InArgs = []) { return (await db.execute({sql,args})).rows[0] as unknown as T | undefined }
async function many<T>(db: DB, sql: string, args: InArgs = []) { return (await db.execute({sql,args})).rows as unknown as T[] }
export async function audit(tx: Transaction, study: string, actor: string, action: string, entity: string, data: unknown) {
  const previous = await one<Audit>(tx,"SELECT * FROM jl_audit WHERE study_id=? ORDER BY id DESC LIMIT 1",[study])
  const at = Date.now(), payload = JSON.stringify(data), prev = previous?.hash ?? "genesis"
  const digest = hash(JSON.stringify([study,actor,action,entity,payload,at,prev]))
  await tx.execute({sql:"INSERT INTO jl_audit(study_id,actor,action,entity,payload,created_at,prev_hash,hash) VALUES(?,?,?,?,?,?,?,?)",args:[study,actor,action,entity,payload,at,prev,digest]})
}
export async function createSession(persona: DemoPersona) {
  if(process.env.VERCEL&&!process.env.TURSO_DATABASE_URL)throw new DomainError("Profils désactivés sur cette Preview : connectez Turso pour activer les simulations.",503)
  const profiles = {
    buyer: {role:"buyer" as const, study_id:null, name:"Acheteur démo"},
    paris: {role:"auctioneer" as const, study_id:"etude-paris", name:"Commissaire démo · Paris"},
    lyon: {role:"auctioneer" as const, study_id:"etude-lyon", name:"Commissaire démo · Lyon"},
    bordeaux: {role:"auctioneer" as const, study_id:"etude-bordeaux", name:"Commissaire démo · Bordeaux"},
  }
  if (!Object.hasOwn(profiles,persona)) throw new DomainError("Profil de démonstration inconnu.")
  const p = profiles[persona], id = randomUUID(), token = randomBytes(32).toString("hex")
  const expires_at = Date.now() + 4*60*60*1000
  await transaction(async tx => {
    const active = await one<{n:number}>(tx,"SELECT COUNT(*) n FROM jl_sessions WHERE expires_at>?",[Date.now()])
    if (Number(active?.n) >= 1000) throw new DomainError("Capacité de démonstration atteinte. Réessayez plus tard.",429)
    await tx.execute({sql:"INSERT INTO jl_sessions(id,token_hash,role,study_id,name,expires_at) VALUES(?,?,?,?,?,?)",args:[id,hash(token),p.role,p.study_id,p.name,expires_at]})
  })
  return {token,session:{id,...p,expires_at} as Session}
}
export async function authenticate(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new DomainError("Choisissez un profil de démonstration.",401)
  const s = await one<Session>(await getDB(),"SELECT id,role,study_id,name,expires_at FROM jl_sessions WHERE token_hash=?",[hash(token)])
  if (!s || s.expires_at <= Date.now()) throw new DomainError("Session expirée. Reconnectez votre profil démo.",401)
  return s
}
export function authorizeStudy(s: Session, study: string) {
  if (s.role !== "auctioneer" || s.study_id !== study) throw new DomainError("Cette action est réservée aux membres de cette étude.",403)
}
export async function catalog(): Promise<Catalog> {
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
    return {studies:fixtureStudies,sales:fixtureSales.map(s=>({...s,lot_count:fixtureLots.filter(l=>l.sale_id===s.id).length})),lots:fixtureLots,demo:true,read_only:true}
  }
  const db = await getDB()
  return { studies: await many<Study>(db,"SELECT * FROM jl_studies ORDER BY id"), sales:await many<Sale>(db,"SELECT s.*, (SELECT COUNT(*) FROM jl_lots l WHERE l.sale_id=s.id) AS lot_count FROM jl_sales s ORDER BY s.rowid"), lots:await many<Lot>(db,"SELECT * FROM jl_lots ORDER BY rowid"), demo:true }
}
export async function state(saleId: string): Promise<SaleState> {
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
    const sale=fixtureSales.find(s=>s.id===saleId)
    if(!sale)throw new DomainError("Vente introuvable.",404)
    return {sale,study:fixtureStudies.find(s=>s.id===sale.study_id)!,lots:fixtureLots.filter(l=>l.sale_id===saleId),bids:[],server_time:Date.now(),demo:true,video_configured:false,storage:"unconfigured"}
  }
  const db = await getDB(), sale = await one<Sale>(db,"SELECT * FROM jl_sales WHERE id=?",[saleId])
  if (!sale) throw new DomainError("Vente introuvable.",404)
  return { sale, study:(await one<Study>(db,"SELECT * FROM jl_studies WHERE id=?",[sale.study_id]))!,
    lots:await many<Lot>(db,"SELECT * FROM jl_lots WHERE sale_id=? ORDER BY number",[saleId]),
    bids:await many(db,"SELECT id,lot_id,amount_cents,alias,created_at FROM jl_bids WHERE sale_id=? ORDER BY created_at DESC LIMIT 50",[saleId]),
    server_time:Date.now(), demo:true, video_configured:!!(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET), storage:process.env.TURSO_DATABASE_URL?.startsWith("libsql:") || process.env.TURSO_DATABASE_URL?.startsWith("https:") ? "turso" : "local" }
}
export async function placeBid(s: Session, saleId: string, lotId: string, amount: number, requestId: string) {
  if (s.role !== "buyer") throw new DomainError("Utilisez un profil acheteur pour enchérir.",403)
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100_000_000) throw new DomainError("Montant invalide.")
  if (!/^[\w-]{16,80}$/.test(requestId)) throw new DomainError("Identifiant de requête invalide.")
  return transaction(async tx => {
    const prior = await one<{lot_id:string;amount_cents:number}>(tx,"SELECT lot_id,amount_cents FROM jl_bids WHERE session_id=? AND request_id=?",[s.id,requestId])
    if (prior) {
      if (prior.lot_id !== lotId || prior.amount_cents !== amount) throw new DomainError("Cette requête a déjà été utilisée pour une autre offre.",409)
      return {accepted:true,replayed:true}
    }
    const lot = await one<Lot>(tx,"SELECT * FROM jl_lots WHERE id=? AND sale_id=?",[lotId,saleId])
    const sale = await one<Sale>(tx,"SELECT * FROM jl_sales WHERE id=?",[saleId])
    if (!lot || !sale || lot.study_id !== sale.study_id) throw new DomainError("Lot introuvable dans cette vente.",404)
    const now = Date.now()
    if (sale.status !== "live" || lot.status !== "live" || !lot.ends_at || now >= lot.ends_at) throw new DomainError("Les offres sont fermées pour ce lot.",409)
    const floor = lot.current_cents === null ? lot.starting_cents : lot.current_cents + lot.increment_cents
    if (amount < floor || (amount - lot.starting_cents) % lot.increment_cents !== 0) throw new DomainError("L'offre doit respecter le montant minimum et le pas d'enchère.",409)
    const count = await one<{n:number}>(tx,"SELECT COUNT(*) n FROM jl_bids WHERE session_id=? AND created_at>?",[s.id,now-10_000])
    if (Number(count?.n) >= 8) throw new DomainError("Trop d'offres. Réessayez dans quelques secondes.",429)
    const ends = Math.max(lot.ends_at,now+10_000), alias = `Acheteur ${s.id.slice(0,4).toUpperCase()}`
    await tx.execute({sql:"UPDATE jl_lots SET current_cents=?,high_bidder=?,ends_at=?,version=version+1 WHERE id=? AND sale_id=? AND study_id=?",args:[amount,s.id,ends,lotId,saleId,lot.study_id]})
    await tx.execute({sql:"INSERT INTO jl_bids(id,lot_id,sale_id,study_id,session_id,amount_cents,alias,created_at,request_id) VALUES(?,?,?,?,?,?,?,?,?)",args:[randomUUID(),lotId,saleId,lot.study_id,s.id,amount,alias,now,requestId]})
    await audit(tx,lot.study_id,s.id,"bid.accepted",lotId,{amount_cents:amount,request_id:requestId,ends_at:ends,demo:true})
    return {accepted:true,replayed:false}
  })
}
export async function control(s: Session, saleId: string, action: string, lotId?: string) {
  return transaction(async tx => {
    const sale = await one<Sale>(tx,"SELECT * FROM jl_sales WHERE id=?",[saleId])
    if (!sale) throw new DomainError("Vente introuvable.",404)
    authorizeStudy(s,sale.study_id)
    if (action === "start") {
      const lot = await one<Lot>(tx,"SELECT * FROM jl_lots WHERE id=? AND sale_id=? AND study_id=?",[lotId ?? "",saleId,sale.study_id])
      if (!lot) throw new DomainError("Lot introuvable dans votre étude.",404)
      if (sale.status === "ended" || lot.status !== "queued") throw new DomainError("Ce lot n'est plus en attente.",409)
      const current = await one<Lot>(tx,"SELECT * FROM jl_lots WHERE sale_id=? AND status='live'",[saleId])
      if (current) throw new DomainError("Clôturez d'abord le lot en cours.",409)
      await tx.execute({sql:"UPDATE jl_lots SET status='live',ends_at=?,version=version+1 WHERE id=?",args:[Date.now()+120_000,lot.id]})
      await tx.execute({sql:"UPDATE jl_sales SET status='live' WHERE id=?",args:[saleId]})
    } else if (action === "pause") {
      if (sale.status !== "live") throw new DomainError("La vente n'est pas ouverte.",409)
      await tx.execute({sql:"UPDATE jl_sales SET status='paused' WHERE id=?",args:[saleId]})
    } else if (action === "resume") {
      if (sale.status !== "paused") throw new DomainError("La vente n'est pas en pause.",409)
      await tx.execute({sql:"UPDATE jl_sales SET status='live' WHERE id=?",args:[saleId]})
      await tx.execute({sql:"UPDATE jl_lots SET ends_at=?,version=version+1 WHERE sale_id=? AND status='live'",args:[Date.now()+120_000,saleId]})
    } else if (action === "close") {
      const lot = await one<Lot>(tx,"SELECT * FROM jl_lots WHERE id=? AND sale_id=? AND study_id=?",[lotId ?? "",saleId,sale.study_id])
      if (!lot || lot.status !== "live") throw new DomainError("Aucun lot ouvert à clôturer.",409)
      await tx.execute({sql:"UPDATE jl_lots SET status='closed',ends_at=NULL,version=version+1 WHERE id=?",args:[lot.id]})
    } else if (action === "end") {
      await tx.execute({sql:"UPDATE jl_lots SET status='closed',ends_at=NULL,version=version+1 WHERE sale_id=? AND status='live'",args:[saleId]})
      await tx.execute({sql:"UPDATE jl_sales SET status='ended' WHERE id=?",args:[saleId]})
    } else if (action === "rehearse") {
      // Explicit new rehearsal, never deletes bid or audit history.
      if (sale.status === "live" || sale.status === "paused") throw new DomainError("Terminez la simulation avant d'en lancer une autre.",409)
      const next = await one<{n:number}>(tx,"SELECT MAX(number) n FROM jl_lots WHERE sale_id=?",[saleId])
      const first = await one<Lot>(tx,"SELECT * FROM jl_lots WHERE sale_id=? ORDER BY number LIMIT 1",[saleId])
      if (!first) throw new DomainError("Aucun lot à dupliquer.")
      if (Number(next?.n) >= 30) throw new DomainError("Limite de répétitions atteinte.",429)
      const id = `lot-${randomUUID()}`
      await tx.execute({sql:"INSERT INTO jl_lots(id,sale_id,study_id,number,title,description,image,estimate_low,estimate_high,starting_cents,increment_cents,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'queued')",args:[id,saleId,sale.study_id,Number(next?.n ?? 0)+1,`${first.title} · répétition`,first.description,first.image,first.estimate_low,first.estimate_high,first.starting_cents,first.increment_cents]})
      await tx.execute({sql:"UPDATE jl_sales SET status='ready' WHERE id=?",args:[saleId]})
    } else throw new DomainError("Action inconnue.")
    await audit(tx,sale.study_id,s.id,`sale.${action}`,lotId ?? saleId,{sale_id:saleId,demo:true})
    return {ok:true,demo:true}
  })
}
export async function updateStudy(s: Session, id: string, name: string, color: string) {
  authorizeStudy(s,id)
  if (typeof name !== "string" || name.trim().length < 3 || name.length > 70 || !/^#[0-9a-fA-F]{6}$/.test(color)) throw new DomainError("Nom (3 à 70 caractères) ou couleur invalide.")
  return transaction(async tx => {
    await tx.execute({sql:"UPDATE jl_studies SET name=?,color=? WHERE id=?",args:[name.trim(),color,id]})
    await audit(tx,id,s.id,"study.updated",id,{name:name.trim(),color})
    return {ok:true}
  })
}
export async function getAudit(s: Session, studyId: string) {
  authorizeStudy(s,studyId)
  return many<Audit>(await getDB(),"SELECT * FROM jl_audit WHERE study_id=? ORDER BY id DESC LIMIT 500",[studyId])
}
