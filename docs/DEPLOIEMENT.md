# Déploiement Preview protégé dans Llocs

La cible est un projet Vercel nommé `jurislive`, lié à `mandpdotcom/jurislive`. La branche de travail est `JURISLIVE` et la branche de production demeure `main` ; ne pas fusionner ni promouvoir en production avant validation.

## Préparer les services

Utiliser une base Turso et une application GetStream dédiées à la démonstration, sans données ni utilisateurs réels. Fournir uniquement dans les variables Preview du projet :

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `STREAM_API_KEY`
- `STREAM_API_SECRET`

Ne jamais copier de secret dans un ticket, un README, la pull request ou une conversation. Ne pas utiliser de compte de production par défaut.

## Protection et source GitHub

L'API Vercel accepte [la configuration de protection Preview](https://vercel.com/docs/rest-api/reference/endpoints/projects/update-an-existing-project) :

```json
{ "ssoProtection": { "deploymentType": "preview" } }
```

Le fichier `vercel.json` ne suffit pas à activer cette protection : elle est un réglage du projet. La protection doit être confirmée dans l'API et par une ouverture anonyme qui arrive sur l'authentification Vercel, pas sur le catalogue.

La CLI authentifiée permet :

```bash
vercel link --scope llocs --project jurislive --yes
vercel git connect https://github.com/mandpdotcom/jurislive --scope llocs
vercel deploy --scope llocs --target preview
```

Dans l'environnement Computer, l'authentification de service peut nécessiter explicitement `--token "$VERCEL_TOKEN"` ; la valeur ne doit jamais être affichée. Il n'est pas nécessaire de créer un nouveau jeton si ce contexte fonctionne.

## Première initialisation

Les tables `jl_*` et fixtures sont créées de manière additive et idempotente à la première connexion. Une base dédiée est fortement recommandée. Le code ne détruit pas de données amont et n'exécute aucun cron de purge.

Sans Turso, la Preview montre uniquement les fixtures en lecture seule, avec un avertissement visible. Sans Stream, les enchères fonctionnent si Turso est connecté, mais pas la vidéo. Aucun indicateur ne doit être interprété comme un live réel sans connexion au fournisseur.

## Recette après ajout des variables

1. Redéployer la branche JURISLIVE en Preview.
2. Ouvrir le lien avec un compte Vercel autorisé ; confirmer la protection dans un navigateur anonyme.
3. Vérifier catalogue, session acheteur, session de chaque étude et mutations autorisées.
4. Faire une offre sur un téléphone pendant qu'un second navigateur pilote la vente.
5. Tenter accès aux commandes et journal d'une autre étude ; attendre 403.
6. Rejouer une offre avec la même clé d'idempotence ; vérifier l'absence de doublon.
7. Tester concurrence sur plusieurs instances Vercel et reconnexion réseau.
8. Connecter GetStream : vérifier création serveur, rôle host, jeton limité au call, lecteur acheteur et caméra/micro désactivés pour l'acheteur.
9. Vérifier les règles de permissions des types `livestream` vidéo et `messaging` chat dans GetStream. Tester un acheteur tentant de publier, créer un call ou rejoindre un channel non autorisé.
10. Vérifier affichage mobile et permissions caméra/micro sur Safari iOS et Chrome Android réels.

## Accès de présentation

Ne pas désactiver la protection pour rendre la démonstration « plus facile ». Fournir un accès Vercel approprié au présentateur, ou utiliser un partage approuvé de l'aperçu privé. L'accès de Marc Laporte n'est pas supposé et aucune invitation n'est envoyée sans validation.

## Go / no-go

Une Preview en lecture seule n'est pas un test fonctionnel des enchères sur Vercel. Une caméra locale n'est pas un live GetStream. Des tests libSQL locaux ne constituent pas une qualification Turso distante. La présentation doit conserver explicitement ces distinctions jusqu'à la recette complète.
