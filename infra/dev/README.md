# Utiliser le socle local

Ces commandes s'exécutent à la racine de `E-com-system-AI`, avec Node 24.14.0 et npm 11.9.0. Le socle utilise Vendure 3.8.0 et PostgreSQL embarqué. Il ne requiert ni Docker, ni service PostgreSQL système, ni clé fournisseur.

## Première installation

```sh
npm ci
npm run dev:prepare -- --session=A
npm run typecheck
npm run build
npm run dev -- --session=A
```

`npm run dev` compile le serveur, démarre PostgreSQL, applique les migrations, puis démarre l'API, le worker et Vite. La commande reste au premier plan. `Ctrl+C` arrête ses services et conserve les données.

L'administration est accessible à `http://127.0.0.1:5101/dashboard/`. La page ajoutée par S00 est `http://127.0.0.1:5101/dashboard/platform-foundation`.

Les identifiants sont générés dans `.data/v0-s00-a/session.json`, avec des droits de fichier `600`. Consulter ce fichier localement pour se connecter ; ne pas le copier dans une conversation, un journal ou Git.

Depuis un second terminal :

```sh
npm run dev:check -- --session=A
```

Ce contrôle authentifie un appel API et vérifie les ressources HTTP du Dashboard. Il ne remplace pas le contrôle d'un parcours rendu dans un navigateur.

## Ressources par session

| Session | API | Administration | Site réservé | PostgreSQL | Données |
|---|---:|---:|---:|---:|---|
| A | 4101 | 5101 | 3101 | 5541 | `.data/v0-s00-a/` |
| B | 4102 | 5102 | 3102 | 5542 | `.data/v0-s00-b/` |
| C | 4103 | 5103 | 3103 | 5543 | `.data/v0-s00-c/` |

Le site de vente n'est pas démarré par S00. Le serveur écoute uniquement sur `127.0.0.1`. Une base PostgreSQL, un compte administrateur, des secrets, un répertoire de médias et des sauvegardes sont propres à chaque session.

Les caches Vite, la compilation temporaire Vendure et les types GraphQL sont sous `.cache/<outil>/<session>/`. Le Dashboard compilé est sous `apps/dashboard/dist/<session>/`. Après G0, les sessions de code auront aussi des worktrees distincts.

Pour V1, préparer la mission dans son worktree :

```sh
npm run dev:prepare -- --mission=S10 --session=A
npm run dev -- --mission=S10 --session=A
```

Les données sont alors sous `.data/v1-s10-a/`. S11 utilise B et S12 utilise C. Les commandes de contrôle, sauvegarde et restauration acceptent les mêmes arguments ; sans `--mission`, elles conservent S00. Les ports correspondent à la session et doivent être libres, y compris ceux du prototype S01 avant S11.

Le lanceur transmet le fichier de session à ses enfants. Pour compiler manuellement un Dashboard V1, sélectionner ce même fichier :

```sh
ECOM_SESSION_FILE="$PWD/.data/v1-s10-a/session.json" npm run build
```

Un port déjà occupé fait échouer le démarrage ; aucun processus inconnu n'est arrêté. Choisir une autre session disponible. Le fichier `running.lock` interdit deux lanceurs sur les mêmes données.

Après un arrêt forcé du système, un verrou peut rester. Vérifier le PID consigné et les ports avant toute intervention. Ne pas supprimer automatiquement un verrou d'une autre session.

## Paramètres

`ECOM_SESSION_FILE` permet aux outils de test de charger une configuration locale complète ; il est transmis automatiquement aux processus enfants. En son absence, le serveur et la compilation Dashboard utilisent la session A.

`ECOM_PROJECT_ROOT` est défini par Vite pendant l'introspection pour que le code temporairement compilé retrouve le dépôt. Les outils désactivent la télémétrie Vendure via `VENDURE_DISABLE_TELEMETRY=true`.

Ces paramètres sont destinés au développement local. Une configuration d'exploitation, des domaines, TLS et des secrets de production ne font pas partie de S00.

## Migrations

Le schéma est créé par `apps/commerce/src/migrations/1792513149156-InitialSchema.ts`, généré depuis la configuration Vendure retenue. `synchronize` reste désactivé.

Le lanceur applique les migrations avant de démarrer l'API. Le second passage ne modifie pas le schéma. Pour préparer une évolution future, utiliser une base de développement propre avec le schéma précédent, adapter la configuration puis lancer :

```sh
npm run dev -- --generate-migration
```

La commande génère un fichier, puis arrête PostgreSQL. L'intégrateur doit nommer, relire et ordonner les migrations avant leur application commune. Ne pas générer une migration sur une base d'une autre session.

## Sauvegarde et restauration de démonstration

Arrêter la session source avant la sauvegarde :

```sh
npm run db:backup -- --session=A
```

La commande affiche le chemin de la sauvegarde. Elle copie le cluster PostgreSQL arrêté, les médias et les paramètres locaux sous `.data/v0-s00-a/backups/`. Le manifeste est écrit en dernier.

Pour restaurer vers une session B encore vide :

```sh
npm run db:restore -- --session=B --from=/chemin/affiche/par/la/sauvegarde
npm run dev -- --session=B
```

Les comptes et mots de passe de la source sont conservés, avec les ports et répertoires de B. Le nom de la base est adapté à B. La restauration refuse une destination contenant déjà un cluster ou des médias.

Cette sauvegarde physique exige la même version du paquet PostgreSQL, le même système et la même architecture. Elle contient des secrets locaux et reste ignorée par Git. Elle démontre une restauration à froid de données synthétiques ; elle ne remplace pas une stratégie de sauvegarde de production, une migration entre plateformes ou une reprise après crash.

## Vérifications

```sh
npm run typecheck
npm run build
npm test
```

Les tests créent des données synthétiques isolées sous `.data/verification-*`, utilisent des ports libres et arrêtent leurs services. Ils vérifient les permissions par l'API réelle, le contrôle CSRF, l'indépendance des sessions, la migration, la restauration et l'arrêt du lanceur. Aucun prestataire externe n'est appelé.

Les tests du lanceur vérifient aussi une panne pendant le démarrage, un service déjà sorti, la perte de PostgreSQL et une sortie inattendue avec code zéro. La suite réelle provoque l'arrêt de l'API et du processus PostgreSQL qu'elle a elle-même démarrés ; le lanceur doit échouer, nettoyer ses processus et retirer son verrou. Les avertissements de connexion pendant cette panne sont attendus. La VM Node utilisée par les tests contrôlés émet un avertissement expérimental ; elle ne remplace pas ces essais réels.

Le résultat d'intégration est écrit par défaut dans `docs/livraisons/S00/preuves/integration.json`, avec les empreintes du code et du verrouillage testés. Pour conserver la preuve S00 et produire une livraison G0 :

```sh
ECOM_VERIFY_REPORT_DIR=docs/livraisons/G0/preuves npm test
npm run test:contracts
```

Le [paquet de contrats](../../packages/contracts/README.md) décrit le prérequis Python. Ses vérifications sont documentaires ; elles n'affirment aucune autorisation ou transaction applicative.

## Points d'extension

- `apps/commerce/src/plugins/index.ts` est le registre commun géré par l'intégrateur.
- `FoundationPlugin` déclare la permission serveur `ReadPlatformFoundation`, le resolver et le chemin de l'extension Dashboard.
- `apps/dashboard/src/extensions/foundation.tsx` utilise les exports publics de Vendure. La navigation masque l'entrée selon les droits ; le resolver protège réellement la lecture.
- Le worker utilise la file SQL de Vendure. Le planificateur périodique n'est pas encore configuré ; Vendure émet un avertissement explicite. La reprise après crash d'une tâche reste à traiter dans les lots concernés.
- `apps/storefront/` réserve le futur site Next.js. Il n'existe pas encore de checkout.

L'alignement de React Query évite deux contextes de requête entre Vendure et l'extension. `react-hook-form` est fixé à 7.71.0, version compatible avec les types de Vendure 3.8.0 vérifiés ici. Le contrôle TypeScript reste strict.

La configuration suit le [guide officiel Dashboard de Vendure 3.8.0](https://github.com/vendurehq/vendure/blob/v3.8.0/docs/docs/guides/extending-the-dashboard/getting-started/index.mdx) et les exports du paquet installé. Aucun composant interne n'est recopié.
