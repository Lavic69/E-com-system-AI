# Conception fonctionnelle S01

20 octobre 2026. Direction graphique confirmée par Victor dans cette session. Les maquettes et règles visuelles se trouvent dans [PLANCHES.md](PLANCHES.md) et [SYSTEME_INTERFACE.md](SYSTEME_INTERFACE.md).

Références en lecture seule : [mission](../../pilotage/missions/S01-interface.md), [parcours](../../produit/PARCOURS_INTERFACE.md), [périmètre](../../produit/CAHIER_PRODUIT.md) et [glossaire](../../produit/GLOSSARY.md). Ce document précise les trois écrans de S01. Il ne remplace pas les parcours du produit.

## 1. Intention et périmètre

Le marchand consulte son activité, repère ce qui bloque une commande puis examine une proposition d'amélioration. Chaque écran doit lui permettre de répondre à quatre questions : quel objet est concerné, que sait-on, que reste-t-il à vérifier et quelle action peut-il entreprendre ?

Les écrans retenus sont la vue d'ensemble, la commande et un dossier d'action SEO. Le dossier SEO montre le mécanisme commun de justification et de suivi des actions. Les autres modules restent représentés dans l'organisation de la navigation, sans fonctions simulées présentées comme livrées.

Les exemples ci-dessous sont des **données de démonstration**. Atelier Démo est une boutique fictive, pas le nom du produit. Le marché d'exemple est Belgique, français, EUR. L'environnement est Démonstration. Toutes les heures d'exemple sont exprimées en Europe/Brussels.

## 2. Organisation et navigation

Conserver les cinq activités des parcours validés : Vue d'ensemble, Commerce, Boutique, Croissance et Analyses. Réglages, connexions, membres et budgets restent dans la zone secondaire.

Dans les maquettes, seuls les trois écrans du lot sont des destinations de consultation. Les autres entrées sont indiquées comme hors maquette ou représentées sans lien. Aucun contrôle ne doit laisser croire qu'une fonction métier s'exécute.

| Situation | Comportement à concevoir |
|---|---|
| Contexte de travail | Boutique, marché et environnement visibles avant les actions ; le changement de marché est explicite |
| Navigation principale | Activité courante identifiable par le texte et un repère visuel ; sous-sections de l'activité accessibles |
| Ouverture d'un objet | Lien nommé avec l'objet, par exemple « Examiner la commande D-1042 » |
| Retour à la liste | Conserver filtre, tri, position et focus sur l'objet d'origine dans l'application future |
| Dossier depuis un objet | Commande ou page cible reliée à ses sources, changements, coûts et résultats |
| Assistant | Fermé au départ ; accès depuis l'objet ; contexte et autonomie affichés à l'ouverture |
| Accès insuffisant | Message contextualisé, retour vers une destination autorisée ; aucune donnée sensible dans le panneau |

Les chemins des futures routes relèvent de G0. Les intitulés de navigation ne dictent pas un schéma d'API.

## 3. Vue d'ensemble

### Hiérarchie de lecture

1. Contexte de boutique, titre « À traiter aujourd'hui », date de référence.
2. Exceptions qui bloquent la vente ou l'expédition, avec leur raison et l'objet.
3. Autres opérations à traiter.
4. Propositions à examiner.
5. Activité des agents et synthèse chiffrée compacte, accompagnées de leurs sources.

La priorité vient de la conséquence métier. Elle ne dépend pas d'un score opaque ou de la couleur seule.

### Contenu d'exemple

Instantané fictif du 20 octobre 2026 à 10 h 00.

| Priorité | Situation | Objet | Justification | Suite |
|---|---|---|---|---|
| Blocage | Paiement à confirmer | Commande D-1042 | Réponse du prestataire absente depuis 09 h 42 | Examiner la commande |
| Blocage | Stock indisponible | Variante SAC-SABLE | Quantité disponible insuffisante pour une commande | Voir le stock, hors maquette |
| À traiter | Commande prête à préparer | Commande D-1041 | Encaissement confirmé, articles disponibles | Examiner, hors maquette |
| Proposition | Titre de collection à préciser | Dossier SEO-018 | Intitulé peu descriptif dans la source relevée | Comparer la proposition |

Le compteur de la file correspond aux quatre lignes de l'instantané. Un filtre « Blocages » conserve les deux premières. Les compteurs ne doivent pas être pris pour des données commerciales réelles.

La synthèse ne doit pas dominer cette file. Exemple possible : 12 commandes encaissées, 1 248,00 € encaissés, période du 13 au 19 octobre 2026, source paiements de démonstration, relevé le 20 octobre à 09 h 55. Aucun taux de progression ni attribution à l'agent n'est déduit de ces valeurs.

L'activité sépare « audit terminé », « génération en cours » et « synchronisation en attente ». Chaque ligne nomme son objet et sa dernière mise à jour.

### États particuliers

| État | Message et suite |
|---|---|
| Première ouverture, aucune commande | « Votre boutique n'a pas encore de commandes. » Montrer les étapes de configuration et la commande de test |
| File vide, activité existante | « Aucune action à traiter pour le moment. » Conserver l'accès aux commandes et à l'historique |
| Filtre sans résultat | « Aucune action ne correspond à ce filtre. » Proposer « Réinitialiser les filtres » |
| Une source inaccessible | Garder les autres sections disponibles ; identifier la source en erreur et son dernier relevé |
| Données anciennes | Afficher la date de collecte ; proposer une actualisation sans faire disparaître le contenu connu |

## 4. Commande D-1042

### Hiérarchie de lecture

Le haut de fiche contient l'identifiant, la date, le marché et trois états indépendants. L'avertissement de paiement vient ensuite, suivi de l'action utile, des articles, du client et de l'historique.

| Dimension | État initial de démonstration | Ce que le marchand doit comprendre |
|---|---|---|
| Paiement | Confirmation attendue | Une tentative existe ; l'encaissement n'est pas confirmé |
| Préparation | Non commencée | Aucun article n'a encore été préparé |
| Livraison | Non expédiée | Aucune prise en charge transporteur n'est confirmée |

Une frise globale « commande terminée » ne remplace pas ces trois états. Pour une livraison partielle, afficher les quantités préparées, expédiées et livrées par expédition.

### Montants et objets de démonstration

| Article | Variante | Quantité | Prix unitaire TTC | Total TTC |
|---|---|---:|---:|---:|
| Tasse Atelier | Craie · TAS-CRAIE | 2 | 24,00 € | 48,00 € |
| Plateau Atelier | Petit · PLA-PETIT | 1 | 32,00 € | 32,00 € |
| Livraison | Standard | 1 | 6,00 € | 6,00 € |
| Total de commande | EUR | | | 86,00 € |

Les montants proviendront de la commande côté serveur. La conception ne calcule ni ne fixe une règle fiscale. Le client fictif est « Client de démonstration » ; une adresse utile peut être représentée par « Adresse de démonstration, Belgique ».

À 09 h 42, tentative de paiement pour 86,00 €. À 09 h 43, absence de confirmation. À 10 h 00, état toujours à vérifier. Identifiant fictif de suivi : PAI-DEMO-1042.

### Action suivante

L'action principale est « Vérifier le paiement ». Elle demande l'état de la tentative existante. Une reprise de lecture ne crée pas une nouvelle tentative de débit.

Pendant la vérification, conserver le montant, la référence et les trois états. Le contrôle devient « Vérification en cours ». Le membre peut quitter la fiche et retrouver l'opération.

| Réponse observée | Affichage | Action disponible |
|---|---|---|
| Encaissement confirmé | « Encaissé · 86,00 € », avec date et référence | Préparer la commande si les autres conditions sont remplies |
| Refus confirmé | « Paiement refusé », avec motif utile non sensible | Examiner les possibilités de reprise |
| Toujours aucune confirmation | « Résultat toujours incertain » | Vérifier à nouveau l'état existant ou consulter le dossier |
| Erreur de lecture du prestataire | « Vérification indisponible » ; dernier état conservé | Réessayer la consultation |
| Commande modifiée pendant l'examen | « La commande a changé » | Actualiser et relire le récapitulatif |

Ne pas afficher « Échec du paiement » pour une simple expiration de la requête de consultation.

Le récapitulatif de préparation, si accessible, nomme les articles, quantités, emplacement et effet attendu. L'application future vérifie permissions, paiement et disponibilités côté serveur avant l'opération. La maquette explique cette étape sans exécuter de préparation.

Retours et remboursements ont des sections et historiques propres. Aucun remboursement ne peut être présenté comme possible à partir d'un encaissement seulement supposé.

## 5. Dossier SEO-018

### Objet et décision

Page de collection « Tasses en céramique », marché Belgique, français. Version courante v12, proposition v13. L'hypothèse est qu'un titre plus descriptif peut mieux exprimer le contenu de la collection. Aucun gain de classement n'est promis.

Le dossier utilise une lecture stable : objet et version, sources, changement, contrôles, coûts et autorisation, résultat. Un sommaire permet d'accéder aux sections longues. La décision reste au voisinage du récapitulatif.

### Sources fictives

| Source | Donnée | Période ou relevé | Limite visible |
|---|---|---|---|
| Catalogue de démonstration | 8 produits de type tasse en céramique | 20 octobre, 09 h 00 | Composition vérifiée dans ce jeu fictif |
| Search Console de démonstration | 3 200 impressions, 64 clics, CTR 2,0 % | 22 septembre au 19 octobre ; relevé le 20 octobre, 09 h 10 | Observation agrégée, pas une preuve de causalité |
| Lecture de la page de démonstration | Titre actuel « Notre collection » | Version v12, 20 octobre, 09 h 12 | Aucun engagement sur l'affichage réel dans Google |
| DataForSEO | Compte non connecté | Aucune collecte | Aucun volume, score ou coût de collecte disponible |

Chaque source peut être ouverte avec sa période, son périmètre et sa date de collecte. L'absence de DataForSEO n'interdit pas toute proposition fondée sur les autres sources. Le contrat futur décide quelles données sont obligatoires pour chaque action.

### Comparaison

| Champ | Version v12 | Proposition v13 |
|---|---|---|
| Titre SEO | Notre collection | Tasses en céramique · Atelier Démo |
| Description SEO | Découvrez notre collection. | Découvrez les tasses en céramique Atelier Démo, leurs formats et les coloris disponibles. |
| URL, prix, stock et contenu commercial | Valeurs existantes | Inchangés dans cette proposition |

Les ajouts et suppressions sont libellés, pas uniquement colorés. Le texte long reste lisible sur mobile, avec « Actuel » puis « Proposé ». Un aperçu de résultat de recherche porte la mention « Aperçu indicatif ».

### Contrôles, coûts et autorisation

| Contrôle | Exemple nominal | Variante bloquante |
|---|---|---|
| Version cible | v12 toujours courante | v14 a remplacé v12 : relire les différences et renouveler la validation |
| Expérience active | Aucune sur les champs concernés | EXP-007 utilise le titre : modification bloquée sur ce périmètre |
| Données produit | Matière et formats justifiés par le catalogue | Une affirmation n'a pas de source : retirer ou justifier |
| Permission | Membre autorisé à approuver | Accès de consultation seulement |
| Budget | Plafond de l'action 1,00 € ; coût connu 0,08 € ; réservé 0,12 € | Plafond insuffisant ou coût non borné : pas de nouvelle exécution |

Ces coûts sont fictifs. « Coût connu », « montant réservé », « estimation » et « coût restant à confirmer » restent des notions distinctes. Les conventions et permissions exactes sont à rapprocher de S02.

Le mode d'autonomie montré est « Validation requise ». « Examiner la validation » ouvre le récapitulatif de la proposition v13, basé sur v12, pour cette page et ce marché. La confirmation de la proposition reste distincte de son application et de la publication du site.

Si une nouvelle version, un coût ou le périmètre change, l'accord précédent ne s'étend pas silencieusement. La vérification serveur doit être refaite au moment de l'action.

### Résultat

Avant application : « Non appliquée · Aucun résultat mesuré ». Après approbation seule : « Approuvée · Application à effectuer ». Après application vérifiée : date, version appliquée et preuve consultables. En cas d'absence de confirmation : « Application à vérifier », sans nouveau lancement automatique.

La période d'observation proposée est de 28 jours après publication confirmée. La date de départ est absente tant que cette confirmation n'existe pas. L'écran distingue « observation en cours », « données insuffisantes », « évolution observée » et « résultat non concluant ». Une hausse observée ne devient pas automatiquement un effet causal.

## 6. États transversaux

| État | Présentation et suite | Navigation et focus |
|---|---|---|
| Chargement initial | Libellé « Chargement… » et structure conservée ; aucun zéro inventé | Région occupée signalée ; navigation générale disponible |
| Actualisation | Dernières données datées conservées ; progression discrète | Éviter de déplacer le focus à chaque réponse |
| Données absentes | Expliquer ce qui manque et l'action de départ | Lien ou bouton de suite nommé |
| Accès refusé | Message sans détail sensible ; retour à une vue autorisée | Titre d'erreur atteint après navigation |
| Erreur récupérable | Message attaché à la section, dernière tentative et « Réessayer » | Conserver les saisies ; annoncer l'erreur |
| Opération longue | Étape connue, référence, dernière mise à jour ; aucune durée inventée | Possibilité de quitter puis retrouver le suivi |
| Résultat incertain | État et conséquences inconnues explicites | « Vérifier l'état » avant toute possibilité de relance |
| Conflit de version | Version examinée et nouvelle version visibles | « Actualiser et comparer », accord précédent invalidé |
| Connexion absente | « Compte non connecté » et capacité concernée | Connexion proposée seulement au membre autorisé |
| Quota atteint | Source, quota et reprise si la date est connue | Données déjà disponibles restent consultables |
| Synchronisation échouée | Erreur de collecte distincte d'une absence de données | Relance de collecte soumise au coût et à la permission |

## 7. Adaptation aux dimensions du projet

| Dimension | Navigation | Contenu | Panneaux et actions |
|---|---|---|---|
| 1440 × 900 | Colonne latérale visible | File de travail large ; détail principal et complément ; comparaison côte à côte | Assistant latéral uniquement si l'action reste visible |
| 1024 × 768 | Repliable, bouton nommé | Une ou deux colonnes selon la place réelle ; tableaux lisibles | Panneau superposé refermable, focus contenu |
| 390 × 844 | Menu compact | Lignes transformées en objets empilés ; trois états de commande séparés ; comparaison séquentielle | Détails et assistant en vues dédiées ; action après récapitulatif |
| 360 × 800 | Même organisation compacte | Retours à la ligne, montants et identifiants contrôlés | Aucun bouton tronqué ; aucune barre fixe ne masque le contenu |

Ne pas cacher un état de paiement, un coût ou une limite de source pour gagner de la place. Le tableau des articles peut devenir une liste avec quantités et totaux explicitement libellés. Le défilement horizontal de toute la page n'est pas une adaptation.

## 8. Clavier et accessibilité

Ordre de lecture : lien d'évitement, contexte, navigation, titre, message important, action principale, contenu, éléments secondaires. Les contrôles suivent l'ordre du document.

- Les liens naviguent, les boutons déclenchent une action ; chaque contrôle a un nom explicite.
- L'activité courante expose `aria-current`. Les sections ont des titres hiérarchisés.
- Un panneau modal retient le focus, se ferme par Échap et rend le focus à son déclencheur. La fermeture d'un panneau de suivi n'annule pas l'opération.
- La confirmation sensible reçoit d'abord le focus sur son titre ou sa description. L'action de confirmation n'est pas présélectionnée.
- Tab et Maj+Tab parcourent les contrôles. Entrée ou Espace activent les boutons. Des onglets éventuels utilisent les flèches et le modèle ARIA correspondant.
- Les états associent libellé, forme ou pictogramme à la couleur. Les messages asynchrones ne sont pas annoncés en boucle.
- Les cibles tactiles visent 44 × 44 px. Les champs conservent des labels visibles et des erreurs reliées au contrôle.
- Contraste cible : 4,5:1 pour le texte courant, 3:1 pour le grand texte et les repères interactifs essentiels. Le choix des couleurs doit être mesuré après confirmation.
- Contrôler zoom, texte long et réduction des animations. Un contrôle masqué ne reste pas focusable.

## 9. Besoins transmis à G0

S01 demande des valeurs lisibles pour les états de paiement, de préparation et de livraison, les versions de page, les sources datées et les coûts détaillés. Les états proposés ici sont des libellés d'interface, pas de nouveaux types métier ou enums imposés à S02.

L'intégrateur doit aussi raccorder les permissions serveur, le suivi d'une opération existante, la protection des versions et expériences, les preuves d'application et l'invalidation d'une approbation périmée. Aucun de ces mécanismes n'est prouvé par une maquette.
