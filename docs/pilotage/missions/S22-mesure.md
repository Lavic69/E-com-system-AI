# S22 Collecte et premiers tableaux de bord

État : fiche préparée en G1, non lancée. Session C, branche prévue `feat/s22-mesure`. Démarrer uniquement sur instruction de Victor depuis le même SHA G1 intégré que S20/S21.

## Résultat attendu

Le marchand consulte un tunnel et des ventes rattachés à des événements connus. Il distingue zéro observé, collecte absente, retard, incohérence et période incomplète. Les montants concordent avec les commandes Vendure du périmètre choisi.

## Entrées et chemins

Lire les instructions du dépôt, le plan, G1, les contrats S02, SC03, le journal S12 et les lectures commerciales S10. La projection G1 des actions est un suivi opérationnel ; elle ne représente ni vente ni revenu.

Écritures propres : `apps/commerce/src/plugins/measurement/`, `apps/dashboard/src/extensions/measurement/`, `infra/tests/s22/`, `docs/livraisons/S22/`. Proposer les raccordements communs à l'intégrateur. S21 possède le storefront et raccordera les émetteurs proposés ; S20 possède la source des confirmations de paiement.

## Travail et preuve

1. Définir les métriques et leurs versions : événement déclencheur, population, marché, devise, période, dénominateur, retard et limites. Ne pas additionner EUR et USD. Ne pas déduire paiement ou revenu d'un événement navigateur.
2. Définir une collecte minimale, bornée et sans données sensibles inutiles. Vérifier provenance, schéma, versions de charge, droits et clés de déduplication côté serveur. Les événements publics de navigation ne peuvent modifier une commande.
3. Utiliser `receiveEvent` et des consommateurs stables. Construire les projections dans la transaction de réception ; éprouver doublons, conflit de contenu sous la même clé, désordre, trous et reprise après redémarrage. Toute lecture de rapprochement doit venir de la source autoritaire.
4. Livrer les vues de tunnel et ventes, avec filtres par marché/période/devise et dates de collecte. Les états absents, anciens, en cours et échoués restent visibles. Réutiliser les règles S01 et vérifier Responsively aux quatre dimensions.
5. Préparer un jeu de calcul manuel indépendant. Vérifier les chiffres par rapport aux commandes, la non-rétrogradation sur événement ancien et la reconstruction d'une projection sans double revenu.
6. Rejouer en G2 avec une vraie commande S20 et un parcours S21. Les fixtures en attendant leurs livraisons sont marquées comme telles et ne clôturent pas ce parcours.

Prévoir `.data/v2-s22-c/`, API 4103, administration 5103 et PostgreSQL 5543, après contrôle et préparation par l'intégrateur. Aucun compte analytique ou service payant n'est nécessaire à la première collecte locale.

## Livraison

`RESULTAT.md`, définitions de métriques, schémas et jeux de calcul, migrations candidates, tests et raccordements G2. Consigner branche, base, état du push, preuves et limites. Les remboursements, coûts publicitaires, commissions et attribution avancée restent dans leurs lots ; ne pas présenter la marge ou le ROAS comme disponibles.
