"use client"
import Link from "next/link"
import {ArrowRight,MapPin} from "lucide-react"
import type {Catalog} from "@/lib/jurislive/types"
import {useResource} from "./hooks"
import {Empty,ErrorBox,Loading,SaleCard} from "./common"
export function Studies({slug}:{slug?:string}) {
  const {data,error,loading,refresh}=useResource<Catalog>("catalog")
  if(loading)return <div className="page"><Loading/></div>
  if(error)return <div className="page"><ErrorBox message={error} retry={refresh}/></div>
  const study=slug?data?.studies.find(s=>s.slug===slug):null
  if(slug&&!study)return <div className="page"><Empty title="Cette étude est introuvable."/></div>
  return <div className="page studies">
    {study?<><Link className="breadcrumb" href="/etudes">Les études / {study.city}</Link><section className="study-profile" style={{background:study.color}}><span className="large-avatar">{study.initials}</span><div><p className="eyebrow">ESPACE INDÉPENDANT · ÉTUDE FICTIVE</p><h1>{study.name}</h1><p>{study.description}</p><span className="location"><MapPin size={16}/>{study.city}, France</span></div></section><div className="section-heading"><h2>Le catalogue de l&apos;étude</h2><span className="count-label">Lots fictifs</span></div><div className="sales-grid">{data?.sales.filter(s=>s.study_id===study.id).map(s=><SaleCard key={s.id} sale={s} study={study}/>)}</div></>:<><p className="eyebrow">DES PROFESSIONNELS, PARTOUT EN FRANCE</p><h1>À chaque étude, sa signature.</h1><p className="lede">Découvrez les espaces indépendants de nos trois études fictives.<br/>Un même accès national, une identité propre à chaque étude.</p><div className="study-directory">{data?.studies.map(s=><Link href={`/etudes/${s.slug}`} key={s.id} className="study-directory-card"><span className="large-avatar" style={{background:s.color}}>{s.initials}</span><div><span className="eyebrow">{s.city} · ÉTUDE FICTIVE</span><h2>{s.name}</h2><p>{s.description}</p><span className="text-link">Découvrir l&apos;étude <ArrowRight size={16}/></span></div></Link>)}</div></>}
  </div>
}
