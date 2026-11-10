# S10 — Catalogue, membres et clients

Base : `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086`. Branche : `feat/s10-catalogue`.
Worktree : `/Users/lavic/Desktop/Amboras REA/E-com-system-AI-S10`.

## Réalisation et vérification

1. Composer S00 avec un plugin catalogue dans une configuration propre à S10. Garder les registres et dépendances communs inchangés. Vérifier la migration candidate sur une base PostgreSQL isolée.
2. Réutiliser les API et écrans Vendure pour produits, variantes/options, facettes, collections, médias, stocks, prix, clients/groupes et membres/rôles. Préparer Belgique/fr/EUR et États-Unis/en/USD, deux emplacements et des comptes de démonstration. Tester créations, modifications, lecture Shop API, refus et séparation des canaux.
3. Ajouter un import CSV de création, limité à 100 lignes : aperçu sans écriture, erreurs par ligne, prix en unités mineures et emplacement explicite. Chaque ligne crée un produit et sa variante. Une clé de ligne durable permet de reprendre un fichier après interruption sans recréer un produit ; un contenu modifié sous la même clé est refusé. Tester répétition, concurrence, rollback et reprise après redémarrage.
4. Ajouter seulement les préférences de langue et de contact au client natif. Ces préférences et l'appartenance à un groupe ne valent pas consentement marketing.
5. Vérifier l'extension d'import et les parcours natifs dans Responsively, aux dimensions 1440×900, 1024×768, 390×844 et 360×800 ; vérifier clavier, chargement, erreur, refus et persistance.
6. Relire les changements, livrer les preuves, commandes, migrations et raccordements G1 dans `RESULTAT.md`. Aucun commit, push ou lancement S20 n'est autorisé par S10.

## Interface

Le marchand prépare un petit catalogue, vérifie ses lignes et importe seulement les lignes valides. Le marché, la devise, l'emplacement et les effets sont visibles avant l'action. Les résultats restent affichés ligne par ligne.
La direction S01 déjà confirmée et les composants publics Vendure sont conservés : police système, hiérarchie par bordures, espacement de 4 px, libellés explicites et états textuels. Le thème commun reste à l'intégrateur.

## État

- Worktree créé et dépendances installées depuis le lockfile.
- Plugin, extension, migration candidate et composition de recette réalisés.
- 23 contrôles API/PostgreSQL réussis ; recette graphique ciblée effectuée dans Responsively.
- Livraison dans `RESULTAT.md`, avec raccordements G1 et limites de vérification explicites.

## Complément demandé le 10 novembre

- Migration sur une copie de G0 remplie : 5 contrôles réussis, données commerciales, clients, rôles et médias conservés ; preuve dans `preuves/upgrade.json`.
- Saisie graphique du prix et des stocks : réalisée par le membre catalogue dans Responsively ; prix 18,90 EUR, entrepôt 9 unités, magasin 4 unités. Valeurs conservées après rechargement et confirmées par Admin API et Shop API.
- Ouverture du CSV par le dialogue système : réalisée avec `infra/tests/s10/fixtures/recette-fichier.csv` ; une ligne importée, ligne au stock négatif refusée, résultat relu par API.
- Complément graphique terminé et preuves ajoutées dans `preuves/ui/`. Aucun développement S20 ni intégration G1 lancé.
