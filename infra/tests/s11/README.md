# Recette locale S11

Depuis la racine du worktree S11, Node 24 et les dépendances du lockfile installées :

```sh
npm ci
npm run build --workspace @ecom/commerce
npm run typecheck
npx tsc -p infra/tests/s11/tsconfig.json
node infra/tests/s11/verify.mjs
```

`verify.mjs` crée une base PostgreSQL jetable et choisit des ports libres. Il installe d'abord G0, crée un produit témoin, puis applique la migration candidate S11. Les requêtes passent par la vraie API Vendure. Les services démarrés par le test sont arrêtés dans `finally`. Les données restent sous `.data/` pour diagnostic ; aucun fichier privé n'entre dans les preuves.

Le test force l'expiration d'un bail en SQL. Les acquisitions, renouvellements, libérations, versions et sélections passent par GraphQL. Le registre `s11_fixture_protection` est une fixture locale ; il ne constitue pas le registre S51. Un test le rend indisponible et vérifie qu'aucune version n'est créée.

Pour la recette graphique :

```sh
npm run dev:prepare -- --mission=S11 --session=B
node infra/tests/s11/serve.mjs
```

L'API utilise 4102, PostgreSQL 5542 et le Dashboard **5112**, car S01 occupe 5102. Le script vérifie ces ports avant de démarrer et ne ferme aucun autre processus. Les identifiants restent dans `.data/v1-s11-b/recipe.json`, fichier privé. Le navigateur ouvre `http://127.0.0.1:5112/dashboard/content`. Arrêter le lanceur avec Ctrl-C.

La configuration composée `vendure-config.ts` charge les sources S11 et la migration candidate, sans modifier le registre partagé. Le build Dashboard de recette se lance séparément :

```sh
ECOM_SESSION_FILE="$PWD/.data/v1-s11-b/recipe.json" node node_modules/vite/bin/vite.js build --config infra/tests/s11/vite.config.mts
```

Pour le parcours navigateur isolé, avec le serveur précédent actif :

```sh
node infra/tests/s11/browser.mjs
```

Ce script utilise Playwright comme outil de vérification local, installé hors du dépôt sur la machine de recette. Il ne figure pas dans les dépendances applicatives. Pour le rendre autonome en CI, l'intégrateur devra choisir et déclarer l'outil et sa version. Les tests API ne dépendent pas de Playwright. La recette ajoute uniquement des pages et comptes fictifs dans la base S11.

Les captures et rapports sont écrits dans `docs/livraisons/S11/preuves/`. Chromium vérifie le parcours et les dimensions, mais ne remplace pas la manipulation dans Responsively. Respecter le créneau graphique attribué dans le checkout principal avant d'utiliser l'application stable.
