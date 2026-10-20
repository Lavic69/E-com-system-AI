# État préparé pour le premier commit

Branche locale initiale : `main`, sans commit. Le dépôt GitHub `Lavic69/E-com-system-AI` a été revérifié vide et public. Il n'existe aucune branche de mission à fusionner.

Le contenu candidat comprend les configurations racine, le socle sous `apps` et `infra/dev`, les documents produit/pilotage, les livraisons S00/S01/S02/G0, les contrats communs et le banc expérimental écrit pour ce projet. Les maquettes et rapports inclus utilisent des données synthétiques.

La [liste exacte des fichiers](FICHIERS_COMMIT.txt) et les [empreintes de l'état revu](preuves/etat-revu.json) permettent de vérifier le contenu avant toute action Git. Aucun fichier n'est ajouté à l'index par cette préparation.

## Exclusions vérifiées

- `.data/` : bases, secrets, sauvegardes, logs et état initial conservé pour la revue.
- `.cache/`, `node_modules/`, `dist/` : fichiers générés et dépendances.
- `.local-coordination/` : ressources de session.
- `.env` et fichiers de secrets correspondants.
- Les preuves privées et fichiers récupérés chez Amboras, situés hors de ce dépôt.

Le contrôle recherche des motifs de clés et compare les secrets locaux connus aux sources candidates et au bundle Dashboard. Il ne constitue pas un audit de sécurité exhaustif.

## Avant de créer la base commune

1. Recette graphique G0 réalisée ; débordement mobile corrigé. Les preuves et la liste de fichiers incluent cette reprise.
2. Relire l'état exact à versionner et recueillir l'autorisation du commit. Proposition de message : `chore: préparer le socle G0, les contrats et le workflow de missions`.
3. Ajouter seulement les chemins revus. La liste peut être utilisée avec `git add --pathspec-from-file=docs/livraisons/G0/FICHIERS_COMMIT.txt`, puis contrôler `git diff --cached`.
4. Créer le commit initial sur `main`, relever son SHA et l'utiliser comme base commune. L'autorisation de commit n'autorise pas automatiquement le push.
5. Avant publication sur GitHub public, confirmer la licence proposée dans l'architecture et le contenu destiné à être public. Sur autorisation correspondante, pousser `main`, puis comparer son SHA local au SHA distant.
6. Préparer les trois worktrees depuis cette même base. Les [règles de coordination](../../pilotage/COORDINATION.md) gouvernent ensuite branches de mission, intégration et PR.

Le SHA de la première base n'est pas incorporé fictivement dans les fichiers qui doivent former ce même commit. Il est relevé après création et inscrit dans la fiche locale de base commune, puis référencé par les livraisons des missions et le journal d'intégration suivant.
