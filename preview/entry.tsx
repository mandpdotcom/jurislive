// Private Computer preview adapter. The deployed Vercel application remains Next.js.
// Every screen and the authenticated backend are shared with the Next.js application.
import React,{useEffect} from "react"
import {createRoot} from "react-dom/client"
import {usePathname} from "./link"
import {JurisProvider} from "../components/jurislive/provider"
import {Shell} from "../components/jurislive/shell"
import {Marketplace} from "../components/jurislive/marketplace"
import {Studies} from "../components/jurislive/studies"
import {SaleDetail} from "../components/jurislive/sale-detail"
import {Room} from "../components/jurislive/room"
import {Studio} from "../components/jurislive/studio"
import {Account} from "../components/jurislive/account"
import About from "../app/a-propos/page"
import NotFound from "../app/not-found"
function Route(){
  const path=usePathname(),[root,id]=path.split("/").filter(Boolean)
  useEffect(()=>{window.scrollTo(0,0)},[path])
  if(!root)return <Marketplace/>
  if(root==="favoris")return <Marketplace favoritesOnly/>
  if(root==="etudes")return <Studies slug={id}/>
  if(root==="ventes"&&id)return <SaleDetail id={id}/>
  if(root==="salle"&&id)return <Room key={id} id={id}/>
  if(root==="console")return <Studio/>
  if(root==="compte")return <Account/>
  if(root==="a-propos")return <About/>
  return <NotFound/>
}
createRoot(document.getElementById("root")!).render(<JurisProvider><Shell><Route/></Shell></JurisProvider>)
