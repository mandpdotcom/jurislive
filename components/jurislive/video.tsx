"use client"
import {useEffect,useRef,useState} from "react"
import dynamic from "next/dynamic"
import {Camera,Radio,VideoOff} from "lucide-react"
import {api,useJuris} from "./provider"
import {Photo} from "./common"
const StreamRoom=dynamic(()=>import("./stream-room"),{ssr:false,loading:()=> <div className="video-placeholder">Connexion au service vidéo…</div>})
export type StreamAccess={apiKey:string;userId:string;name:string;callId:string;isHost:boolean;videoToken:string;chatToken:string}
export function Video({id,image,host,configured,onEvent}:{id:string;image:string;host:boolean;configured:boolean;onEvent:()=>void}) {
  const {token,session}=useJuris(),[access,setAccess]=useState<StreamAccess|null>(null),[media,setMedia]=useState<MediaStream|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false)
  const videoRef=useRef<HTMLVideoElement>(null),mediaRef=useRef<MediaStream|null>(null)
  useEffect(()=>{if(videoRef.current&&media)videoRef.current.srcObject=media},[media])
  useEffect(()=>()=>{mediaRef.current?.getTracks().forEach(t=>t.stop())},[])
  async function localCamera(){setError("");setBusy(true);try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error("Caméra indisponible dans ce navigateur ou cette intégration. Ouvrez le lien HTTPS directement.")
    const m=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});mediaRef.current=m;setMedia(m)
  }catch(e){setError(e instanceof Error?`Caméra non activée : ${e.message}`:"Caméra refusée.")}finally{setBusy(false)}}
  async function connect(){setBusy(true);setError("");try{setAccess(await api<StreamAccess>(`stream/${id}`,{token,body:{}}))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  function stop(){mediaRef.current?.getTracks().forEach(t=>t.stop());mediaRef.current=null;setMedia(null);setAccess(null)}
  return <><div className="room-video">
    {access?<StreamRoom key={`${id}-${session?.id}`} access={access} id={id} token={token} onEvent={onEvent} onClose={stop}/>:media?<div className="local-camera"><video autoPlay playsInline muted ref={videoRef}/><span className="camera-label">APERÇU LOCAL · AUCUNE DIFFUSION</span><div className="camera-controls"><button className="button light" onClick={stop}><VideoOff size={16}/>Couper la caméra</button></div></div>:<><Photo src={image} alt="Illustration de catégorie, pas une vidéo en direct"/><div className="video-placeholder"><Radio size={30}/><h2>{configured?"La salle vidéo de l'étude":"La vidéo attend son premier direct."}</h2><p>{configured?"Connectez-vous à la salle GetStream. Le commissaire pilote la diffusion.":"GetStream n'est pas encore connecté. Testez les enchères et la console sans diffusion vidéo."}</p>{configured&&session?<button className="button light" disabled={busy} onClick={connect}>{busy?"Connexion…":host?"Connecter le studio vidéo":"Regarder la vidéo"}</button>:host?<button className="button light" disabled={busy} onClick={localCamera} data-testid="button-camera"><Camera size={17}/>{busy?"Autorisation…":"Tester ma caméra en local"}</button>:null}<small>Illustration de lot fictif · Pas de faux direct</small></div></>}
  </div>{error&&<p className="feedback error" role="alert">{error}</p>}</>
}
