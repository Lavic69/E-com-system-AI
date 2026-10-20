# S02 : contrats communs

Statut : livré pour revue G0. Propositions documentaires, non intégrées à l'application.

Mise à jour G0 : les schémas et exemples ont été déplacés sans changement de contenu vers `packages/contracts`, leur source commune. Les décisions sont dans [G0](../G0/DECISIONS.md). Le rapport `verification.json` ci-dessous conserve la preuve historique de S02 ; les nouvelles exécutions écrivent un rapport séparé et ne réécrivent pas cette preuve.

Répertoire : `/Users/lavic/Desktop/Amboras REA/E-com-system-AI`.
Base au démarrage : branche `main`, aucun commit ni SHA disponible. Les documents du projet et le banc expérimental étaient non suivis par Git.

## Plan et contrôles

1. Reprendre le glossaire, l'architecture et le banc, puis vérifier les capacités précises de Vendure 3.8.0 dans ses sources. Résultat attendu : propriétaires et limites sourcés.
2. Proposer les neuf contrats et des exemples synthétiques. Contrôle : schéma, références, marchés, devises, versions et états inconnus cohérents.
3. Détailler les huit scénarios obligatoires. Contrôle : préconditions, résultats chiffrés, preuves attendues et lot responsable pour chacun.
4. Exécuter les vérifications documentaires, relire et préparer les arbitrages G0. Les tests de concurrence, les fournisseurs et la persistance restent aux lots d'implémentation.

Méthode : `karpathy-guidelines`, `domain-modeling`, puis `unslop`. Une seule mission dans le checkout partagé, avec écritures limitées à ce dossier.

Les quatre étapes sont réalisées. Aucun worktree n'a été créé : la base ne possédait aucun commit et la coordination prévoit des destinations disjointes avant G0. S02 n'a pas lancé de sous-agent ni de travail d'interface.

## Livraison

| Fichier | Utilité |
|---|---|
| [CONTRATS.md](CONTRATS.md) | Neuf contrats, propriétaires, invariants, transitions, erreurs et frontières avec Vendure |
| [contracts.schema.json](../../../packages/contracts/contracts.schema.json) | 17 formats publics et leurs structures communes, en JSON Schema 2020-12 |
| [examples.json](../../../packages/contracts/examples.json) | 29 exemples synthétiques et 38 contre-exemples ; EUR/USD, deux marchés, états incertains et snapshots alternatifs |
| [SCENARIOS.md](SCENARIOS.md) | Huit recettes obligatoires, résultats attendus et preuves à collecter |
| [SOURCES.md](SOURCES.md) | Références du projet, capacités Vendure consultées et limites |
| [source-manifest.json](source-manifest.json) | Empreintes des entrées documentaires et sources locales consultées |
| [verify.py](verify.py) | Validation des exemples, contre-exemples, références et liens locaux |
| [verification.json](verification.json) | Rapport horodaté, environnement et empreintes de la livraison vérifiée |

Les 17 formats couvrent les neuf sujets demandés ; les objets commerciaux restent des références vers Vendure. Les autres définitions du schéma sont des structures internes, telles qu'une référence ou une autorisation.

Les exemples positifs sont des états stockables, pas des autorisations d'agir. Par exemple, un consentement retiré et des droits inconnus sont des données valides qui bloquent ensuite la diffusion. Les différentes photographies d'une même opération servent des scénarios séparés ; elles ne constituent pas une suite d'événements à appliquer ensemble.

## Décisions proposées à l'intégrateur

| Sujet | Proposition S02 | Validation ou arbitrage attendu |
|---|---|---|
| Marché et monnaie | Un marché référence un canal explicite ; EUR/USD à échelle 2 dans le premier contrat ; autres devises refusées jusqu'à adaptation | Confirmer la correspondance avec la configuration retenue par S00/S10 ; élargir en S70 avec tests |
| Paiement différé | Allocation Vendure durable avant appel distant, sans double soustraction ; conserver le stock tant que le résultat est inconnu | S20 doit prouver réservation, retour au panier, annulation, préparation, expiration et concurrence ; choisir TTL, alerte et cadence avec le connecteur de test |
| Événements durables | Journal de sortie transactionnel, réception dédupliquée par consommateur, clé métier pour chaque effet et rapprochement | S12 doit prouver rollback et reprise après crash sur les points d'émission retenus ; ne pas assimiler EventBus et journal durable |
| Approbation et versions | Liaison à la proposition, cible, politique, effets, compte et plafond ; comparaison atomique avant effet | Fixer canonisation et révision commerciale vérifiable ; contrôler les mutations natives exposées, pas seulement les nouvelles routes |
| Contenu et expérience | Réservation d'édition avec jeton de génération, contrôle du registre d'expériences, publication d'un artefact vérifié et cache partitionné | Réconcilier les états avec S01 ; S11/S21/S51 doivent prouver conflits, expiration de bail et absence de cache croisé |
| Coûts et connexions | Réserve conservée en cas d'incertitude ; coût rapproché une fois ; aucune relance aveugle sans capacité fournisseur | S12 doit vérifier réservation concurrente, changement de période et dépassement constaté ; les fournisseurs restent à sélectionner par lot |
| Audience et création | Client et groupes Vendure référencés ; consentement, désinscription, provenance et droits datés dans Marketing | S32/S52 doivent définir les finalités réelles et vérifier les preuves adaptées aux canaux retenus |

La conservation des allocations incertaines protège la dernière unité mais peut immobiliser du stock. Ce coût est explicite ; aucune libération automatique sur simple timeout n'est proposée. Les paramètres d'exploitation doivent être fixés avant le raccordement d'un fournisseur.

G0 peut accepter les formats de base tout en laissant les garanties d'exécution aux lots désignés. Il ne doit pas marquer le paiement asynchrone ou les connecteurs comme validés sur cette seule livraison.

## Vérifications

Depuis la racine du dépôt :

```sh
python3 docs/livraisons/S02/verify.py
```

Le script utilise Python et `jsonschema` déjà disponibles dans l'environnement. Il n'installe rien, n'ouvre aucun port et n'appelle aucun fournisseur. Sur un autre poste, la disponibilité de `jsonschema` est un prérequis documentaire ; aucune dépendance applicative n'a été ajoutée.

La commande vérifie le schéma lui-même, tous les exemples via leur format et l'enveloppe racine, le refus des contre-exemples à la couche attendue, les références croisées et les liens locaux. Le rapport enregistre aussi les empreintes des fichiers du dossier, hors lui-même.

Résultat final : **81 contrôles documentaires sur 81 réussis**, dont 29 exemples acceptés et 38 contre-exemples rejetés. Les huit scénarios sont présents. Les empreintes des sources relevées sont restées identiques lors du contrôle final.

Un premier essai a révélé que la validation des dates RFC3339 dépendait d'un composant optionnel absent. Le contrôle calendaire UTC est désormais explicite dans le validateur ; le cas du 30 février est rejeté. Aucun échec ne reste ouvert après correction.

La relecture a porté sur les responsabilités, les états inconnus, les bornes monétaires, les références d'approbation, les expirations, les conditions de reprise et la séparation des preuves fictives et réelles. Les sources de Vendure 3.8.0 ont été confrontées aux affirmations dépendant du moteur.

## Critères de sortie

| Critère de S02 | Résultat |
|---|---|
| Terme et propriétaire de référence | Table de responsabilité dans `CONTRATS.md`, glossaire produit conservé |
| États explicites et résultats inconnus | Actions, opérations, paiement, stock, coût, consentement et droits |
| Appels commerciaux autorisés côté serveur | Invariants et recettes définis ; implémentation non prétendue |
| Exemples cohérents | Schéma, égalités, marchés, monnaies, références et contre-exemples vérifiés |
| Hypothèses séparées des décisions validées | Sources, propositions et arbitrages distingués |
| Huit scénarios obligatoires | SC01 à SC08, avec attendus et preuves |
| Compte rendu traçable | Cette livraison et ses rapports locaux |

## Raccordements et limites

L'intégrateur doit choisir l'emplacement applicatif des contrats après revue G0, puis utiliser une seule source de formats. S10 reprendra le contexte et les références commerciales ; S11 les versions et réservations d'édition ; S12 les actions, connexions, budgets et événements ; S20 le paiement différé. Les autres lots reprennent les scénarios qui les concernent.

Aucune migration, table, permission serveur, API de réservation ou file durable n'a été créée. Les huit scénarios n'ont pas été exécutés sur une application. Les transactions, la concurrence PostgreSQL asynchrone, les crashes, les signatures de webhooks, les fournisseurs, les droits réels et les rendus/cache restent à vérifier dans leurs lots. Le banc antérieur de 15 contrôles PostgreSQL n'a pas été relancé.

Les modifications sont exclusivement dans `docs/livraisons/S02/`. Les fichiers techniques de S00 et la livraison S01 apparus pendant la session appartiennent aux autres travaux et ne sont pas inclus dans ce résultat. Les documents partagés et le statut global du plan n'ont pas été modifiés par S02.

Aucun serveur, base ou worker lancé. Aucun compte, paiement, message externe, commit, push ou publication créé. Les fichiers de S02 restent non commités. G0 et les lots suivants ne sont pas lancés par cette livraison.
