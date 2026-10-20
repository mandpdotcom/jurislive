# JURISLIVE : dossier technique de démonstration

Travail réalisé les 20 et 21 octobre 2026. La spécification disponible est le message de dix exigences ; aucune pièce jointe correspondante n'a été reçue dans l'espace de travail.

## Architecture

```text
Marketplace nationale / espace étude / salle acheteur / console
                           |
                    API Next.js /api/jl
                           |
        sessions hachées + rôle serveur + périmètre étude
                           |
               transactions libSQL / Turso
                lots + offres + journal chaîné
                           |
              événement GetStream d'invalidation
                           |
        relecture serveur (polling de secours 1,5 seconde)
```

Les composants vidéo utilisent les SDK GetStream ; les clients ne créent pas de call ni de rôle host. Le serveur crée le call du commissaire et retourne un jeton vidéo limité au call et à 15 minutes. Un profil d'étude ne peut obtenir un call d'une autre étude. Les jetons de chat expirent également après 15 minutes. Les permissions applicatives GetStream doivent être vérifiées en environnement réel avant activation : aucune preuve d'isolation fournisseur n'est revendiquée sans clés ni test distant.

## Schéma et isolation

- `jl_studies` : identité d'étude et slug public.
- `jl_sales` : vente fictive rattachée à une étude.
- `jl_lots` : lot rattaché à une vente et une étude, montants en centimes, version, heure limite.
- `jl_sessions` : identifiant aléatoire, hash SHA-256 du jeton, rôle, étude, expiration.
- `jl_bids` : offres acceptées, session, lot, vente, étude, montant, horodatage et clé d'idempotence.
- `jl_audit` : journal append-only chaîné par étude.

Le catalogue est volontairement public à l'intérieur de la Preview protégée. L'administration, les exports et les mutations sont vérifiés sur le serveur. Chaque lot est recherché avec son identifiant ET celui de sa vente ; le rattachement à l'étude est vérifié. Une session acheteur ne peut piloter aucune vente et une session commissaire ne peut enchérir.

Les sessions de démonstration sont sélectionnables sans mot de passe. Cette propriété est volontaire et documentée ; elle interdit de qualifier cette démo comme une authentification de production. La protection extérieure est celle de Vercel Authentication ou de l'aperçu privé Computer.

## Moteur d'enchères

La logique transactionnelle est dérivée de `lib/store.ts` de [VinylStream, licence MIT](https://github.com/GetStream/vinylstream-live-shopping-react-demo). Les modules amont restent disponibles pour comparaison, et l'avis de copyright original n'est pas retiré.

1. Valider le jeton de session et le rôle acheteur.
2. Refuser les montants non entiers, non finis, négatifs, trop élevés ou mal alignés sur le pas.
3. Ouvrir une transaction d'écriture.
4. Détecter une clé d'idempotence déjà traitée ; refuser sa réutilisation pour un autre montant ou lot.
5. Lire la vente et le lot ; vérifier le périmètre, l'état et l'horloge serveur.
6. Vérifier le plancher et le pas d'enchère ; plafonner à 8 offres acceptées par 10 secondes et par session.
7. Étendre la limite à au moins 10 secondes en cas d'offre tardive.
8. Enregistrer l'offre, la nouvelle valeur du lot et l'événement d'audit dans la même transaction.
9. Après commit, notifier GetStream si disponible ; un échec de notification ne remet pas en cause la transaction.

Une file d'écriture dans le processus évite le blocage du pilote SQLite local lorsqu'une seconde transaction démarre alors que la première est suspendue. La transaction en base reste la frontière de sûreté entre instances ; un mutex JavaScript seul ne suffit pas. Les tests multi-instances Turso distants restent à exécuter.

Un index unique partiel interdit deux lots ouverts simultanément pour la même vente. La fin de minuterie bloque les offres côté serveur même si le navigateur falsifie son horloge. Le commissaire clôture manuellement le lot ; le statut est `closed`, jamais une adjudication réelle.

## Traçabilité

Chaque événement contient étude, acteur de démonstration, action, entité, payload, date serveur, hash précédent et hash de l'événement. Les triggers SQL refusent UPDATE et DELETE ordinaires sur le journal. L'export est limité explicitement aux 500 derniers événements.

Ce dispositif n'est pas un journal probatoire certifié. Un administrateur de base peut supprimer les triggers ou réécrire la chaîne entière. Il manque un horodatage qualifié, un ancrage externe, une politique de conservation validée, une procédure d'archivage et une qualification juridique.

## Audit des dépendances

État initial observé par `npm audit` : **29 alertes**, dont 2 critiques, 20 élevées, 6 modérées et 1 faible. Après mise à jour de Next.js et React, retrait du CLI shadcn du runtime et corrections non cassantes : **0 alerte de production**, et **5 alertes élevées de développement** liées à `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next`.

Ces cinq lignes sont une chaîne de dépendances, pas cinq failles indépendantes. L'avis de référence est [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Le downgrade cassant proposé automatiquement vers une ancienne version d'ESLint/Next n'a pas été appliqué. Les motifs de glob de lint sont contrôlés dans le dépôt ; cette dépendance n'est pas dans le runtime de production.

Versions principales testées : Next.js 16.4.2 et React/React DOM 19.3.1. Les résultats d'audit doivent être rejoués à chaque livraison, car la base d'avis évolue.

## Contrôles passés localement

`tsc --noEmit`, ESLint sur le code actif, build Next.js optimisé et 24 tests serveur passent. La suite vérifie fixtures, jetons, profils inconnus, droits acheteur, isolation Lyon/Paris, lien vente/lot, durée, unicité du lot ouvert, interdiction d'auto-enchère, montants invalides, plancher, pas, idempotence, concurrence, anti-sniping, pause/reprise, expiration, clôture, personnalisation, chaîne d'audit, répétition sans effacement, limite de fréquence et mode Vercel sans Turso.

Le premier test de concurrence a révélé un verrouillage du pilote SQLite local ; la file d'écriture a été ajoutée et la suite complète rejouée avec succès. Cette correction n'est pas une qualification du comportement Turso distant sous charge.

La recette navigateur a exercé la recherche, les catégories, l'état vide, les favoris, la connexion de démonstration, l'ouverture vendeur, l'offre acheteur dans un second navigateur, la réception de cette offre, la pause/reprise, la clôture, le lot suivant, la personnalisation réversible et l'export JSON.

Huit tests HTTP supplémentaires passent contre le serveur Next.js : catalogue, endpoints historiques désactivés, authentification, rôle forgé, isolation des études, formats invalides, taille de requête et en-têtes de non-cache. Les parcours hébergés ont également été testés dans un iframe opaque sans stockage navigateur. Aucun débordement horizontal n'a été détecté à 375px et 1440px sur les six pages principales, la salle et le studio ; aucune exception JavaScript applicative n'a été relevée dans le contexte hébergé.

## Déploiement et réserves

Le projet Vercel `jurislive` appartient à l'équipe Llocs et est relié au dépôt GitHub. La protection SSO est configurée sur tous les déploiements, avec `ssoProtection.deploymentType = all`, conformément aux valeurs de la [documentation Vercel](https://vercel.com/docs/rest-api/reference/endpoints/projects/update-an-existing-project). Une ouverture anonyme du lien Preview redirige vers la connexion Vercel.

La connexion Git a aussi déclenché un déploiement automatique de la branche amont `main`. La suppression de ce déploiement a été refusée par l'API (403) ; il reste présent mais protégé. Sa suppression depuis le tableau de bord Llocs est une action résiduelle. La tentative de déploiement CLI est restée sans état terminal exploitable ; le déploiement Preview retenu est celui du workflow Git, confirmé READY.

La création automatique d'un jeton de contournement pour la recette a été refusée. La protection est donc vérifiée, mais le parcours de l'application derrière le SSO Vercel n'a pas été ouvert dans ce navigateur isolé. Les tests fonctionnels de bout en bout ont été réalisés sur l'aperçu privé hébergé, pas prétendus sur Vercel.

Sans `TURSO_DATABASE_URL`, un déploiement Vercel affiche un catalogue explicitement en lecture seule. Les écritures et profils sont refusés ; aucun fallback SQLite éphémère n'est utilisé. L'aperçu privé peut utiliser le disque local du serveur de développement et est distingué de Vercel.

Sans clés GetStream, aucune diffusion n'est active. L'aperçu caméra local ne transmet pas son flux et n'enregistre rien. Le live vidéo réel, les permissions distantes et la latence réseau restent non testés.

## Présentation commerciale

La démo est destinée à être présentée à Marc Laporte dans la perspective d'un éventuel partenariat. Le [site de Jurisdrone](https://www.jurisdrone.com/) le présente comme cofondateur ; aucun accord ni soutien de Jurisdrone n'est revendiqué. Le produit n'utilise pas son logo comme sceau de validation.
