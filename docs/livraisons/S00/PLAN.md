# S00 : socle reproductible

Mission démarrée le 20 octobre 2026 dans le checkout commun, sans commit initial.
S01 et S02 restent propriétaires de leurs dossiers de livraison.

## Décisions de réalisation

- npm workspaces, Node 24.14.0 et Vendure 3.8.0, avec versions directes et lockfile fixés.
- PostgreSQL embarqué en développement, sans service système. Une instance, un répertoire de médias, des secrets et des ports propres à chaque session.
- Administration React officielle de Vendure. La seule extension S00 est une page de contrôle technique protégée côté serveur.
- Composants et thème natifs conservés. La direction graphique métier reste à S01.
- Aucun prestataire externe, paiement réel, commit, push ou déploiement dans cette mission.

## Étapes et preuves attendues

1. Préparer les workspaces, configurations et commandes de développement.
   Vérification : installation verrouillée, compilation, démarrage et arrêt, séparation des ressources A/B.
2. Ajouter le plugin technique et les migrations.
   Vérification : API anonyme refusée, lecture authentifiée, compte limité refusé, migration sur base vide, sauvegarde/restauration avec relecture.
3. Raccorder la page React au menu et à l'API.
   Vérification : navigation et refus d'accès réels, états chargement/erreur, contrôle Responsively aux tailles du projet lorsque le créneau et l'accès sont disponibles.
4. Relire les fichiers et livrer `RESULTAT.md`, les commandes et preuves locales.

## Intention de l'extension

L'intégrateur doit constater qu'une page ajoutée par plugin fonctionne et respecte une permission. La page reprend la palette, les surfaces, la typographie et les espacements des composants publics Vendure. Elle affiche la session et un résultat API explicite, sans données commerciales fictives présentées comme un produit fini.

## Suivi

- Lecture de la mission, de la coordination, de l'architecture et des scénarios du banc effectuée.
- Plages A/B/C proposées libres lors de l'inspection initiale.
- MCP Responsively absent des outils exposés. L'accès graphique sera examiné au moment du contrôle, sans reconfigurer le MCP.
- Socle, migrations, extension et commandes réalisés. Installation depuis le lockfile, types, compilations, 2 tests de configuration et 14 scénarios d'intégration réussis.
- Arrêt Ctrl+C et signaux répétés vérifiés, services arrêtés.
- CUA a refusé ResponsivelyApp et Chrome. Recette graphique en attente ; voir `RECETTE_UI.md` et `RESULTAT.md`.
