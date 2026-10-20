# Résultat G0

20 octobre 2026. Intégration locale demandée par Victor après la revue S00/S01/S02.

**G0 vérifié techniquement, recette graphique réalisée.** Le premier commit de `main`, autorisé par Victor après la recette, porte la base commune des worktrees.

## Réalisation

- Lanceur : surveillance de PostgreSQL, API, worker et Dashboard dès leur prise en charge, détection d'un service déjà arrêté, échec même pour une sortie inattendue avec code zéro, nettoyage en ordre inverse.
- Régressions : cas de panne pendant le démarrage et après disponibilité, arrêt volontaire distinct, essais sur processus réels.
- Contrats S02 : schéma et exemples déplacés sans modification de contenu dans `packages/contracts`, exposés comme workspace. Le validateur historique est conservé et utilise cette source unique.
- Ressources V1 : `--mission=S10/S11/S12` choisit des données, médias, secrets et sauvegardes propres au lot ; les ports restent affectés par session A/B/C.
- [Décisions G0](DECISIONS.md) : conventions monétaires, marchés, permissions, états, versions, coûts et frontières d'implémentation rapprochées de S00/S01.
- [Fiches S10](../../pilotage/missions/S10-catalogue.md), [S11](../../pilotage/missions/S11-pages.md) et [S12](../../pilotage/missions/S12-operations.md) détaillées, sans lancement.
- Coordination mise à jour : branche par mission, intégration de vague, PR vers `main`, autorisations distinctes et vérification du SHA distant.

## Défaut corrigé

Le lanceur n'écoutait la sortie de l'API qu'après le démarrage du worker et n'incluait pas PostgreSQL dans son attente. Une sortie anticipée était donc perdue ; la session pouvait rester ouverte puis retourner zéro à l'arrêt manuel.

Quatre tests échouaient avant correction : API arrêtée pendant le démarrage du worker, service déjà arrêté avant abonnement, perte de PostgreSQL, sortie inattendue avec code zéro. Le scénario d'arrêt volontaire passait déjà. Le code corrigé conserve la première panne et échoue après nettoyage.

Les tests contrôlés exécutent le code du lanceur avec des processus simulés. La suite d'intégration complète provoque aussi l'arrêt de l'API réelle et du processus PostgreSQL lancé pour le test ; elle exige le code 1, les ports libres et l'absence de verrou résiduel.

## Vérifications

Les résultats finaux et les empreintes sont rassemblés dans `preuves/verification.json`. Le [rapport d'intégration](preuves/integration.json) couvre les permissions, CSRF, migrations, séparation des sessions, restauration et quatre scénarios d'arrêt du lanceur.

| Contrôle exécuté sur l'état G0 | Résultat |
|---|---|
| Installation depuis le lockfile | `npm ci` réussi, sans changement de versions de dépendances |
| TypeScript et build serveur/Dashboard | Réussis |
| Configuration et régressions du lanceur | 9 tests réussis |
| Intégration réelle | 16 scénarios réussis |
| Contrats communs | 81 contrôles réussis ; 29 exemples acceptés, 38 contre-exemples refusés |
| Prototype S01, contrôles statiques | 26 contrôles réussis ; rapport courant sous `preuves/interface-statique.json` |
| Promotion des contrats | Schéma et exemples identiques par SHA-256 à la preuve S02 d'origine |
| Secrets et exclusions | Aucun secret local connu ni motif de clé recherché dans les fichiers candidats et le bundle ; données, dépendances et caches ignorés |
| Liens documentaires locaux | Aucun lien de fichier manquant au contrôle final |
| Recette graphique S00/S01 | Réalisée dans Responsively stable aux quatre dimensions ; débordement mobile corrigé et revérifié |

Le build conserve l'avertissement de taille du bundle natif Vendure. L'installation signale des dépendances transitives dépréciées ; aucune montée de version ni audit de sécurité exhaustif n'a été réalisé en G0. Le pilote PostgreSQL conserve son avertissement connu. Ces messages ne sont pas comptés comme des échecs de test.

Commandes à rejouer depuis la racine :

```sh
npm ci
npm run typecheck
npm run build
ECOM_VERIFY_REPORT_DIR=docs/livraisons/G0/preuves npm test
ECOM_CONTRACT_REPORT=docs/livraisons/G0/preuves/contracts.json npm run test:contracts
```

Les tests de contrat nécessitent la version Python de `jsonschema` indiquée dans `packages/contracts/requirements.txt`. Les données et logs de recette restent dans `.data/`. Les anciennes preuves S00/S01/S02 sont historiques et conservées, sans leur attribuer les modifications G0.

## Recette graphique

Après la première tentative partielle, Victor a demandé une reprise avec la seule version stable `/Applications/ResponsivelyApp.app`. La [recette détaillée](RECETTE_RESPONSIVELY.md) et les preuves sous `preuves/ui/` couvrent les quatre dimensions : 1440 × 900, 1024 × 768, 390 × 844 et 360 × 800.

S00 a été vérifié avec un administrateur et deux rôles limités, par navigation et URL directe. La suspension puis l'arrêt des services de recette ont permis d'observer le chargement, l'erreur réelle et la reprise. L'activation du bouton au clavier a déclenché une vraie requête.

S01 a été manipulé sur ses trois écrans et ses dix variantes d'état. Le bouton de vérification du paiement débordait en mobile : sa largeur a été corrigée, puis le rendu a été revérifié dans Responsively et les 26 contrôles statiques ont été rejoués.

Les appareils physiques, Safari et un audit exhaustif d'accessibilité ne sont pas couverts. Le prototype reste fictif ; cette recette technique ne vaut pas approbation personnelle des maquettes finales par Victor.

## Git et suites

Au départ : un checkout, branche initiale nommée `main`, aucun commit local ou distant. Aucun travail à fusionner depuis des branches S00/S01/S02. Les fichiers candidats et exclusions sont présentés dans [l'état à versionner](ETAT_A_VERSIONNER.md).

Victor a autorisé le premier commit local sur `main` après présentation de la recette. Son SHA réel se retrouve avec `git rev-list --max-parents=0 main` et est consigné après création dans `.local-coordination/v1-base.json`. Les trois missions V1 sont prêtes mais ne sont pas lancées par ce commit.

Les rapports JSON et l'inventaire décrivent l'état contrôlé avant le commit ; leurs champs Git nuls ou non committés sont des relevés historiques, pas une lecture actuelle de `.git`. Aucun SHA fictif ni autoréférence de commit n'est inséré dans les preuves.

Le push reste distinct, avec le choix de licence et le contenu destiné au dépôt public. Aucun push, fusion ou déploiement n'est effectué lors de la création de cette base locale.

Les garanties asynchrones, fournisseurs réels, crash transactionnel métier et fonctions commerciales futures restent aux lots désignés. Le socle et les contrats ne les rendent pas déjà opérationnels.

Tous les services démarrés par G0 et la recette S00 sont arrêtés. Le serveur S01 déjà présent sur 5102 a été conservé. Le créneau graphique G0 est libéré et les trois appareils habituels sont à nouveau sélectionnés dans Responsively.
