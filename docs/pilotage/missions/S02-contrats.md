# S02 Contrats communs et scénarios d'acceptation

Statut : prêt à lancer. Session C. Travail documentaire et exemples locaux.

## Mission

Définir les contrats minimums qui permettront aux modules de communiquer sans inventer chacun leurs propres types, états ou règles. Utiliser l'architecture et le moteur existants comme références, puis fournir les exemples qui serviront aux tests des premiers lots.

## Lire

- `AGENTS.md`, le plan et les règles de coordination.
- `docs/produit/GLOSSARY.md`.
- `docs/produit/ARCHITECTURE.md`, sections données, actions, publication et expérimentation.
- `experiments/core-validation/README.md`, notamment les limites du paiement synchrone.
- Documentation ou sources actuelles du moteur lorsque le contrat dépend d'une capacité précise.

## Écritures autorisées

Uniquement `docs/livraisons/S02/`. Ne pas modifier le code, les dépendances, les migrations ou les documents partagés.

## Contrats à préparer

| Contrat | Points à fixer |
|---|---|
| Contexte | Boutique, marché, langue, devise, acteur et permissions ; données commerciales dont Vendure est la référence |
| Montants | Unité, devise, arrondi, taxes et distinction entre montants connus et estimés |
| Événements | Identité, version, dates, source, déduplication, reprise et rapprochement |
| Dossier d'action | Cible versionnée, proposition, approbation, exécution, erreur, résultat incertain et preuve |
| Connexion et budget | Capacités, compte, quota, montant réservé/connu et limites d'action |
| Contenu et expérience | Versions, publication, réservation d'édition, exposition, dimensions de cache |
| Paiement et stock | Réservation durable, expiration, tentative de paiement, confirmation, annulation et reprise |
| Audience | Identité client, groupes, consentements, désinscription et date de validité |
| Création | Produit de référence, fournisseur, version, provenance et droits d'utilisation |

Préparer des propositions de schémas ou types et des exemples, pas un schéma complet de toutes les fonctionnalités futures. Éviter de dupliquer les objets déjà fournis par le moteur.

## Scénarios obligatoires

1. Deux acheteurs pour la dernière unité, avec confirmation de paiement différée.
2. Une réservation expire pendant un paiement dont le résultat reste incertain.
3. Le même événement arrive deux fois, puis dans le désordre.
4. Une approbation est suivie d'une modification de la version cible.
5. Un agent SEO tente de modifier une page réservée par une expérience.
6. Une campagne préparée devient incompatible avec le stock ou les consentements.
7. Un fournisseur ne répond pas après une demande payante.
8. Une reprise ne doit ni envoyer deux messages ni engager deux fois le même budget.

Pour chaque scénario, indiquer le résultat attendu et ce qui permettra de le vérifier, sans imposer une API non documentée.

## Critères de sortie

- Un terme et un propriétaire de référence par donnée commune.
- Des états explicites, y compris les résultats inconnus.
- Les appels commerciaux sont autorisés côté serveur.
- Les exemples sont cohérents avec les devises, versions et marchés.
- Les hypothèses non résolues sont séparées des décisions validées.
- `docs/livraisons/S02/RESULTAT.md` décrit les contrats proposés, exemples, validations et points à arbitrer en G0.

## Limites

Ne pas appeler d'API payante, créer de comptes ou inventer des résultats de fournisseur. Ne pas définir de règle fiscale réelle sans périmètre et source. Ne pas figer tous les fournisseurs médias et marketing.

Ces contrats deviennent la base des autres modules après leur intégration en G0. Une proposition seule ne les rend pas automatiquement acceptés.
