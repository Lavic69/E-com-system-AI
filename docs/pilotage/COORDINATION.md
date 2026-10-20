# Coordination des sessions

Ce protocole s'applique au [plan d'exécution](PLAN_EXECUTION.md). Il vise deux ou trois sessions actives, avec une seule personne ou session responsable de l'intégration.

## 1. Rôles

La session A réalise son lot, puis devient l'intégrateur au point G de la vague. Les sessions B et C livrent leurs changements et leurs preuves avant cette intégration. Le coordinateur n'est pas une quatrième session qui modifie simultanément la base.

Chaque session est responsable de ses tests locaux, de sa relecture et de son compte rendu. L'intégrateur est responsable du fonctionnement combiné, de l'ordre des migrations, de la base suivante et du statut global.

## 2. Avant le premier commit

Le dépôt a été fourni vide. Les missions S00, S01 et S02 peuvent démarrer dans le même checkout parce que leurs écritures sont disjointes :

- S00 : fichiers techniques du socle et `docs/livraisons/S00/`.
- S01 : `docs/livraisons/S01/`.
- S02 : `docs/livraisons/S02/`.

Les documents produit, le plan, les missions et `experiments/core-validation` sont lus sans modification par ces sessions. Un besoin de correction est décrit dans la livraison.

Les sessions ne lancent pas de `git add .`, ne changent pas les branches du checkout partagé et ne créent pas de commit regroupant le travail d'une autre session.

Les worktrees de développement attendent un commit de référence réel. La demande de découpage n'autorise pas ce commit ni un push. La question du commit initial est posée après préparation d'un état concret et d'une liste explicite de fichiers, conformément à la règle de Victor sur les commits.

## 3. Après G0

Chaque lot de code part du SHA enregistré au point d'intégration précédent, dans un worktree propre. Vérifier le répertoire, la branche ou le HEAD détaché, le SHA de base et les modifications présentes avant d'agir.

Le gestionnaire de worktrees natif de Codex est à privilégier. Dans un nouveau chat, sélectionner **Worktree**, puis la branche de départ contenant la base vérifiée. Le mode peut utiliser un HEAD détaché : vérifier l'état effectif. [Documentation officielle](https://learn.chatgpt.com/docs/environments/git-worktrees)

Créer les worktrees suivants depuis la base intégrée, jamais depuis la branche encore incomplète d'une autre mission. Réutiliser le worktree existant pour continuer le même lot.

Les bases et secrets ne sont pas automatiquement recopiés entre worktrees. Un script d'environnement peut préparer les dépendances et ressources propres à une session ; son contenu doit rester explicite. [Environnements locaux Codex](https://learn.chatgpt.com/docs/environments/local-environment)

### Branches, commits, push et intégration

- `main` contient la base commune revue. Pour V0, les trois livraisons sont dans le même checkout sans historique : préparer un seul commit initial cohérent, sans inventer trois branches rétroactives.
- Après G0, utiliser `feat/s10-catalogue`, `feat/s11-pages` et `feat/s12-operations`, depuis le même SHA intégré. Une mission poursuivie conserve sa branche et son worktree.
- Avant un commit, relire le diff et ajouter explicitement les seuls fichiers du lot. Indiquer le SHA de départ, le ou les commits, les tests et les raccordements dans `RESULTAT.md`.
- Un commit local, un push de branche, une PR, une fusion et un push de `main` sont des actions distinctes. Réutiliser les autorisations déjà données ; ne pas interpréter un push de mission comme une autorisation de fusion dans `main`.
- Pour G1, créer `integration/g1` depuis la base commune, puis y réunir les trois missions livrées avec les autorisations correspondantes. Raccorder les fichiers communs, ordonner les migrations et tester le parcours combiné.
- Présenter une PR de `integration/g1` vers `main`, avec les SHA des trois lots, les preuves et les limites. Vérifier les contrôles du commit exact à fusionner. Une modification ultérieure exige de rejouer les contrôles affectés.
- Après fusion et push autorisés, vérifier le SHA distant de `main` et sa correspondance avec l'état intégré. C'est cette base qui sert à la vague suivante.
- Ne supprimer une branche ou un worktree qu'après vérification de sa fusion, de son état propre et de l'absence de travail non transféré. Ne pas forcer un push ni effacer une branche pour résoudre un conflit ordinaire.

Chaque livraison comporte ces champs : `branche`, `base_sha`, `commits`, `push` (non effectué ou SHA distant vérifié), `destination_integration`, `tests`, `raccordements`, `limites`. Un HEAD détaché doit être rattaché à une branche nommée avant un push.

Tant que le dépôt distant est vide, aucune PR vers `main` n'est possible. La première publication crée cette branche après revue du contenu. Prévoir ensuite une règle GitHub imposant la revue et les contrôles utiles, sur autorisation de configuration du dépôt. Aucun ruleset ni workflow CI n'est prétendu installé par G0.

## 4. Fichiers partagés et propriétaires

| Surface | Propriétaire |
|---|---|
| Manifestes racine, verrouillage de dépendances, versions communes, configuration des workspaces | Intégrateur |
| Configuration Vendure, registre de plugins, entrée serveur et worker | Intégrateur |
| Navigation commune, routes racine, fournisseurs de contexte et thème commun | Intégrateur après proposition de la session interface |
| Contrats communs, enveloppes d'événements, erreurs et types partagés | Intégrateur après revue de la demande |
| Ordre global des migrations et configuration d'installation | Intégrateur |
| Module métier, son extension d'interface, tests et documentation du lot | Session affectée à ce module |
| Plan global et état des lots | Intégrateur |
| Compte rendu `docs/livraisons/Sxx/` | Session Sxx |

Le périmètre d'un lot doit être un sous-dossier précis. « Tout `packages/marketing` » ou « tout `apps/storefront` » n'est pas une attribution acceptable si d'autres lots y travaillent.

Chaque module peut fournir sa migration et sa proposition de raccordement. L'intégrateur vérifie les conflits de schéma, numérote/ordonne les migrations et teste leur application combinée. Une session ne génère jamais de migration sur une base utilisée par une autre.

Une session qui a besoin d'une dépendance commune ou d'une modification de contrat fournit une demande avec le changement, la raison et les appelants affectés. Elle continue les travaux indépendants. Elle ne contourne pas le conflit par un deuxième schéma concurrent.

Les extensions sont vérifiées dans une configuration de test propre au module. Le raccordement à l'application complète est vérifié au point d'intégration.

## 5. Ressources locales

Les valeurs suivantes sont des plages proposées. S00 les vérifie et documente les valeurs effectivement choisies.

| Session | API | Administration | Site de vente réservé | PostgreSQL |
|---|---:|---:|---:|---:|
| A | 4101 | 5101 | 3101 | 5541 |
| B | 4102 | 5102 | 3102 | 5542 |
| C | 4103 | 5103 | 3103 | 5543 |

Chaque session possède sa base ou son instance PostgreSQL, son stockage de médias, ses fichiers temporaires, son worker et ses sorties de test. Leur nom inclut la vague et le lot. Les essais automatisés peuvent choisir des ports libres.

Pour V1, les identifiants sont `v1-s10-a`, `v1-s11-b` et `v1-s12-c`. Les commandes S00 acceptent désormais `--mission=S10`, `--mission=S11` ou `--mission=S12` avec la session correspondante. Le prototype S01 occupe 5102 ; sa libération ou une réaffectation explicite précède le démarrage de S11.

Une ressource occupée n'est pas libérée en arrêtant un processus inconnu. La session choisit une autre ressource et l'indique.

Le coordinateur peut utiliser `.local-coordination/` dans le checkout principal pour partager les affectations locales. Ce dossier est ignoré par Git et ne contient aucun secret. Les sessions y publient uniquement leur propre fiche de ressources ; le coordinateur affecte les ressources communes.

## 6. Outils graphiques partagés

Responsively App et les outils qui pilotent une même fenêtre sont utilisés par une seule session à la fois. Le coordinateur attribue le créneau en indiquant le lot, l'URL locale et les appareils concernés.

Avant utilisation, la session confirme la fenêtre et l'URL. À la fin, elle signale la libération du créneau. Une autre session n'interagit pas avec cette fenêtre tant que le créneau n'est pas libéré.

Les tests API et les navigateurs de test réellement isolés peuvent fonctionner en parallèle. Une validation dans un autre navigateur ne remplace pas la vérification Responsively requise. Si le créneau ou l'accès manque, noter `Validation UI en attente` et continuer les vérifications indépendantes.

## 7. Compte rendu de livraison

Chaque lot remet `docs/livraisons/Sxx/RESULTAT.md` contenant :

- Le lot, le répertoire de travail et la base de départ.
- Les fonctionnalités réalisées et les critères non couverts.
- Les chemins modifiés et les raccordements requis.
- Les contrats, migrations et nouvelles dépendances.
- Les commandes de vérification, résultats et preuves.
- Les simulations, accès manquants et restrictions.
- L'état des serveurs/ressources lancés.
- Les commits déjà autorisés et créés, ou les changements non commités.

Une erreur reproductible est accompagnée de son scénario. Une absence d'accès est signalée comme telle. Les preuves sont rattachées au code testé et restent locales.

## 8. Revue et intégration

L'intégrateur examine les livraisons sans effacer le travail en cours. Les modifications sensibles reçoivent une revue distincte, avec des tests capables de contredire les hypothèses de l'implémentation.

L'intégration n'est pas automatique : elle intervient sur demande et dans les autorisations données. Un patch local ou un transfert de changements peut être préparé sans publication. Les commits, fusions Git et pushes conservent leur autorisation propre.

Après intégration, exécuter les tests concernés et la démonstration commune. Un lot ne devient `Intégré et vérifié` qu'après ce contrôle. Un succès local avec des dépendances simulées reste `Livré` jusque-là.

Si un contrat change pendant une vague, le coordinateur décrit l'impact, prévient les sessions concernées et indique la nouvelle base ou adaptation. Les sessions ne poursuivent pas silencieusement sur des versions incompatibles.

## 9. Deux sessions au lieu de trois

Les mêmes lots et critères restent valables. La troisième mission est prise par la première session disponible après clôture de son lot actif. En V0 : lancer S00 et S01, puis S02. G0 attend les trois livraisons.

Au fil du projet, le coordinateur privilégie la mission qui débloque le plus de dépendances, sans ouvrir deux lots d'écriture dans une même session.
