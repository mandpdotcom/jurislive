import Link from "next/link"
export default function NotFound(){return <div className="page empty"><p className="eyebrow">PAGE INTROUVABLE</p><h1>Retrouvons la salle des ventes.</h1><p>Cette adresse ne correspond pas à un espace JURISLIVE. Le catalogue de démonstration reste accessible.</p><Link href="/" className="button primary">Explorer les ventes</Link></div>}
