"use client"
/* eslint-disable @next/next/no-img-element */
import Link from "next/link"
import { ArrowRight, Heart, MapPin, Radio, RotateCw, SearchX } from "lucide-react"
import type {Sale,Study} from "@/lib/jurislive/types"
import {useJuris} from "./provider"
export function Photo({src,alt,className=""}:{src:string;alt:string;className?:string}) {
  const base=typeof window!=="undefined"?(window as Window & {__JURISLIVE_ASSETS__?:string}).__JURISLIVE_ASSETS__??"":""
  return <img src={`${base}${src}`} alt={alt} className={className} loading="lazy" width={724} height={543} onError={e=>{e.currentTarget.style.opacity=".2"}}/>
}
export function Status({status}:{status:Sale["status"]}) {
  return <span className={`status ${status}`}><i/>{status==="live"?"Enchères démo ouvertes":status==="paused"?"Simulation en pause":status==="ended"?"Simulation terminée":"PRÊT À EXPLORER"}</span>
}
export function SaleCard({sale,study}:{sale:Sale;study?:Study}) {
  const {favorites,toggleFavorite}=useJuris(),fav=favorites.includes(sale.id)
  return <article className="sale-card" data-testid={`card-sale-${sale.id}`}>
    <div className="sale-visual"><Link href={`/ventes/${sale.id}`} aria-label={`Découvrir ${sale.title}`}><Photo src={sale.image} alt={`Illustration générée : ${sale.category.toLowerCase()}`}/></Link><span className="image-tag">{sale.category}</span><button className={`favorite ${fav?"is-favorite":""}`} aria-label={fav?"Retirer de ma sélection":"Ajouter à ma sélection"} aria-pressed={fav} onClick={()=>toggleFavorite(sale.id)} data-testid={`favorite-${sale.id}`}><Heart size={17} fill={fav?"currentColor":"none"}/></button><span className="fictif-tag">LOTS FICTIFS</span></div>
    <div className="card-topline"><Status status={sale.status}/><span>{sale.lot_count ?? 3} lots</span></div>
    <Link href={`/ventes/${sale.id}`} className="card-title">{sale.title}</Link>
    <div className="card-location"><MapPin size={13}/>{sale.city}</div>
    <Link href={`/etudes/${study?.slug ?? ""}`} className="study-line"><span className="avatar" style={{background:study?.color}}>{study?.initials}</span><span>{study?.name}<small>Étude fictive</small></span><ArrowRight size={16}/></Link>
  </article>
}
export function Loading(){return <div className="loading-grid" aria-label="Chargement du catalogue">{[0,1,2,3].map(n=><div className="skeleton" key={n}/>)}</div>}
export function ErrorBox({message,retry}:{message:string;retry?:()=>void}) {return <div className="error-box" role="alert"><p>{message}</p>{retry&&<button className="button secondary" onClick={retry}><RotateCw size={16}/>Réessayer</button>}</div>}
export function Empty({title="Aucune vente dans cette sélection.",onReset}:{title?:string;onReset?:()=>void}) {return <div className="empty"><SearchX size={32}/><h2>{title}</h2><p>Explorez une autre catégorie ou retrouvez toutes les ventes.</p>{onReset?<button className="button secondary" onClick={onReset}>Voir toutes les ventes</button>:<Link className="button secondary" href="/">Explorer les ventes <ArrowRight size={16}/></Link>}</div>}
export function DemoNote(){return <div className="quiet-note"><Radio size={16}/><p>Une expérience réelle, des ventes fictives.<br/><span>Vos offres sont des tests sans engagement. Aucun paiement n&apos;est possible.</span></p></div>}
