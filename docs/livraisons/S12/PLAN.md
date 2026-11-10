# S12 : plan de réalisation

Base : `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086`. Branche : `feat/s12-operations`.
Worktree : `/Users/lavic/Desktop/Amboras REA/E-com-system-AI-s12`.

1. Générer les types et la validation serveur depuis `packages/contracts/contracts.schema.json`. Vérifier les exemples communs, la canonisation et des vecteurs fixes. Aucun second schéma commun.
2. Persister les actions, approbations, opérations, connexions, budgets et événements dans PostgreSQL. Vérifier transactions, droits rechargés, comparaison de version, concurrence et réception dédupliquée.
3. Exécuter les effets locaux avec prise exclusive, clé stable et rapprochement. Interrompre réellement un processus après commit et après réception fournisseur ; vérifier l'unicité de l'effet et du coût après reprise.
4. Fournir le dossier Dashboard selon S01. Vérifier chargement, vide, refus, erreur, coût inconnu et preuve, puis les quatre dimensions dans Responsively si l'accès graphique est disponible.
5. Relire le diff, exécuter les contrôles du socle et livrer les migrations candidates et raccordements G1. Aucun commit, push ou raccordement des fichiers communs dans cette session.

## Validation commune proposée à l'intégrateur

Le lockfile contient Ajv 6, incompatible avec le dialecte 2020-12 commun. Proposition : génération avec Ajv 8 et json-schema-to-typescript, outils isolés dans `.data/s12-codegen/`, puis validateur autonome et types générés dans le module. La génération et le condensat du schéma sont contrôlables. Aucun changement du manifeste ni du lockfile partagé. L'intégrateur pourra déplacer cette génération dans `packages/contracts` en G1.

## Frontières

S12 ne crée ni page S11 ni objet commercial S10. Un adaptateur reçoit le gestionnaire transactionnel et doit verrouiller/comparer la vraie version avant l'effet. Les cibles commerciales sont refusées dans cette livraison. Les tests de l'adaptateur utilisent une cible explicitement synthétique ; G1 doit refaire le parcours sur une vraie page S11 avec référence produit S10.

Les transports de cette mission sont locaux et simulés. Aucun SMTP distant, paiement ou connecteur payant. Une connexion sans recherche d'état garde son résultat incertain et sa réservation.

## Interface

Intention : permettre au marchand de lire la décision, la version visée, le coût réservé et la preuve, puis de comprendre une incertitude. Palette et surfaces S01 : ivoire, graphite, bleu pour les actions, orange pour l'attente, vert pour une preuve confirmée. Profondeur par bordures discrètes, police système et montants tabulaires, grille de 4 px. La fiche conserve la référence, l'approbation et le résultat dans cet ordre sur mobile.

## Avancement

- Base vérifiée, worktree créé, dépendances du lockfile installées, session C préparée.
- Réalisation, tests API, concurrence, crash, contrats, build et recette Chromium terminés.
- Recette Responsively terminée après libération du créneau : quatre dimensions, dossiers, coûts, trace au clavier, erreur/reprise API et lecture/refus. Voir `RECETTE_RESPONSIVELY.md`.
- Livraison et raccordements consignés dans `RESULTAT.md` et `RACCORDEMENTS.md`.
