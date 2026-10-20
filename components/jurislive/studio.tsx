"use client"
import {useCallback,useEffect,useState} from "react"
import Link from "next/link"
import {ArrowUpRight,Check,Download,History,Palette,Pause,Play,Radio,Square} from "lucide-react"
import {money,type Audit,type Catalog,type SaleState,type Study} from "@/lib/jurislive/types"
import {useJuris,api} from "./provider"
import {Account} from "./account"
import {useResource} from "./hooks"
import {DemoNote,ErrorBox,Loading,Photo,Status} from "./common"
import {Video} from "./video"
import {AuctionPanel} from "./auction-panel"
export function Studio(){
  const {session}=useJuris(),{data,error,loading,refresh}=useResource<Catalog>("catalog"),[tab,setTab]=useState("live"),[selected,setSelected]=useState("")
  if(!session||session.role!=="auctioneer")return <div className="page"><Account compact/></div>
  if(loading)return <div className="page"><Loading/></div>
  if(error||!data)return <div className="page"><ErrorBox message={error||"Indisponible."} retry={refresh}/></div>
  const study=data.studies.find(s=>s.id===session.study_id),sales=data.sales.filter(s=>s.study_id===session.study_id)
  const sale=sales.find(s=>s.id===selected)??sales[0]
  if(!study||!sale)return <div className="page"><ErrorBox message="Aucune vente accessible pour ce profil."/></div>
  return <div className="page studio"><div className="studio-title"><div><p className="eyebrow">STUDIO DE VENTE · DÉMONSTRATION</p><h1>{study.name}</h1></div><Link href={`/etudes/${study.slug}`} className="button secondary">Voir mon espace <ArrowUpRight size={15}/></Link></div>
    <div className="studio-tabs" role="group" aria-label="Outils de l'étude">{[{id:"live",title:"Piloter la vente",icon:Radio},{id:"brand",title:"Mon identité",icon:Palette},{id:"audit",title:"Journal",icon:History}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={tab===t.id?"active":""} aria-pressed={tab===t.id} data-testid={`tab-${t.id}`}><t.icon size={16}/>{t.title}</button>)}</div>
    {tab==="live"?<><label className="sale-switcher">Vente sélectionnée<select value={sale.id} onChange={e=>setSelected(e.target.value)} data-testid="select-sale">{sales.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><Link className="text-link" href={`/salle/${sale.id}`} target="_blank" rel="noopener">Ouvrir la salle acheteur <ArrowUpRight size={14}/></Link></label><StudioSale key={`${session.id}-${sale.id}`} id={sale.id}/></>:tab==="brand"?<BrandForm key={study.id} study={study} refresh={refresh}/>:<AuditLog studyId={study.id}/>}
  </div>
}
function StudioSale({id}:{id:string}) {
  const {token}=useJuris(),{data,error,loading,refresh}=useResource<SaleState>(`state/${id}`,1500),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(""),[actionError,setActionError]=useState("")
  async function act(action:string,lotId?:string){setBusy(true);setActionError("");setFeedback("");try{
    await api(`control/${id}`,{token,body:{action,lot_id:lotId}})
    const labels:Record<string,string>={start:"Lot ouvert aux offres fictives.",close:"Lot clôturé en simulation. Aucune adjudication réelle.",pause:"Offres mises en pause.",resume:"Offres rouvertes pour 2 minutes.",end:"Simulation terminée. Journal conservé.",rehearse:"Un lot de répétition a été ajouté. L'historique reste intact."}
    setFeedback(labels[action]);await refresh()
  }catch(e){setActionError((e as Error).message)}finally{setBusy(false)}}
  if(loading)return <Loading/>
  if(!data)return <ErrorBox message={error||"Vente indisponible."} retry={refresh}/>
  const current=data.lots.find(l=>l.status==="live"),selected=current??data.lots.find(l=>l.status==="queued")??data.lots.at(-1)
  return <>{error&&<ErrorBox message={error} retry={refresh}/>}<div className="room-heading"><Status status={data.sale.status}/><span className="count-label">{data.lots.filter(l=>l.status==="closed").length} / {data.lots.length} lots clôturés</span></div><div className="room-grid"><div><Video key={id} id={id} image={data.sale.image} host configured={data.video_configured} onEvent={refresh}/><div className="room-meta"><span>{data.video_configured?"GetStream configuré · Connexion sur demande":"GetStream non connecté · Caméra locale disponible"}</span><span>Données : {data.storage==="turso"?"Turso distant":"libSQL local"}</span></div><div className="studio-actions">{data.sale.status==="live"?<button className="button secondary" disabled={busy||!!error} onClick={()=>act("pause")} data-testid="button-pause"><Pause size={16}/>Mettre en pause</button>:data.sale.status==="paused"?<button className="button secondary" disabled={busy||!!error} onClick={()=>act("resume")} data-testid="button-resume"><Play size={16}/>Reprendre</button>:null}{data.sale.status!=="ended"?<button className="button secondary" disabled={busy||!!error} onClick={()=>act("end")} data-testid="button-end"><Square size={14}/>Terminer la simulation</button>:<button className="button secondary" disabled={busy||!!error} onClick={()=>act("rehearse")} data-testid="button-rehearse">Créer une nouvelle répétition</button>}</div>
      <div className="queue"><h2>Votre ordre de passage</h2>{data.lots.map(l=><div className={`queue-row ${l.status==="live"?"current":""}`} key={l.id}><Photo src={l.image} alt={`Illustration du lot ${l.number}`}/><div><small>LOT {String(l.number).padStart(2,"0")} · {money(l.starting_cents)}</small><strong>{l.title}</strong><small>{l.status==="closed"?"Clôturé en simulation":l.status==="live"?"En cours":"En attente"}</small></div>{l.status==="queued"?<button className="button secondary" disabled={busy||!!current||!!error||data.sale.status==="ended"} onClick={()=>act("start",l.id)} data-testid={`start-${l.id}`}><Play size={14}/>Ouvrir</button>:l.status==="closed"?<Check size={16}/>:null}</div>)}</div></div><div><AuctionPanel data={data} lot={selected} host refresh={refresh}/>{current&&<button className="button primary wide" disabled={busy||!!error} onClick={()=>act("close",current.id)} data-testid="button-close"><Check size={17}/>Clôturer ce lot en simulation</button>}{feedback&&<p className="feedback" role="status">{feedback}</p>}{actionError&&<p className="feedback error" role="alert">{actionError}</p>}<DemoNote/></div></div></>
}
function BrandForm({study,refresh}:{study:Study;refresh:()=>Promise<void>}) {
  const {token}=useJuris(),[name,setName]=useState(study.name),[color,setColor]=useState(study.color),[feedback,setFeedback]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false)
  async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setFeedback("");try{await api(`study/${study.id}`,{token,method:"PATCH",body:{name,color}});setFeedback("Identité de démonstration enregistrée. Votre espace public est à jour.");await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <form className="studio-form" onSubmit={save}><h2>La signature de votre étude</h2><p>Ces réglages modifient uniquement votre étude fictive. Les autres espaces restent indépendants.</p><label>Nom affiché<input value={name} onChange={e=>setName(e.target.value)} minLength={3} maxLength={70} required data-testid="input-study-name"/></label><label>Couleur de l&apos;espace<input type="color" value={color} onChange={e=>setColor(e.target.value)} data-testid="input-study-color"/></label><button type="submit" className="button primary" disabled={busy} data-testid="button-save-brand">{busy?"Enregistrement…":"Enregistrer mon identité"}</button>{feedback&&<p className="feedback" role="status">{feedback}</p>}{error&&<p className="feedback error" role="alert">{error}</p>}</form>
}
function AuditLog({studyId}:{studyId:string}) {
  const {token}=useJuris(),[events,setEvents]=useState<Audit[]>([]),[error,setError]=useState("")
  const load=useCallback(async()=>{try{const d=await api<{events:Audit[]}>(`audit/${studyId}`,{token});setEvents(d.events);setError("")}catch(e){setError((e as Error).message)}},[studyId,token])
  useEffect(()=>{
    let active=true
    api<{events:Audit[]}>(`audit/${studyId}`,{token}).then(d=>{if(active){setEvents(d.events);setError("")}}).catch(e=>{if(active)setError(e.message)})
    return()=>{active=false}
  },[studyId,token])
  function download(){const blob=new Blob([JSON.stringify({demo:true,study_id:studyId,exported_at:new Date().toISOString(),events},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`jurislive-journal-${studyId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return <><div className="section-heading"><div><h2>Le journal de votre étude</h2><p className="illustration-note">Offres acceptées et commandes · Chaînage SHA-256 · Horloge serveur · 500 derniers événements maximum</p></div><button className="button secondary" onClick={download} disabled={!!error} data-testid="button-export"><Download size={16}/>Exporter le journal</button></div>{error?<ErrorBox message={error} retry={load}/>:events.length?<div className="audit-list">{events.map(e=><article className="audit-event" key={e.id}><div><strong>#{e.id} · {e.action}</strong><time>{new Date(e.created_at).toLocaleString("fr-FR")}</time></div><small>Entité : {e.entity} · Acteur de démonstration : {e.actor.slice(0,8)}</small><details><summary>Détails et empreinte de l&apos;événement</summary><pre>{e.payload}</pre><code>SHA-256 : {e.hash}<br/>Précédent : {e.prev_hash}</code></details></article>)}</div>:<div className="empty"><History size={30}/><h2>Le journal est prêt.</h2><p>Ouvrez un lot ou modifiez votre identité pour enregistrer votre première action.</p></div>}<p className="illustration-note">Journal technique de démonstration, non certifié. Le chaînage détecte des incohérences mais ne constitue ni un horodatage qualifié ni un procès-verbal.</p></>
}
