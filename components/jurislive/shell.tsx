"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Building2, Compass, Heart, Radio, ShieldCheck, UserRound } from "lucide-react"
import { useJuris } from "./provider"
export function Shell({children}:{children:React.ReactNode}) {
  const path = usePathname(), {session} = useJuris()
  return <>
    <a className="skip" href="#contenu">Aller au contenu</a>
    <div className="demo-strip"><ShieldCheck size={14}/><span>ESPACE DÉMONSTRATION <b>·</b> Lots fictifs, aucune adjudication ni paiement réel</span><Link href="/a-propos" data-testid="link-demo-info">En savoir plus <ArrowUpRight size={12}/></Link></div>
    <header className="topbar">
      <Link href="/" className="wordmark" aria-label="JURISLIVE, accueil" data-testid="link-home">JURIS<span>LIVE</span><i/></Link>
      <nav className="desktop-nav" aria-label="Navigation principale">
        <Link href="/" className={path==="/"?"selected":""}>Explorer</Link>
        <Link href="/etudes" className={path.startsWith("/etudes")?"selected":""}>Les études</Link>
        <Link href="/favoris" className={path==="/favoris"?"selected":""}>Ma sélection</Link>
      </nav>
      <div className="header-actions"><Link className="studio-link" href="/console" data-testid="link-console"><Radio size={16}/><span>Espace étude</span><ArrowUpRight size={14}/></Link><Link href="/compte" className="account-link" aria-label={session?session.name:"Choisir un profil démo"} data-testid="link-account"><UserRound size={18}/><span>{session?session.role==="buyer"?"Acheteur démo":"Étude démo":"Se connecter"}</span></Link></div>
    </header>
    <main id="contenu">{children}</main>
    <footer className="footer"><Link className="wordmark" href="/">JURIS<span>LIVE</span><i/></Link><p>Les enchères, au plus près.<br/><small>Études, lots et estimations fictifs. Illustrations générées.</small></p><Link href="/a-propos">Le cadre de la démonstration <ArrowUpRight size={14}/></Link></footer>
    <nav className="mobile-nav" aria-label="Navigation mobile">
      <Link href="/" className={path==="/"?"selected":""}><Compass size={20}/>Explorer</Link>
      <Link href="/etudes" className={path.startsWith("/etudes")?"selected":""}><Building2 size={20}/>Études</Link>
      <Link href="/favoris" className={path==="/favoris"?"selected":""}><Heart size={20}/>Sélection</Link>
      <Link href="/console" className={path.startsWith("/console")?"selected":""}><Radio size={20}/>Studio</Link>
    </nav>
  </>
}
