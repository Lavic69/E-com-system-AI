# Recette Responsively S11

10 novembre 2026. Créneau confirmé disponible par Victor après la libération S10. Application stable ouverte au chemin `/Applications/ResponsivelyApp.app`, contrôlée avec `cua_repl`. Aucun MCP Responsively ni autre version installé.

Le serveur de recette S11 utilise `http://127.0.0.1:5112/dashboard/content`, avec l'API 4102 et PostgreSQL 5542 dans le worktree `feat/s11-pages`. Les données sont propres à S11. Les captures et relevés d'accessibilité restent sous [preuves/responsively/](preuves/responsively/).

## Parcours réalisés

| Parcours | Observation |
|---|---|
| Connexion et chargement | Connexion avec le compte administrateur local ; chargement puis liste des pages visibles |
| Création au clavier | Titre et adresse saisis ; Tab atteint « Créer le brouillon », Entrée crée la page en base |
| Création sur mobile après correction | À 360 × 800, création de `creation-mobile-verifiee`, navigation automatique vers son dossier et focus sur le titre |
| Réservation et édition | Réservation depuis l'ordinateur, ajout d'un texte et enregistrement de v2 validée |
| Sélection | v2 sélectionnée, message « Elle n'est pas publiée » et pointeur conservé lors de la création de v3 brouillon |
| Historique et comparaison | v1 reste vide, v2 conserve le premier texte, v3 présente le texte modifié avec son parent v2 |
| Renouvellement et libération | Expiration affichée actualisée, puis libération confirmée dans l'interface |
| Réservation concurrente | Réservation prise depuis le mobile ; acquisition dans la vue ordinateur refusée avec un message explicite |
| Lecture seule | Connexion avec un rôle `ReadContent` existant ; champs et sauvegardes désactivés, aucune action de réservation, historique et aperçu consultables |
| Page absente | Accès direct à un identifiant inexistant ; erreur lisible et actions de reprise visibles |

Le rendu a été examiné à **1440 × 900**, **1024 × 768**, **390 × 844** et **360 × 800**. L'éditeur et l'historique sont côte à côte sur ordinateur. Les sections et comparaisons s'empilent sur mobile ; le contenu et les libellés restent lisibles. Le mode individuel de Responsively a permis d'examiner entièrement les deux mobiles, y compris la vue à 360 pixels située hors du cadre dans la disposition commune.

La vérification clavier porte sur la création et l'ordre de focus observé, pas sur un audit exhaustif d'accessibilité. Les conflits atomiques, l'expiration forcée et le refus d'un ancien jeton restent couverts par les 19 scénarios API ; ils ne sont pas tous répétés dans l'application graphique.

## Défaut reproduit et corrigé

Avant correction, deux créations dans Responsively persistaient la page mais restaient sur l'ancienne liste. La navigation programmée avec un timer de délai zéro pouvait précéder le retrait du gestionnaire `beforeunload` qui protégeait la saisie du formulaire.

La création conserve maintenant l'identifiant retourné dans l'état React. Un effet lance la navigation après le nettoyage de la protection de saisie. Le scénario a ensuite abouti directement au dossier de la page sur le mobile étroit, avec son titre focalisé. Le correctif ne change ni les permissions, ni les écritures serveur, ni la protection des formulaires encore modifiés.

Après ce changement ciblé de `apps/dashboard/src/extensions/content/index.tsx` :

- `npm run typecheck` réussi.
- Les **7/7** parcours Chromium isolés repassent, notamment création, clavier, quatre dimensions et saisie conservée après conflit.
- Le build Dashboard composé S11 réussit.
- Les sources serveur et leurs tests API sont inchangés ; les résultats **19/19** précédents restent applicables à ces sources.

## Preuves

| Fichier | Contenu |
|---|---|
| [Dossier aux quatre formats](preuves/responsively/dossier-quatre-formats.png) | En-têtes de dimensions, page, révision et sélection |
| [Comparaison et aperçu](preuves/responsively/comparaison-apercu.png) | Versions avant/après et aperçu local |
| [Mobile étroit](preuves/responsively/mobile-etroit.png) | Comparaison empilée à 360 × 800 |
| [Historique mobile](preuves/responsively/iphone-historique.png) | v2 sélectionnée et trois versions consultables à 390 × 844 |
| [Création corrigée](preuves/responsively/creation-mobile-corrigee.png) | Dossier ouvert après création sur mobile |
| [Réservation refusée](preuves/responsively/reservation-refusee.txt) | Refus visible de la seconde acquisition |
| [Lecture seule](preuves/responsively/lecture-seule.txt) | Champs désactivés, historique et aperçu accessibles |
| [Tablette en lecture seule](preuves/responsively/tablette-lecture-seule.png) | Rendu à 1024 × 768 |
| [Erreur de page absente](preuves/responsively/page-absente.png) | Message et actions de reprise |
| [Persistance relue par API](preuves/responsively/persistence.json) | Trois versions, sélection v2 et page créée après correction |

Les captures de fenêtre montrent aussi le cadre sombre de Vendure, suivant la préférence déjà présente dans Responsively. Le module conserve sa direction claire S01. Aucun réglage de thème global n'a été modifié.

## État de sortie

Disposition commune des quatre appareils restaurée, mode individuel fermé et réglages de mirroring remis dans leur état initial. La fenêtre reste sur la page S11 avec le compte lecteur de recette. Le créneau est libéré pour S12 dans la fiche de coordination S11. Les services démarrés pour cette recette sont arrêtés ; les ports sont vérifiés libres dans `preuves/verification.json`.

Cette recette valide le module local. Elle ne démontre pas G1, S10/S12 combinés, S21, Safari ou un appareil physique. Aucun commit, push, déploiement ou publication n'a été effectué.
