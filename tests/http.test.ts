import {test} from "node:test"
import assert from "node:assert/strict"
const base=process.env.TEST_URL??"http://localhost:3001"
async function request(path:string,body?:unknown,token?:string,method?:string){
  return fetch(`${base}/api/${path}`,{method:method??(body?"POST":"GET"),headers:{...(body?{"content-type":"application/json"}:{}),...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined})
}
test("HTTP catalog and health mark the demonstration",async()=>{
  const r=await request("jl/catalog");assert.equal(r.status,200);const d=await r.json();assert.equal(d.demo,true);assert.equal(d.sales.length,4)
  const health=await(await request("jl/health")).json();assert.equal(health.demo,true)
})
test("HTTP legacy checkout and token endpoints are disabled",async()=>{
  assert.equal((await request("checkout",{})).status,410)
  assert.equal((await request("token",{})).status,410)
})
test("HTTP mutations require a valid opaque session",async()=>{
  assert.equal((await request("jl/control/mobilite-paris",{action:"start",lot_id:"lot-1"})).status,401)
  assert.equal((await request("jl/control/mobilite-paris",{action:"start",lot_id:"lot-1"},"0".repeat(64))).status,401)
})
test("HTTP client role and study claims never override session",async()=>{
  const {token}=await(await request("jl/session",{persona:"buyer",role:"auctioneer",study_id:"etude-paris"})).json()
  assert.equal((await request("jl/control/mobilite-paris",{action:"pause",role:"auctioneer",study_id:"etude-paris"},token)).status,403)
})
test("HTTP tenant journal and customization isolation",async()=>{
  const {token}=await(await request("jl/session",{persona:"lyon"})).json()
  assert.equal((await request("jl/audit/etude-paris",undefined,token)).status,403)
  assert.equal((await request("jl/study/etude-paris",{name:"Forbidden","#color":"#ffffff"},token,"PATCH")).status,403)
})
test("HTTP invalid persona and content type rejected",async()=>{
  assert.equal((await request("jl/session",{persona:"admin"})).status,400)
  const r=await fetch(`${base}/api/jl/session`,{method:"POST",body:"persona=paris",headers:{"content-type":"text/plain"}});assert.equal(r.status,415)
})
test("HTTP oversized JSON rejected",async()=>{
  assert.equal((await request("jl/session",{persona:"buyer",payload:"x".repeat(9000)})).status,413)
})
test("HTTP no-cache and robots headers present",async()=>{
  const r=await request("jl/catalog");assert.equal(r.headers.get("cache-control"),"no-store");assert.match(r.headers.get("x-robots-tag")??"",/noindex/)
})
