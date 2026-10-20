import type { Study, Sale, Lot } from "./types"

export const studies: Study[] = [
  { id: "etude-paris", slug: "rive-gauche", name: "Étude Rive Gauche", city: "Paris", initials: "RG", color: "#193b4c", description: "Véhicules, mobilier et actifs professionnels. Une étude fictive pour découvrir une autre façon de vendre." },
  { id: "etude-lyon", slug: "rhone-alpes", name: "Étude Rhône & Alpes", city: "Lyon", initials: "RA", color: "#615a43", description: "Matériels et équipements professionnels en région. Étude entièrement fictive de démonstration." },
  { id: "etude-bordeaux", slug: "les-chartrons", name: "Étude des Chartrons", city: "Bordeaux", initials: "EC", color: "#6e4a40", description: "Mobilier, objets et équipements d'hospitalité. Catalogue fictif, sans vente réelle." },
]
export const sales: Sale[] = [
  { id: "mobilite-paris", study_id: "etude-paris", title: "La mobilité a de l'avenir.", category: "Véhicules", city: "Paris · 75", image: "/images/vehicule.webp", scheduled_label: "Simulation disponible", status: "ready" },
  { id: "design-paris", study_id: "etude-paris", title: "Des pièces qui ont du caractère.", category: "Mobilier", city: "Paris · 75", image: "/images/mobilier.webp", scheduled_label: "À votre rythme", status: "ready" },
  { id: "materiel-lyon", study_id: "etude-lyon", title: "Du matériel pour vos projets.", category: "Matériels", city: "Lyon · 69", image: "/images/materiel.webp", scheduled_label: "Simulation disponible", status: "ready" },
  { id: "equipement-bordeaux", study_id: "etude-bordeaux", title: "Une seconde vie professionnelle.", category: "Équipements", city: "Bordeaux · 33", image: "/images/equipement.webp", scheduled_label: "Catalogue de démonstration", status: "ready" },
]
const seed: Array<[string, string, string, number, number, number, number]> = [
  ["mobilite-paris", "Break de direction gris métallisé", "Véhicule fictif · Année indicative 2021 · 68 000 km simulés · Aucun numéro d'immatriculation réel.", 1280000, 1800000, 1200000, 10000],
  ["mobilite-paris", "Véhicule utilitaire compact", "Lot fictif de véhicule professionnel. Visuel illustratif commun à la catégorie, non contractuel.", 700000, 1100000, 600000, 10000],
  ["mobilite-paris", "Berline de flotte professionnelle", "Lot fictif. Les caractéristiques et estimations sont créées exclusivement pour la démonstration.", 900000, 1400000, 800000, 10000],
  ["design-paris", "Fauteuil en cuir cognac & table d'appoint", "Ensemble de mobilier fictif. Visuel généré à titre d'illustration, aucun fabricant revendiqué.", 80000, 140000, 65000, 5000],
  ["design-paris", "Mobilier de bureau · ensemble de 6 pièces", "Lot fictif de mobilier professionnel. Visuel de catégorie non contractuel.", 120000, 180000, 100000, 5000],
  ["design-paris", "Table de réunion en bois", "Lot fictif destiné à tester le passage d'un lot au suivant.", 60000, 100000, 45000, 2500],
  ["materiel-lyon", "Mini-pelle compacte sur chenilles", "Matériel fictif · Données techniques non contractuelles · Aucune machine proposée à la vente.", 1500000, 2200000, 1400000, 25000],
  ["materiel-lyon", "Équipement de chantier · lot d'outillage", "Lot fictif de matériels professionnels. Visuel de catégorie non contractuel.", 180000, 300000, 150000, 10000],
  ["materiel-lyon", "Groupe électrogène de chantier", "Lot fictif. Aucun document technique ou certification réelle.", 200000, 350000, 180000, 10000],
  ["equipement-bordeaux", "Machine espresso professionnelle", "Machine fictive et équipement de restauration illustratif. Aucun numéro de série réel.", 180000, 320000, 150000, 10000],
  ["equipement-bordeaux", "Plan de travail & équipement inox", "Lot fictif de matériel de restauration. Illustration générique de la catégorie.", 100000, 180000, 80000, 5000],
  ["equipement-bordeaux", "Accessoires de restauration", "Lot fictif de petit équipement. Aucune transaction possible.", 40000, 80000, 30000, 2500],
]
export const lots: Lot[] = seed.map(([sale_id, title, description, estimate_low, estimate_high, starting_cents, increment_cents], i) => {
  const sale = sales.find(s => s.id === sale_id)!
  return { id: `lot-${i + 1}`, sale_id, study_id: sale.study_id, number: i % 3 + 1, title, description, image: sale.image, estimate_low, estimate_high, starting_cents, increment_cents, current_cents: null, high_bidder: null, status: "queued", ends_at: null, version: 0 }
})
