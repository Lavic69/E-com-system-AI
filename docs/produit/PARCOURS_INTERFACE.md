# Parcours et organisation de l'administration

Conception fonctionnelle du 20 octobre 2026.

L'administration doit permettre au marchand de traiter son activité et de suivre les agents dans le même espace. Ce document décrit les écrans et leurs états. La direction claire a été confirmée par Victor pendant S01. Les [maquettes et règles S01](../livraisons/S01/RESULTAT.md) la concrétisent ; leur approbation finale reste distincte. S00 fournit une page technique dans l'administration, pas encore les écrans métier.

Références : [périmètre](CAHIER_PRODUIT.md), [architecture](ARCHITECTURE.md), [vocabulaire](GLOSSARY.md).

## 1. Intentions

Le marchand ouvre l'administration pour connaître les commandes à traiter, résoudre une exception, préparer une opération ou examiner les actions des agents. Il doit retrouver l'objet concerné, comprendre le résultat d'une action et décider de la suivante.

L'interface privilégie des listes de travail, des vues détaillées et des comparaisons. Les indicateurs restent accessibles, avec leur période, leur source et leur état de fraîcheur. Les tableaux de bord ne remplacent pas les parcours d'action.

Le produit doit rester utilisable sans assistant. L'agent accompagne les écrans existants et prépare des actions dans les mêmes règles.

## 2. Exploration et direction proposée

| Élément | Proposition |
|---|---|
| Domaine | Commande à préparer, stock réservé, colis, marge, audience, création, expérience, version et preuve d'exécution |
| Univers de couleurs | Ivoire du papier, graphite de l'encre, gris des étiquettes, bleu du suivi, vert de validation et orange d'alerte |
| Élément commun | Le dossier d'action rassemble l'objet métier, ses sources, les changements, le coût, les validations et le résultat |
| Habitude à remplacer | Une grille d'indicateurs en accueil devient une file de travail avec une synthèse chiffrée compacte |
| Habitude à remplacer | Une conversation occupant tout l'écran devient un panneau lié à l'objet consulté |
| Habitude à remplacer | Une longue liste de modules devient une navigation par activités avec sous-sections |

La direction recommandée est claire et sobre, avec une densité suffisante pour travailler sur un catalogue et des commandes. L'accent sert aux actions, les couleurs sémantiques aux états.

Le dossier d'action apparaît dans cinq situations concrètes :

1. Une correction SEO avec les données, le contenu avant/après et la période d'observation.
2. Une campagne avec son offre, ses créations, son budget et sa diffusion.
3. Une expérience avec son hypothèse, ses versions, ses expositions et sa décision.
4. Une modification du site avec aperçu, contrôles et version publiable.
5. Une opération commerciale sensible avec les montants, objets affectés et résultat confirmé.

Ces situations partagent la même structure de lecture sans imposer les mêmes champs.

## 3. Navigation

| Entrée principale | Sous-sections |
|---|---|
| Vue d'ensemble | À traiter, propositions, activité récente |
| Commerce | Commandes, retours, catalogue, stocks, approvisionnement, clients, promotions |
| Boutique | Éditeur, pages, blog, médias, thèmes et publications |
| Croissance | SEO, expériences, campagnes, créations, automatisations, créateurs et affiliation, catalogues publicitaires |
| Analyses | Ventes, tunnel, marge, acquisition, cohortes |

Les réglages, connexions, membres, marchés, budgets et journaux sont regroupés dans une zone secondaire. Les détails avancés sont accessibles depuis leur contexte et par recherche.

Le contexte courant affiche la boutique, le marché si pertinent et l'environnement. Une opération sur un autre marché ou une autre version rend ce changement explicite.

La navigation tient compte des permissions, mais une entrée masquée ne remplace pas un contrôle côté serveur.

## 4. Structure commune d'un écran

```text
┌─────────────────────────────────────────────────────────────────┐
│ Boutique et marché     Recherche                 Aide · Profil   │
├──────────────┬──────────────────────────────────────────────────┤
│ Navigation   │ Titre · état · période              Action utile │
│ par activité ├──────────────────────────────────────────────────┤
│              │ Liste, formulaire, aperçu ou comparaison         │
│              │                                                  │
│              │ Sources, changements et résultats                 │
│              │                                                  │
├──────────────┴──────────────────────────────────────────────────┤
│ Activité en cours · Dernière synchronisation · Accès à l'agent   │
└─────────────────────────────────────────────────────────────────┘
```

Le panneau de l'assistant s'ouvre sur demande. Il indique les objets auxquels il a accès et le niveau d'autonomie en vigueur. L'activité de fond reste visible sans obliger à garder la conversation ouverte.

## 5. Mise en route

**Résultat attendu :** une boutique configurée et un parcours d'achat de test vérifié.

Le parcours couvre :

1. Les informations du marchand, la langue et les marchés.
2. L'import du catalogue avec aperçu, correspondance des champs et erreurs par ligne.
3. Les prix, stocks, taxes et conditions de livraison à compléter.
4. La connexion d'un prestataire de paiement en mode test.
5. Le choix du thème, les contenus et les pages nécessaires.
6. Une commande de test et les vérifications associées.
7. La préparation du domaine et de la publication.

L'utilisateur peut enregistrer et reprendre chaque étape. Les comptes externes non connectés restent identifiables. Les données de démonstration sont explicitement signalées et séparées des données commerciales.

## 6. Vue d'ensemble

**Question traitée :** que faut-il faire maintenant ?

La page présente d'abord les exceptions qui empêchent une vente ou une livraison, puis les actions commerciales à traiter et les propositions d'amélioration. Le niveau de priorité doit être justifié, par exemple « paiement à confirmer » ou « commande sans mode de livraison ».

```text
Aujourd'hui

À traiter                       Objet                  Action
Paiement à confirmer            Commande #…             Examiner
Stock insuffisant               Variante …              Voir le stock
Créations prêtes                 Campagne …              Relire
Modification SEO proposée        Catégorie …             Comparer

Activité des agents
Audit terminé · Génération en cours · Synchronisation en attente

Synthèse des ventes
Période choisie · Données actualisées à … · Accès au détail
```

Aucune vente ni aucun pourcentage fictif n'apparaît comme résultat réel. Le démarrage sans commandes montre des actions de configuration plutôt qu'une grille de zéros ambiguë.

## 7. Catalogue et commandes

### Catalogue

La liste permet de filtrer par statut, marché, disponibilité, collection et qualité des données. Les actions en masse affichent le nombre d'objets concernés et un aperçu des modifications.

Une fiche produit relie ses variantes, médias, stocks, prix, contenus SEO, avis, campagnes et expériences. Une alerte commerciale reste distincte d'une suggestion éditoriale.

Les imports distinguent les nouvelles lignes, mises à jour, doublons, erreurs et lignes non traitées. La reprise ne réimporte pas silencieusement les lignes déjà appliquées.

### Commande

La fiche présente le client, les articles, les montants et trois états séparés : paiement, préparation et livraison. Les remboursements et retours ont leur propre historique.

Une action sensible montre un récapitulatif concret : articles, quantités, montants, effet attendu et message éventuel. Si le prestataire n'a pas confirmé le résultat, l'écran conserve un état en attente ou incertain avec une action de vérification.

Le marchand peut retrouver le dossier d'action correspondant à une opération humaine ou à une opération d'agent.

## 8. Éditeur de boutique

**Résultat attendu :** modifier un contenu et publier exactement la version contrôlée.

L'écran est organisé autour de l'aperçu, avec une arborescence de pages et de sections, puis les paramètres de l'élément sélectionné. L'assistant intervient dans ce contexte et présente les éléments qu'il prévoit de modifier.

```text
Page et version      Taille d'aperçu       Voir les changements
──────────────────────────────────────────────────────────────
Sections             Aperçu                Propriétés
En-tête                                    Texte
Présentation                               Image
Produits                                   Disposition
Pied de page                               Accessibilité
──────────────────────────────────────────────────────────────
État enregistré · Contrôles · Version prête à publier
```

Le parcours distingue modification enregistrée, aperçu prêt, contrôles réussis et publication confirmée. Une modification après validation invalide la version prête à publier.

L'édition avancée de code dispose d'un espace séparé avec différences, fichiers concernés, contrôles et journaux utiles. L'agent doit signaler un conflit avec une expérience active.

## 9. SEO

**Résultat attendu :** traiter une opportunité avec une justification et un suivi.

La liste classe les problèmes et opportunités par type, priorité justifiée, effort et état. Elle indique la page, le marché, la source et la date d'observation.

Le détail d'une opportunité rassemble :

- Le problème ou l'hypothèse.
- Les observations Search Console, DataForSEO et commerciales utiles.
- La proposition de changement et son aperçu avant/après.
- Les contrôles et éléments en conflit.
- Le coût et l'autorisation nécessaires.
- La période d'observation et le résultat disponible.

Les états « compte non connecté », « aucune donnée disponible », « données anciennes », « quota atteint » et « erreur de synchronisation » sont distincts.

Les positions, volumes et scores ne sont pas mélangés dans un score opaque présenté comme une garantie de progression.

## 10. Expériences

**Résultat attendu :** décider d'une modification à partir d'un protocole identifiable.

La création suit une séquence :

1. Objet, hypothèse et population.
2. Versions de référence et variante.
3. Métrique principale, effet recherché et durée prévue.
4. Métriques de contrôle et conflits.
5. Aperçu, vérification et lancement.

L'écran de suivi indique le protocole, la version, les expositions, la maturité des données et l'incertitude. Il distingue l'observation courante de la décision finale.

La conclusion peut être favorable, défavorable ou non concluante. La publication est une action distincte, reliée à la version évaluée. Une modification importante des variantes crée une nouvelle expérience ou une nouvelle version à relancer.

## 11. Campagnes et studio

**Résultat attendu :** passer d'un objectif commercial à un ensemble prêt à diffuser.

Une campagne contient un brief, des produits, une audience, une offre, des créations, une destination et un plan de diffusion. Le marchand peut travailler dans cet ordre ou reprendre une étape depuis une campagne existante.

```text
Campagne · objectif · état · budget
Brief | Produits et offre | Créations | Destination | Diffusion | Résultats

Création              Format     État              Coût connu    Action
Visuel produit        Vertical   À relire          …             Comparer
Présentation vidéo    Vertical   En génération     …             Suivre
Email                 Email      Brouillon        …             Éditer
Page de campagne      Web        Contrôle requis   …             Aperçu

Références produit · Marque · Droits · Variantes · Historique
```

Les sources et caractéristiques produit sont consultables depuis les créations. Une régénération peut viser une scène ou un élément pour éviter de refaire tout le contenu.

Les vidéos de créateurs, vidéos avec avatars et médias produit portent leur provenance. Les autorisations d'utilisation et leur durée sont consultables avant diffusion.

Le passage à la diffusion affiche les comptes, dates, audiences, contenus exacts et plafonds. Une campagne peut être prête alors qu'un canal reste bloqué. Une publication partielle présente les réussites et échecs séparément.

## 12. Connexions, budgets et autonomie

Chaque connexion présente son compte externe, ses capacités disponibles, son état, sa dernière vérification et ses limites. Les capacités dépendent du réseau et du type de compte.

Les écrans de budget distinguent génération, données SEO, envois et publicité. Ils affichent plafond, montant réservé, montant connu et opérations dont le coût reste à confirmer.

Les règles d'autonomie indiquent des objets et actions concrets, par exemple « préparer les métadonnées », « appliquer les corrections approuvées » ou « programmer les créations validées dans ce calendrier ».

Un marchand peut suspendre une automatisation et examiner les actions déjà engagées. L'interface précise ce qui peut encore être interrompu.

## 13. États et accessibilité

Chaque écran prévoit chargement, données présentes, absence de données, erreur récupérable, refus d'accès et conflit de version lorsque pertinent.

Les actions longues peuvent être quittées et retrouvées. Les messages restent attachés à l'objet concerné et proposent une suite concrète. Les notifications temporaires ne sont pas la seule trace d'un échec.

Les contrôles sont accessibles au clavier, avec un ordre de focus cohérent. Les états associent un libellé à la couleur. Le retour après fermeture d'un panneau retrouve l'élément qui l'a ouvert.

La densité des tableaux reste réglable ou adaptée à la taille d'écran. Le français est la langue initiale de l'administration ; les libellés et formats sont conçus pour être traduisibles.

## 14. Tailles d'écran et vérification future

| Surface | Taille de référence | Adaptation attendue |
|---|---|---|
| Ordinateur | 1440 × 900 | Navigation et contenu visibles ; panneau contextuel possible sans masquer l'action principale |
| Tablette | 1024 × 768 | Navigation repliable ; panneau secondaire superposé et refermable |
| Mobile | 390 × 844 | Navigation compacte ; listes adaptées ; détails et assistant en vues dédiées |
| Mobile étroit | 360 × 800 | Contrôle complémentaire des textes, formulaires et actions sensibles |

Ces dimensions sont des choix de vérification du projet. L'implémentation devra être examinée dans Responsively App, puis les parcours clavier et fonctionnels seront testés.

Les schémas de ce document sont des plans fonctionnels. Ils ne constituent ni des captures d'application ni une validation responsive.

## 15. Vérification des parcours

Avant de livrer l'interface, faire exécuter les tâches suivantes avec des données contrôlées :

1. Trouver une commande en attente, comprendre son paiement et préparer son traitement.
2. Corriger un produit et retrouver la source d'une proposition de l'agent.
3. Comparer puis approuver une correction SEO sans modifier une expérience active.
4. Comprendre pourquoi une expérience ne permet pas encore de décider.
5. Préparer une campagne, corriger une création et vérifier le budget avant diffusion.
6. Revenir à une version antérieure du site sans toucher à l'historique commercial.
7. Retrouver un envoi incertain et vérifier son état sans le dupliquer.

La revue mesurera les erreurs et points de confusion observés. Elle ne supposera pas que la présence d'un bouton rend un parcours compréhensible.
