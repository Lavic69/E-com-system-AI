# Sources et limites de S02

Consultation le 20 octobre 2026. La cible est Vendure **3.8.0**, version du banc fourni. Aucune dépendance n'a été mise à jour. Les sources npm installées dans le banc voisin `validation-socle` ont été lues sans modification. Le verrouillage du banc dans ce dépôt reste la référence reproductible.

## Références du projet

- [Mission S02](../../pilotage/missions/S02-contrats.md), [coordination](../../pilotage/COORDINATION.md) et [plan](../../pilotage/PLAN_EXECUTION.md) : périmètre documentaire et intégration G0.
- [Glossaire](../../produit/GLOSSARY.md) : termes conservés.
- [Architecture, sections 6 à 9](../../produit/ARCHITECTURE.md) : propriétaires, actions, publication, expériences et cache.
- [Banc commercial](../../../experiments/core-validation/README.md) et [checker](../../../experiments/core-validation/src/stock-eligibility.cjs) : protection synchrone et limites explicites.
- [Rapport PostgreSQL protégé](../../../experiments/core-validation/reports/run-2026-10-20T15-24-40-784Z-postgres-guarded.json) : preuve antérieure de 15 contrôles, non rejouée par S02.

## Capacités précises consultées

Les liens pointent vers la version `v3.8.0`. Les quatre premières sources ont aussi été lues directement sur le dépôt officiel via le Web. La documentation web renvoyant surtout sa navigation, les fichiers source ont servi à vérifier le comportement. Les autres entrées ont été lues dans le paquet installé de même version.

| Référence primaire | Constat utilisé | Limite |
|---|---|---|
| [PaymentMethodHandler](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/config/payment/payment-method-handler.ts) | Le handler retourne montant, état et référence fournisseur ; création, règlement, annulation et remboursement ont des points d'extension distincts | Le contrat de réservation durable et l'idempotence du fournisseur ne sont pas fournis par cette interface |
| [StockAllocationStrategy](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/config/order/stock-allocation-strategy.ts) | La stratégie décide quand allouer pendant une transition ; elle doit être sans effet et donner un résultat stable | Son remplacement ne prouve pas les parcours de retour au panier ou d'annulation |
| [EventBus](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/event-bus/event-bus.ts) | Flux RxJS en mémoire ; abonnements ordinaires après transaction ; handlers bloquants pouvant partager le contexte transactionnel | Aucun journal durable ne découle de ce seul flux ; relation de chaque événement à sa transaction à éprouver |
| [DefaultMoneyStrategy](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/config/entity/default-money-strategy.ts) | Stockage `int`, précision 2, arrondi `Math.round(value * quantity)` | Ni règle fiscale ni validation de toutes les devises |
| [DefaultStockAllocationStrategy](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/config/order/default-stock-allocation-strategy.ts) | Allocation par défaut de `ArrangingPayment` vers `PaymentAuthorized` ou `PaymentSettled` | Le paiement différé exige le raccordement décrit dans le contrat |
| [StockMovementService](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/service/services/stock-movement.service.ts) | Services d'allocation, libération, vente et ajustement disponibles ; l'allocation augmente le stock alloué | Ne pas modifier directement les compteurs ni doubler l'allocation |
| [DefaultPaymentProcess](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/config/payment/default-payment-process.ts) | États `Created`, `Authorized`, `Settled`, `Declined`, `Error`, `Cancelled` et synchronisation avec la commande | L'état de connaissance `unknown` est propre à notre tentative, pas un état moteur présumé |
| [RequestContext](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/api/common/request-context.ts) | Contexte du canal, langue, devise et session ; token de session exclu du contexte sérialisé documenté | Un ancien contexte ne remplace pas la revalidation des permissions |
| [Channel](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/entity/channel/channel.entity.ts) | Langues/devises disponibles, valeurs par défaut, prix avec taxe, relations aux rôles et données commerciales | La relation un marché vers un canal est notre proposition, pas une isolation de marchands indépendants |
| [VendureEntity](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/entity/base/base.entity.ts) | Identité, création et dernière modification | Pas de révision métier commune automatiquement garantie |
| [DefaultOrderProcess](https://github.com/vendure-ecommerce/vendure/blob/v3.8.0/packages/core/src/config/order/default-order-process.ts) | Contrôle à l'entrée dans le paiement ; prise de verrous liée à la stratégie d'allocation | Lire ce code ne remplace pas une recette concurrente du plugin futur |

Les empreintes des fichiers locaux réellement consultés sont dans [source-manifest.json](source-manifest.json). Les méthodes publiques sont des pistes de raccordement ; S02 n'introduit pas de signature GraphQL ou de faux appel `reserveStock`.

## Statut des propositions

Les choix du document d'architecture ne sont pas tous des validations d'exécution. S02 conserve cette distinction :

- Déjà décidé dans le projet : séparation des propriétaires, cellule par boutique, permissions serveur, versions et approbations liées, budgets réservés, conservation des états inconnus.
- Observé dans le banc antérieur : parcours commerciaux synthétiques et protection de concurrence synchrone, avec limites listées dans son README.
- Vérifié ici : présence des points d'extension consultés, formats des exemples, cohérence interne et refus des contre-exemples documentaires.
- Proposé à G0 : formats exacts, allocation avant appel distant, conservation après échéance incertaine, liaison d'approbation, journal durable et clés de déduplication/cache.
- À prouver dans les lots suivants : intégration Vendure, transactions, crashes, fournisseurs, sécurité et interface.

Les dates, reçus, droits et comptes `fixture:` sont fictifs. Les condensats d'exemple sont calculés à partir de chaînes fictives ; ils ne définissent pas la canonisation cryptographique d'une approbation. Aucun texte de cette livraison n'établit une règle fiscale réelle ou des droits acquis sur un contenu externe.
