# Décisions G1

10 novembre 2026. Périmètre local S10, S11 et S12.

## Composition et migrations

`vendure-config.ts` compose le socle, le catalogue, le contenu, les opérations et leur raccordement. `foundation-config.ts` conserve une configuration G0 explicite pour les recettes isolées et la montée de version. Les extensions Dashboard sont découvertes dans leurs plugins, sans deuxième déclaration de routes.

L'ordre appliqué par TypeORM suit les timestamps :

1. `InitialSchema1792513149156`.
2. `Operations1792513200000`.
3. `CatalogueS101794309752560`.
4. `ContentPages1794355200000`.
5. `PlatformActionProjection1794390000000`.

S12 précède S10/S11 car sa migration ne dépend d'aucune de leurs tables. La projection G1 dépend du journal S12. `synchronize` reste désactivé. Une copie froide de G0 remplie et une restauration de G1 rempli ont été exécutées.

## Identité, marchés et permissions

La session génère un `shopId` opaque, conservé lors d'une restauration même si la base est renommée. Pour une ancienne session sans ce champ, le format `local:<database>` reste reconnu et la restauration le fige. Cette identité locale ne constitue pas une architecture multi-boutiques de production.

Chaque marché est dérivé du canal Vendure effectivement chargé, avec `marketId = vendure-channel:<id>`, ses langues et les devises EUR/USD prises en charge. Le serveur reconstruit le contexte depuis l'acteur authentifié. Le canal principal reste transversal ; les canaux ne séparent pas des marchands.

La seule cible enregistrée dans la configuration commune G1 est `content-page`, capacité `content.save`. Elle exige `EditContent`, `ProposeOperations`, une approbation humaine et le bail du proposant. Les agents dédiés n'obtiennent pas de droit natif d'édition ; leur délégation vers cette capacité est refusée. Les cibles commerciales restent refusées par S12.

## Page, action et événement

`target.version` correspond à la révision de la page. Le payload fige `headVersion`, `fencingToken`, `document` et `validate`. Une action locale exige coût nul, aucune connexion et aucun budget.

L'adaptateur initialise ses services par l'Injector public Vendure. Il vérifie le gestionnaire transactionnel, puis appelle les méthodes S11 avec le même contexte transactionnel. Le service S11 conserve le contrôle des permissions, références, bail, révision et protection d'expérience. Les refus connus deviennent des erreurs d'opération ; les erreurs inattendues annulent la transaction.

La nouvelle version, la réussite de l'action et `operations.succeeded` sont commités ensemble. Une erreur SQL après l'écriture de la page ou un `SIGKILL` avant commit ne conserve aucune version partielle. Une mutation native postérieure à l'approbation produit `TARGET_VERSION_CHANGED`, conserve l'historique de l'approbation et exige une nouvelle proposition.

La canonisation accepte désormais les objets JSON à prototype nul produits par GraphQL pour ses littéraux. Les octets et condensats des mêmes valeurs restent identiques. Les accesseurs, prototypes personnalisés, propriétés cachées, nombres et chaînes ambiguës restent refusés.

## Worker et réception locale

Le worker commun recherche au plus 25 actions `queued` par passage, toutes les secondes. Les prises concurrentes sont protégées par les verrous S12. G1 n'enregistre que des effets transactionnels de contenu : un crash avant commit laisse l'action en file, un commit empêche son rejeu.

Le même worker remet au plus 100 événements par passage au consommateur `platform-action-journal-v1`. Il vérifie leur présence et leur condensat dans le journal de sortie local avant réception. Réception et projection partagent une transaction ; les doublons n'ajoutent pas de deuxième projection. Un trou de séquence se rapproche du dossier autoritaire. L'arrêt attend le traitement actif.

Aucun endpoint public de réception ni transport externe n'est activé. Le transport email local, les réservations de budget et le rapprochement fournisseur sont vérifiés par les tests S12 isolés. Un futur connecteur doit fournir son adaptateur, ses preuves et sa cadence de rapprochement avant activation. Le polling G1 ne remplace pas un planificateur général.

## Administration

Le thème clair utilise les variables publiques Vendure avec les couleurs S01. Le compte choisit sa langue et son thème dans les préférences natives ; Vendure 3.8.0 conserve initialement `en` et `system` dans ses réglages de compte malgré le défaut i18n configuré. La recette a sélectionné français et clair, puis vérifié leur persistance.

Le dossier d'action affiche « Page » avec son identifiant, les refus métier de contenu et un lien vers la page et son historique. Aucun lien vers une publication publique n'est ajouté. Le rendu et la navigation natifs restent en place.
