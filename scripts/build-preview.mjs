import {build} from "esbuild"
import {mkdir,copyFile,cp,readFile,writeFile} from "node:fs/promises"
import path from "node:path"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
const root=process.cwd(),out=path.join(root,"preview-dist")
await mkdir(out,{recursive:true})
await build({
  entryPoints:["preview/entry.tsx"],outdir:out,bundle:true,splitting:true,format:"esm",platform:"browser",
  jsx:"automatic",minify:true,target:"es2020",define:{"process.env.NODE_ENV":'"production"'},
  alias:{"next/link":path.join(root,"preview/link.tsx"),"next/navigation":path.join(root,"preview/link.tsx"),"next/dynamic":path.join(root,"preview/dynamic.tsx"),"@":root},
})
const css=await postcss([tailwindcss()]).process(await readFile("app/globals.css","utf8"),{from:path.join(root,"app/globals.css"),to:path.join(out,"app.css")})
await writeFile(path.join(out,"app.css"),css.css)
await copyFile("preview/index.html",path.join(out,"index.html"))
await cp("public/images",path.join(out,"images"),{recursive:true})
console.log("Private preview built from shared Next.js components.")
