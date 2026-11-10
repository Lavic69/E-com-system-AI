# Résultat G1

10 novembre 2026. S10, S11 et S12 sont réunies et vérifiées dans la configuration locale commune. Le parcours produit importé → page versionnée → action approuvée → événement durable est exécuté avec PostgreSQL et Vendure réels.

| Traçabilité | Valeur |
|---|---|
| Branche de livraison | `integration/g1`, vers `main` par la PR #1 |
| Base commune | `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086` |
| Sources initiales | `feat/s10-catalogue`, `feat/s11-pages`, `feat/s12-operations`, livrées sans commits propres |
| Transfert | 179 fichiers, empreintes dans `preuves/transfert.json` ; worktrees sources conservés |
| Commit de réalisation G1 | `96edeab0904141a6441b2c0f4e7099b11a977a1d` ; les commits suivants de la PR actualisent la traçabilité |
| Publication Git | Branche poussée ; [PR #1](https://github.com/Lavic69/E-com-system-AI/pull/1), qui fournit le statut et le SHA de fusion |
| Destination finale | `main` ; commit, push, PR et fusion autorisés par Victor le 10 novembre 2026 |

## Résultat

Les trois plugins, leurs migrations et leurs extensions Dashboard sont raccordés. La configuration G0 reste disponible pour les essais de montée de version. GraphQL et Nest Core sont déclarés comme dépendances directes du serveur ; le Dashboard déclare Vendure Common pour sa configuration de langues. Aucun paquet produit n'a été mis à niveau.

Une action S12 peut enregistrer une version de page S11 contenant une référence au produit S10. Elle conserve les contrôles de permission, marché, langue, bail et révision. L'action, la version et l'événement sont atomiques. Le worker exécute les actions locales approuvées et alimente un journal de réception dédupliqué.

Deux corrections ont été démontrées pendant G1 : prise en charge des objets JSON littéraux GraphQL dans la canonisation et conservation de l'identité boutique lors d'une restauration dans une base renommée. Les [décisions](DECISIONS.md) détaillent le fonctionnement et les frontières.

## Vérifications

| Contrôle | Résultat |
|---|---|
| Commande complète `npm run test:all` | Réussie, code 0, `preuves/test-all.txt` |
| TypeScript serveur et Dashboard | Réussi, `preuves/typecheck.txt` |
| Build serveur et Dashboard composé | Réussi ; quatre extensions actives, `preuves/dashboard-build.txt` |
| G1 sur API et PostgreSQL réels | **15/15**, `preuves/integration.json` |
| S10 rejoué depuis l'intégration | **23/23**, `../S10/preuves/integration.json` |
| S11 rejoué depuis l'intégration | **19/19**, `../S11/preuves/integration.json` |
| S12 après correction de canonisation | **17/17**, `preuves/s12.tap` |
| Socle sur la configuration intégrée | **16/16** et tests du lanceur/configuration, `preuves/socle/integration.json` |
| Contrats communs | **81/81**, `preuves/contracts.json` |
| Responsively stable | Voir `RECETTE_RESPONSIVELY.md` pour les dimensions, interactions et captures |

G1 éprouve l'import avec reprise, la lecture Shop API, deux marchés et prix distincts, la page immuable et son aperçu, l'exécution répétée/concurrente, SC04, un bail renouvelé ou expiré, une référence absente, le retrait de droits, les agents refusés et l'isolation des canaux. Il injecte un échec SQL après écriture de contenu, tue l'API avant commit, redémarre API/PostgreSQL/worker, remet un événement déjà reçu et restaure G1 dans une base renommée.

La copie G0 conserve produit, prix, stock, rôle et média. Les cinq migrations passent dans l'ordre prévu ; aucune table `s11_fixture_*` ou `s12_fixture_*` n'existe dans la configuration intégrée. Les simulations S12 restent cantonnées à sa recette.

## Rejouer

Depuis le checkout contenant G1 :

```sh
npm ci --no-audit --no-fund
npm run test:all
npm run demo:g1
```

`test:all` compile puis exécute les contrôles du socle, des contrats et des trois modules, suivis de G1. Il exige un Python disposant des dépendances décrites dans `packages/contracts/README.md`. `test:g1` conserve une base de démonstration et ses métadonnées privées sous `.data/` et `.local-coordination/`. `demo:g1` l'ouvre avec le lanceur commun et annonce son URL. Les identifiants restent dans les fichiers privés locaux.

Pour une installation locale vide : `npm run dev -- --mission=G1 --session=A`. Ce démarrage ne crée pas silencieusement les marchés et données de démonstration ; les tests les préparent explicitement.

## Limites et prochaine base

La recette couvre le moteur Chromium de Responsively. Safari, appareils physiques et audit exhaustif d'accessibilité ne sont pas démontrés. Les avertissements Vendure sur le bundle volumineux, le scheduler général absent et le pilote PostgreSQL restent visibles.

Aucun site publié, checkout, paiement, compte fournisseur, envoi externe ou agent commercial n'est activé. Les transports de simulation S12 restent testés séparément ; G1 active seulement l'effet local sur page. La protection d'expérience attend S51. Les montants nuls des actions locales ne prouvent aucun tarif fournisseur.

Les fiches S20, S21 et S22 sont préparées, sans lancement. Leur base est le commit de fusion de la [PR #1](https://github.com/Lavic69/E-com-system-AI/pull/1) sur `main`, à relever lorsque son état est `MERGED`. Le SHA G0 et les branches des trois lots ne constituent pas cette base. Aucun worktree ni branche source n’est supprimé.

La liste explicite des fichiers candidats est conservée dans `FICHIERS_A_VERSIONNER.txt`. Le texte de présentation est conservé dans `PR_PREPAREE.md` et repris dans la PR #1. Les 179 fichiers sources ont été comparés à leurs empreintes initiales sans différence ; la recherche des secrets locaux connus dans les fichiers candidats ne trouve aucune correspondance.

## Rattachement Git des preuves

Le commit de réalisation `96edeab0904141a6441b2c0f4e7099b11a977a1d` reproduit les 94 empreintes sources de `preuves/verification.json`. Aucun code n’a été modifié pour sa publication. Six journaux de preuve ont seulement perdu leurs espaces de fin de ligne ; les originaux sont conservés localement. Les contrôles du commit final comparent les fichiers exécutables au commit de réalisation et relisent les contrôles distants. Aucune CI ni revue externe n’est présentée comme exécutée en l’absence de résultat GitHub.

Pour relever la base commune immuable de V2 :

```sh
gh pr view 1 --repo Lavic69/E-com-system-AI --json state,mergeCommit
```

Exiger `MERGED`, récupérer ce SHA et vérifier que `origin/main` le contient avant de créer les worktrees S20/S21/S22. Le coordinateur conserve également la référence locale dans `.local-coordination/v2-base.json`.
