# Plan S11

Base : `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086`. Branche `feat/s11-pages`, worktree `E-com-system-AI-s11`.

1. Plugin de contenu et migration candidate. Pages par canal et langue, blocs texte/média/produit, versions immuables, révisions et réservation avec jeton croissant. Vérifier sur PostgreSQL réel la concurrence, l'expiration, les permissions et la persistance.
2. Extension Dashboard. Reprendre le système S01 : marchand préparant une page, liste puis dossier, comparaison et aperçu local. Palette ivoire/graphite/bleu, bordures discrètes, police système et grille de 4 px ; composants publics Vendure. Vérifier chargement, vide, refus, conflit et navigation clavier.
3. Recette et livraison. Configuration isolée dans `infra/tests/s11`, migration depuis G0, tests API, build et Responsively aux formats 1440 × 900, 1024 × 768, 390 × 844 et 360 × 800. Livrer les raccordements G1 et limites dans `RESULTAT.md`.

Le port 5102 est occupé par le prototype S01. La recette S11 utilise 5112 après vérification de disponibilité, avec un fichier de session dérivé privé ; le lanceur commun reste intact. API 4102 et PostgreSQL 5542 si libres ; tests automatisés sur ports alloués dynamiquement.

Les versions restent propres à une page et une langue. La réservation couvre toute la page (`/`). Le pointeur de version sélectionnée prépare S21 et ne constitue aucune publication. Le registre d'expériences sera un adaptateur serveur appelé sous le verrou de page ; la fixture protégée reste réservée aux tests. S10/S12/S21/S51 ne sont pas annoncés intégrés.

État : plugin, extension, vérifications automatisées et recette Responsively réalisés. La navigation après création a été corrigée pendant la recette, puis revérifiée. Voir `RESULTAT.md` et les preuves pour l'état courant. Aucun commit ni push autorisé pour ce lot.
