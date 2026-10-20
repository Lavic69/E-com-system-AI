# Raccordement proposé à Vendure

Revue documentaire du 20 octobre 2026. Le paquet `node_modules/@vendure/dashboard/package.json` du socle préparé par S00 indique la version 3.8.0. Inspection en lecture seule par S01.

La documentation publique consultée décrit les API actuelles. Elle ne prouve pas à elle seule que tous les exports sont présents dans la version installée par S00. Les éléments ci-dessous sont des candidats d'intégration. Aucun composant interne de Vendure n'est copié et aucune dépendance n'est ajoutée par cette revue.

## Vérification locale du paquet 3.8.0

L'entrée publique `@vendure/dashboard` pointe vers `src/lib/index.ts`. La lecture de cet index et des déclarations ciblées confirme les exports `Page`, `PageTitle`, `PageLayout`, `PageBlock`, `ListPage`, `DetailPageButton` et `defineDashboardExtension`. L'index réexporte aussi les modules publics des boutons, badges, cartes, champs, dialogues et panneaux.

Les déclarations de `DashboardNavSectionDefinition` et `DashboardPageBlockDefinition` sont présentes dans ce paquet. Les sections disposent d'un ordre et d'une condition de visibilité ; les blocs ciblent un emplacement et peuvent conditionner leur affichage. Ces constats portent sur les sources du paquet, pas sur une extension exécutée.

Fichiers inspectés sous `node_modules/@vendure/dashboard/` :

- `package.json` et `src/lib/index.ts` ;
- `src/lib/framework/layout-engine/page-layout.tsx` ;
- `src/lib/framework/page/list-page.tsx` ;
- `src/lib/components/shared/detail-page-button.tsx` ;
- `src/lib/framework/extension-api/define-dashboard-extension.ts` ;
- `src/lib/framework/extension-api/types/navigation.ts` et `layout.ts`.

## Réemploi et extensions

| Besoin S01 | Réemploi proposé | Partie propre au produit | Vérification à l'intégration |
|---|---|---|---|
| Structure de page | `Page`, `PageTitle`, `PageLayout`, `PageBlock` | Hiérarchie des contenus et dossier d'action | Exports publics et comportement aux quatre dimensions |
| File de travail | `ListPage` pour une ressource homogène ; composant de liste propre pour la file multi-objets | Priorisation des exceptions, sources et destinations | Ne pas forcer des objets hétérogènes dans un contrat de liste de commandes |
| Liste de commandes | Liste native et extensions de tableaux | Colonnes ou libellés utiles au contexte | Conserver filtres et choix de colonnes du membre |
| Fiche de commande | Route native et blocs existants | Présentation des trois états, résultat incertain et lien au dossier | Inspecter la fiche réelle ; étendre avant d'envisager son remplacement |
| Dossier SEO | Nouvelle page enregistrée dans une extension | Sources, comparaison, versions, coûts, approbation et suivi | Permissions, données et états à raccorder à S02 puis aux lots concernés |
| Navigation par activité | `navSections` et entrées de routes | Regroupement Commerce, Boutique, Croissance, Analyses | Faisabilité du déplacement des entrées natives ; aucune duplication silencieuse |
| Boutons, champs et liens de détail | Exports publics documentés de `Button`, `Input`, `Card`, `Badge`, `DetailPageButton` | Libellés et états métier | Contrôles clavier et styles dans la version retenue |
| Panneau assistant | Mise en page et contrôles publics disponibles | Contexte de l'objet, niveau d'autonomie et suivi | Panneau mobile et retour du focus ; aucun accès implicite à d'autres objets |
| Thème | Variables et configuration du plugin Vite documentées | Valeurs approuvées de S01 | Contrastes, héritage du thème et absence de CSS ciblant les internes |
| Historique | Points d'extension disponibles selon le socle | Références d'actions et preuves | Ordre, dates, pagination et permissions |

La file de travail et le dossier d'action demandent une logique propre au produit. La mise en page ne justifie pas de reconstruire la gestion des commandes.

## Points d'extension documentés

Les pages personnalisées se composent avec `Page`, `PageLayout` et `PageBlock`, puis s'enregistrent dans les routes de `defineDashboardExtension`. Les colonnes `main`, `side` et `full` permettent d'organiser le contenu. [Création de pages](https://github.com/vendurehq/vendure/blob/master/docs/docs/guides/extending-the-dashboard/creating-pages/index.mdx)

`pageBlocks` permet d'insérer un composant autour d'un bloc identifié, avec un emplacement principal ou secondaire. Les identifiants des blocs doivent être relevés dans le mode développeur de l'administration effectivement installée. Les propriétés de permission d'affichage ne remplacent pas une autorisation serveur. [Référence des blocs](https://docs.vendure.io/current/core/reference/dashboard/extensions-api/page-blocks)

Les formulaires de détail peuvent être enrichis par `detailForms`, notamment pour ajouter des données à la requête et remplacer des champs existants. Utiliser un bloc séparé pour les sources, coûts et résultats qui n'appartiennent pas au formulaire natif. [Personnalisation des fiches](https://docs.vendure.io/current/core/extending-the-dashboard/customizing-pages/customizing-detail-pages)

`navSections` définit des groupes de navigation, leur ordre et leur visibilité. Les routes peuvent fournir les entrées de ces sections. La réorganisation exhaustive des entrées natives n'est pas démontrée ici. [Navigation](https://docs.vendure.io/current/core/reference/dashboard/extensions-api/navigation)

Les extensions `dataTables` ciblent une page et un bloc. Elles proposent notamment des composants de cellules, des actions en masse et un enrichissement des données de liste. Les préférences enregistrées par un membre peuvent prévaloir sur les valeurs initiales. [Tableaux](https://docs.vendure.io/current/core/reference/dashboard/extensions-api/data-tables)

Le thème expose des variables pour les surfaces, textes, interactions, bordures, focus et typographies. Les valeurs S01 devront être traduites vers ces variables par l'intégrateur, dans la configuration du plugin. [Thème](https://docs.vendure.io/current/core/extending-the-dashboard/theming)

Les composants communs sont importés depuis le paquet public `@vendure/dashboard`. Les exemples de migration documentent notamment `Button`, `Badge`, `DetailPageButton` et les formats locaux. [Migration vers le Dashboard React](https://docs.vendure.io/current/core/extending-the-dashboard/migration), [composants et technologies](https://docs.vendure.io/current/core/extending-the-dashboard/tech-stack)

## Contrôles attendus de S00 et G0

1. Fournir la version réellement installée de `@vendure/dashboard` et une extension minimale exécutée.
2. Relever les identifiants de page et de blocs sur la commande réelle. Ne pas inventer un `blockId` à partir d'une capture.
3. Vérifier l'ajout d'un bloc, d'une route et d'un groupe de navigation avec les seuls exports publics.
4. Vérifier le refus côté serveur et l'affichage avec un membre autorisé puis non autorisé.
5. Tester une fiche ouverte par navigation puis directement par son URL. Vérifier que les données d'extension sont chargées dans les deux cas.
6. Examiner les mécanismes disponibles pour le thème et la navigation native. Documenter une limite plutôt que recopier une page interne.

Un problème d'enrichissement de requête sur les liens directs de commande est décrit dans une issue amont. Son état et son applicabilité à S00 restent à vérifier ; il justifie le scénario 5, pas l'affirmation que le socle est défectueux. [Issue Vendure 5159](https://github.com/vendurehq/vendure/issues/5159)

## Limites de cette proposition

S01 n'installe ni ne compile Vendure. Le paquet déjà installé par S00 a été inspecté en lecture seule. Les fichiers techniques, contrats GraphQL, permissions, migrations et chemins de routes appartiennent aux autres lots et à l'intégration. Les maquettes restent indépendantes du socle jusqu'à G0.
