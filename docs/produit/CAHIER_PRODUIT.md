# Plateforme e-commerce open source

Périmètre validé et plan de réalisation

Date : 20 octobre 2026  
Porteur du projet : Victor Marchetti  
Nom du produit : à définir

## 1. Vision et état des décisions

Créer une plateforme e-commerce open source complète pour concevoir une boutique, gérer son activité et développer ses ventes. Le produit réunit le commerce, l'édition du site, les opérations, le marketing, les tests A/B et un agent SEO récurrent dans une interface cohérente.

Victor a validé ce périmètre dans la conversation, y compris le studio marketing, la production d'images et de vidéos, les connexions à des API externes et l'apport de DataForSEO. La couverture fonctionnelle complète constitue la cible. Les étapes de réalisation ci-dessous organisent le travail sans retirer les modules de cette cible.

| Sujet | État |
|---|---|
| Ambition et périmètre fonctionnel | Validés par Victor |
| SEO récurrent, tests A/B et studio marketing | Validés |
| Connecteurs remplaçables, clés propres au marchand et plafonds de dépenses | Validés |
| Fournisseurs externes cités | Candidats à comparer ; disponibilité documentaire vérifiée pendant le cadrage |
| Moteur commercial et hébergement | Vendure 3.8.0 éprouvé sur les premiers parcours API avec protection du stock ; cellules par boutique à vérifier |
| Licence du code original | GPL-3.0-or-later proposée ; choix de distribution à arrêter avant publication |
| Plan opérationnel | Découpage en vagues et missions prêt ; voir le plan d’exécution |
| Interface | Parcours définis ; direction graphique proposée en attente de réponse |
| Budget, équipe et calendrier | Non définis ; aucune estimation ferme retenue |

L’investigation concurrentielle et ses preuves restent conservées hors du dépôt applicatif. Le présent document est la référence du périmètre. Le plan opérationnel est maintenu dans `docs/pilotage`. Les choix techniques sont dans [ARCHITECTURE.md](ARCHITECTURE.md), les écrans dans [PARCOURS_INTERFACE.md](PARCOURS_INTERFACE.md) et les termes dans [GLOSSARY.md](GLOSSARY.md). Les fonctions annoncées par Amboras, les comportements observés lors de l'investigation et les capacités attendues de notre produit doivent rester distincts.

## 2. Utilisateurs et parcours principaux

Le commerçant est l'utilisateur principal. Il doit pouvoir gérer sa boutique et comprendre les actions des agents sans intervenir dans le code. Des membres d'équipe et des prestataires disposent d'accès adaptés à leurs responsabilités. L'acheteur accède à la boutique, à ses commandes et aux services après achat.

Les segments de marchands à privilégier pour les premiers essais restent à préciser. Le périmètre inclut le B2C et les fonctions B2B décrites plus bas.

Les parcours de référence sont :

1. Configurer la boutique, importer le catalogue, personnaliser le site et préparer sa publication.
2. Recevoir une commande, encaisser, préparer, expédier, notifier, puis gérer un éventuel retour.
3. Identifier une opportunité SEO, préparer une amélioration, la vérifier et observer ses effets.
4. Concevoir une variante, lancer une expérience A/B et décider avec une mesure d'incertitude.
5. Préparer une campagne complète à partir des produits, produire ses contenus et organiser sa diffusion.
6. Suivre les coûts et les résultats, puis préparer les prochaines actions.
7. Installer, mettre à jour, sauvegarder et restaurer une boutique en auto-hébergement.

## 3. Périmètre fonctionnel validé

| Domaine | Capacités attendues |
|---|---|
| Boutique et contenu | Thèmes, éditeur visuel, modification par conversation, pages, navigation, blog, médias, rendu mobile, traductions, aperçu, publication et historique |
| Catalogue | Produits, variantes, attributs, collections, catégories, médias, import/export et modifications en masse |
| Vente | Panier, checkout, prestataires de paiement, promotions, lots, cartes cadeaux, ventes complémentaires, devis et commandes manuelles |
| Types de vente | Produits physiques, produits numériques, abonnements et fonctions B2B : catalogues restreints, tarifs spécifiques et commandes en volume |
| Opérations | Commandes, préparation, transporteurs, expédition, suivi, retours, échanges et remboursements |
| Approvisionnement | Stocks par emplacement, réservations, transferts, fournisseurs, commandes d'achat, alertes et réapprovisionnement |
| Clients | Comptes, historique, segmentation, fidélité, avis, questions/réponses et préférences de communication |
| International | Langues, devises, marchés, prix, taxes et règles de livraison par zone |
| Marketing relationnel | Emails transactionnels, campagnes, paniers abandonnés, bienvenue, réactivation, retour en stock et réachat |
| Mesure | Tunnel d'achat, ventes, cohortes, coûts d'acquisition, revenus attribués, retours et marge estimée selon les coûts disponibles |
| Tests A/B | Hypothèses, génération de variantes, attribution, collecte, analyse statistique, décision, publication et retour arrière |
| SEO récurrent | Audit, surveillance, recherche d'opportunités, optimisation, contenus, maillage, contrôle technique et suivi |
| Studio marketing | Briefs, angles, accroches, scripts, images, vidéos, montage, traductions, déclinaisons et pages de campagne |
| Diffusion | Calendrier, publications sociales, campagnes email et connexions publicitaires avec budgets et états de diffusion |
| Marque et créations | Ton, identité visuelle, arguments vérifiés, références produit, versions des créations et résultats associés |
| Créateurs et affiliation | Briefs UGC, produits envoyés, réception des contenus, autorisations d'utilisation, codes, attribution et commissions |
| Analyse des retours clients | Exploitation des avis et questions du SAV pour proposer des améliorations de contenu, d'offre et de parcours |
| Catalogues publicitaires | Flux produits, contrôle des informations requises, disponibilité, synchronisation et diagnostic des rejets |
| Connexions et extensions | API, webhooks, connecteurs, points d'extension, comptabilité et migration depuis d'autres plateformes |
| Exploitation | Équipes, permissions, isolation des boutiques, domaines, journaux, sauvegardes, restauration, mises à jour et export |

Chaque capacité devra disposer d'un parcours exécuté et vérifié avant d'être présentée comme disponible.

## 4. Agents et règles d'exécution

Les agents utilisent les mêmes données et règles métier que les interfaces classiques. Le catalogue validé, les politiques du marchand, les stocks, les prix et les coûts disponibles constituent leurs sources de référence.

Trois niveaux d'autonomie sont prévus :

- Recommandation : l'agent explique et prépare les actions.
- Validation : l'agent produit un résultat consultable avant son application.
- Exécution déléguée : l'agent agit dans un périmètre, des permissions et des plafonds définis par le marchand.

Les règles d'exécution sont appliquées par le logiciel, indépendamment des consignes données au modèle. Une demande qui dépasse un budget ou une permission est interrompue et présentée au marchand.

Chaque exécution conserve son objectif, son contexte, ses sources, ses actions, les changements produits, les contrôles réalisés, son coût connu et son état final. Elle doit pouvoir signaler une erreur, reprendre après interruption et éviter les opérations en double.

La restauration distingue le site et les données commerciales. Revenir à une version précédente d'une page ne modifie ni les commandes ni les paiements. Les opérations financières et les messages déjà envoyés ont leurs propres mécanismes de correction ; ils ne sont pas traités comme des fichiers réversibles.

## 5. Tests A/B

Le marchand ou l'agent définit une hypothèse, un élément à modifier, une population éligible et une métrique principale. Les variantes peuvent concerner les pages, titres, visuels, appels à l'action, offres, lots et seuils de livraison. Les expérimentations email suivent des règles adaptées à leur canal.

Le système doit fournir :

- Un aperçu des variantes et une version de référence identifiable.
- Une attribution aléatoire stable à l'échelle définie pour l'expérience, avec ses limites explicites entre appareils.
- Un lien entre exposition, événements et commandes, avec déduplication.
- Une estimation du trafic nécessaire et de l'effet détectable.
- Une méthode statistique explicite, des règles d'arrêt définies et un contrôle des conflits entre expériences.
- Des résultats accompagnés d'incertitude, avec les issues « gain », « perte » et « résultat non concluant ».
- Des indicateurs de contrôle : marge, erreurs de paiement, performances et retours lorsque la période d'observation le permet.
- Une publication selon le niveau d'autonomie choisi, un historique et un retour arrière du contenu.

Le premier protocole recommandé pour la preuve technique est un test fréquentiste à horizon fixé. Les modes séquentiels et bayésiens restent des extensions possibles après calibration. Le contrat et les vérifications sont décrits dans [l'architecture](ARCHITECTURE.md). Un seuil affiché de 95 % ne suffit pas à définir le fonctionnement du moteur.

Les éléments participant à une expérience sont protégés contre les modifications concurrentes. L'agent SEO et l'éditeur doivent respecter cette protection. Une modification qui change le traitement testé entraîne une nouvelle version ou un redémarrage explicitement identifié.

Les variantes respectent les recommandations de Google sur les tests de site : accès cohérent pour les visiteurs et robots, liens canoniques adaptés et redirections temporaires lorsque nécessaires.

## 6. Agent SEO récurrent et DataForSEO

### Sources

| Source | Rôle |
|---|---|
| Search Console | Performances Google observées pour la boutique : impressions, clics, taux de clic et positions moyennes |
| DataForSEO | Mots-clés, volumes, tendances, difficulté, résultats de recherche, concurrents, backlinks et données complémentaires selon les modules retenus |
| Boutique | Catalogue, disponibilité, ventes, marges estimées, questions clients et priorités du marchand |
| Contrôles du site | Exploration, indexabilité, liens, contenu, données structurées, médias et performances |

Les résultats de recherche sont associés au pays, à la langue, à l'appareil et à la date de collecte. Les scores et volumes estimés restent identifiés comme tels. Une réponse vide ou une limite d'API ne doit pas devenir une métrique égale à zéro.

### Boucle de travail

1. Observer les changements du catalogue, les problèmes techniques et les performances disponibles.
2. Identifier et prioriser les opportunités selon leur pertinence commerciale, leur effort et les données qui les soutiennent.
3. Préparer une modification : métadonnées, contenu de catégorie, guide, liens internes, textes alternatifs ou correction technique.
4. Contrôler les faits produit, le rendu, les liens et les éléments d'indexation.
5. Appliquer selon l'autonomie accordée, puis conserver une version et une justification.
6. Observer les résultats sur une période adaptée et décider de conserver, modifier ou annuler.

La cadence est configurable. La surveillance peut être fréquente ; les changements éditoriaux doivent laisser une période d'observation. Une hausse après modification reste une observation tant que la méthode ne permet pas d'établir un effet causal.

Les changements d'URL, suppressions, règles d'indexation, redirections et modifications massives disposent d'autorisations spécifiques. L'agent respecte les expériences en cours et les corrections manuelles protégées.

Le connecteur DataForSEO prévoit un budget, un cache, une fréquence de collecte par type de données et une traçabilité des coûts. La comparaison des modes de collecte fait partie de son évaluation.

## 7. Studio marketing

Un objectif commercial et une sélection de produits alimentent une campagne. Les stocks, les coûts disponibles, le public, la langue, la période et l'identité de marque guident sa préparation.

Exemple de parcours validé :

> Préparer une campagne pour une collection, destinée aux clients francophones, avec des visuels, deux vidéos, une page de vente et une séquence email.

Le système prépare :

1. Le brief, les audiences proposées, l'offre et les contraintes de marge.
2. Les angles, accroches, scripts et messages.
3. Les images et vidéos à partir de références produit.
4. Les formats, langues, sous-titres et variantes.
5. La page de campagne, les produits associés et les offres.
6. Le calendrier, les canaux, les audiences et le budget de diffusion.
7. Les contrôles et éléments à valider.
8. Le suivi des publications, coûts, résultats et prochaines expérimentations.

### Référentiel de marque et bibliothèque

Le référentiel conserve l'identité visuelle, le ton, les références, les caractéristiques produit et les arguments vérifiés. Une information commerciale manquante doit être signalée.

Chaque création conserve ses sources, son fournisseur, ses paramètres utiles, son coût connu, ses versions, ses droits d'utilisation et ses campagnes. Les résultats sont rattachés à la création réellement diffusée.

Les vidéos de vrais créateurs et les présentations avec avatars synthétiques ont une provenance identifiable. Les témoignages restent liés à de véritables expériences clients. Les images générées sont contrôlées pour préserver les caractéristiques des produits, notamment leurs formes, logos et emballages.

### Diffusion et mesure

La création, l'approbation, la programmation, la publication et l'activation publicitaire sont des états distincts. Une réponse de programmation est suivie d'une vérification de l'état final.

La diffusion dispose de plafonds de dépense, de règles d'arrêt et d'une gestion des comptes déconnectés. Un événement répété ou une reprise après erreur ne doit pas déclencher deux publications ou deux campagnes.

Le reporting distingue les ventes observées, les revenus attribués par chaque canal, les estimations et les résultats d'expériences. Les conversions revendiquées par plusieurs plateformes ne sont pas additionnées sans traitement des doublons.

## 8. Connecteurs candidats et indépendance

| Besoin | Candidat | Vérification attendue avant choix |
|---|---|---|
| Moteur commercial | Vendure Community, recommandé après comparaison avec Medusa et Saleor | Permissions, achat, reprise, événements, extensions et licence de la version publiée choisie |
| Données SEO | Search Console et DataForSEO | Données par marché, fraîcheur, quotas, coût et qualité de l'association requête/page |
| Images et vidéos produit | Runway | Fidélité aux références, logos, formats, délais et coût par résultat retenu |
| Présentateurs virtuels | HeyGen | Français, synchronisation voix/image, références, provenance et droits |
| Assemblage des médias | Creatomate | Modèles, déclinaisons, sous-titres, corrections et récupération des résultats |
| Campagnes relationnelles | Klaviyo | Parcours d'intégration, segmentation, consentements, programmation et synchronisation |
| Publication sociale | Zernio | Capacités et restrictions par réseau, types de comptes, états et récupération des erreurs |
| Publicité | Google Ads API et autres réseaux à sélectionner | Accès développeur, autorisations par compte, budgets, validation et remontée des résultats |

Ces candidats ne constituent pas une obligation d'abonnement. Les capacités et données du produit doivent rester distinctes de l'implémentation d'un fournisseur. Un fournisseur indisponible ne doit pas empêcher l'accès au catalogue et aux fonctions indépendantes.

Le marchand peut apporter ses propres clés et consulter ses coûts. Les secrets restent côté serveur, associés à la bonne boutique et exclus des prompts, journaux ordinaires et exports.

Le logiciel vise l'auto-hébergement avec une documentation exploitable. Une offre hébergée pourra utiliser le même socle. La licence du projet, la redistribution des dépendances et les conditions d'intégration des fournisseurs seront vérifiées avant publication.

## 9. Architecture et interface

L'[architecture](ARCHITECTURE.md) recommande Vendure Community, son administration React extensible, un site Next.js et une installation séparée par boutique indépendante. Elle décrit la couverture du moteur, les modules à développer, la propriété des données, les actions des agents, les publications et les preuves techniques nécessaires.

Les [parcours d'interface](PARCOURS_INTERFACE.md) organisent le produit autour de la vue d'ensemble, du commerce, de la boutique, de la croissance et des analyses. Le dossier d'action relie les objets métier aux sources, changements, coûts et résultats. La direction graphique est une proposition soumise à Victor pendant ce jalon.

Les documents de conception et les preuves d'exécution sont conservés séparément. Les contrats du moteur sont vérifiés avant l'extension des fonctions concernées.

Une [preuve technique reproductible](../../experiments/core-validation/README.md) complète désormais la conception : permissions, catalogue, achats fictifs, remboursements, événements et persistance sont vérifiés sur SQLite et PostgreSQL. Elle a révélé un dépassement de stock lors de paiements concurrents dans la configuration sans contrôle final. La protection ajoutée passe les scénarios une unité et deux unités. Les paiements externes et l'interface restent à réaliser.

## 10. Plan de réalisation

Le découpage opérationnel est maintenu dans le [plan d'exécution](../pilotage/PLAN_EXECUTION.md). Il couvre l'ensemble du périmètre en dix vagues de trois missions, avec des intégrations intermédiaires.

Les trois premières missions sont prêtes : socle, conception de l'administration et contrats communs. Le [guide de lancement](../pilotage/DEMARRER.md) contient les messages à utiliser dans deux ou trois sessions Codex. Les lots ultérieurs sont détaillés avant lancement à partir d'une base intégrée.

Les [règles de coordination](../pilotage/COORDINATION.md) fixent les propriétaires des fichiers, worktrees, bases, ports, migrations et outils graphiques. Le plan d'exécution est l'unique référence du statut opérationnel des missions.

## 11. État du premier jalon

| Travail | État |
|---|---|
| Comparaison du moteur | Réalisée sur documentation et sources ; Vendure Community recommandé |
| Première preuve d'exécution | 13 contrôles SQLite et 15 PostgreSQL réussis avec protection ; contre-exemple concurrent conservé |
| Hébergement et isolation | Cellules indépendantes proposées ; exploitation décrite |
| Modèle et termes | Propriété des données décrite et glossaire rédigé |
| Interface | Navigation, écrans, états et parcours définis ; direction graphique en attente de réponse |
| Licence | GPL-3.0-or-later proposée pour le code original ; notices et dépendances à vérifier sur les versions retenues |
| Expérimentation | Protocole initial proposé ; détails statistiques et calibration à réaliser |
| Fournisseurs médias | Candidats documentés ; comparaison sur rendus réels et budget de test à préparer |
| Utilisateurs pilotes, équipe et calendrier | À préciser avant l'estimation et les essais marchands |

Les prochaines preuves techniques sont regroupées dans [ARCHITECTURE.md](ARCHITECTURE.md). La couverture fonctionnelle validée reste inchangée.

## 12. Références de cadrage

Les références suivantes ont alimenté la discussion du 20 octobre 2026. Les capacités, conditions d'accès et tarifs devront être revérifiés au choix d'un fournisseur.

- [Amboras A/B testing](https://www.amboras.com/ab-testing), [SEO](https://www.amboras.com/ai-seo) et [FAQ](https://www.amboras.com/faq) : périmètre annoncé.
- [Vendure](https://github.com/vendurehq/vendure), [Medusa](https://github.com/medusajs/medusa) et [Saleor](https://github.com/saleor/saleor) : moteurs comparés dans l'architecture.
- [Search Console API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) et [DataForSEO](https://dataforseo.com/apis) : sources de données SEO.
- [Google et tests A/B](https://developers.google.com/search/docs/crawling-indexing/website-testing) et [dimensionnement des expériences](https://docs.statsig.com/experiments/power-analysis) : références méthodologiques.
- [Runway images de campagne](https://docs.dev.runwayml.com/recipes/product-campaign-image/) et [vidéos UGC](https://docs.dev.runwayml.com/recipes/product-ugc/).
- [HeyGen](https://developers.heygen.com/docs/quick-start) et [Creatomate](https://creatomate.com/docs/fundamentals/getting-started/api-automation).
- [Klaviyo](https://developers.klaviyo.com/en/reference/campaigns_omni_api_overview) et [Zernio](https://docs.zernio.com/platforms).
- [Google Ads](https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns) et [niveaux d'accès](https://developers.google.com/google-ads/api/docs/api-policy/access-levels).
