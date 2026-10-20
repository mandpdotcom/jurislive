import "./globals.css"
import { JurisProvider } from "@/components/jurislive/provider"
import { Shell } from "@/components/jurislive/shell"
export const metadata = {
  title: {default:"JURISLIVE · Les enchères, au plus près.",template:"%s · JURISLIVE"},
  description:"Démonstrateur de marketplace de ventes aux enchères vidéo pour les commissaires de justice. Études et lots fictifs. Aucune adjudication réelle.",
  robots:{index:false,follow:false},
}
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="fr"><head>
    <link rel="preconnect" href="https://api.fontshare.com" />
    <link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&f[]=boska@400,500&display=swap" rel="stylesheet" />
  </head><body><JurisProvider><Shell>{children}</Shell></JurisProvider></body></html>
}
