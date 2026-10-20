"use client"
import {useState} from "react"
import {ArrowRight,Building2,Check,UserRound} from "lucide-react"
import Link from "next/link"
import {useJuris} from "./provider"
import type {DemoPersona} from "@/lib/jurislive/types"
import {ErrorBox} from "./common"
export function Account({compact=false}:{compact?:boolean}) {
  const {session,login,logout}=useJuris(),[busy,setBusy]=useState(""),[error,setError]=useState("")
  async function select(p:DemoPersona){setBusy(p);setError("");try{await login(p)}catch(e){setError((e as Error).message)}finally{setBusy("")}}
  return <section className={compact?"account compact":"page account"}>
    <p className="eyebrow">AUCUNE INSCRIPTION NÉCESSAIRE</p><h1>{compact?"Entrez dans votre studio.":"Découvrez les deux côtés de la vente."}</h1><p>Choisissez un profil fictif pour tester l&apos;expérience.<br/>Ce sélecteur est réservé à la démonstration, ce n&apos;est pas une authentification professionnelle.</p>
    {session&&<div className="session-status"><Check size={18}/><span>Profil actif : {session.name}</span><button className="text-button" onClick={logout}>Se déconnecter</button></div>}
    <div className="persona-grid">{([{id:"buyer",title:"Je découvre et j'enchéris",subtitle:"Acheteur de démonstration",icon:UserRound},{id:"paris",title:"Je pilote une vente à Paris",subtitle:"Étude Rive Gauche · Paris",icon:Building2},{id:"lyon",title:"Je pilote une vente à Lyon",subtitle:"Étude Rhône & Alpes · Lyon",icon:Building2},{id:"bordeaux",title:"Je pilote une vente à Bordeaux",subtitle:"Étude des Chartrons · Bordeaux",icon:Building2}] as const).filter(p=>!compact||p.id!=="buyer").map(p=><button key={p.id} disabled={!!busy} className="persona" onClick={()=>select(p.id)} data-testid={`persona-${p.id}`}><p.icon size={24}/><strong>{p.title}</strong><span>{p.subtitle}</span><small>{busy===p.id?"Connexion…":"Utiliser ce profil"} <ArrowRight size={16}/></small></button>)}</div>
    {error&&<ErrorBox message={error}/>}
    {!compact&&session&&<Link className="button primary" href={session.role==="buyer"?"/":"/console"} data-testid="button-continue">Continuer vers {session.role==="buyer"?"les ventes":"mon studio"} <ArrowRight size={17}/></Link>}
    <p className="privacy-note">Aucun nom réel, e-mail ou document d&apos;identité demandé. La session est conservée en mémoire dans cet onglet et expire après 4 heures ; un rechargement demande de choisir à nouveau un profil.</p>
  </section>
}
