# S11 Pages, versions et réservation d'édition

État : prête, non lancée. Session B, branche prévue `feat/s11-pages`. Vérifier le commit G0 et son SHA selon le plan. La mission commence uniquement sur instruction de Victor, depuis le même SHA G0 que S10 et S12.

## Résultat attendu

Un membre crée une page structurée, prépare une nouvelle version et retrouve son historique. Deux éditeurs ne peuvent pas écraser silencieusement leurs modifications.

## Entrées

- `AGENTS.md`, le plan, `COORDINATION.md` et les décisions G0.
- `packages/contracts` et les invariants S02 : `ContentVersion`, `EditLease`, `Publication`.
- S01 : états, comparaison et distinction approbation/application/publication.
- Recettes SC04/SC05, avec les garanties de publication et d'expérience réservées à leurs lots.

## Périmètre exclusif

- `apps/commerce/src/plugins/content/`.
- `apps/dashboard/src/extensions/content/`.
- `infra/tests/s11/` et `docs/livraisons/S11/`.

Ne pas modifier le registre, les dépendances communes, le schéma partagé, le thème racine ou les migrations globales. Aucun travail dans `apps/storefront/` à cette étape. Les migrations candidates restent dans le plugin, puis sont ordonnées par l'intégrateur.

## Travail et preuve

1. Relever branche, SHA et état Git. Préparer B avec `npm run dev:prepare -- --mission=S11 --session=B`, après vérification de la disponibilité du port 5102.
2. Définir les blocs minimums utiles au premier jalon : texte, média et référence produit. Valider leur structure côté serveur ; ne pas copier les prix ou stocks dans les pages.
3. Persister page, brouillon, version immuable, lien au parent et révision. Une modification crée une version ; elle ne réécrit pas une version validée.
4. Fournir liste, détail, historique et aperçu local du contenu. Un aperçu ne vaut ni artefact publié ni site de vente fonctionnel.
5. Implémenter la réservation d'édition avec jeton croissant, expiration et comparaison atomique. Tester deux écritures concurrentes, renouvellement et refus d'un ancien détenteur.
6. Enregistrer la sélection d'une version destinée à la publication. La publication d'un artefact construit, le retour arrière du site et le cache rendu appartiennent à S21.
7. Définir le raccordement au futur registre d'expériences ; une fixture protégée vérifie le refus d'édition sans prétendre que S51 existe.

Recettes minimales : création/relecture après redémarrage ; historique inchangé après nouvelle version ; conflit de révision ; bail expiré puis repris ; ancien jeton refusé ; référence produit absente ; accès hors canal ; lecture seule refusée sur mutation ; affichage des états et navigation clavier dans Responsively.

Les tests propres utilisent une configuration Vendure composée dans `infra/tests/s11/`, une base jetable et des ports libres. Développement : `.data/v1-s11-b/`, ports 4102/5102/3102 réservé/5542.

## Livraison et G1

Fournir le plugin, l'extension, les migrations candidates, tests et `docs/livraisons/S11/RESULTAT.md`, avec base, branche, commits et état du push.

Le raccordement aux vrais produits S10 et au journal d'actions S12 sera démontré en G1. Les dépendances simulées sont listées comme telles. Ne pas développer l'éditeur conversationnel, l'exécution de code, la génération SEO ou S21.
