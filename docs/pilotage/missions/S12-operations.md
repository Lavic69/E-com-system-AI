# S12 Actions, connexions et événements durables

État : prête, non lancée. Session C, branche prévue `feat/s12-operations`. Vérifier le commit G0 et son SHA selon le plan. La mission commence uniquement sur instruction de Victor, depuis le même SHA G0 que S10 et S11.

## Résultat attendu

Une action autorisée et versionnée conserve sa trace après interruption. Une reprise ne duplique ni son effet, ni sa réservation de budget, ni son message de test.

## Entrées

- `AGENTS.md`, le plan, `COORDINATION.md` et les décisions G0.
- Contrats `Context`, `Action`, `Operation`, `Event`, `Connection`, `BudgetReservation`.
- Recettes SC03, SC04, SC07 et SC08 ; frontières commerciales de S10 et de contenu de S11.
- Points de transaction et d'extension publics de Vendure 3.8.0 installé.

## Périmètre exclusif

- `apps/commerce/src/plugins/operations/`.
- `apps/dashboard/src/extensions/operations/`.
- `infra/tests/s12/` et `docs/livraisons/S12/`.

Le registre, les manifestes, le lockfile, les contrats et les migrations globales restent à l'intégrateur. Une évolution de schéma commun se propose avec ses exemples et ses appelants ; elle ne se duplique pas dans le module.

## Travail et preuve

1. Relever branche, SHA et état Git. Préparer C avec `npm run dev:prepare -- --mission=S12 --session=C`.
2. Raccorder la validation des formats communs côté serveur. Proposer la dépendance ou la génération requise à l'intégrateur avant tout changement de lockfile.
3. Construire le contexte depuis l'identité et le canal autorisés, recharger permissions/délégation avant effet. Démontrer les refus par API directe.
4. Définir et tester une canonisation versionnée de la liaison d'approbation : ordre des propriétés, encodage, montants entiers, champs inclus et refus des valeurs ambiguës. Tester des vecteurs fixes, des ordres de propriétés différents et une modification de chaque champ sensible.
5. Persister proposition, approbation, opération et prises de travail exclusives. Comparer la révision de la cible et inscrire l'opération dans la même transaction. Pour une cible commerciale, prouver l'adaptateur de révision et les chemins de mutation couverts avant de déclarer un agent commercial opérable.
6. Créer journal de sortie transactionnel et réception dédupliquée. Prouver rollback, crash après commit avant émission, doublon, désordre et reprise après redémarrage. Un abonnement EventBus seul ne clôt pas le lot.
7. Réserver le budget atomiquement, conserver la réserve en cas d'incertitude et rapprocher une seule fois. Tester concurrence, changement de période et reçu supérieur au plafond sans tronquer le coût.
8. Créer un registre de connexions sans secret exposé et un transport email local de test, sans envoi externe. Fournir recherche d'état et idempotence simulées ; distinguer le fournisseur incapable de rapprocher.
9. Fournir une lecture du dossier avec états, coûts, erreurs et preuves ; reprendre S01 et vérifier les états pertinents dans Responsively.

Développement : `.data/v1-s12-c/`, ports 4103/5103/3103 réservé/5543. Les tests sous `infra/tests/s12/` emploient des bases jetables, des ports libres et un récepteur de test durable ; annoncer ses ports propres s'il en ouvre.

## Livraison et G1

Livrer le plugin, l'extension, migrations candidates, scénarios de crash et `docs/livraisons/S12/RESULTAT.md`, avec base, branche, commits, état du push et limites.

En G1, démontrer une action sur une vraie version de page S11 et son événement durable, avec référence produit S10. Une action sur un faux objet ne suffit pas. Les paiements, connecteurs payants, publication réelle et envois externes restent hors de cette mission.
