# Recette Responsively S12

10 novembre 2026, après confirmation de Victor et libération de la fenêtre par S10/S11. Recette effectuée dans `/Applications/ResponsivelyApp.app`, version stable 1.18.0, à l'URL `http://127.0.0.1:5103/dashboard/operations`.

Les fichiers source correspondent toujours aux empreintes de [source-manifest.json](preuves/source-manifest.json). Aucun code produit n'a été modifié pendant cette recette. Les tests API, contrats, build et Chromium de la livraison précédente restent rattachés à ce même code.

## Contrôles observés

| Format ou parcours | Résultat |
|---|---|
| Galaxy S21, 360 × 800 | Dossier incertain lisible ; plafond et réserve de 3,00 USD, coût inconnu, erreur fournisseur et absence de preuve de réussite distincts. Défilement de la liste puis du détail exercé. |
| iPhone 12 Pro, 390 × 844 | Sélection du dossier réussi ; coût connu de 2,40 USD, réserve à zéro et référence `local-mail:` affichés. |
| Tablette paysage, 1024 × 768 | Sélection de la proposition à valider ; plafond proposé de 3,00 USD, aucune réservation ni approbation présentée comme acquise. |
| MacBook Pro, 1440 × 900 | Liste et dossier lisibles côte à côte ; sélection et actualisation des données exercées. |
| Clavier | Trace ouverte par clic, fermée puis rouverte avec Espace. Identifiants, transmission unique, motif et liaison d'approbation affichés. Fin du dossier atteinte au clavier. |
| Chargement | États « Loading » et « Chargement des dossiers… » observés lors de l'ouverture des aperçus. |
| API indisponible | Après arrêt de notre API S12 et clic sur Actualiser, le message « Les dossiers n'ont pas pu être chargés » remplace les dossiers. |
| Reprise API | Après redémarrage de la même API et actualisation, les trois dossiers réapparaissent. Le dossier réussi conserve son coût et sa preuve. |
| Accès refusé | Un compte local avec `ReadCatalog` seulement reçoit « Accès refusé » en ouvrant directement `/dashboard/operations`. Aucun dossier ni coût n'est rendu. |
| Lecture autorisée | Un compte local avec `ReadOperations` seulement lit les dossiers. Les quatre aperçus finaux contiennent chacun les trois entrées. |

Aucun texte tronqué, chevauchement ou débordement horizontal du contenu web n'a été observé dans les quatre vues individuelles. La liste interne peut défiler sur mobile ; le détail reste consultable au défilement de la page. L'administration avait son thème sombre ; le panneau S12 conserve les couleurs claires S01, sans modification des préférences de l'application.

## Preuves locales

- [360 px : coût inconnu et réserve](preuves/responsively/360-costs.png), [trace](preuves/responsively/360-trace.png).
- [390 px : coût rapproché et preuve](preuves/responsively/390-success.png).
- [1024 px : proposition à valider](preuves/responsively/1024-proposal.png).
- [1440 px : dossier réussi](preuves/responsively/1440-success.png).
- [Erreur API](preuves/responsively/api-unavailable.png), [état après reprise](preuves/responsively/api-restored.txt).
- [Refus avec un vrai compte restreint](preuves/responsively/permission-denied.png), [lecture autorisée](preuves/responsively/read-only-authorized.txt).
- [Quatre aperçus rétablis](preuves/responsively/four-devices.png), [arbre d'accessibilité complet](preuves/responsively/four-devices.txt).
- [Rapport structuré](preuves/responsively/verification.json).

## Limites et fin de session

Cette recette porte sur la lecture des dossiers S12 et ses états. La liste vide a été contrôlée dans Chromium lors de la première livraison, mais n'a pas été recréée dans Responsively. Les références de cible et les messages restent des données de recette ; aucune page S11 intégrée ni livraison email réelle n'est démontrée.

Les deux comptes supplémentaires sont propres à la base locale S12. Leurs identifiants restent dans `.data/v1-s12-c/responsively-accounts.json`, hors Git. Aucun secret n'est présent dans les captures ou les fichiers de preuve.

La fenêtre reste configurée avec les quatre appareils, sur S12 avec le rôle de lecture. Le créneau graphique est libéré. Nos services S12, y compris l'API redémarrée pour le test d'erreur, sont arrêtés ; les ports sont contrôlés dans [resources.json](preuves/resources.json). Aucun commit, push ou changement du plan global.
