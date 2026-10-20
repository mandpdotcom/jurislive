import React,{lazy,Suspense,type ComponentType} from "react"
export default function dynamic<T extends object>(loader:()=>Promise<{default:ComponentType<T>}>,options?:{ssr?:boolean;loading?:()=>React.ReactNode}){
  const Component=lazy(loader)
  return function Dynamic(props:T){return <Suspense fallback={options?.loading?.()??null}><Component {...props}/></Suspense>}
}
