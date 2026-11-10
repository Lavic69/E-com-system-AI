# Raccordements S11 pour G1

## Registre, migration et dépendances

Ajouter `ContentPlugin` au registre serveur commun. Son champ `dashboard` désigne l'extension `apps/dashboard/src/extensions/content/index.tsx`. L'extension ajoute les routes `/content` et `/content/$id` dans la section « Boutique et contenu ». Aucun changement du thème racine n'est demandé ; les variables S01 sont limitées à l'espace de contenu.

La migration candidate est `apps/commerce/src/plugins/content/migrations/1794355200000-ContentPages.ts`. Elle ajoute `content_page`, `content_revision` et `content_lease_event`, ainsi qu'une fonction et deux triggers d'immuabilité. G1 ordonne cette migration avec celles de S10 et S12. Le test S11 l'applique à une base G0 déjà peuplée et vérifie la conservation du produit témoin. Son `down` supprime les données du module ; ne pas l'utiliser comme retour arrière d'un site publié.

Le code importe `GraphQLError` depuis `graphql`, déjà résolu en version **16.14.2** par le lockfile G0. G1 doit le déclarer explicitement dans les dépendances directes de `apps/commerce` ; S11 n'a pas modifié ce manifeste partagé. Aucun autre paquet applicatif n'est ajouté. Playwright est seulement un outil local de recette, à déclarer séparément si ces tests sont repris en CI.

## Permissions et contexte

| Permission | Opérations |
|---|---|
| `ReadContent` | Liste, détail, historique, aperçu |
| `EditContent` | Création, réservation, renouvellement, libération, sauvegarde et validation de structure |
| `SelectContent` | Sélection d'une version validée |

Un éditeur qui sélectionne des versions reçoit les trois permissions. `SelectContent` seul n'autorise pas à prendre la réservation d'un autre membre. Les permissions se vérifient dans les résolveurs et dans le service, sur le canal courant. Le serveur prend l'acteur dans `RequestContext.activeUserId` et le canal dans `RequestContext.channelId` ; ces valeurs ne sont jamais fournies par le formulaire.

## Catalogue S10

Les blocs produit stockent uniquement `productId`. Les blocs média stockent `assetId` et leur texte alternatif. Les références sont lues dans les entités natives Vendure, filtrées par canal. Un produit supprimé ou une référence absente empêche la sauvegarde et la sélection ; un ancien aperçu indique l'absence sans modifier l'historique.

Les tests utilisent de vrais produits et médias créés dans Vendure, mais pas les données ni les parcours de S10. G1 doit refaire création, édition et aperçu avec les produits S10, dans ses deux marchés réels. Les prix, stocks et traductions commerciales ne sont pas copiés dans les versions de page.

## Révisions, versions et contrats S02

`ContentPage.revision` est le compteur de comparaison pour les écritures et sélections. `headVersion` identifie le dernier contenu enregistré. `selectedVersion` est un pointeur indépendant vers une version validée ; une sauvegarde ultérieure ne le déplace pas. Une page est identifiée par canal, langue et adresse fixe.

Toutes les versions, y compris les brouillons enregistrés, sont immuables. Chaque sauvegarde crée un numéro croissant et son parent. Le document est canonisé en ordre de champs fixe avant SHA-256. La validation de structure et de références est datée, avec une référence de preuve liée au numéro de version. Elle ne vaut pas approbation d'une action S12.

Les entités et les réponses GraphQL sont des vues internes du module. Pour produire le format partagé `ContentVersion`, l'adaptateur G1 conserve le condensat et les preuves, convertit les numéros en chaînes et fournit le `Scope` depuis le vrai contexte boutique/marché de S10. Aucun `shopId` ou `marketId` fictif n'est enregistré dans le produit. `themeVersion = local-preview-1` décrit seulement le rendu de recette ; S21 devra fournir sa version de thème réelle.

La réservation couvre la page entière, dans sa langue, portée `/`. Son détenteur, son jeton et ses dates sont persistés sur `ContentPage`. L'état `active` ou `expired` se déduit de l'horloge PostgreSQL ; une libération retire le détenteur et l'expiration. Le journal append-only conserve acquisition, renouvellement et libération. L'adaptateur `EditLease` devra construire `leaseId`, `scope`, `target` et `holder` depuis ces données et le contexte intégré, sans exposer un format concurrent dans `packages/contracts`.

## Actions S12

`ContentService` est exporté par le plugin. `save()` et `select()` reçoivent la révision attendue et le jeton de réservation, puis verrouillent la page et comparent ces valeurs dans la transaction. G1 doit appeler ces méthodes depuis l'adaptateur de cible S12 avec le même `RequestContext` transactionnel, puis écrire son journal durable dans cette transaction. Ne pas remplacer cette étape par une notification EventBus.

L'approbation doit porter sur la version cible et la proposition exactes. Rejouer SC04 en modifiant la cible entre préparation et application : `TARGET_VERSION_CHANGED`, aucune nouvelle version, approbation invalidée par S12 et aucun effet externe. Les tests S11 prouvent le conflit et l'absence d'écrasement ; ils ne prouvent pas le cycle d'approbation S12.

## Expériences S51 et publication S21

`ContentProtection.assertEditable(ctx, page)` est appelé sous le verrou de page lors de l'acquisition, du renouvellement, de la sauvegarde et de la sélection. S51 devra fournir l'implémentation qui lit son registre durable et prendre **le même verrou de page** lors de l'activation, de l'arrêt ou de l'invalidation d'une expérience. Une erreur de lecture doit refuser la mutation. Le contrôle reste obligatoire après expiration du bail.

Le plugin seul utilise `noExperimentsYet`, adapté au périmètre actuel où aucun registre d'expériences n'existe. Il faut le remplacer dès l'intégration de S51. La configuration de recette fournit une protection SQL simulée uniquement sous `infra/tests/s11/` ; elle ne doit pas être copiée dans le registre de production.

S21 consommera la sélection validée et devra revérifier révision, références et protection avant publication. S11 ne crée aucun `Publication`, artefact public, retour arrière de site ou cache de rendu. L'aperçu reste privé dans l'Admin API. L'éditeur conversationnel, le code libre et le SEO sont hors de ce lot.
