## JURISLIVE : démonstrateur mobile-first multi-études

Adaptation du fork VinylStream MIT en marketplace française pour commissaires de justice, sans adjudication, paiement ou pièce d'identité réels.

### Contenu
- Marketplace, filtres, favoris en mémoire, 3 espaces d'étude personnalisables, 4 ventes et 12 lots fictifs.
- Salle acheteur et console vendeur mobile, avec rôles serveur et périmètres d'étude.
- Enchères transactionnelles en centimes, idempotence, anti-sniping, contrôle de concurrence, journal chaîné.
- SDK GetStream conservés pour vidéo et notifications ; aucun faux live si les clés manquent.
- Anciennes routes isolées dans `legacy-upstream` et endpoints API historiques bloqués.
- Schéma additif `jl_*`, Next.js mis à jour, CI, tests, guide de déploiement.
- Projet Vercel `jurislive` créé dans Llocs, connecté à ce dépôt, protection Preview activée.

### Validation
- TypeScript, ESLint, build Next.js, 24 tests serveur et 8 tests HTTP passent localement.
- Parcours vendeur et acheteur vérifié sur deux contextes navigateur, mobile 375px et bureau.
- Audit runtime : zéro vulnérabilité connue lors de la vérification ; 5 alertes élevées restent dans la chaîne ESLint de développement et sont documentées.
- Isolation, montants invalides, concurrence, rejeu, pause, expiration et audit testés.

### Bloquants et limites
- Turso distant non connecté à ce stade : Preview Vercel explicitement en lecture seule, écritures refusées. Une demande de connexion Turso a été affichée.
- Clés GetStream absentes : streaming réel non qualifié ; aperçu caméra local distinct du direct.
- Le sélecteur de profils est une facilité de démonstration, pas une authentification professionnelle.
- Tests multi-instances Turso, permissions GetStream, appareils iOS/Android réels, audit externe et validation juridique restent nécessaires.
- Pièce jointe annoncée non accessible : spécification de référence disponible = les 10 exigences du message.
- Aucun partenariat Jurisdrone conclu ou revendiqué.
- Tous les déploiements du projet sont désormais protégés. Un déploiement automatique initial de `main` reste présent car sa suppression API est refusée (403) ; suppression à effectuer dans le dashboard. La Preview de référence provient du workflow Git et est READY.
- Protection Vercel vérifiée par redirection vers la connexion. Pas de contournement SSO disponible pour la recette de l'application : le parcours derrière SSO reste à contrôler avec un compte autorisé.

Ne pas fusionner ni promouvoir en production avant revue et validation. La démo reste volontairement non transactionnelle au sens commercial.
