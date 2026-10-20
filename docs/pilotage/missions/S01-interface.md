# S01 Conception de l'administration

Statut : prêt à lancer. Session B. Travail local.

## Mission

Transformer les parcours déjà définis en une proposition visuelle concrète et en règles de composants utilisables par les lots suivants. Le résultat est une conception revue, avec les états et interactions prioritaires, sans modifier le socle que S00 prépare.

## Lire

- `AGENTS.md` et `docs/pilotage/COORDINATION.md`.
- `docs/produit/PARCOURS_INTERFACE.md`.
- Les sections pertinentes du cahier produit et le glossaire.
- Le skill `interface-design`.

## Écritures autorisées

Uniquement `docs/livraisons/S01/`. Les documents produit et le code applicatif sont en lecture seule.

## Travail

1. Reprendre la navigation et le dossier d'action proposés. Réutiliser le cadrage existant.
2. Vérifier si Victor a déjà confirmé la direction graphique dans cette session. À défaut, présenter la direction existante et obtenir ce seul choix avant la réalisation visuelle, conformément à `interface-design`. Avancer entre-temps sur la hiérarchie, les états et critères.
3. Préparer une proposition de vue d'ensemble, une fiche de commande et un dossier d'action SEO ou campagne.
4. Montrer le comportement de ces écrans sur ordinateur et mobile.
5. Définir les couleurs, typographies, espacements, états, contrôles et composants réellement nécessaires.
6. Prévoir chargement, données absentes, refus d'accès, erreur, opération longue et résultat incertain.
7. Identifier ce qui peut réutiliser les composants publics de l'administration Vendure et ce qui exige une extension.

Les maquettes peuvent être des artefacts statiques. Un prototype web éventuel reste local, dans le dossier autorisé, avec ses dépendances propres. Il ne modifie pas le lockfile racine. S'il est créé, utiliser Responsively et les outils autorisés sur un créneau exclusif.

## Critères de sortie

- Le marchand repère une action prioritaire, ouvre son objet et comprend l'action suivante.
- Une commande distingue paiement, préparation et livraison.
- Un dossier d'action montre les sources, la différence proposée, les limites, le coût et le résultat.
- Les exemples portent explicitement la mention « données de démonstration ».
- Les états importants et la navigation clavier sont spécifiés.
- Les maquettes sont examinées avant livraison ; une proposition non confirmée reste identifiée comme telle.
- `docs/livraisons/S01/RESULTAT.md` liste les décisions validées, les fichiers, les vérifications et les questions restantes.

## Limites

Ne pas recréer un autre système de design en parallèle avec UI/UX Pro Max ou Impeccable. Ne pas recommencer l'entretien produit. Ne pas construire une application factice dont les boutons seraient présentés comme des fonctions livrées.

La confirmation graphique attendue ne bloque pas S00 ou S02. Après livraison, transmettre les propositions de thème et navigation à l'intégrateur ; ne pas modifier les fichiers partagés.
