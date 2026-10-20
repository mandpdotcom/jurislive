"use client"
import {useEffect,useState} from "react"
import Link from "next/link"
import {ArrowRight,Clock3,Gavel,History} from "lucide-react"
import {money,type Lot,type SaleState} from "@/lib/jurislive/types"
import {api,useJuris} from "./provider"
export function AuctionPanel({data,lot,host=false,offline=false,refresh}:{data:SaleState;lot:Lot|undefined;host?:boolean;offline?:boolean;refresh:()=>Promise<void>}) {
  const {session,token,login}=useJuris(),[now,setNow]=useState(data.server_time),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("")
  useEffect(()=>{const offset=data.server_time-Date.now();const t=setInterval(()=>setNow(Date.now()+offset),250);return()=>clearInterval(t)},[data.server_time])
  const left=Math.max(0,Math.ceil(((lot?.ends_at??0)-now)/1000)),open=data.sale.status==="live"&&lot?.status==="live"&&left>0&&!offline
  const next=lot?.current_cents===null?lot.starting_cents:(lot?.current_cents??0)+(lot?.increment_cents??0)
  const bids=data.bids.filter(b=>b.lot_id===lot?.id)
  async function bid(){setBusy(true);setError("");setMessage("");try{
    await api(`bid/${data.sale.id}`,{token,body:{lot_id:lot?.id,amount_cents:next,request_id:crypto.randomUUID()}})
    setMessage("Offre de démonstration enregistrée. Aucun engagement d'achat.");await refresh()
  }catch(e){setError((e as Error).message);await refresh()}finally{setBusy(false)}}
  async function becomeBuyer(){setBusy(true);setError("");try{await login("buyer")}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <aside className="auction-panel"><div className="lot-label"><p className="eyebrow" style={{margin:0}}>LOT {String(lot?.number??1).padStart(2,"0")} · FICTIF</p><span className="countdown"><Clock3 size={13}/> {data.sale.status==="paused"?"En pause":lot?.status==="live"?`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`:lot?.status==="closed"?"Clôturé":"En attente"}</span></div><h2>{lot?.title??"Aucun lot sélectionné"}</h2><p className="auction-description">{lot?.description}</p><div className="bid-value"><span>{lot?.current_cents===null?"Mise à prix fictive":"Dernière offre de démonstration"}</span><strong data-testid="current-price">{money(lot?.current_cents??lot?.starting_cents)}</strong><small>Estimation : {money(lot?.estimate_low)} à {money(lot?.estimate_high)} · Pas : {money(lot?.increment_cents)}</small></div>
    {!host&&(data.storage==="unconfigured"?<p className="feedback">Preview en lecture seule : Turso doit être connecté pour activer les offres.</p>:!session||session.role!=="buyer"?<button className="button primary wide" onClick={becomeBuyer} disabled={busy} data-testid="button-buyer-session"><Gavel size={17}/>{busy?"Connexion…":"Essayer comme acheteur"}</button>:<button className="button primary bid-button" onClick={bid} disabled={busy||!open} data-testid="button-bid"><span>{busy?"Enregistrement…":open?"Enchérir pour de faux":lot?.status==="closed"?"Simulation de ce lot clôturée":lot?.status==="live"&&left===0?"Temps écoulé":data.sale.status==="paused"?"Vente en pause":"En attente d'ouverture"}</span>{open&&<><strong>{money(next)}</strong><ArrowRight size={17}/></>}</button>)}
    {!host&&!open&&<p className="bid-disclaimer">Pour ouvrir ce lot, utilisez la console de l&apos;étude dans un autre onglet. <Link href="/console" target="_blank" rel="noopener">Ouvrir le studio</Link></p>}
    <p className="bid-disclaimer">Démonstration uniquement · Aucun achat, aucuns frais</p>
    {message&&<p className="feedback" role="status">{message}</p>}{error&&<p className="feedback error" role="alert">{error}</p>}
    <div className="auction-history"><h3><History size={15}/>Les dernières offres</h3>{bids.length?bids.slice(0,5).map(b=><div className="bid-row" key={b.id}><span>{b.alias}</span><time>{new Date(b.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</time><strong>{money(b.amount_cents)}</strong></div>):<p>Aucune offre pour ce lot. L&apos;historique apparaîtra ici, sans enchérisseurs simulés automatiquement.</p>}</div>
  </aside>
}
