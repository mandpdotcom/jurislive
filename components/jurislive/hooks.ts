"use client"
import {useCallback,useEffect,useState} from "react"
import {api} from "./provider"
export function useResource<T>(path:string,interval=0) {
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true)
  const refresh=useCallback(async()=>{
    try { const result=await api<T>(path);setData(result);setError("") }
    catch(e){setError(e instanceof Error?e.message:"Connexion indisponible.")}
    finally{setLoading(false)}
  },[path])
  useEffect(()=>{
    let active=true
    const load=async()=>{try{const result=await api<T>(path);if(active){setData(result);setError("")}}catch(e){if(active)setError(e instanceof Error?e.message:"Connexion indisponible.")}finally{if(active)setLoading(false)}}
    void load();const timer=interval?setInterval(load,interval):undefined
    return()=>{active=false;clearInterval(timer)}
  },[path,interval])
  return {data,error,loading,refresh}
}
