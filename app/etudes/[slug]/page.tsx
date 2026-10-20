import {Studies} from "@/components/jurislive/studies"
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <Studies slug={slug}/>}
