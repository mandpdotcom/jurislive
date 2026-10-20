"use client"
import { createContext, useCallback, useContext, useState } from "react"
import type { DemoPersona, Session } from "@/lib/jurislive/types"
type Context = {
  session:Session|null;token:string;login:(p:DemoPersona)=>Promise<void>;logout:()=>void;
  favorites:string[];toggleFavorite:(id:string)=>void;
}
const JurisContext = createContext<Context|null>(null)
export async function api<T>(path:string,options?:{token?:string;body?:unknown;method?:string}):Promise<T> {
  const base=typeof window!=="undefined"?(window as Window & {__JURISLIVE_API__?:string}).__JURISLIVE_API__??"":""
  const res = await fetch(`${base}/api/jl/${path}`,{
    method:options?.method ?? (options?.body ? "POST" : "GET"),
    headers:{...(options?.body ? {"Content-Type":"application/json"} : {}),...(options?.token ? {Authorization:`Bearer ${options.token}`} : {})},
    body:options?.body ? JSON.stringify(options.body) : undefined,cache:"no-store",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Connexion interrompue. Réessayez.")
  return data
}
export function JurisProvider({children}:{children:React.ReactNode}) {
  const [session,setSession] = useState<Session|null>(null), [token,setToken] = useState("")
  const [favorites,setFavorites] = useState<string[]>([])
  const login = useCallback(async(persona:DemoPersona)=>{
    const data = await api<{session:Session;token:string}>("session",{body:{persona}})
    setSession(data.session);setToken(data.token)
  },[])
  return <JurisContext.Provider value={{session,token,login,logout:()=>{setSession(null);setToken("")},favorites,toggleFavorite:id=>setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id])}}>{children}</JurisContext.Provider>
}
export const useJuris = () => { const c=useContext(JurisContext);if(!c)throw Error("Provider required");return c }
