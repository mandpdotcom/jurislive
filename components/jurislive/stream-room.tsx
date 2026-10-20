"use client"
import {useEffect,useState} from "react"
import {CallControls,LivestreamLayout,StreamCall,StreamVideo,StreamVideoClient,type Call} from "@stream-io/video-react-sdk"
import {StreamChat} from "stream-chat"
import type {StreamAccess} from "./video"
import {api} from "./provider"
export default function StreamRoom({access,id,token,onEvent,onClose}:{access:StreamAccess;id:string;token:string;onEvent:()=>void;onClose:()=>void}) {
  const [client,setClient]=useState<StreamVideoClient>(),[call,setCall]=useState<Call>(),[error,setError]=useState(""),[live,setLive]=useState(false)
  useEffect(()=>{
    let disposed=false
    const video=new StreamVideoClient({apiKey:access.apiKey,user:{id:access.userId,name:access.name},tokenProvider:async()=>(await api<StreamAccess>(`stream/${id}`,{token,body:{}})).videoToken})
    const chat=new StreamChat(access.apiKey)
    const c=video.call("livestream",access.callId)
    const joined=(async()=>{
      try{
        await c.join({create:false})
        if(disposed)return
        if(access.isHost){await c.camera.enable();await c.microphone.enable()}
        else{await c.camera.disable();await c.microphone.disable()}
        setClient(video);setCall(c)
        await chat.connectUser({id:access.userId,name:access.name},async()=>(await api<StreamAccess>(`stream/${id}`,{token,body:{}})).chatToken)
        if(disposed)return
        const ch=chat.channel("messaging",access.callId);await ch.watch()
        ch.on((event)=>{if((event.type as string)==="auction_update")onEvent()})
      }catch{if(!disposed)setError("Connexion vidéo interrompue ou autorisation refusée. La simulation d'enchères reste indépendante.")}
    })()
    return()=>{disposed=true;void joined.finally(async()=>{await c.leave().catch(()=>{});await video.disconnectUser().catch(()=>{});await chat.disconnectUser().catch(()=>{})})}
  },[access.apiKey,access.userId,access.name,access.callId,access.isHost,id,token,onEvent])
  async function toggle(){try{if(live)await call?.stopLive();else await call?.goLive();setLive(!live)}catch{setError("Impossible de modifier la diffusion. Vérifiez les droits GetStream.")}}
  return <div className="live-sdk">{client&&call?<StreamVideo client={client}><StreamCall call={call}><LivestreamLayout showLiveBadge showParticipantCount={false} showDuration enableFullScreen={false}/>{access.isHost&&<div className="camera-controls"><CallControls/><button className="button light" onClick={toggle}>{live?"Arrêter la diffusion":"Diffuser la vidéo de démonstration"}</button></div>}</StreamCall></StreamVideo>:<div className="video-placeholder">Connexion vidéo…</div>}{error&&<p className="feedback error" role="alert">{error}</p>}<button className="button light" style={{position:"absolute",top:12,right:12,zIndex:5}} onClick={onClose}>Quitter la vidéo</button></div>
}
