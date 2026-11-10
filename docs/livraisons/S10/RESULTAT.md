# Livraison S10 — Catalogue, membres et clients

10 novembre 2026. Lot réalisé et vérifié dans sa composition isolée. Le complément de recette sur le fichier CSV et la saisie graphique des stocks est terminé. Le raccordement aux autres lots reste à G1.

## État Git

| Champ | Valeur |
|---|---|
| branche | `feat/s10-catalogue` |
| base_sha | `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086` |
| worktree | `/Users/lavic/Desktop/Amboras REA/E-com-system-AI-S10` |
| commits | Aucun ; changements locaux non commités |
| push | Non effectué |
| destination_integration | `integration/g1` |

## Résultat utilisable

Les API et écrans natifs Vendure conservent les produits, variantes/options, facettes, collections, médias, prix, stocks, clients, groupes et membres/rôles. Le plugin ajoute un import CSV et deux préférences au client natif. Il ne crée aucun deuxième catalogue ni compte client parallèle.

- Deux marchés de démonstration : Belgique/fr/EUR et États-Unis/en/USD, avec leurs IDs et jetons réels générés localement.
- Deux emplacements belges et un emplacement américain ; les prix et stocks restent dans les objets Vendure.
- Import CSV avec aperçu, erreurs par ligne, limite de 100 lignes et 64 Ko. Colonnes : `key,name,sku,price,stock`. Chaque ligne crée un produit activé et une variante. Le prix est un entier en unités mineures ; la devise, le traitement des taxes et l'emplacement sont affichés avant l'import.
- Une transaction et un reçu durable par ligne. Deux requêtes d'import concurrentes portant la même clé ou le même SKU dans un canal sont sérialisées. La reprise conserve les lignes validées. Un contenu différent sous une clé déjà importée est refusé. Les modifications ultérieures du produit ne sont pas écrasées par une relance.
- Les erreurs locales permettent un résultat partiel. Après perte de réponse, la page invite à refaire l'aperçu avec les mêmes clés. Les erreurs internes SQL ne sont pas exposées au navigateur.
- `preferredLanguage` et `contactPreference` sont des champs du client Vendure, privés côté Shop API et soumis aux permissions natives. Aucun groupe ni préférence ne constitue un consentement marketing.

L'import est un outil de création simple. Les modifications et variantes multiples se gèrent dans les écrans natifs. L'import/export avancé et les reprises de migrations externes appartiennent à S72.

## Vérifications

| Contrôle | Résultat et preuve |
|---|---|
| Installation | `npm ci --no-audit --no-fund`, lockfile inchangé |
| TypeScript | `npm run typecheck` réussi |
| Build serveur | `npm run build --workspace @ecom/commerce` réussi |
| Build Dashboard S10 | Vite avec `infra/tests/s10/vite.config.mts`, réussi |
| API/PostgreSQL réels | **23/23 contrôles**, [rapport avec empreintes](preuves/integration.json) |
| Migration sur G0 rempli | **5/5 contrôles**, sauvegarde/restauration dans une autre base, migration et conservation des données et médias ; [rapport](preuves/upgrade.json) |
| Lanceur de recette | **2/2 contrôles réels**, SIGTERM répété et perte de l'API, codes de sortie attendus, processus/ports libérés ; [rapport](preuves/launcher.json) |
| Permissions | Refus anonymes/lecture seule, mutations natives produit/variante/client refusées, commandes non accessibles aux rôles catalogue |
| Marchés | Lecture publique Shop API, objet hors canal non visible et mutation refusée, EUR 1290 et USD 1590 sur la même variante |
| Import | Aperçu sans écriture, résultat partiel, doublons, conflits, mêmes clés et SKU concurrents, rollback après échec SQL, bornes et CSV avec BOM/guillemets/lignes vides |
| Interruption réelle | Serveur arrêté brutalement au milieu de 25 lignes ; après redémarrage, les lignes validées sont reconnues et les autres créées une seule fois |
| Catalogue natif | Produit modifié, deux variantes/options, option invalide refusée, média PNG chargé/servi, facette et collection ; le worker affecte effectivement la variante à la collection |
| Stocks et actions en masse | Deux emplacements avec 7 et 4 unités ; deux produits désactivés puis réactivés |
| Clients | Compte natif authentifié par Shop API, groupe, préférences persistantes, valeur invalide refusée, absence de fuite intercanal |
| Interface | [Recette Responsively](RECETTE_UI.md), import et fiche produit ; quatre dimensions, clavier, erreur, chargement, reprise et refus |
| Complément graphique | CSV choisi dans le dialogue système, ligne invalide refusée ; prix et deux stocks saisis dans la fiche native, enregistrés puis relus après rechargement et par API |

Les avertissements hérités restent visibles : taille du bundle Vendure, dépendances transitives dépréciées, pilote PostgreSQL et absence de scheduler du socle. Aucun audit exhaustif des dépendances ni mise à niveau n'a été réalisé dans S10.

## Rejouer

Depuis le worktree S10 :

```sh
npm ci --no-audit --no-fund
npm run typecheck
npm run build --workspace @ecom/commerce
node infra/tests/s10/verify.mjs
node infra/tests/s10/verify-upgrade.mjs
node infra/tests/s10/verify-launcher.mjs
npm run dev:prepare -- --mission=S10 --session=A
node infra/tests/s10/dev.mjs
```

L'administration est disponible sur `http://127.0.0.1:5101/dashboard/catalogue-import` pendant la commande de développement. Les identifiants restent dans `.data/v1-s10-a/session.json` et les comptes de recette dans `.data/v1-s10-a/fixtures.json`, fichiers ignorés par Git. Le lanceur crée les marchés et rôles au premier démarrage. Il conserve les données aux démarrages suivants. Le contrôle du lanceur utilise les ports réservés A et exige qu'aucun serveur S10 ne soit déjà lancé.

Build de la composition Dashboard isolée :

```sh
ECOM_SESSION_FILE="$PWD/.data/v1-s10-a/session.json" node node_modules/vite/bin/vite.js build --config infra/tests/s10/vite.config.mts
```

## Raccordements G1

1. Ajouter `CataloguePlugin` au registre commun `apps/commerce/src/plugins/index.ts`. L'extension Dashboard est déclarée par le plugin ; ne pas recopier ses routes dans une seconde entrée.
2. Intégrer la migration candidate `apps/commerce/src/plugins/catalogue/migrations/1794309752560-CatalogueS10.ts` dans l'ordre global. Elle crée `catalogue_import_receipt` et les deux colonnes de préférences du client. Sa montée de version sur une copie de G0 contenant produits, prix, stocks, client, groupe, rôles et média est vérifiée par `verify-upgrade.mjs`. G1 doit encore tester les migrations combinées S10/S11/S12.
3. Ajouter les tests S10 aux contrôles communs et reprendre le lanceur commun une fois les plugins raccordés. Les fichiers `infra/tests/s10/vendure-config.ts`, `vite.config.mts` et `dev.mjs` sont des compositions de recette, pas les nouvelles configurations globales. Le lanceur de recette utilise les fonctions S00 de supervision des processus ; PostgreSQL tourne dans son propre processus, afin que son gestionnaire d'arrêt ne court-circuite pas le nettoyage des autres services.
4. S11 référence les IDs des produits natifs obtenus par API, après contrôle du canal. Les IDs des fixtures ne sont pas des contrats stables.
5. S12 doit raccorder et tester son adaptateur de révision commerciale avant de permettre des effets d'agents sur le catalogue. Les événements natifs produits/variantes ne remplacent pas son journal durable.

Aucune dépendance ajoutée, aucun contrat commun changé, aucune source de S11/S12 modifiée. Le thème global et la navigation commune restent sous la responsabilité de l'intégrateur.

## Limites

- G1, le storefront, le checkout, les paiements et les fournisseurs externes ne sont pas vérifiés par cette livraison.
- Les canaux sont des marchés, pas une isolation entre marchands. Le canal principal Vendure conserve son rôle transversal natif.
- L'import sérialise ses propres requêtes. Il n'impose pas une unicité globale des SKU à tous les autres chemins natifs et futurs ; cette règle métier n'est pas ajoutée silencieusement.
- La reprise s'appuie sur la clé conservée dans le fichier et le reçu en base. Supprimer manuellement ces reçus retire cette garantie. Le reçu persiste même si le produit est ensuite supprimé ; une relance ne le recrée pas.
- La recette graphique est ciblée. Safari, appareils physiques et audit exhaustif d'accessibilité restent non testés. Le dialogue de fichier CSV et la modification graphique du prix et des deux stocks sont vérifiés ; les préférences client sont vérifiées par les API réelles.
- Le Dashboard conserve son thème et ses libellés natifs. La traduction et l'application du thème S01 commun restent à G1 ; aucune refonte des pages natives n'est introduite.

Le créneau graphique S10 est libéré pour S12 après confirmation de sa disponibilité par Victor et réalisation du complément. Tous les services lancés par S10 sont arrêtés ; 4101, 5101 et 5541 sont libérés. Les données de démonstration sont conservées. Les preuves restent locales. Aucun commit, push, fusion ou déploiement n'a été effectué.

## Intégration G1

10 novembre 2026. Cette livraison est reprise dans `integration/g1` et vérifiée avec les deux autres modules. Voir [le résultat G1](../G1/RESULTAT.md), ses décisions et ses preuves. Les mentions de raccordements à faire ci-dessus décrivent la livraison isolée initiale. Le worktree source est conservé. Le commit commun G1 `96edeab0904141a6441b2c0f4e7099b11a977a1d` et la [PR #1](https://github.com/Lavic69/E-com-system-AI/pull/1) publient le transfert ; aucun commit séparé n’est inventé sur les branches des lots.
