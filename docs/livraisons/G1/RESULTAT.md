# Résultat G1

10 novembre 2026. S10, S11 et S12 sont réunies et vérifiées dans la configuration locale commune. Le parcours produit importé → page versionnée → action approuvée → événement durable est exécuté avec PostgreSQL et Vendure réels.

| Traçabilité | Valeur |
|---|---|
| Branche | `integration/g1` dans le checkout principal |
| Base commune | `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086` |
| Sources | `feat/s10-catalogue`, `feat/s11-pages`, `feat/s12-operations`, toutes non commitées |
| Transfert | 179 fichiers, empreintes dans `preuves/transfert.json` ; worktrees sources conservés |
| Commits G1 | Aucun ; état local à versionner |
| Push, PR, fusion | Non effectués |
| Destination finale | `main`, après autorisation propre et vérification du commit exact |

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

Les fiches S20, S21 et S22 sont préparées, sans lancement. Leur base ne peut pas être G0 : il reste à autoriser le commit G1, sa publication/PR et sa fusion suivant la coordination, puis relever le SHA de `main` réellement intégré. Aucun worktree ni branche source n'est supprimé.

La liste explicite des fichiers candidats est conservée dans `FICHIERS_A_VERSIONNER.txt`. Le brouillon de PR reste local dans `PR_PREPAREE.md`. Les 179 fichiers sources ont été comparés à leurs empreintes initiales sans différence ; la recherche des secrets locaux connus dans les fichiers candidats ne trouve aucune correspondance.
