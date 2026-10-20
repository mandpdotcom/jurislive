"use client"
import {useState} from "react"
import Link from "next/link"
import {ArrowDown,ArrowRight,ArrowUpRight,Armchair,CarFront,Construction,Grid2X2,MapPin,Search,ShieldCheck,SlidersHorizontal,UtensilsCrossed} from "lucide-react"
import type {Catalog} from "@/lib/jurislive/types"
import {useResource} from "./hooks"
import {useJuris} from "./provider"
import {Empty,ErrorBox,Loading,Photo,SaleCard} from "./common"
const categories=[{name:"Tout explorer",icon:Grid2X2},{name:"Véhicules",icon:CarFront},{name:"Mobilier",icon:Armchair},{name:"Matériels",icon:Construction},{name:"Équipements",icon:UtensilsCrossed}]
export function Marketplace({favoritesOnly=false}:{favoritesOnly?:boolean}) {
  const {data,error,loading,refresh}=useResource<Catalog>("catalog"),{favorites}=useJuris()
  const [category,setCategory]=useState("Tout explorer"),[query,setQuery]=useState(""),[city,setCity]=useState("Toute la France"),[filterOpen,setFilterOpen]=useState(false)
  const filtered=data?.sales.filter(s=>(!favoritesOnly||favorites.includes(s.id))&&(category==="Tout explorer"||s.category===category)&&(city==="Toute la France"||s.city.startsWith(city))&&`${s.title} ${s.category} ${s.city} ${data.studies.find(t=>t.id===s.study_id)?.name}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))??[]
  return <div className="page marketplace">
    {data?.read_only&&<div className="configuration-note" role="status"><ShieldCheck size={18}/><p><strong>Preview en lecture seule.</strong> Le catalogue est disponible ; connectez Turso pour activer les profils, les offres et la console. Aucune enchère ne peut être enregistrée sur cet hébergement pour le moment.</p></div>}
    {!favoritesOnly&&<section className="intro">
      <div className="intro-copy"><p className="eyebrow">LA NOUVELLE SALLE DES VENTES</p><h1>Les enchères,<br/><span>au plus près.</span></h1><p>Des biens à découvrir. Des études à rencontrer.<br className="desktop-only"/> Vivez la vente, où que vous soyez.</p><button className="button primary" onClick={()=>document.getElementById("ventes")?.scrollIntoView({behavior:"smooth"})} data-testid="button-explore">Explorer les ventes <ArrowDown size={16}/></button><div className="intro-trust"><ShieldCheck size={17}/><span>Pensé pour les commissaires de justice</span></div></div>
      <Link href="/ventes/mobilite-paris" className="feature-sale" data-testid="link-featured-sale"><Photo src="/images/vehicule.webp" alt="Illustration d'un break gris dans une salle de vente"/><div className="feature-top"><span className="badge-light"><i/>VENTE DÉMONSTRATION</span><span className="feature-location"><MapPin size={13}/>Paris</span></div><div className="feature-bottom"><div><p>LA SÉLECTION MOBILITÉ</p><h2>Votre prochain départ<br/>se trouve peut-être ici.</h2><span>{data?.sales.find(s=>s.id==="mobilite-paris")?.lot_count??3} lots fictifs · {data?.studies.find(s=>s.id==="etude-paris")?.name??"Étude Rive Gauche"}</span></div><span className="round-arrow"><ArrowUpRight size={25}/></span></div></Link>
    </section>}
    <section className="discovery" id="ventes">
      <div className="section-heading"><div><p className="eyebrow">{favoritesOnly?"VOTRE CARNET DE DÉCOUVERTES":"LE CATALOGUE NATIONAL"}</p><h2>{favoritesOnly?"Ma sélection":"Trouvez votre prochaine opportunité."}</h2></div><span className="count-label">{data?.sales.length ?? "…"} ventes de démonstration</span></div>
      <div className="browse-toolbar"><div className="category-tabs" role="group" aria-label="Catégorie de biens">{categories.map(c=><button key={c.name} onClick={()=>setCategory(c.name)} className={category===c.name?"active":""} aria-pressed={category===c.name} data-testid={`category-${c.name}`}><c.icon size={18}/>{c.name}</button>)}</div><button className={`filter-toggle ${filterOpen?"active":""}`} onClick={()=>setFilterOpen(!filterOpen)} aria-expanded={filterOpen} aria-label="Afficher les filtres"><SlidersHorizontal size={17}/><span>Filtres</span></button></div>
      <div className="search-row"><div className="search-field"><Search size={18}/><input aria-label="Rechercher une vente" placeholder="Un bien, une catégorie, une étude…" value={query} onChange={e=>setQuery(e.target.value)} data-testid="input-search"/>{query&&<button onClick={()=>setQuery("")} aria-label="Effacer la recherche">×</button>}</div><label className="city-filter"><MapPin size={16}/><select aria-label="Ville" value={city} onChange={e=>setCity(e.target.value)}><option>Toute la France</option><option>Paris</option><option>Lyon</option><option>Bordeaux</option></select></label></div>
      {filterOpen&&<div className="filter-panel"><p>Filtrez par catégorie, ville ou mot-clé. Les {data?.sales.length??4} ventes présentées sont fictives.</p><button className="text-button" onClick={()=>{setCity("Toute la France");setCategory("Tout explorer");setQuery("")}}>Réinitialiser les filtres</button></div>}
      {loading?<Loading/>:error?<ErrorBox message={error} retry={refresh}/>:filtered.length?<div className="sales-grid">{filtered.map(s=><SaleCard key={s.id} sale={s} study={data?.studies.find(t=>t.id===s.study_id)}/>)}</div>:<Empty onReset={favoritesOnly?undefined:()=>{setCategory("Tout explorer");setQuery("");setCity("Toute la France")}}/>}
      <p className="illustration-note">Catalogue de démonstration · Études, biens et estimations fictifs · Visuels générés, non contractuels</p>
    </section>
    {!favoritesOnly&&<section className="study-banner"><div><p className="eyebrow">VOTRE ÉTUDE. VOTRE SALLE. VOTRE SIGNATURE.</p><h2>Une salle des ventes<br/>qui vous ressemble.</h2></div><div><p>Votre espace indépendant, vos lots et votre vidéo.<br/>Découvrez la console de vente depuis votre téléphone.</p><Link href="/console" className="button light">Entrer dans le studio démo <ArrowRight size={17}/></Link></div></section>}
  </div>
}
