# Raccordements S12 pour G1

S12 reste isolée du registre et des migrations communs. Sa base est `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086`. Les chemins ci-dessous sont relatifs au dépôt.

## Plugin et migration

Importer `OperationsPlugin` depuis `apps/commerce/src/plugins/operations/operations.plugin.ts`, puis appeler `init(options)` dans le registre commun. Fournir :

- l'identité serveur de la boutique et une version de politique ;
- la correspondance entre les vrais IDs de canaux S10 et leurs marchés, langues et devises autorisés ;
- les adaptateurs de cibles vérifiés ;
- les transports locaux disponibles et la durée de prise de travail, 30 secondes par défaut.

La configuration de recette `infra/tests/s12/config.cjs` construit ses marchés à partir des canaux réellement créés par Vendure. Elle utilise une cible `s12-fixture` et un récepteur local. Ne pas reprendre cette cible ni ses données comme adaptation produit.

Ordonner la migration candidate `Operations1792513200000`, dans `apps/commerce/src/plugins/operations/migrations/`, après le socle. Elle crée uniquement les tables `s12_*` du module. Les tables `s12_fixture_*` sont créées par les tests, jamais par la migration du plugin. Garder `synchronize: false`. Tester l'application combinée sur une copie de G0 et l'ordre retenu avec S10/S11 avant de l'ajouter au registre global.

Le point d'entrée Dashboard est `apps/dashboard/src/extensions/operations/index.tsx`. La découverte par le plugin Vendure et le build de recette sont vérifiés. Les fichiers `infra/tests/s12/config-ui.ts` et `vite.config.mts` montrent la composition locale ; ils ne remplacent pas la configuration commune.

## Action sur une page S11

Le contrat `TargetAdapter` se trouve dans `types.ts`. `prepare(manager, ctx, context, intent)` doit verrouiller la vraie cible et vérifier boutique, canal, version et protection d'édition. `apply` écrit dans cette même transaction et retourne une référence de preuve. Aucun appel réseau ne doit entrer dans cet adaptateur transactionnel.

La recette vérifie que `connection.getRepository(ctx, User).manager` correspond exactement au gestionnaire transactionnel transmis. Il faut conserver ce `ctx` pour les services Vendure appelés par l'adaptateur.

Le code S11 consulté dans son worktree expose `ContentService.save(ctx, { pageId, expectedRevision, fencingToken, document, validate })` et `select(ctx, { pageId, expectedRevision, fencingToken, version })`. Sa `ContentPage.revision` protège les écritures ; `headVersion` et `selectedVersion` décrivent autre chose. G1 doit :

1. Faire porter `target.version` sur la révision attendue, et figer les versions de contenu et le jeton d'édition dans `payload`.
2. Vérifier les permissions S11 dans l'adaptateur et réutiliser son verrou de page, sa réservation et sa protection d'expérience. Ne pas contourner `ContentService` par une mise à jour SQL du contenu.
3. Convertir les refus métier S11 en `OperationError` avec le code pertinent, afin de conserver le refus dans le dossier et de revenir à `awaiting_approval` avant effet.
4. Enregistrer la modification S11, la réussite de l'opération et sa sortie durable dans la transaction S12. Prouver le rollback des trois et leur persistance après interruption.
5. Créer une page réelle avec un bloc produit S10, appliquer une proposition approuvée et relire la nouvelle version, le produit référencé et l'événement durable.

Ces signatures ont été lues pendant des travaux parallèles. Les revérifier sur la livraison finale S11. Aucun fichier de S11 ou S10 n'est copié dans S12, et leur démonstration combinée n'a pas été exécutée.

Les mutations commerciales restent refusées par S12. Une intégration future doit apporter la comparaison de révision et la couverture des mutations natives avant d'autoriser un adaptateur commercial.

## Appels et permissions

| Permission | API administrative |
|---|---|
| `ReadOperations` | `operationDossiers`, `operationConnections`, `operationBudget` |
| `ProposeOperations` | `proposeOperation` |
| `ApplyOperations` | Capacité d'un adaptateur S12 ; aucune mutation native Vendure n'est ouverte par cette permission |
| `ApproveOperations` | `approveOperation` |
| `ExecuteOperations` | `executeOperation` |
| `ManageOperations` | `configureOperationConnection`, `configureOperationBudget`, `grantOperationDelegation`, `revokeOperationDelegation` |

Une proposition contient `target`, `proposalVersion`, `changeRef`, `capability`, `effectKey`, `payload`, `connectionId`, `budgetId` et `costCeiling`. Le serveur refuse les propriétés supplémentaires. L'acteur, les permissions, le marché et la politique viennent du serveur. Un agent appelle avec une identité Vendure authentifiée et un `delegationId` qui lui est lié.

La V1 expose un effet par dossier. La contrainte `s12_operation.action_id UNIQUE` matérialise ce choix. Le contrat commun reste capable de représenter plusieurs opérations ; une orchestration produisant des résultats partiels n'est pas exposée par ce lot. Un effet acquis n'est jamais rejoué pour changer une proposition. Le réemploi d'une clé métier avec un contenu différent est refusé.

L'approbation est explicite et expire au plus tard après 24 heures. Une délégation ne dispense pas de cette approbation humaine dans cette V1. Sa durée maximale est aussi de 24 heures. Les droits du proposant et de l'approbateur, la délégation et la politique sont relus à la prise de travail.

L'octroi d'une délégation enregistre durablement un compte d'agent dédié. Ce compte doit se limiter à `Authenticated`, `ReadOperations`, `ProposeOperations` et `ApplyOperations`. Une permission native d'écriture ou d'administration interdit l'octroi. L'agent ne peut omettre sa délégation pour se présenter comme membre, ni approuver, exécuter depuis l'API ou gérer les autorisations. Les opérations préparées avant sa conversion en agent sont invalidées. Ses droits sont contrôlés de nouveau avant effet ; ne pas lui ajouter des permissions natives lors du raccordement S11. Une adaptation donnant aux agents l'accès aux écritures de contenu attend une protection cohérente des routes natives en G1.

## Worker et événements

`OperationsService.execute(actionId)` est le point d'entrée serveur du worker. La route administrative vérifie aussi `ExecuteOperations` et le canal. Une prise de travail expirée ne permet pas de retransmettre : la reprise recherche le résultat avec la clé existante. Si le fournisseur ne peut pas le retrouver, le dossier reste incertain. Cette lecture de rapprochement reste possible après expiration de l'approbation ; elle ne crée aucun nouvel effet.

Le module ne lance pas de boucle permanente ni de planificateur. G1 doit raccorder le déclenchement du worker et sa cadence au lanceur commun, sans nouvelle opération ni nouvelle réservation lors d'une reprise. `infra/tests/s12/server.cjs --execute` démontre l'exécution dans un vrai processus séparé.

`appendEvent(manager, event)` exige une transaction active. `deliverOne(deliver)` prend une sortie avec verrou et jeton, appelle le destinataire hors transaction, puis inscrit l'accusé. Une interruption laisse la sortie disponible après expiration de la prise de travail. La remise est au moins une fois.

`receiveEvent(manager, shopId, consumer, event)` inscrit la réception et la projection dans la même transaction. Chaque consommateur doit fournir un identifiant stable, un contrôle de provenance authentifiée côté serveur, le schéma de sa charge utile et sa logique de projection. L'enveloppe seule ne prouve pas l'authenticité d'un fournisseur. Aucun endpoint public de réception n'est créé par S12.

Les événements `operations.proposed`, `operations.approved`, `operations.blocked`, `operations.dispatched`, `operations.succeeded`, `operations.uncertain` et `operations.reconciled` ont `payloadVersion: 1` et la charge `{ actionId, state }`. La séquence est la révision du dossier. Ils portent une référence ; le lecteur autorisé recharge le dossier pour obtenir son détail.

La réception déduplique par consommateur, boutique, type/module de source, compte et clé source. Un contenu différent sur la même clé est mis en conflit. Une séquence ancienne reste tracée sans rétrogradation. Un trou de séquence ou une source sans séquence attend un rapprochement vers une référence fiable. Les écritures d'un rapprochement qui ne fournit pas de séquence suffisante sont annulées.

## Connexions et budgets

Seul l'environnement `simulation` est accepté. `LocalMailTransport` exige une origine HTTP `127.0.0.1`, interdit les redirections et n'utilise aucun SMTP. Le récepteur de test persiste le message et le reçu dans PostgreSQL avant de répondre. Les preuves `local-mail:` indiquent une réception locale, sans preuve de livraison dans une boîte réelle.

`operationConnections` retire `secretRef`. Aucun secret fournisseur n'est stocké dans les fixtures. Les quotas inconnus, épuisés, anciens de plus de cinq minutes ou dont l'échéance est dépassée bloquent une première transmission.

Les budgets utilisent des périodes mensuelles UTC. La lecture du disponible soustrait toutes les réserves encore ouvertes, même celles des périodes précédentes. Le rapprochement impute le coût à sa période d'origine. Un dépassement du plafond de l'opération conserve le reçu entier, marque l'incident dans le dossier et bloque le budget. Aucune API de déblocage automatique n'est fournie.

## Contrats et génération

La source unique reste `packages/contracts/contracts.schema.json`. Le serveur utilise les validateurs autonomes et les types générés sous `operations/generated/`. Le validateur conserve les conditions du schéma ; les types TS décrivent la forme des propriétés. Les règles transactionnelles sont vérifiées par les services et les tests.

Outils isolés, sans modification du lockfile partagé :

```sh
npm install --prefix .data/s12-codegen --package-lock=false --save-exact --no-audit --no-fund ajv@8.17.1 ajv-formats@3.0.1 json-schema-to-typescript@15.0.4
node infra/tests/s12/generate-contracts.mjs --check
```

La génération utilise aussi `esbuild`, déjà présent dans le lockfile G0 via Vite. G1 pourra centraliser ce script dans `packages/contracts` et déclarer ses dépendances de développement. Les validateurs livrés n'ajoutent aucune dépendance d'exécution et portent le condensat du schéma. Les licences des fonctions embarquées sont conservées dans `generated/LICENSES.txt`.

## Références vérifiées

Les signatures effectives ont été vérifiées dans les paquets installés Vendure 3.8.0 et TypeORM 0.3.31. La documentation actuelle peut présenter une version plus récente : [TransactionalConnection](https://docs.vendure.io/current/framework/reference/typescript-api/data-access/transactional-connection), [génération autonome Ajv](https://ajv.js.org/standalone.html). Les tests locaux restent la preuve pour les versions verrouillées du projet.
