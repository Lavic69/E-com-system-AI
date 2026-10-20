# Plan d'exécution par lots et sessions

Version de travail du 20 octobre 2026. Périmètre : [cahier produit](../produit/CAHIER_PRODUIT.md).

Le projet se construit par lots démontrables. Une vague rassemble jusqu'à trois lots pouvant avancer indépendamment depuis une base commune. Une intégration courte entre les vagues vérifie qu'ils fonctionnent ensemble.

Un lot peut demander plusieurs tours de la même session Codex. Aucun délai ou coût ferme n'est déduit du nombre de lots.

## 1. État actuel

| Élément | État constaté |
|---|---|
| Dépôt | `Lavic69/E-com-system-AI`, public et initialement vide |
| Checkout local préparé | Dossier `E-com-system-AI` à l'intérieur de `Amboras REA` |
| Commits, base de worktrees | Base G0 portée par le premier commit de `main` ; relever son SHA avec la commande ci-dessous |
| Application | Socle local Vendure 3.8.0, API, worker et extension Dashboard réalisés par S00 |
| Moteur | Vendure 3.8.0 testé avec données et paiements fictifs |
| Stock concurrent | Contre-exemple reproduit et protection synchrone testée ; paiement asynchrone encore à traiter |
| Interface | Direction S01 confirmée ; maquettes livrées ; recette S00/S01 réalisée dans Responsively stable aux quatre dimensions |
| Contrats | Source commune dans `packages/contracts`, invariants S02 et décisions G0 |
| Intégration | G0 vérifié : lanceur, contrats, ressources, recette UI et workflow Git ; base locale, non poussée |
| Missions de code suivantes | S10, S11 et S12 prêtes ; lancement uniquement sur instruction de Victor depuis le même SHA G0 |

Les rapports du [banc de validation](../../experiments/core-validation/README.md) sont les preuves du moteur. Ils ne valent pas validation du checkout de production, de l'administration ou des intégrations.

## 2. Manière de travailler

Chaque mission contient un résultat observable, ses entrées, ses dépendances, les chemins autorisés, les exclusions et les critères de sortie. Les trois premières fiches sont prêtes. Les lots ultérieurs sont une carte complète du projet ; leur fiche détaillée est arrêtée avant lancement, à partir de l'état réellement intégré.

Le cycle d'un lot est :

1. Vérifier la base, les contrats et les ressources.
2. Réaliser le parcours dans le périmètre confié.
3. Exécuter les contrôles et corriger les problèmes démontrés.
4. Relire et remettre une livraison avec ses preuves.
5. Faire intégrer puis vérifier le parcours commun.

Les choix produit et les autorisations manquantes sont remontés avec une proposition concrète. Un doute ordinaire d'implémentation est résolu par la session. Les grands arbitrages déjà validés ne sont pas rouverts sans nouvelle preuve.

Le parallélisme ne remplace pas les dépendances. Les états utilisés sont `À détailler`, `Prêt`, `En cours`, `Livré`, `Intégré et vérifié`, ou `En attente` avec une raison précise.

## 3. Première vague livrée et intégration

| Session | Mission | Résultat | Écritures exclusives |
|---|---|---|---|
| A | [S00 — Socle](missions/S00-socle.md) | Dépôt amorçable, API locale, commandes de développement et validation de l'extension d'administration | Racine technique, `apps/`, `infra/dev/`, `docs/livraisons/S00/` |
| B | [S01 — Interface](missions/S01-interface.md) | Proposition graphique et maquettes des parcours prioritaires, états et composants définis | `docs/livraisons/S01/` uniquement |
| C | [S02 — Contrats](missions/S02-contrats.md) | Contrats communs minimaux, données d'exemple et scénarios d'acceptation | `docs/livraisons/S02/` uniquement |

S00 ne développe pas les écrans métier ni les objets propres aux agents. S01 ne modifie pas le squelette de l'application. S02 prépare les contrats, sans appliquer de migrations ni modifier les fichiers techniques de S00.

Les trois sessions ont livré leurs fichiers sans commit. L'intégrateur G0 peut désormais réconcilier les documents partagés dans le périmètre autorisé.

### G0 — Première intégration

La session A reprend le rôle d'intégrateur une fois S00, S01 et S02 livrés :

- Vérifier l'amorçage sur les versions réellement retenues.
- Confirmer que les points d'extension d'administration nécessaires fonctionnent.
- Exiger une permission serveur, une migration et une restauration de démonstration vérifiées ; un blocage sur ces contrôles laisse G0 ouvert.
- Réconcilier les contrats S02 avec le moteur et la proposition S01.
- Fixer les chemins exacts, commandes, ports et ressources propres à chaque session.
- Intégrer les contrats et scénarios communs dans le dépôt, avec des exemples exécutables lorsque pertinent.
- Vérifier les conventions monétaires, de marché, de permissions, d'événements et de versions.
- Préparer un état de référence propre ; créer son commit uniquement après autorisation correspondante.
- Inscrire le SHA réel de cette base et préparer les fiches S10, S11 et S12.

**Le premier commit de `main` constitue la base G0.** Sa création locale a été autorisée par Victor après la recette. La [livraison d'intégration](../livraisons/G0/RESULTAT.md) précise les preuves et les limites ; les [décisions](../livraisons/G0/DECISIONS.md) fixent les contrats, chemins et ressources.

Pour relever le SHA immuable de G0, y compris après des commits ultérieurs :

```sh
git rev-list --max-parents=0 main
```

Cette commande doit retourner un seul commit. L'intégrateur consigne ce SHA dans `.local-coordination/v1-base.json` après sa création. Chaque mission le relève et l'inscrit dans sa livraison ; le fichier local n'est pas nécessaire sur un autre clone. Ne pas remplacer silencieusement cette base par un `main` qui aurait avancé.

Les fiches [S10](missions/S10-catalogue.md), [S11](missions/S11-pages.md) et [S12](missions/S12-operations.md) sont prêtes. Vérifier l'existence du commit G0 et son SHA commun avant leur lancement. La création de cette base ne lance aucune mission automatiquement.

Une direction graphique non confirmée empêche de marquer prêts les travaux d'écrans métier. Si seule cette décision manque, l'intégrateur peut préparer une mission API indépendante, avec sa base et ses critères explicites ; il conserve G0 partiel et ne déclare pas l'interface validée.

## 4. Carte complète des vagues

Chaque vague attend l'intégration de la précédente. Les dépendances citées précisent les liens importants ; elles n'autorisent pas à contourner le point d'intégration.

| Vague | Session A | Session B | Session C | Démonstration commune attendue |
|---|---|---|---|---|
| V0 | S00 Socle | S01 Interface | S02 Contrats | G0 : base reproductible et contrats prêts |
| V1 | S10 Catalogue, membres et données client minimales | S11 Pages et versions | S12 Actions, connexions et événements persistants | G1 : produit créé, contenu versionné et action traçable |
| V2 | S20 Checkout et paiement de test | S21 Éditeur, aperçu et publication | S22 Collecte et premiers tableaux de bord | G2 : achat visible dans l'administration et les mesures |
| V3 | S30 Livraison, retours et remboursements | S31 Audit SEO et sources de données | S32 Marque, campagnes et images | G3 : commande traitée, audit exploitable, campagne préparée |
| V4 | S40 Approvisionnement et stocks avancés | S41 Agent d'amélioration SEO | S42 Vidéos et montage | G4 : stock, pages et créations modifiés avec historique |
| V5 | S50 Promotions, lots, cartes cadeaux et devis | S51 Expériences A/B | S52 Diffusion email et sociale | G5 : offre, expérience de contenu et campagne cohérentes |
| V6 | S60 Fidélisation et avis | S61 Publicité et flux produits | S62 Hébergement et exploitation | G6 : scénarios commerciaux opérables dans une installation indépendante |
| V7 | S70 International et B2B | S71 Créateurs et affiliation | S72 Migration, comptabilité et extensions | G7 : données et droits cohérents entre parcours avancés |
| V8 | S80 Produits numériques | S81 Abonnements | S82 Retours clients et analyses avancées | G8 : achats avancés et rapports réconciliés |
| V9 | S90 Préparation puis intégration des corrections | S91 Revue des domaines sensibles | S92 Recette utilisateur et installation | G9 : candidat livré avec preuves et limites |

En V9, S90 prépare d'abord un candidat figé. S91 et S92 l'examinent en parallèle avec le code candidat en lecture seule ; installations, bases et données de test jetables sont autorisées pour leur recette locale. S90 reprend ensuite les corrections ; aucune session ne modifie le candidat pendant son évaluation.

## 5. Résultat et critères des lots

### V1 — Premier fonctionnement commun

| Lot | Résultat utilisable | Critères de sortie |
|---|---|---|
| S10 | Un membre autorisé crée un produit et ses variantes ; un visiteur les consulte | Création, modification, import simple et relecture ; attributs, catégories/collections, médias et actions en masse ; rôles ; stock par emplacement ; prix par marché ; comptes clients, groupes et préférences minimales |
| S11 | Le marchand prépare une page et retrouve ses versions | Blocs structurés, brouillon, aperçu de contenu, historique ; sélection d'une version publiée ; réservation d'édition et détection des conflits ; données produit référencées sans double source |
| S12 | Une action autorisée s'exécute et reste traçable après interruption | Permissions, version cible, approbation, état durable, reprise sans double effet ; événements persistants et dédupliqués ; registre de connexion ; coûts réservés/connus ; transport email local de test |

S12 fournit la persistance minimale des événements avant le checkout. S22 développera leur collecte et leur lecture analytique. S11 fournit le verrouillage des versions avant les agents SEO et les expériences.

### V2 — Vendre, modifier le site et mesurer

| Lot | Dépendances utiles | Critères de sortie |
|---|---|---|
| S20 | S10, S12 | Panier, adresses, taxes de test, livraison, prestataire en mode test, paiement refusé et reprise ; réservations durables, expiration, confirmations asynchrones et doublons ; deux acheteurs sur la dernière unité ; confirmation de commande dans le transport de test |
| S21 | S11, S12, direction graphique confirmée | Navigation, pages et thème modifiables ; comparaison avant/après ; aperçu rendu ; publication locale d'un artefact identifié ; clés et invalidation du cache selon le contrat S02 ; retour arrière sans modifier commandes ou paiements ; responsive contrôlé |
| S22 | Contrat S02, événements S12, lectures S10 | Tunnel et ventes sur événements connus ; rapprochement avec les commandes ; retard, absence et doublons visibles ; définitions de métriques datées |

Le correctif synchrone du banc ne suffit pas à fermer S20. L'accès à un compte de test sera demandé au moment de vérifier le prestataire. Un simulateur permet d'avancer localement, mais ce parcours reste `Non testé avec le fournisseur` tant que l'essai réel en sandbox n'a pas été effectué.

### V3 et V4 — Opérations, SEO et production de contenus

| Lot | Dépendances utiles | Critères de sortie |
|---|---|---|
| S30 | S20, S12 | Préparation, suivi, retour, échange et remboursement partiel ; erreurs fournisseur ; notifications expédition/remboursement ; montants et stocks rapprochés |
| S31 | S11, S12, S22 | Audit local ; connexions Search Console et DataForSEO ; marché/date/source identifiables ; absence, quota et erreurs distincts ; opportunités étayées et coût connu |
| S32 | S10, S11, S12, S22 | Référentiel de marque ; brief, produits, offre, audience et page de campagne ; images, traductions et déclinaisons ; provenance/droits ; segmentation minimale et registre de consentement |
| S40 | S10, S20, S30 | Fournisseurs, commandes d'achat, réception et transferts ; alertes et réapprovisionnement ; deux emplacements ; ajustement concurrent avec achat ; stock disponible cohérent et historique |
| S41 | S31, S21, S12 | Surveillance récurrente à cadence configurable ; proposition SEO avant/après ; validations ; application limitée ; respect des versions protégées ; reprise ; historique et période d'observation ; aucune progression inventée |
| S42 | S32 | Scripts, scènes, voix ou avatar, assemblage, sous-titres, traductions et déclinaisons ; reprise d'une scène ; coût ; provenance et droits ; contrôle de fidélité au produit |

S42 concerne la génération et le montage. Le suivi des contrats et livrables de vrais créateurs est réalisé en S71. Les droits et la provenance des médias existent dès S32.

### V5 et V6 — Expérimentation, diffusion et exploitation

| Lot | Dépendances utiles | Critères de sortie |
|---|---|---|
| S50 | S10, S20, S30 | Promotions combinées selon des règles explicites ; lots, ventes complémentaires, cartes cadeaux, devis et commandes manuelles ; montants serveur vérifiés ; annulation et remboursement cohérents |
| S51 | S11, S21, S22, S12 | Attribution stable ; exposition réelle ; protocole préenregistré ; tests A/A et simulations ; résultat non concluant ; publication de la version évaluée ; protection contre édition SEO et cache croisé ; contrat d'expérimentation email |
| S52 | S32, S42, S12 | Calendrier ; email et publication sociale ; audience/consentement vérifiés ; envoi de test autorisé ; déduplication ; état programmé puis état final ; réussite partielle visible ; raccordement des variantes email S51 |
| S60 | S10, S20, S30, S32, S52 | Fidélité, avis et questions/réponses ; bienvenue, abandon, retour en stock, réactivation, réachat et vente complémentaire ; arrêt après achat ou désinscription ; exclusion des envois en double |
| S61 | S52, S50, S22 | Campagne publicitaire en brouillon ; flux produits synchronisé et rejets expliqués ; limites de budget ; arrêt ; coût rapproché ; activation réelle seulement avec autorisation explicite |
| S62 | Socle S00, modules intégrés | Provisionnement d'une cellule et domaines de boutique ; deux boutiques isolées ; médias et secrets séparés ; sauvegarde/restauration ; migration de version ; journaux et état de santé |

S51 peut développer les tests de contenu pendant S50. Les expériences sur les offres et prix attendent l'intégration de S50, avec une recette combinée du checkout. L'expérimentation email S51 et sa diffusion S52 sont raccordées et vérifiées ensemble en G5. Les métriques ne sont pas considérées définitives à S22 : remboursements, publicités et commissions les enrichissent au fil du projet.

### V7 et V8 — Couverture commerciale complète

| Lot | Dépendances utiles | Critères de sortie |
|---|---|---|
| S70 | S20, S30, S50, contrats de marché S02 | Langues, devises, prix, taxes et livraison par marché ; catalogues B2B, tarifs et commandes en volume ; séparation des contextes et vérification du checkout |
| S71 | S32, S42, S50, S52, S60 | Briefs créateurs ; produits envoyés ; contenus reçus ; autorisations d'usage ; codes et commissions ; annulation ou retour répercuté |
| S72 | S10, S20, S30, contrats S02 | Import documenté avec validation et reprise ; redirections ; export exploitable ; connecteur comptable sélectionné ; contrat d'extension et désinstallation contrôlée |
| S80 | S20, S30, S62 | Achat numérique ; accès réservé au bon client ; lien expirant ; nouvelle émission ; effets d'une annulation ou d'un remboursement |
| S81 | S20, S60, S70 | Souscription, renouvellement, échec, nouvelle tentative, résiliation et portail client ; webhooks en double ; stock/paiement/notification cohérents |
| S82 | S22, S30, S60, S61, S71 | Questions et avis transformés en propositions sourcées ; données personnelles maîtrisées ; marges, cohortes, attribution et commissions réconciliées sur des exemples connus |

S70 et S72 peuvent progresser sur leurs sous-domaines distincts ; les imports de données multilingues ou multidevises sont validés après leur raccordement commun. S80 et S81 doivent conserver des plugins et routes distincts, et passer une recette commune des événements et remboursements.

### V9 — Livraison

| Lot | Travail | Critère final |
|---|---|---|
| S90 | Préparer le candidat, intégrer les corrections et constituer la livraison | Version exacte testée, documentation d'installation et de mise à jour, périmètre et limites explicites |
| S91 | Revue du code figé des paiements, données, permissions, isolation, secrets et migrations ; contrôles sur ressources de test isolées | Constats reproductibles rattachés au candidat ; aucun simple score utilisé comme preuve |
| S92 | Recette des parcours, responsive, accessibilité, installation et restauration | Exécution sur une installation indépendante ; preuves des écrans et des états importants |

La publication open source et tout déploiement externe restent des actions distinctes à autoriser sur le résultat concret.

## 6. Couverture des vingt domaines

| Domaine du cahier produit | Lots responsables |
|---|---|
| Boutique et contenu | S11, S21 ; compléments avancés ci-dessous |
| Catalogue | S10, S72 |
| Vente | S20, S50, S70 |
| Types de vente | S70, S80, S81 |
| Opérations | S20, S30 |
| Approvisionnement | S10, S40 |
| Clients | S10, S32, S60 |
| International | S02, S70 |
| Marketing relationnel | S12, S20, S30, S52, S60 |
| Mesure | S12, S22, S61, S71, S81, S82 |
| Tests A/B | S51 et intégration S50 |
| SEO récurrent | S31, S41 |
| Studio marketing | S32, S42 |
| Diffusion | S52, S61 |
| Marque et créations | S32, S42 |
| Créateurs et affiliation | S71 |
| Analyse des retours clients | S82 |
| Catalogues publicitaires | S61 |
| Connexions et extensions | S02, S12, S72 et connecteurs des lots spécialisés |
| Exploitation | S00, chaque intégration, S62, S90–S92 |

S21 est scindé dans sa fiche future en jalons locaux : édition structurée, navigation/blog/thèmes, publication/restauration, édition conversationnelle, puis édition de code en environnement isolé. Chacun a ses vérifications propres ; un simple éditeur de texte ne clôt pas ce lot. Si l'ampleur rend une session incohérente, l'intégrateur crée des sous-lots avant lancement en conservant le même périmètre.

S50 distingue également ses sous-parcours de promotions, lots, cartes cadeaux et devis. Le titre ne dispense pas de leur recette.

## 7. Intégration entre les vagues

Un point G1 à G8 reprend toujours :

1. Les livraisons des sessions, leur base et leurs changements.
2. Les raccordements demandés sur les fichiers partagés.
3. L'ordre des migrations et un essai de montée de version sur une copie.
4. Le parcours commun annoncé pour la vague.
5. Les régressions concernées des vagues précédentes.
6. Les preuves qui restent simulées ou dépendent d'un accès externe.
7. La base suivante et les trois missions détaillées à ouvrir.

La session A intègre après l'arrêt des modifications des autres sessions. L'intégration réutilise les autorisations déjà données ; les commits, fusions et publications suivent leur autorisation propre. Aucun worktree inachevé d'une autre session n'est supprimé.

## 8. État des missions

| Missions | État | Condition de passage |
|---|---|---|
| S00 | Intégré et vérifié | Correction du lanceur et recette réelle du Dashboard réalisées en G0 |
| S01 | Livré et recette du prototype vérifiée | Parcours et quatre dimensions vérifiés ; approbation finale des maquettes distincte, écrans métier futurs |
| S02 | Intégré et vérifié pour ses formats | Source commune et exemples vérifiés ; garanties métier à implémenter dans leurs lots |
| G0 | Intégré et vérifié | Base locale portée par le premier commit de `main` ; push distinct |
| S10, S11, S12 | Prêtes, non lancées | Même SHA G0 vérifié, worktrees distincts et instruction de lancement |
| S20 à S82 | À détailler | Vague précédente intégrée, accès et critères propres au lot |
| S90 à S92 | À détailler | Périmètre complet intégré et candidat figé |

Le coordinateur actualise ce tableau aux points d'intégration. Il n'y a pas de pourcentage d'avancement calculé à partir du nombre de fichiers ou de lignes de code.
