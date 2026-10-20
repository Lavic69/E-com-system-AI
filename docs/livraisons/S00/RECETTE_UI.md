# Recette graphique S00

Statut : exécutée avec succès dans Responsively stable le 20 octobre 2026 pendant la reprise G0. Les rôles, l'accès direct, le chargement, l'erreur réelle, la reprise et les quatre dimensions ont été contrôlés. Le [rapport G0 et ses captures](../G0/RECETTE_RESPONSIVELY.md) constituent la preuve actuelle. Les premières tentatives S00 avaient été bloquées par l'accès graphique.

## Préparation

Réserver le créneau graphique selon `docs/pilotage/COORDINATION.md`. Démarrer la session A avec les commandes de `infra/dev/README.md`.

Vérifier la fenêtre et ouvrir `http://127.0.0.1:5101/dashboard/`. Se connecter avec les identifiants locaux de la session A.

## Parcours attendus

1. Trouver « Environnement local » dans la navigation, puis « Vérification du socle ».
2. Ouvrir la page et constater le résultat « Connexion autorisée au socle », la session A et le canal actif.
3. Utiliser « Vérifier à nouveau » à la souris, puis au clavier.
4. Vérifier le chargement et l'erreur de connexion, sans laisser l'interface annoncer un succès quand la requête échoue.
5. Avec un compte de démonstration limité à `ReadCatalog`, vérifier que l'entrée du menu disparaît et que l'URL directe affiche le refus d'accès.
6. Avec un compte limité à `ReadPlatformFoundation`, vérifier l'accès au socle et l'absence d'accès au catalogue.

Les comptes limités et les refus serveur sont déjà exercés par `npm test` dans ses bases jetables. Leur scénario graphique doit être rejoué dans une session de recette, avec des comptes synthétiques.

## Tailles Responsively

| Taille | Contrôles |
|---|---|
| 1440 × 900 | Menu, page, message API et bouton visibles |
| 1024 × 768 | Navigation repliable et contenu lisible |
| 390 × 844 | Menu compact, textes sans débordement, bouton utilisable |
| 360 × 800 | Texte du refus, erreur et bouton sans coupure |

Conserver les captures localement dans `preuves/`, avec l'URL, le rôle utilisé et les dimensions. Libérer ensuite le créneau. Le succès du build ou du contrôle HTTP ne clôt pas cette recette.
