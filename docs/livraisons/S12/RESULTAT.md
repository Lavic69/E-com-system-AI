# Livraison S12

10 novembre 2026. Le plugin, l'extension Dashboard et les preuves locales sont livrés. La [recette Responsively](RECETTE_RESPONSIVELY.md) est vérifiée aux quatre dimensions ; G1 reste une intégration distincte.

| Champ | Valeur |
|---|---|
| branche | `feat/s12-operations` |
| base_sha | `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086` |
| worktree | `/Users/lavic/Desktop/Amboras REA/E-com-system-AI-s12` |
| commits | Aucun nouveau commit ; changements locaux non commités |
| push | Non effectué pour S12 |
| destination_integration | `integration/g1`, par l'intégrateur |
| raccordements | [RACCORDEMENTS.md](RACCORDEMENTS.md) |
| preuves du code | [source-manifest.json](preuves/source-manifest.json) |

## Réalisé

- Validation serveur générée depuis le schéma commun, sans nouveau schéma ni modification du lockfile. Les types et validateurs sont reproductibles.
- Contexte reconstruit depuis le compte Vendure et le canal autorisé. Permissions et délégation rechargées avant effet. Les comptes d'agents sont identifiés côté serveur ; omettre leur délégation ne les transforme pas en membres.
- Proposition figée et approbation conservée, liée à 31 champs sensibles par une [canonisation versionnée](CANONISATION.md). Changer la cible, la politique, le compte ou le contenu bloque l'action avant effet.
- Opérations et prises de travail persistantes, verrouillage concurrent, clés stables et absence de retransmission après résultat incertain.
- Journal de sortie transactionnel, réception dédupliquée, conflits conservés, séquences anciennes sans rétrogradation, trous et sources sans séquence soumis à rapprochement.
- Budget réservé atomiquement, réserve conservée pendant l'incertitude et au changement de période, reçu imputé une fois. Un reçu de 400 pour un plafond de 300 est enregistré à 400 et bloque les nouveaux appels de ce budget.
- Connexions de simulation sans exposition de `secretRef`. Le transport email local dispose d'un récepteur PostgreSQL durable et d'une recherche d'état simulée. Un connecteur sans recherche conserve son état incertain.
- Lecture des dossiers dans Dashboard, avec version visée, approbations, réserve, coût inconnu ou rapproché, erreur et référence de preuve. Navigation, actualisation, trace au clavier et états chargement/vide/erreur/refus sont exercés.

## Vérifications

| Contrôle | Résultat et preuve |
|---|---|
| Tests S12 | **17/17**, dont appels API directs, deux processus worker, concurrence, crash réel avec `SIGKILL`, redémarrage du worker et du récepteur : [tests.tap](preuves/tests.tap) |
| Arrêt du lanceur S12 | Test réussi pour `SIGTERM` et `SIGINT`, après démarrage Dashboard ; code 0, ports et PID libérés : [launcher.tap](preuves/launcher.tap) |
| Socle | **16/16 scénarios d'intégration**, avec migrations, permissions, restauration et arrêt de processus ; tests du lanceur également réussis : [rapport](preuves/socle/integration.json), [journal](preuves/socle.txt) |
| Contrats S02 | **81/81**, 29 exemples et 38 contre-exemples : [contracts.json](preuves/contracts.json) |
| TypeScript | `npm run typecheck` réussi pour commerce et Dashboard |
| Génération | `node infra/tests/s12/generate-contracts.mjs --check` réussi ; condensat du schéma vérifié par les tests |
| Dashboard composé S12 | Build réussi : [dashboard-build.txt](preuves/dashboard-build.txt). Le bundle natif Vendure conserve son avertissement de taille supérieure à 500 ko |
| Navigateur isolé | Quatre dimensions, quatre états complémentaires, aucune erreur JS observée : [ui.json](preuves/ui.json) |
| Responsively | **Réussi sur le périmètre de recette** : quatre dimensions, sélection, coûts, trace au clavier, interruption/reprise de l'API et rôles réels de lecture/refus. [Compte rendu](RECETTE_RESPONSIVELY.md) |

Les dimensions vérifiées dans Chromium sont 1440 × 900, 1024 × 768, 390 × 844 et 360 × 800. Aucun débordement horizontal mesuré ; sélection de dossier et ouverture/fermeture de la trace au clavier vérifiées. [Ordinateur](preuves/dashboard-1440.png), [mobile](preuves/dashboard-360.png), [coût et preuve sur mobile](preuves/proof-390.png).

Les données affichées proviennent de l'API de recette. Dans Chromium, les états vide, erreur réseau et chargement sont provoqués par le test. Le refus utilise un vrai compte sans `ReadOperations`. La recette Responsively ajoute une interruption réelle de notre API, sa reprise et le contrôle de deux rôles réels. Elle ne remplace pas un essai sur appareil physique ; l'état vide reste vérifié seulement dans Chromium.

## Frontières de la preuve

SC03 utilise une projection de paiement synthétique. SC04 utilise une cible versionnée synthétique avec verrou PostgreSQL. SC07/SC08 utilisent des messages et reçus locaux. Les tests démontrent les mécanismes S12, pas un paiement, une livraison email réelle ou l'application sur une page S11 intégrée.

G1 doit encore composer les trois plugins, ordonner leurs migrations, raccorder le worker et les consommateurs, puis démontrer une action sur une vraie page S11 référençant un produit S10. Les cibles commerciales sont refusées tant que leur adaptateur de révision n'est pas vérifié.

La V1 expose un seul effet par dossier et exige une approbation humaine, y compris pour un agent délégué. Elle ne produit pas de dossier à effets partiels. La lecture est limitée aux 100 dossiers les plus récents du canal, avec accès direct par identifiant pour un dossier plus ancien.

Le module n'active aucun planificateur permanent. Le worker et la sortie durable fournissent des points d'entrée explicites ; les reprises automatiques et leur cadence relèvent du raccordement G1. Après une première transmission à résultat inconnu, seule une recherche est autorisée. Une absence de résultat ne déclenche pas de nouvel envoi.

## Fichiers et ressources

Écritures produit limitées à `apps/commerce/src/plugins/operations/`, `apps/dashboard/src/extensions/operations/`, `infra/tests/s12/` et ce dossier. Seule la fiche locale `.local-coordination/S12.json` du checkout principal est ajoutée pour coordonner les ressources. Les registres, manifestes, contrats communs, migrations globales et statuts du plan ne sont pas modifiés.

Session préparée : `v1-s12-c`, API 4103, Dashboard 5103, PostgreSQL 5543 ; 3103 reste réservé et inutilisé. Les tests automatisés choisissent leurs ports libres et ferment leurs processus. Les identifiants restent dans `.data/`, hors Git.

L'aperçu utilise des données de démonstration propres à S12. Une première base de recette est conservée localement sous `.data/v1-s12-c-before-final/` ; la base finale a été recréée depuis les migrations candidates, sans reprendre ses secrets. Tous les services S12 sont arrêtés, y compris le récepteur local. L'état final des services et le contrôle d'arrêt sont consignés dans [resources.json](preuves/resources.json).

## Reproduire

```sh
npm ci --no-audit --no-fund
npm run dev:prepare -- --mission=S12 --session=C
npm run build --workspace @ecom/commerce
node --test infra/tests/s12/operations.test.mjs
npm run typecheck
npm run test:contracts
node infra/tests/s12/dev.mjs
```

Le dernier processus ouvre la recette sur `http://127.0.0.1:5103/dashboard/operations`. Les identifiants locaux restent dans `.data/v1-s12-c/session.json`. Arrêter le lanceur par `SIGTERM` ou `Ctrl+C` ferme ses propres services. Le récepteur utilise un port libre annoncé au démarrage.

Le test UI utilise un Playwright déjà installé, indiqué par `S12_PLAYWRIGHT_MODULE`, puis `node infra/tests/s12/verify-ui.mjs`. Ce module ne fait pas partie des dépendances produit. Lire le protocole de coordination avant toute manipulation de Responsively.

## Intégration G1

10 novembre 2026. Cette livraison est reprise dans `integration/g1` et vérifiée avec les deux autres modules. Voir [le résultat G1](../G1/RESULTAT.md), ses décisions et ses preuves. Les mentions de raccordements à faire ci-dessus décrivent la livraison isolée initiale. Le worktree source est conservé. Le commit commun G1 `96edeab0904141a6441b2c0f4e7099b11a977a1d` et la [PR #1](https://github.com/Lavic69/E-com-system-AI/pull/1) publient le transfert ; aucun commit séparé n’est inventé sur les branches des lots.
