# Décisions d'intégration G0

20 octobre 2026. Ces choix techniques concrétisent les livraisons S00/S01/S02 dans le périmètre d'intégration demandé par Victor. Ils ne constituent pas une validation d'exécution des fonctions métier futures.

## Références et formats

`packages/contracts/contracts.schema.json` et `examples.json` deviennent les seules sources des formats communs et de leurs exemples. Leur contenu est identique à la livraison S02. Les [invariants S02](../S02/CONTRATS.md) et ses [huit recettes](../S02/SCENARIOS.md) restent les références métier, sans copie concurrente. `npm run test:contracts` les vérifie.

| Sujet | Convention retenue | Preuve d'exécution attendue |
|---|---|---|
| Boutique et marché | Une cellule par boutique. Chaque marché référence un canal Vendure explicite ; aucun canal ne devient une isolation entre marchands | S10 : deux canaux de démonstration, droits et prix séparés |
| Langue et devise | EUR/USD, échelle 2 ; langue et devise autorisées sur le canal ; référence opaque au canal réel, aucun ID de fixture utilisé en base | S10 : Belgique/fr/EUR et États-Unis/en/USD ; S70 pour l'élargissement |
| Montants | Entiers en unités mineures, borne 2 147 483 647 ; totaux issus de Vendure ; estimation et inconnu restent distincts | S10 : prix par canal ; S20 : devis et paiement ; taxes de test seulement |
| Identité et permissions | Le serveur construit le contexte depuis l'acteur authentifié et le canal autorisé ; les codes `platform.*` de fixtures ne sont pas des permissions déjà installées | S10/S11/S12 : accès direct API refusé, dont mutations natives concernées |
| Événements | Journal transactionnel durable, déduplication par consommateur et clé métier de l'effet ; EventBus seul insuffisant | S12 : rollback, crash, doublon, désordre et reprise |
| Actions | Approbation liée à cible/version, proposition, politique, effets, compte et plafond ; revalidation juste avant effet | S12 : invalidation et comparaison atomique ; révision commerciale testée avant agent commercial |
| Contenu | Versions immuables, réservation d'édition avec jeton croissant ; référence aux objets du catalogue | S11 : deux éditeurs, expiration et ancien jeton refusé |
| Expérience et publication | Une réservation expirée ne suffit pas à libérer une expérience active ; artefact et cache partitionnés selon S02 | S21/S51 : registre actif et absence de cache croisé |
| Budget et résultat incertain | Réservation conservée jusqu'au rapprochement ; aucune relance aveugle ; un dépassement constaté reste enregistrable | S12 : réservation concurrente, reprise et coût imputé une fois |
| Paiement et stock | Allocation durable avant l'appel externe, sans double soustraction ; stock conservé si paiement incertain | S20 : recettes SC01/SC02, annulation et webhooks ; aucune intégration du checker synchrone comme solution asynchrone |
| Audience et créations | Références Vendure, consentements et droits datés ; nouvelle vérification avant diffusion | S32/S52 et lots concernés ; aucun compte réel raccordé en G0 |

S00 est une installation technique : il n'a pas configuré les marchés de démonstration ci-dessus. Le canal natif du socle n'est pas assimilé silencieusement à « Belgique ». Les prix en euros de S01 et les identifiants de S02 sont des exemples.

La canonisation cryptographique d'une approbation et l'adaptateur de révision des objets commerciaux sont des critères explicites de S12. Les condensats fictifs de S02 ne sont pas des signatures réutilisables. Aucun effet commercial d'agent n'est autorisé avant leurs tests.

## Correspondance avec S01

| Libellé de l'interface | Donnée ou règle de référence |
|---|---|
| Paiement « À confirmer » | `PaymentAttempt` pending/unknown ; aucune confirmation déduite du navigateur |
| Préparation / livraison | États du moteur commercial ; ne pas les déduire d'un seul état de paiement |
| Proposition v13 basée sur v12 | Version immuable de proposition et version attendue de la cible |
| Proposition approuvée | Autorité enregistrée ; distincte d'une exécution réussie et d'une publication |
| Application à vérifier | Résultat incertain, recherche de l'opération existante avant relance |
| Coût connu / montant réservé | Sommes d'observations et de réservations des opérations ; aucune conversion implicite |
| Plafond de l'action | Limite de la proposition ; ne pas l'assimiler au montant déjà réservé d'une seule opération |
| Source absente / ancienne / quota | Absence ou qualité de la preuve ; jamais un zéro inventé |
| Conflit avec une expérience | Refus de modifier la portée protégée ; l'observation reste possible |
| Aucun résultat mesuré | Pas de conclusion commerciale ou SEO à partir d'une simple application |

La direction claire de S01 est déjà confirmée. Les planches restent une proposition graphique ; la recette technique ne vaut pas approbation personnelle des maquettes par Victor. Les futurs écrans réutilisent les composants publics Vendure et les règles de S01, sans reconstruire les écrans natifs lorsqu'une extension suffit.

## Organisation V1

Pour le premier jalon, les plugins restent dans `apps/commerce/src/plugins/`, déjà compilé par S00. Les limites métier de l'architecture sont conservées. Extraire des packages TypeScript n'est pas nécessaire pour isoler ces trois lots.

| Lot | Serveur | Extension Dashboard | Tests propres |
|---|---|---|---|
| S10 | `apps/commerce/src/plugins/catalogue/` | `apps/dashboard/src/extensions/catalogue/` | `infra/tests/s10/` |
| S11 | `apps/commerce/src/plugins/content/` | `apps/dashboard/src/extensions/content/` | `infra/tests/s11/` |
| S12 | `apps/commerce/src/plugins/operations/` | `apps/dashboard/src/extensions/operations/` | `infra/tests/s12/` |

Chaque lot prépare son plugin et une configuration de test propre dans son dossier de tests. La configuration de test compose la configuration S00 avec ce plugin, sur une base isolée ; elle n'écrit pas dans le registre commun. Toute migration candidate reste dans le dossier du plugin jusqu'à l'ordonnancement par l'intégrateur. Le premier commit G1 commun raccordera le registre, le build Dashboard et les migrations.

Les tests de module et un Dashboard composé uniquement pour la recette ne valent pas preuve de G1. L'intégration finale combine les trois plugins, applique les migrations sur une copie de la base S00 et rejoue le parcours commun.

## Ressources et prérequis

| Lot | Branche prévue | Session | API / Dashboard / site réservé / PostgreSQL | Données dans son worktree |
|---|---|---|---|---|
| S10 | `feat/s10-catalogue` | A | 4101 / 5101 / 3101 / 5541 | `.data/v1-s10-a/` |
| S11 | `feat/s11-pages` | B | 4102 / 5102 / 3102 / 5542 | `.data/v1-s11-b/` |
| S12 | `feat/s12-operations` | C | 4103 / 5103 / 3103 / 5543 | `.data/v1-s12-c/` |

`dev:prepare`, `dev`, `dev:check`, `db:backup` et `db:restore` acceptent `--mission=S10` (ou S11/S12), en plus de `--session`. Les données, médias, comptes et sauvegardes suivent cet identifiant ; les processus reçoivent automatiquement `ECOM_SESSION_FILE`. La compilation Dashboard manuelle d'une mission utilise ce même fichier via la variable d'environnement.

Un port occupé reste un refus de démarrage. Le prototype S01 utilise actuellement 5102 : l'intégrateur doit faire libérer ce serveur par sa session propriétaire avant S11, ou affecter et documenter une configuration distincte. Aucune fiche V1 n'autorise à tuer un processus inconnu.

Les trois missions attendent le même SHA G0, enregistré après création du commit autorisé. Elles sont détaillées, mais ne sont pas lancées par la préparation de G0.
