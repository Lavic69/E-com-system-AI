# Intégration G0

Travail autorisé par Victor après la revue S00/S01/S02. Base de départ : `main` sans commit, 109 fichiers non suivis. L'état initial est conservé localement sous `.data/g0-baseline/`.

| Étape | Résultat attendu | Vérification | État |
|---|---|---|---|
| Corriger le lanceur | Toute sortie inattendue d'un service arrête la session avec un échec ; arrêt demandé propre | Régression avant/après, puis processus réels et suite S00 | Réalisé et vérifié |
| Recette graphique | Socle et prototype utilisables aux quatre dimensions prévues | Responsively, parcours, rôles, clavier, états et captures locales | Réalisée ; débordement mobile corrigé et revérifié |
| Arrêter les contrats | Une source commune, conventions et responsabilités explicites | Exemples S02, correspondances avec le socle et S01 | Réalisé ; formats vérifiés, garanties d'exécution affectées aux lots |
| Préparer V1 | Fiches S10/S11/S12 disjointes avec ressources, raccordements et critères | Revue des dépendances et des chemins ; aucune mission lancée | Réalisé ; fiches prêtes, lancement sur instruction |
| Constituer la base Git | Premier commit local sur `main`, contenu et exclusions vérifiés | Inventaire, empreintes, revue de l'index, SHA réel et état propre après commit | Autorisé ; cette révision porte G0, push distinct |

Le résultat et les limites sont consignés dans `RESULTAT.md`. Le SHA du commit réel est relevé après sa création et consigné dans `.local-coordination/v1-base.json`. Le push conserve son autorisation propre ; cette session ne lance pas automatiquement les missions V1.
