# S20 Checkout et paiement de test

État : fiche préparée en G1, non lancée. Session A, branche prévue `feat/s20-checkout`. Attendre un SHA G1 commité, intégré et vérifié selon `COORDINATION.md`. Ne pas repartir du SHA G0.

## Résultat attendu

Un acheteur constitue son panier, fournit ses adresses et règle une commande en environnement de test. Deux acheteurs ne peuvent payer la dernière unité. Le marchand retrouve commande, paiement et confirmation locale sans doublon après interruption.

## Entrées et chemins

Lire `AGENTS.md`, le plan, la coordination, les livraisons G1/S10/S12 et les recettes SC01, SC02, SC03 et SC08 de S02. Consulter les API de la version Vendure installée.

Écritures propres : `apps/commerce/src/plugins/checkout/`, `apps/dashboard/src/extensions/checkout/`, `infra/tests/s20/`, `docs/livraisons/S20/`. Proposer au coordinateur tout raccordement des registres, migrations, dépendances, contrats et worker. Le storefront appartient à S21 ; S20 livre les API et un parcours de test propre, puis G2 les raccorde.

## Travail et vérification

1. Relever base, ressources et état Git. Prévoir `.data/v2-s20-a/`, API 4101, administration 5101, PostgreSQL 5541. Vérifier leur disponibilité ; faire préparer les commandes de cette vague par l'intégrateur avant lancement.
2. Réutiliser les commandes, clients, taxes et prix Vendure. Calculer le devis côté serveur et refuser un contexte marché/devise incohérent. Tester adresses, quantité, livraison et total déterministe dans BE/fr/EUR et US/en/USD.
3. Réserver durablement le stock avant l'appel de paiement. Couvrir les chemins natifs de mutation effectivement accessibles ; ne pas appliquer le seul checker synchrone du banc historique. SC01 doit observer une seule réservation et un seul paiement pour une unité, deux pour deux unités.
4. Persister tentative et clé d'idempotence avant transmission. Tester refus, réponse perdue, webhook authentifié répété ou ancien, expiration concurrente, annulation et reprise. SC02 doit conserver le stock tant que le paiement est inconnu.
5. Enregistrer transactionnellement les événements et les notifications dans les mécanismes S12. Une confirmation de commande produit un seul message dans le transport local. Livrer le schéma de charge et l'identité du consommateur à S22.
6. Vérifier les parcours par API réelle et PostgreSQL, avec redémarrage et crash. Pour les écrans modifiés, appliquer S01 et la recette Responsively. G2 devra refaire l'achat depuis le storefront S21.

Choisir le prestataire en fonction de l'accès de test réellement disponible. Le simulateur local permet les tests déterministes ; il ne valide pas le fournisseur. L'absence de compte sandbox reste une limite explicite, sans demande de secret dans le chat et sans paiement réel.

## Livraison

`RESULTAT.md` avec les champs Git habituels, migrations candidates, scénarios exécutables, données de test, limites et raccordements G2. Ne pas activer les agents commerciaux, remboursements, promotions avancées ou fournisseurs réels. Ne pas lancer S30.
