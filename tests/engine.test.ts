import {test,after} from "node:test"
import assert from "node:assert/strict"
import {createHash,randomUUID} from "node:crypto"
import {mkdtempSync,rmSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
const dir=mkdtempSync(join(tmpdir(),"jurislive-test-"))
process.env.JURISLIVE_LOCAL_DB=`file:${dir}/test.db`
delete process.env.TURSO_DATABASE_URL
delete process.env.TURSO_AUTH_TOKEN
const engine=await import("../lib/jurislive/engine")
const {getDB}=await import("../lib/jurislive/db")
const {catalog,createSession,authenticate,control,placeBid,state,getAudit,updateStudy,DomainError}=engine
const paris=await createSession("paris"),lyon=await createSession("lyon"),buyer=await createSession("buyer"),buyer2=await createSession("buyer")
const rejects=(fn:()=>Promise<unknown>,status:number)=>assert.rejects(fn,(e:unknown)=>e instanceof DomainError&&e.status===status)

test("fixtures: 3 studies, 4 sales, 12 lots and demo flag",async()=>{
  const c=await catalog();assert.equal(c.studies.length,3);assert.equal(c.sales.length,4);assert.equal(c.lots.length,12);assert.equal(c.demo,true)
})
test("session tokens are opaque and validated server-side",async()=>{
  assert.equal((await authenticate(buyer.token)).role,"buyer")
  await rejects(()=>authenticate("buyer"),401)
  await rejects(()=>authenticate("0".repeat(64)),401)
  const db=await getDB();const r=await db.execute({sql:"SELECT token_hash FROM jl_sessions WHERE id=?",args:[buyer.session.id]})
  assert.notEqual(r.rows[0].token_hash,buyer.token)
})
test("unknown demo persona rejected",async()=>{await rejects(()=>createSession("admin" as never),400);await rejects(()=>createSession("__proto__" as never),400)})
test("buyer cannot control an auction",async()=>{await rejects(()=>control(buyer.session,"mobilite-paris","start","lot-1"),403)})
test("Lyon cannot operate Paris",async()=>{await rejects(()=>control(lyon.session,"mobilite-paris","start","lot-1"),403)})
test("lot IDs are bound to their sale and study",async()=>{await rejects(()=>control(paris.session,"mobilite-paris","start","lot-7"),404)})
test("server opens lot for two minutes",async()=>{
  await control(paris.session,"mobilite-paris","start","lot-1")
  const d=await state("mobilite-paris");assert.equal(d.sale.status,"live");assert.equal(d.lots[0].status,"live");assert.ok(d.lots[0].ends_at!>Date.now()+110000)
})
test("one active lot maximum",async()=>{await rejects(()=>control(paris.session,"mobilite-paris","start","lot-2"),409)})
test("professional profile cannot self-bid",async()=>{await rejects(()=>placeBid(paris.session,"mobilite-paris","lot-1",1200000,randomUUID()),403)})
test("NaN, infinity, fractional, negative, string amounts rejected",async()=>{
  for(const value of [NaN,Infinity,1200000.5,-1,"1200000"]){await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-1",value as number,randomUUID()),400)}
})
test("wrong-sale bid rejected",async()=>{await rejects(()=>placeBid(buyer.session,"materiel-lyon","lot-1",1200000,randomUUID()),404)})
test("minimum and bid step enforced",async()=>{
  await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-1",1190000,randomUUID()),409)
  await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-1",1200050,randomUUID()),409)
})
test("bid stored atomically with audit; idempotency does not duplicate",async()=>{
  const request=randomUUID();const r=await placeBid(buyer.session,"mobilite-paris","lot-1",1200000,request);assert.equal(r.replayed,false)
  const replay=await placeBid(buyer.session,"mobilite-paris","lot-1",1200000,request);assert.equal(replay.replayed,true)
  await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-1",1210000,request),409)
  const s=await state("mobilite-paris");assert.equal(s.bids.length,1);assert.equal(s.lots[0].current_cents,1200000)
})
test("concurrent same-price bids accept exactly one",async()=>{
  const results=await Promise.allSettled([placeBid(buyer.session,"mobilite-paris","lot-1",1210000,randomUUID()),placeBid(buyer2.session,"mobilite-paris","lot-1",1210000,randomUUID())])
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1)
  const rejected=results.find(r=>r.status==="rejected") as PromiseRejectedResult
  assert.ok(rejected.reason instanceof DomainError);assert.equal(rejected.reason.status,409)
})
test("late bid extends end time by at least ten seconds",async()=>{
  await (await getDB()).execute({sql:"UPDATE jl_lots SET ends_at=? WHERE id='lot-1'",args:[Date.now()+2000]})
  const at=Date.now();await placeBid(buyer2.session,"mobilite-paris","lot-1",1220000,randomUUID())
  assert.ok((await state("mobilite-paris")).lots[0].ends_at!>=at+10000)
})
test("paused auction rejects bids, resume resets a two-minute window",async()=>{
  await control(paris.session,"mobilite-paris","pause")
  await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-1",1230000,randomUUID()),409)
  await control(paris.session,"mobilite-paris","resume");assert.ok((await state("mobilite-paris")).lots[0].ends_at!>Date.now()+110000)
})
test("expired auction rejects bids using server clock",async()=>{
  await (await getDB()).execute({sql:"UPDATE jl_lots SET ends_at=? WHERE id='lot-1'",args:[Date.now()-1]})
  await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-1",1230000,randomUUID()),409)
})
test("closing is explicitly simulated; next lot opens",async()=>{
  await control(paris.session,"mobilite-paris","close","lot-1");await control(paris.session,"mobilite-paris","start","lot-2")
  const s=await state("mobilite-paris");assert.equal(s.lots[0].status,"closed");assert.equal(s.lots[1].status,"live")
})
test("study customization and audit cannot cross tenant boundaries",async()=>{
  await rejects(()=>updateStudy(lyon.session,"etude-paris","Intrusion","#ffffff"),403)
  await rejects(()=>getAudit(lyon.session,"etude-paris"),403)
  await rejects(()=>getAudit(buyer.session,"etude-paris"),403)
  await updateStudy(paris.session,"etude-paris","Étude de recette","#193b4c")
  assert.equal((await catalog()).studies.find(s=>s.id==="etude-paris")?.name,"Étude de recette")
})
test("audit chain verifies and SQL triggers reject rewriting",async()=>{
  const events=(await getAudit(paris.session,"etude-paris")).reverse()
  let previous="genesis"
  for(const e of events){assert.equal(e.prev_hash,previous);const h=createHash("sha256").update(JSON.stringify([e.study_id,e.actor,e.action,e.entity,e.payload,e.created_at,e.prev_hash])).digest("hex");assert.equal(e.hash,h);previous=e.hash}
  await assert.rejects(()=>(getDB().then(db=>db.execute("DELETE FROM jl_audit"))))
  await assert.rejects(()=>(getDB().then(db=>db.execute("UPDATE jl_audit SET actor='forged'"))))
})
test("end rejects further bids; rehearsal preserves history",async()=>{
  const before=(await getAudit(paris.session,"etude-paris")).length
  await control(paris.session,"mobilite-paris","end")
  await rejects(()=>placeBid(buyer.session,"mobilite-paris","lot-2",600000,randomUUID()),409)
  await control(paris.session,"mobilite-paris","rehearse")
  const s=await state("mobilite-paris");assert.equal(s.lots.length,4);assert.equal(s.bids.length,3)
  assert.ok((await getAudit(paris.session,"etude-paris")).length>before)
})
test("expired session denied",async()=>{
  await (await getDB()).execute({sql:"UPDATE jl_sessions SET expires_at=? WHERE id=?",args:[Date.now()-1,buyer.session.id]})
  await rejects(()=>authenticate(buyer.token),401)
})
test("per-session rate limit rejects the ninth accepted offer in ten seconds",async()=>{
  const b=await createSession("buyer")
  await control(lyon.session,"materiel-lyon","start","lot-7")
  for(let i=0;i<8;i++)await placeBid(b.session,"materiel-lyon","lot-7",1400000+i*25000,randomUUID())
  await rejects(()=>placeBid(b.session,"materiel-lyon","lot-7",1600000,randomUUID()),429)
})
test("Vercel without Turso is read-only and cannot mint sessions",async()=>{
  process.env.VERCEL="1"
  try{
    assert.equal((await catalog()).read_only,true)
    assert.equal((await state("mobilite-paris")).storage,"unconfigured")
    await rejects(()=>createSession("paris"),503)
  }finally{delete process.env.VERCEL}
})
after(async()=>{(await getDB()).close();rmSync(dir,{recursive:true,force:true})})
