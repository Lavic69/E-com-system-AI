# Vérifications S01

20 octobre 2026. La recette du prototype a été exécutée dans Responsively stable pendant G0. Le [rapport et les captures](../G0/RECETTE_RESPONSIVELY.md) complètent la revue des planches. Les fonctions métier réelles restent aux lots de réalisation.

## Parcours à examiner sur les maquettes

Toutes les données doivent porter la mention « données de démonstration ».

| ID | Point de départ et tâche | Résultat attendu | État actuel |
|---|---|---|---|
| V01 | Vue d'ensemble : repérer le blocage principal | Identifier D-1042, la confirmation de paiement absente et « Examiner » | Repères, filtre et clic vers la commande vérifiés dans Responsively |
| V02 | Ouvrir D-1042 et expliquer sa situation | Distinguer paiement incertain, préparation non commencée et livraison non expédiée | Trois états et navigation vérifiés aux quatre formats |
| V03 | Examiner la suite proposée pour le paiement | Comprendre que « Vérifier » consulte la tentative existante ; aucun nouveau débit | Dialogue ouvert ; résultat incertain simulé et avertissement sans débit vérifiés |
| V04 | Examiner les articles et montants | 2 × 24 + 32 + 6 = 86 EUR ; libellés et quantités lisibles | Calcul et fiche rendue vérifiés, avec défilement |
| V05 | Ouvrir SEO-018 depuis la file | Identifier la page, le marché, v12 et la proposition v13 | Dossier ouvert, versions et contexte vérifiés |
| V06 | Comparer la proposition SEO | Voir le texte actuel et proposé, les sources datées et les champs inchangés | Comparaison rendue et empilement mobile examinés avec défilement |
| V07 | Examiner le coût puis la validation | Distinguer connu, réservé, plafond et autorisation ; approbation séparée de l'application | Coûts et confirmation simulée vérifiés ; aucune publication |
| V08 | Variante avec EXP-007 active | Comprendre le conflit ; absence d'action permettant d'écraser l'expérience | Validation désactivée et explication visibles dans les quatre aperçus |
| V09 | Résultat de l'action SEO | Lire « Non appliquée » et « Aucun résultat mesuré » ; aucun gain annoncé | Non appliqué et résultat incertain vérifiés dans le prototype rendu |
| V10 | Source SEO non connectée ou ancienne | Distinguer donnée absente, zéro observé, donnée ancienne, quota et erreur | Source datée et variantes non connecté, ancienne et quota vérifiées |
| V11 | Chargement, vide, refus d'accès, erreur, opération longue, incertitude | Message explicite, objet conservé si autorisé et suite concrète | Dix variantes observées dans chacun des quatre aperçus |
| V12 | Parcourir avec Tab, Maj+Tab, Entrée, Espace et Échap | Focus visible, ordre logique, fermeture et retour du focus | Touches exercées sur navigation/dialogues ; retour du focus vérifié sur fermeture, contrôle ciblé |

## Examen visuel

Pour chaque écran principal, examiner 1440 × 900, 1024 × 768, 390 × 844 et 360 × 800. Noter la maquette ou capture exacte, la date, l'outil et les corrections. Vérifier aussi les textes longs et le zoom lorsque le support le permet.

- La file de travail est le premier contenu utile de l'accueil.
- Les trois états de commande sont immédiatement repérables.
- Le dossier d'action permet de relier chaque modification à sa source et à sa version.
- Les montants, périodes, limites et actions restent visibles sans défilement horizontal global.
- Les couleurs d'état ont des libellés ; les contrastes sont mesurés.
- Les actions longues et incertaines conservent une trace attachée à l'objet.
- La comparaison mobile empile « Actuel » puis « Proposé ».
- Le support indique clairement ce qui relève d'une maquette.

Relecture `interface-design` : vérifier la hiérarchie d'ensemble, la densité, la cohérence des données et la présence du dossier d'action dans les composants concernés. Corriger les problèmes observés avant présentation.

### Examen réalisé

Les planches PNG ont été ouvertes directement pour la revue. Elles couvrent les quatre dimensions et la comparaison SEO mobile. La file de travail domine l'accueil ; les trois états de commande sont séparés ; la décision SEO conserve version et coûts.

Une première conversion SVG affichait des séparations trop sombres et omettait certains glyphes. Les séparations ont été redessinées et les PNG régénérés avec la police locale Arial Unicode. La commande mobile a fait l'objet d'un rendu de contrôle séparé : comparaison pixel à pixel avec la planche principale, aucune différence.

La revue du code a également corrigé l'ordre mobile décision/résultat, le blocage de validation pour source ancienne ou résultat incertain, la remise à zéro de l'accord simulé lors d'un changement de scénario et le lien d'évitement pour préserver la route courante. Ces interactions ont ensuite été exercées dans Responsively pendant G0.

Les valeurs de contraste, les dimensions PNG/SVG, les liens locaux et la syntaxe JavaScript sont contrôlés par `python3 docs/livraisons/S01/verifier.py`, depuis la racine du dépôt. Résultat : 26 contrôles statiques réussis. [Rapport et empreintes des artefacts](preuves/verification-statique.json).

## Responsively et coordination

La reprise G0 a utilisé uniquement `/Applications/ResponsivelyApp.app` stable, conformément au guide `~/AI-Setup/docs/responsively.md` mis à jour le 20 octobre. La bêta et le MCP sont absents volontairement.

Les écrans ont été vérifiés en 1440 × 900, 1024 × 768, 390 × 844 et 360 × 800. Un débordement du bouton dans l'alerte de paiement mobile a été corrigé puis revérifié. Les 26 contrôles statiques passent après cette correction.

Le [rapport G0](../G0/RECETTE_RESPONSIVELY.md) décrit les gestes exécutés, la portée des contrôles clavier, les captures et les limites. Le créneau graphique a été libéré ; le serveur S01 existant a été conservé sur 5102.

## Tests d'intégration ultérieurs

Les tests ci-dessous ne sont pas exécutés par une maquette S01 :

- permissions serveur et absence de fuite de données ;
- rapprochement du paiement et absence de double débit ;
- reprise d'une opération après interruption ;
- stocks et préparation partielle ;
- approbation liée à une version et invalidation après changement ;
- refus d'une modification en conflit avec une expérience ;
- contrôle des budgets et coûts réels ;
- application puis publication d'une version identifiée ;
- mesure SEO et absence d'attribution causale injustifiée ;
- comportement des exports Vendure et ouverture directe des routes.

Ces contrôles doivent être répartis par l'intégrateur dans les lots de réalisation. Leur présence dans cette liste ne signifie pas qu'ils sont acquis.
