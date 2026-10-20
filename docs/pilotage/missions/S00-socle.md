# S00 Socle reproductible

Statut : prêt à lancer. Session A. Travail local.

## Mission

Amorcer le dépôt applicatif de façon reproductible pour permettre ensuite le travail de plusieurs sessions. Le résultat attendu est une base technique vérifiée, avec une API locale et les points d'extension d'administration confirmés. Le développement des fonctions métier appartient aux lots suivants.

## Lire

- `AGENTS.md`.
- `docs/pilotage/COORDINATION.md` et la section V0/G0 du plan.
- `docs/produit/ARCHITECTURE.md`.
- `experiments/core-validation/README.md` et les scénarios pertinents.

## Écritures autorisées

- Fichiers de configuration techniques à la racine, sauf les documents et consignes déjà présents.
- `apps/commerce/`, `apps/dashboard/` et le minimum de structure de `apps/storefront/`.
- `infra/dev/` et des scripts de développement communs.
- `docs/livraisons/S00/`.

S01 et S02 travaillent dans leurs dossiers de livraison. Ne pas modifier leurs fichiers ni intégrer leurs propositions tant qu'elles ne sont pas livrées.

## Travail

1. Inspecter l'état réel du dépôt et préserver les modifications présentes.
2. Fixer un gestionnaire de paquets unique, les versions communes et la structure du monorepo. Utiliser Vendure 3.8.0 comme référence éprouvée ; documenter tout changement indispensable.
3. Créer la configuration locale du moteur et les commandes de démarrage/arrêt. Garder les identifiants hors du dépôt.
4. Prévoir PostgreSQL et le stockage propres à chaque session, ainsi qu'un mode de test sans fournisseur externe.
5. Vérifier une lecture API authentifiée et une permission limitée dans le socle applicatif.
6. Prouver qu'une extension minimale de l'administration peut ajouter une page, respecter une permission et se raccorder à la navigation. Employer les API publiques de la version installée.
7. Définir le point d'enregistrement des plugins et extensions dont l'intégrateur sera propriétaire.
8. Prévoir une première migration, sa vérification sur une base jetable et un exercice de sauvegarde/restauration de données de démonstration.
9. Documenter les variables, commandes, ports et ressources par session. Les interfaces rendues sont contrôlées dans Responsively selon le créneau attribué.

## Critères de sortie

- Une installation des dépendances reproductible avec verrouillage.
- Le serveur démarre sur une adresse locale, répond et s'arrête proprement.
- Deux configurations de session ne réutilisent pas accidentellement la même base, les mêmes médias ou les mêmes ports.
- Une permission est vérifiée côté serveur ; une restriction d'interface seule ne suffit pas.
- Le point d'extension React est démontré sur la version retenue.
- Migration et restauration de démonstration vérifiées, ou blocage précis documenté.
- Les commandes et résultats sont consignés dans `docs/livraisons/S00/RESULTAT.md`.

## Limites

Ne pas construire le checkout complet, l'éditeur, le SEO ou le studio marketing. Ne pas remplacer les décisions produit par les données de démonstration. Ne pas recopier les preuves Amboras.

Ne pas créer de commit ou pousser sans autorisation. Préparer l'état et la liste explicite des fichiers pour le futur commit initial. Le dépôt vide ne permet pas encore de promettre des worktrees prêts.

## Après livraison

Attendre que S01 et S02 soient livrés. Sur demande de Victor, effectuer G0 selon le plan, arrêter les contrats et préparer les fiches S10, S11 et S12. Ne pas ouvrir automatiquement ces lots.
