# Validation locale du moteur commercial

Essais du 20 octobre 2026 sur Vendure 3.8.0, avec Node 24.14.0.

Le banc de validation démarre un véritable serveur Vendure et interroge ses API Admin et Shop. Il utilise uniquement des produits, comptes et paiements fictifs. Il sert à éprouver le choix du moteur avant de construire les écrans et les intégrations du produit.

## Résultat

| Configuration | Résultat | Preuve |
|---|---|---|
| SQLite, protection du stock activée | 13 contrôles réussis | [Rapport](reports/run-2026-10-20T15-24-40-784Z-sqlite-guarded.json) |
| PostgreSQL, paiement sans contrôle final du stock | Échec reproduit : deux achats acceptés pour une unité | [Rapport de référence](reports/run-2026-10-20T15-24-40-784Z-postgres-baseline.json) |
| PostgreSQL, protection du stock activée | 15 contrôles réussis | [Rapport après correction](reports/run-2026-10-20T15-24-40-784Z-postgres-guarded.json) |

Les trois rapports correspondent aux mêmes empreintes de fichiers source et de dépendances. Les options d'exécution distinguent la configuration de référence de la configuration corrigée.

Chaque rapport enregistre les versions, résultats, assertions échouées, éléments observés et contrôles non exécutés. Les exécutions antérieures restent conservées dans `reports/`.

## Reproduire

Depuis ce dossier :

```sh
npm ci
npm test
npm run test:postgres
```

`npm test` exécute les contrôles séquentiels sur SQLite. `npm run test:postgres` démarre une instance PostgreSQL temporaire supplémentaire et teste les paiements concurrents. Les deux commandes doivent terminer avec le code de sortie `0`.

Pour reproduire le problème sans protection :

```sh
npm run test:postgres:baseline
```

Cette commande est un contre-exemple : elle doit échouer avec le code de sortie `1` sur le contrôle de la dernière unité. Elle ne fait pas partie d'une suite attendue entièrement verte.

PostgreSQL est fourni comme dépendance locale de développement par `embedded-postgres`. Son installation utilise un script de préparation des binaires ; aucune installation système ou inscription d'un service n'est nécessaire. Les essais démarrent sur des ports disponibles, puis arrêtent le serveur HTTP et PostgreSQL. Les données synthétiques sont conservées dans un répertoire temporaire propre à chaque exécution.

Les identifiants de test sont générés en mémoire. Aucune clé de fournisseur, aucun compte marchand et aucun paiement réel ne sont utilisés. La télémétrie Vendure est désactivée dans ce processus de validation.

## Parcours vérifiés

- L'API d'administration refuse une lecture sans authentification.
- Un produit et sa variante sont créés via l'API Admin puis relus via l'API Shop.
- Un membre disposant de `ReadCatalog` peut consulter le catalogue, mais ne peut ni le modifier ni lire les commandes.
- Une permission personnalisée donne accès au resolver de notre plugin sans ouvrir le catalogue.
- Deux articles à 25 EUR et une livraison à 5 EUR donnent une commande à 55 EUR.
- Un paiement refusé laisse la commande en attente ; une nouvelle tentative valide cette même commande.
- Répéter la demande de paiement après achat ne crée pas un deuxième paiement.
- Une tentative d'achat après épuisement du stock est refusée.
- Un remboursement partiel de 25 EUR sur 55 EUR est enregistré et confirmé manuellement dans le scénario fictif.
- Un remboursement supplémentaire dépassant le solde de 30 EUR est refusé.
- Les événements de commande et de paiement correspondent aux opérations observées.
- Les commandes, remboursements et réservations de stock sont relus après redémarrage du serveur.
- Sur PostgreSQL, deux acheteurs sollicitent simultanément la dernière unité avec un délai de prestataire simulé de 150 ms.
- Sur PostgreSQL, deux acheteurs peuvent tous deux acheter lorsqu'il reste deux unités.

La relecture après redémarrage porte sur un arrêt normal, pas sur un crash au milieu d'une transaction.

## Défaut observé et correction

Avec le moyen de paiement fictif sans contrôle final du stock, deux commandes préparées avant paiement ont été réglées simultanément pour une unité disponible. Le rapport de référence contient deux commandes `PaymentSettled` et deux appels au prestataire fictif. Le compteur de stock ne montrait qu'une allocation : ce compteur seul n'aurait donc pas permis de détecter le dépassement.

La lecture du moteur montre que le contrôle standard de disponibilité intervient à l'entrée dans `ArrangingPayment`, alors que sa stratégie par défaut alloue le stock lors de l'autorisation ou du règlement. Dans le scénario reproduit, la disponibilité peut changer entre ces deux étapes.

Le [contrôle ajouté](src/stock-eligibility.cjs) utilise `PaymentMethodEligibilityChecker`, un mécanisme d'extension du moteur. Il :

1. Charge les variantes concernées et additionne les quantités demandées par variante.
2. Verrouille leurs niveaux de stock avec le service public de Vendure, dans la transaction de paiement.
3. Relit le stock vendable avec une lecture verrouillée qui évite le cache de requête.
4. Refuse le moyen de paiement si le stock est devenu insuffisant, avant d'appeler le prestataire.

Aucun fichier de `node_modules` n'a été modifié. Le test de concurrence, les critères de réussite et le stock initial restent explicites dans le banc de validation.

| Situation avec protection | Commandes payées | Appels au prestataire fictif | Stock alloué |
|---|---:|---:|---:|
| Deux acheteurs, une unité | 1 | 1 | 1 |
| Deux acheteurs, deux unités | 2 | 2 | 2 |

Dans le premier cas, l'autre commande reste en `ArrangingPayment` et reçoit `IneligiblePaymentMethodError`. L'interface du futur produit devra expliquer le changement de disponibilité et permettre de rafraîchir le panier.

Le contrôle doit être associé à chaque moyen de paiement applicable. Le test couvre un seul moyen fictif et un paiement synchrone dans la transaction. Pour un prestataire asynchrone, les réservations durables, expirations, confirmations et clés d'idempotence nécessitent une conception et des tests supplémentaires. Conserver un verrou pendant un appel distant a aussi un coût de contention à mesurer.

## Versions et limites

Le serveur PostgreSQL interrogé par Vendure renvoie la version `18.4`. Sur ce Mac arm64, la chaîne de version du binaire embarqué indique `x86_64-apple-darwin24.6.0`. Ces essais ne constituent pas une mesure de performance native.

Le pilote `pg` 8.23.1 émet un avertissement de dépréciation concernant des requêtes simultanées sur un même client. Les assertions passent ; cet avertissement devra être traité avant un éventuel passage à `pg` 9.

Restent notamment à vérifier :

- Stripe ou un autre prestataire réel en environnement de test, y compris webhooks répétés et résultats incertains.
- Les paiements asynchrones, autorisations différées, réservations expirées et interruptions.
- Les rôles sur tous les domaines commerciaux et les politiques d'autonomie, montant et budget.
- Plusieurs canaux, emplacements, variantes et commandes comportant des règles avancées.
- Les conflits entre modification du stock par un membre et achat simultané.
- La reprise des files de tâches, les migrations et la restauration depuis une sauvegarde.
- L'isolation entre deux installations et leurs stockages.
- Les extensions graphiques, les parcours d'interface et leur vérification dans Responsively.
- Les modules SEO, A/B testing, studio marketing et connecteurs externes.

## Fichiers

- [test/core.test.cjs](test/core.test.cjs) : parcours API, assertions, cas de concurrence et rapports.
- [test/probe-plugin.cjs](test/probe-plugin.cjs) : plugin minimal pour éprouver une permission personnalisée.
- [src/stock-eligibility.cjs](src/stock-eligibility.cjs) : contrôle transactionnel du stock avant paiement.
- [package-lock.json](package-lock.json) : versions et intégrité des dépendances.

Sources utilisées pour préparer les essais : [tests Vendure 3.8.0](https://github.com/vendurehq/vendure/blob/v3.8.0/docs/docs/guides/developer-guide/testing/index.mdx), code du paquet installé, [embedded-postgres](https://github.com/leinelissen/embedded-postgres).
