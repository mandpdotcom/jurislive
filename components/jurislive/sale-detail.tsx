"use client"
import Link from "next/link"
import {ArrowRight,MapPin,Radio,ShieldCheck} from "lucide-react"
import {money,type SaleState} from "@/lib/jurislive/types"
import {useResource} from "./hooks"
import {DemoNote,ErrorBox,Loading,Photo,Status} from "./common"
export function SaleDetail({id}:{id:string}) {
  const {data,error,loading,refresh}=useResource<SaleState>(`state/${id}`,5000)
  if(loading)return <div className="page"><Loading/></div>
  if(error||!data)return <div className="page"><ErrorBox message={error||"Vente indisponible."} retry={refresh}/></div>
  const {sale,study,lots}=data
  return <div className="page sale-detail"><Link href="/" className="breadcrumb">Explorer / {sale.category}</Link><div className="sale-detail-top"><div className="detail-image"><Photo src={sale.image} alt={`Illustration de la vente ${sale.category}`}/><span className="fictif-tag">ILLUSTRATION · LOTS FICTIFS</span></div><div className="detail-copy"><Status status={sale.status}/><h1>{sale.title}</h1><p className="location"><MapPin size={16}/>{sale.city} <span>· {lots.length} lots</span></p><Link className="study-line" href={`/etudes/${study.slug}`}><span className="avatar" style={{background:study.color}}>{study.initials}</span><span>{study.name}<small>Étude fictive de démonstration</small></span><ArrowRight size={18}/></Link><p>Entrez dans la salle, découvrez les lots et testez les enchères. Une expérience sans engagement, pensée pour le direct.</p><Link href={`/salle/${id}`} className="button primary wide" data-testid="button-enter-room"><Radio size={18}/>Entrer dans la salle de démonstration <ArrowRight size={17}/></Link><div className="quiet-note"><ShieldCheck size={17}/><span>Aucune adjudication réelle. Aucun frais ni paiement.</span></div></div></div>
    <div className="section-heading"><h2>Les lots de cette vente</h2><span className="count-label">Estimations fictives · euros</span></div>
    <div className="lot-catalog">{lots.map(l=><article className="catalog-lot" key={l.id}><Photo src={l.image} alt={`Illustration de catégorie du lot ${l.number}`}/><div><span className="eyebrow">LOT {String(l.number).padStart(2,"0")} · FICTIF</span><h3>{l.title}</h3><p>{l.description}</p><div className="lot-prices"><span>Estimation<strong>{money(l.estimate_low)} – {money(l.estimate_high)}</strong></span><span>Mise à prix<strong>{money(l.starting_cents)}</strong></span></div></div><Link href={`/salle/${id}`} className="button secondary" aria-label={`Voir le lot ${l.number} en salle`}>Voir en salle <ArrowRight size={15}/></Link></article>)}</div><DemoNote/>
  </div>
}
