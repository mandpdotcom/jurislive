# JURISLIVE

Démonstrateur français de marketplace de ventes aux enchères vidéo, en marque blanche pour les commissaires de justice. Dérivé du dépôt [GetStream/VinylStream](https://github.com/GetStream/vinylstream-live-shopping-react-demo), sous licence MIT, copyright original conservé dans `LICENSE`.

**Aucune vente réelle. Aucun paiement. Aucune pièce d'identité.** Les études, profils, lots, caractéristiques, estimations et images sont fictifs. Aucun partenariat avec Jurisdrone n'est annoncé comme conclu.

## Parcours

- Marketplace nationale : catégories, recherche, filtre ville et sélection en mémoire.
- Espaces `/etudes/rive-gauche`, `/etudes/rhone-alpes`, `/etudes/les-chartrons` : catalogues indépendants et identité personnalisable.
- Fiches `/ventes/:id` et salles `/salle/:id` : lots, compte à rebours serveur, offres fictives, historique pseudonymisé.
- `/console` : profils d'étude Paris, Lyon ou Bordeaux ; ouverture de lot, pause/reprise, clôture simulée, passage au suivant, fin et répétition sans effacement d'historique.
- Journal technique filtré par étude, export JSON, chaînage SHA-256 et protections SQL contre les modifications ordinaires.
- Vidéo : SDK GetStream conservés ; capture et diffusion sur action explicite lorsque configurés. Sans clés, uniquement aperçu caméra local et état « GetStream non connecté ».

## Stack et reprise amont

Next.js 16.4.2, React 19.3.1, TypeScript, Tailwind CSS 4, GetStream Video/Chat, `@libsql/client` compatible Turso. Les transactions d'écriture, l'autorité serveur, les contrôles de plancher et l'anti-sniping de 10 secondes de l'amont sont repris et durcis dans `lib/jurislive/engine.ts`.

Les anciennes routes sont conservées dans `legacy-upstream/app/` pour revue, mais ne sont plus servies. Le proxy renvoie 410 sur tout ancien endpoint `/api/*` hors `/api/jl/*`. Les anciens modules et composants restent dans l'historique et dans le dépôt pour faciliter la comparaison ; ils ne font pas partie du parcours JURISLIVE.

Le schéma `jl_*` est additif : aucune table amont n'est détruite. Les montants sont des entiers en centimes, l'identité est issue d'un jeton aléatoire stocké haché côté serveur, et les mutations de vendeur exigent un rôle lié à l'étude ciblée. Les paramètres `user_id` ou `study_id` du navigateur ne confèrent aucun droit.

## Démarrer

Node.js 22 recommandé.

```bash
npm ci
npm run dev
```

Ouvrir `http://localhost:3000`. Sans variables Turso, la base locale `data/jurislive.db` est créée et contient 3 études, 4 ventes, 12 lots. Le stockage local est réservé au développement ou à l'aperçu privé, pas à Vercel.

### Test à deux onglets

1. Onglet vendeur : `/console`, sélectionner Paris, puis « Ouvrir » sur un lot.
2. Onglet acheteur : `/salle/mobilite-paris`, « Essayer comme acheteur », puis « Enchérir pour de faux ».
3. Observer l'offre dans la console, mettre en pause, reprendre, clôturer, ouvrir le lot suivant.
4. Onglet « Mon identité » : changer nom ou couleur, consulter l'espace de l'étude.
5. Onglet « Journal » : consulter les événements et exporter le JSON.

La session est en mémoire dans chaque onglet, expire après 4 heures et n'utilise aucun stockage navigateur. Un rechargement complet nécessite une nouvelle sélection de profil. Les favoris sont également limités à l'onglet.

## Variables Preview

Configurer uniquement les variables **Preview** dans les réglages Vercel, jamais dans Git :

| Variable | Utilisation |
|---|---|
| `TURSO_DATABASE_URL` | URL libSQL de la base de démonstration dédiée |
| `TURSO_AUTH_TOKEN` | Accès serveur à cette base |
| `STREAM_API_KEY` | Identifiant de l'application GetStream de démonstration |
| `STREAM_API_SECRET` | Secret serveur pour jetons et appels GetStream |

Sans Turso sur Vercel, le catalogue est **explicitement en lecture seule**. Aucun jeton de session ni aucune offre ne sont enregistrés. Sans GetStream, la simulation transactionnelle reste disponible si la base l'est ; aucun faux direct n'est affiché.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm audit --omit=dev
npm run build
```

La suite serveur utilise une base temporaire dédiée : elle ne touche pas le catalogue de démonstration actif. Elle couvre notamment usurpation d'identité, isolation des études, montants invalides, concurrence, idempotence, expiration, pause, anti-sniping et journal append-only.

Une CI GitHub exécute ces contrôles. Le résultat local ne remplace pas le résultat distant de la CI.

## Aperçu privé Computer

`preview/` est un adaptateur de navigation pour l'aperçu privé. Il réutilise les mêmes composants et le serveur Next.js, sans réimplémenter le moteur. L'application cible Vercel reste Next.js avec ses routes natives.

```bash
node scripts/build-preview.mjs
npm run start -- --hostname 0.0.0.0 --port 3001
```

L'aperçu dépend du serveur de cette session et de son disque local. Il ne démontre ni une persistance Turso distante, ni une disponibilité de production. Les SDK GetStream contiennent des références internes à des APIs navigateur indisponibles dans certains iframes ; la qualification vidéo se fait sur l'URL Vercel directe après configuration.

## Limites assumées

- Le sélecteur de profils est volontairement ouvert dans la démonstration protégée. Ce n'est ni du SSO métier, ni une authentification de commissaires de justice.
- Les personnes ayant accès à la démo partagent ses études fictives. Les droits empêchent une session donnée de muter une autre étude, mais les visiteurs peuvent sélectionner un autre personnage démo.
- Le journal n'est pas certifié, n'est pas un procès-verbal et ne résiste pas à un administrateur capable de réécrire toute la base et ses triggers. Un ancrage externe serait nécessaire.
- La clôture est manuelle ; après expiration, le serveur refuse les offres, mais attend le commissaire pour clôturer visuellement le lot.
- Actualisation de repli toutes les 1,5 secondes. Événements Stream utilisés comme invalidations, jamais comme source de vérité.
- Pas de création libre de ventes/lots, d'import catalogue, de sous-domaines personnalisés, d'abonnements, de KYC, de paiement, d'enregistrement vidéo, de messagerie publique ou d'adjudication réelle dans cette version.
- Validation juridique, authentification professionnelle, audit indépendant, test de charge multi-instances et qualification GetStream/Turso indispensables avant production.
- Le cahier des charges annoncé en pièce jointe n'était pas accessible lors du développement. La référence disponible est la liste des dix exigences du message utilisateur.

Voir [le dossier technique et de sécurité](docs/JURISLIVE-TECHNIQUE.md) et [le guide Vercel](docs/DEPLOIEMENT.md).
