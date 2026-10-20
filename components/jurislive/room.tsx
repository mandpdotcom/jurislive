"use client"
import Link from "next/link"
import {ArrowLeft,ArrowUpRight} from "lucide-react"
import {money,type SaleState} from "@/lib/jurislive/types"
import {useResource} from "./hooks"
import {AuctionPanel} from "./auction-panel"
import {Video} from "./video"
import {DemoNote,ErrorBox,Loading,Photo,Status} from "./common"
export function Room({id}:{id:string}) {
  const {data,error,loading,refresh}=useResource<SaleState>(`state/${id}`,1500)
  if(loading)return <div className="page"><Loading/></div>
  if(!data)return <div className="page"><ErrorBox message={error||"Salle indisponible."} retry={refresh}/></div>
  const current=data.lots.find(l=>l.status==="live")??data.lots.find(l=>l.status==="queued")??data.lots.at(-1)
  return <div className="page room"><Link href={`/ventes/${id}`} className="breadcrumb"><ArrowLeft size={13}/> Retour au catalogue de la vente</Link><div className="room-heading"><div><Status status={data.sale.status}/><h1>{data.sale.title}</h1></div><Link href={`/etudes/${data.study.slug}`} className="button secondary">{data.study.initials} <ArrowUpRight size={14}/></Link></div>{error&&<ErrorBox message={`Connexion interrompue : les offres sont désactivées. ${error}`} retry={refresh}/>}<div className="room-grid"><div><Video id={id} image={data.sale.image} configured={data.video_configured} host={false} onEvent={refresh}/><div className="room-meta"><span>{data.study.name} · Étude fictive</span><span>Offres : actualisation toutes les 1,5 s</span></div><div className="queue"><h2>Le déroulé de la vente</h2>{data.lots.map(l=><div className={`queue-row ${l.id===current?.id?"current":""}`} key={l.id}><Photo src={l.image} alt={`Illustration de catégorie du lot ${l.number}`}/><div><small>LOT {String(l.number).padStart(2,"0")} · {l.status==="live"?"OUVERT":l.status==="closed"?"CLÔTURÉ (SIMULATION)":"À VENIR"}</small><strong>{l.title}</strong></div><small>{money(l.starting_cents)}</small></div>)}</div></div><AuctionPanel data={data} lot={current} refresh={refresh} offline={!!error}/></div><DemoNote/></div>
}
