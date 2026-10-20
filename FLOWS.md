# JURISLIVE : inventaire de recette

## État initial
Le dépôt MIT amont est cloné intégralement, commit f9d9e28. Son URL annoncée renvoie DEPLOYMENT_NOT_FOUND lors de la consultation ; aucune recette visuelle amont possible. Inspection du code : catalogue, authentification déclarative, vidéo Stream, enchères transactionnelles, console vendeur, panier et checkout simulé.

## Parcours à tester
- Marketplace française : quatre ventes fictives, recherche, filtres catégories, favoris et état vide.
- Fiche vente : liste des lots, informations fictives, accès salle.
- Salle acheteur : session de démonstration, enchère serveur, historique actualisé sur un deuxième navigateur, compteur et statut expiré.
- Console : session étude Paris ou Lyon, ouverture d'un lot, pause/reprise, clôture simulée, lot suivant.
- Sécurité : identité forgée ignorée, session inconnue refusée, acheteur non autorisé à piloter, étude différente refusée, montant invalide refusé, double requête idempotente, concurrence.
- Espace étude : URL indépendante, catalogue filtré, personnalisation nom/couleur par membre seulement.
- Journal : actes horodatés, périmètre étude, export JSON, refus lecture inter-études.
- Vidéo : état indisponible explicite sans clés ; capture caméra locale seulement sur demande ; intégration GetStream non qualifiée sans credentials.
- Démonstration : aucun paiement, aucune pièce d'identité, aucun statut d'adjudication réelle, anciens endpoints bloqués.
- Navigation : retour, liens directs, 404 lisible, responsive 375px et 1440px, aucun débordement horizontal.
- Déploiement : ouvrir l'URL finale en contexte neuf, vérifier protection et parcours.

## Contraintes ouvertes
- Pièce jointe annoncée non reçue.
- Vercel CLI annonce absence de credentials ; demande sécurisée ouverte.
- Clés Stream et base Turso distante non disponibles au démarrage.
