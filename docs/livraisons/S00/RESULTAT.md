# Livraison S00 : socle technique

Travail local du 20 octobre 2026 dans `/Users/lavic/Desktop/Amboras REA/E-com-system-AI`.
Base de départ : dépôt sans commit, documentation et banc expérimental existants.

**Le socle est réalisé. La recette graphique a été exécutée pendant la reprise G0** : [rapport Responsively](../G0/RECETTE_RESPONSIVELY.md). Les tableaux et limites de vérification ci-dessous décrivent la livraison S00 d'origine ; G0 apporte la correction du lanceur et les preuves actuelles.

Suite G0 : le lanceur a reçu une correction de surveillance des services et de nouveaux tests de panne. Les commandes prennent désormais un identifiant de mission pour V1. Les rapports ci-dessous sont les preuves historiques de S00 ; la [livraison G0](../G0/RESULTAT.md) référence les vérifications du code actuel. Ne pas utiliser les anciennes empreintes comme preuve de la version modifiée.

## Résultat livré

- Monorepo npm avec serveur Vendure 3.8.0 et administration React officielle.
- Configuration locale PostgreSQL, médias et secrets distincts pour A, B et C.
- Commande unique de développement, worker SQL séparé et arrêt des processus appartenant à la session.
- Migration initiale explicite, sans synchronisation automatique du schéma.
- Plugin technique avec permission `ReadPlatformFoundation`, requête GraphQL protégée, page et entrée de navigation.
- Sauvegarde physique à froid et restauration vers une session vide, sans écrasement des données existantes.
- Tests de permissions, CSRF, séparation des sessions, persistance et cycle de vie.

Les commandes et les ports sont décrits dans [le guide local](../../../infra/dev/README.md).
L'application métier, le checkout, les agents et les contrats S02 ne sont pas implémentés dans ce lot.

## Vérifications

Les résultats définitifs et leurs empreintes sont dans [le rapport d'intégration](preuves/integration.json).
Le [contrôle de démarrage](preuves/demarrage.json) distingue explicitement disponibilité HTTP et rendu navigateur.
La suite finale comprend 2 tests de configuration et 14 scénarios d'intégration réussis.
Le [contrôle final](preuves/controle-final.json) confirme les empreintes, l'arrêt des services et la vérification des secrets locaux dans les sources et le bundle.

| Contrôle | État |
|---|---|
| Installation depuis le lockfile | Réussie avec `npm ci` |
| TypeScript strict, serveur et Dashboard | Réussi |
| Compilation du serveur et du Dashboard | Réussie ; extension découverte par le plugin officiel |
| Migrations sur base vide puis second passage | Réussi |
| Authentification et permission serveur | Réussi, cas autorisés et refusés |
| Requête sans précontrôle CSRF | Refusée comme attendu |
| Deux sessions actives indépendantes | Réussi : bases, comptes, médias et ports |
| Sauvegarde active / restauration sur données existantes | Refusées comme attendu |
| Restauration et relecture API | Réussie : produit, médias, migration et droits |
| Arrêt du lanceur par signaux répétés | Réussi avec SIGTERM et SIGINT ; Ctrl+C via npm également vérifié |
| Accès HTTP au fichier d'identifiants via Vite | Refusé avec HTTP 403 |
| Rendu, navigation, clavier et formats Responsively | Non testés, accès graphique refusé |

Le premier essai de restauration a détecté une copie incorrecte dans le répertoire de médias déjà créé. La copie a été corrigée ; le scénario complet est passé ensuite. Le test au clavier du lanceur a révélé un verrou résiduel lié au gestionnaire de signaux de PostgreSQL embarqué, puis aux interruptions répétées de npm. PostgreSQL est maintenant supervisé dans un processus séparé, arrêté après l'API et le worker. Le lanceur accepte les interruptions répétées pendant son nettoyage ; deux scénarios automatisés couvrent cet arrêt.

Tous les services S00 démarrés pendant cette mission sont arrêtés. Les ports A sont libres, le verrou de session et le fichier PID PostgreSQL ont disparu. Les bases synthétiques, sauvegardes et diagnostics restent sous `.data/`, hors Git.

## Limites réelles

- La page React compile et son API est vérifiée. Son exécution dans un navigateur et ses états visuels ne sont pas encore démontrés.
- CUA refuse ResponsivelyApp et Chrome ; aucune autre méthode n'a servi à contourner ces refus. La [recette à reprendre](RECETTE_UI.md) précise les étapes et dimensions.
- Le worker démarre avec une file SQL. Les tâches périodiques et la reprise après crash ne sont pas vérifiées ; aucun planificateur périodique n'est configuré.
- Le pilote `pg` 8.23.1 émet l'avertissement de requêtes concurrentes déjà observé dans le banc. Les scénarios passent ; cet avertissement reste à traiter avant une montée majeure du pilote.
- Le build du Dashboard signale un gros fragment JavaScript provenant de l'administration native. Aucune mesure de performance utilisateur n'a été effectuée.
- La sauvegarde vérifiée est locale, physique et à froid, sur le même environnement PostgreSQL. Aucun fournisseur, paiement réel, hébergement, crash transactionnel ou scénario de production n'est couvert.
- La première migration contient une méthode inverse générée ; son exécution inverse n'a pas été testée.

## Fichiers et raccordements

État S00 à examiner pour un futur commit initial :

```text
.npmrc
.nvmrc
package.json
package-lock.json
apps/commerce/package.json
apps/commerce/tsconfig.json
apps/commerce/src/
apps/dashboard/package.json
apps/dashboard/tsconfig.json
apps/dashboard/vite.config.mts
apps/dashboard/src/
apps/storefront/README.md
infra/dev/
docs/livraisons/S00/
```

Les bases, secrets, caches, dépendances, builds et fiches locales de coordination sont ignorés par Git. Aucun `git add`, commit, push, déploiement ou envoi externe n'a été effectué.

L'intégrateur reprend le registre `apps/commerce/src/plugins/index.ts`, la configuration racine, le lockfile et l'ordre des migrations. Les propositions de S01 et S02 restent à réconcilier en G0, sur demande de Victor. Il actualisera alors le README racine et l'état global, qui décrivent encore la préparation initiale. Le plan global et les documents produit n'ont pas été modifiés.

## Méthode et décisions

`karpathy-guidelines` a guidé le périmètre ; `evidence-driven-testing` les preuves réelles ; `interface-design` la reprise des composants natifs ; `diagnosing-bugs` les incompatibilités de dépendances et l'arrêt du lanceur. La relecture rédactionnelle suit `unslop`.

Le lockfile a dû être reconstruit pour que l'override `react-hook-form` soit effectivement appliqué. Le contrôle TypeScript passe avec la version 7.71.0, sans filtrer les erreurs de dépendances. React Query est aligné sur 5.104.5 dans Vendure et l'extension, afin de partager un seul contexte.

La direction graphique métier appartient toujours à S01. S00 ne la remplace pas et ne marque pas G0 comme acquis.
