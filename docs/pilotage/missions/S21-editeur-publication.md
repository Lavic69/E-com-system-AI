# S21 Éditeur, aperçu et publication locale

État : fiche préparée en G1, non lancée. Session B, branche prévue `feat/s21-publication`. Attendre la base G1 commitée et intégrée. La réalisation reste soumise à une instruction de Victor.

## Résultat attendu

Le marchand prépare une boutique depuis des pages et thèmes versionnés, compare un aperçu rendu, publie un artefact local identifié et revient à une version précédente. Les commandes et paiements ne changent pas lors d'un retour arrière.

## Entrées et chemins

Lire `AGENTS.md`, le plan, G1, S01, S11, S12, `ContentVersion`, `EditLease`, `Publication` et SC04/SC05. L'aperçu privé S11 et sa version `local-preview-1` ne sont pas un site publié.

Écritures propres : `apps/commerce/src/plugins/publication/`, `apps/dashboard/src/extensions/publication/`, `apps/storefront/`, `infra/tests/s21/`, `docs/livraisons/S21/`. Les modifications nécessaires au service S11, aux registres, dépendances, contrats et migrations sont proposées à l'intégrateur. Ne pas modifier checkout ou mesure.

## Jalons du lot

1. Édition structurée et rendu réel : réutiliser pages/versions/baux S11, les références du catalogue S10 et les contrôles de droits. Définir le premier thème et son identité de version, sans copier prix et stock dans le contenu. Vérifier le rendu privé et l'absence d'accès public aux brouillons.
2. Navigation, blog, médias et thèmes : édition cohérente, traductions et liens contrôlés. Conserver une seule source pour chaque version. Prévoir la connexion aux API S20 sans simuler un achat comme une réussite intégrée.
3. Publication locale et retour arrière : construire un artefact immuable, vérifier la sélection et sa révision avant bascule, puis enregistrer preuve et événement durable. Provoquer un échec de construction et une interruption avant/après bascule ; le pointeur publié doit rester cohérent.
4. Cache : clés partitionnées suivant S02, deux marchés et deux versions effectivement rendus ; aucun prix, contenu privé ou expérience d'un autre contexte. Le retour arrière ne réécrit ni contenu historique ni données commerciales.
5. Édition conversationnelle : une proposition versionnée, un diff compréhensible, une approbation liée au contenu exact et application contrôlée. Un accès de modèle absent ou payant doit être identifié avant appel ; une sortie simulée n'est pas une intégration fournisseur.
6. Édition de code isolée : définir puis éprouver l'environnement d'exécution et ses limites avant de permettre du code libre. Le code proposé ne doit accéder ni aux secrets ni aux bases de production. Aucun simple éditeur de texte ne clôt ce jalon.

Ces jalons sont ordonnés. Si leur ampleur nécessite plusieurs sous-lots, les inscrire dans la livraison avec les mêmes limites d'écriture et preuves, avant leur réalisation. Ne pas supprimer les deux derniers jalons de la portée sous prétexte de livrer le premier rendu.

## Recette et livraison

Prévoir `.data/v2-s21-b/`, API 4102, administration 5102, storefront local 3102 et PostgreSQL 5542, après contrôle et préparation par l'intégrateur. Vérifier les états et interactions dans Responsively, en particulier 1440×900, 1024×768, 390×844 et 360×800.

Prouver conflit de version, bail expiré, référence supprimée, refus de publication, absence de cache croisé, rollback d'artefact et conservation des commandes. S51 n'existe pas : conserver son point de protection et identifier sa simulation. G2 réunit le storefront, le checkout S20 et la mesure S22.

Livrer `RESULTAT.md`, les manifests d'artefacts locaux, migrations, tests et raccordements. Aucun domaine public, déploiement ou modèle payant sans autorisation propre. Ne pas lancer S31/S41.
