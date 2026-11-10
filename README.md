# E-com-system-AI

Projet de plateforme e-commerce open source : gestion commerciale, édition de boutique, agents SEO, expérimentation et studio marketing.

Le dépôt contient Vendure 3.8.0 et son administration React, avec le catalogue, les pages versionnées et les actions durables intégrés en G1. Le parcours commun et les migrations sont vérifiés. Le checkout, la publication du storefront et les mesures forment la vague suivante. Le banc expérimental reste distinct de l’application.

- [Intégration G1 et preuves](docs/livraisons/G1/RESULTAT.md)
- [Intégration G0](docs/livraisons/G0/RESULTAT.md)
- [Démarrage du socle local](infra/dev/README.md)
- [Contrats communs](packages/contracts/README.md)
- [Démarrer deux ou trois sessions Codex](docs/pilotage/DEMARRER.md)
- [Plan d'exécution et état des lots](docs/pilotage/PLAN_EXECUTION.md)
- [Règles de coordination](docs/pilotage/COORDINATION.md)
- [Cahier produit](docs/produit/CAHIER_PRODUIT.md)
- [Architecture](docs/produit/ARCHITECTURE.md)
- [Parcours d'interface](docs/produit/PARCOURS_INTERFACE.md)
- [Glossaire](docs/produit/GLOSSARY.md)
- [Validation du moteur commercial](experiments/core-validation/README.md)

Les documents sous `docs/produit` sont les références maintenues du produit. Les preuves de reverse engineering d'Amboras restent hors de ce dépôt.

La gestion des branches, commits, pushes et PR est définie dans les [règles de coordination](docs/pilotage/COORDINATION.md). La [PR G1](https://github.com/Lavic69/E-com-system-AI/pull/1) relie le code, ses contrôles et le commit de fusion qui sert de base à V2. Les worktrees S10–S12 sont conservés.

Pour vérifier l’ensemble : `npm run test:all`. Après succès, `npm run demo:g1` ouvre la démonstration locale issue de la recette.
