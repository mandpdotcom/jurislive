import React from "react"
import {useSyncExternalStore} from "react"
function subscribe(fn:()=>void){window.addEventListener("hashchange",fn);return()=>window.removeEventListener("hashchange",fn)}
function current(){return window.location.hash.slice(1)||"/"}
export function usePathname(){return useSyncExternalStore(subscribe,current,()=>"/")}
export default function Link({href,children,...rest}:React.AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){
  return <a href={href.startsWith("/")?`#${href}`:href} {...rest}>{children}</a>
}
