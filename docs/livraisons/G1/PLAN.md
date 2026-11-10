# Intégration G1

10 novembre 2026. Réalisation locale autorisée par Victor pour finaliser S10 à S12.

Base commune : `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086`. Branche : `integration/g1`. Les trois livraisons non commitées ont été transférées sans modifier leurs worktrees. Le manifeste `preuves/transfert.json` conserve leurs empreintes.

1. Raccorder les trois plugins, la découverte Dashboard, la dépendance GraphQL et les migrations. Garder une composition G0 explicite pour les tests de montée de version. Vérifier compilation et absence de doublons.
2. Raccorder les actions sur les pages par les services S11 et leur transaction, avec permissions, bail, révision et références S10. Vérifier réussite, refus, concurrence et rollback conjoint contenu/action/événement.
3. Raccorder la reprise du worker et un consommateur local durable. Vérifier arrêt/redémarrage, remise dédupliquée et conservation des données après migration d'une copie G0.
4. Rejouer les tests des modules et du socle sur l'état intégré. Vérifier les écrans combinés dans Responsively aux dimensions 1440×900, 1024×768, 390×844 et 360×800.
5. Relire les modifications, conserver les preuves et actualiser les statuts et les fiches de la vague suivante sans lancer celle-ci.

Les agents commerciaux restent refusés. Les actions G1 sur le contenu utilisent les droits et la réservation d'un membre ; aucune permission native supplémentaire n'est donnée aux comptes agents. Les effets externes, la publication du site et les paiements restent dans leurs lots.

Victor a autorisé les commits, pushes, création de PR et fusion dans `main` le 10 novembre 2026. La [PR #1](https://github.com/Lavic69/E-com-system-AI/pull/1) porte la livraison. Aucun worktree source ne sera supprimé.

## Clôture technique

Les étapes 1 à 5 sont réalisées. `npm run test:all` passe sur l’état final ; recette Responsively et preuves de restauration/crash disponibles. Les fiches S20/S21/S22 sont préparées, non lancées. La base de la vague suivante est le commit de fusion de la PR #1, après vérification du SHA distant.
