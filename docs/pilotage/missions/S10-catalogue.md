# S10 Catalogue, membres et clients

État : prête, non lancée. Session A, branche prévue `feat/s10-catalogue`. Vérifier le commit G0 et son SHA selon le plan avant de créer le worktree. La mission commence uniquement sur instruction de Victor, depuis cette base commune.

## Résultat attendu

Un membre autorisé crée un produit et ses variantes, configure ses prix et son stock, puis un visiteur consulte les données du marché demandé. Les comptes et groupes clients restent ceux de Vendure.

## Entrées

- `AGENTS.md`, le plan et `COORDINATION.md`.
- `docs/livraisons/G0/DECISIONS.md`, `packages/contracts/README.md`.
- Cahier produit : catalogue, clients, marchés et stock ; règles d'interface S01.
- API publiques de Vendure 3.8.0 installé, puis documentation ciblée si nécessaire.

## Périmètre exclusif

- `apps/commerce/src/plugins/catalogue/`.
- `apps/dashboard/src/extensions/catalogue/`.
- `infra/tests/s10/` et `docs/livraisons/S10/`.

Le registre des plugins, les manifestes racine, le lockfile, les contrats communs, le thème et les migrations globales appartiennent à l'intégrateur. Décrire les raccordements requis dans la livraison. Ne pas modifier les dossiers S11/S12.

## Travail et preuve

1. Relever branche, SHA, état Git et ressources. Préparer A avec `npm run dev:prepare -- --mission=S10 --session=A`.
2. Composer un plugin et une configuration de test propre au lot, sans remplacer les services commerciaux natifs. Vérifier les points d'extension réellement présents.
3. Créer/modifier produits, variantes, attributs, collections et médias ; ajout en masse borné et import simple avec aperçu, erreurs par ligne et reprise sans duplication.
4. Configurer deux marchés de démonstration, Belgique/fr/EUR et États-Unis/en/USD. Faire correspondre les IDs réels aux références de contrats, sans stocker les IDs fictifs de S02.
5. Vérifier prix par marché et stock par emplacement. Aucun checkout, allocation asynchrone ou approvisionnement avancé dans ce lot.
6. Vérifier les membres/rôles ainsi que les clients, groupes et préférences minimales. Une appartenance à un groupe ne vaut pas consentement marketing.
7. Réutiliser les écrans natifs ; ajouter uniquement les extensions nécessaires. Tester droits, accès direct, états et responsive dans Responsively.

Recettes minimales : lecture Shop API ; création puis relecture ; modification et import répété ; variante invalide ; deux canaux avec prix distincts ; absence de fuite entre canaux ; deux emplacements ; compte lecture seule refusé sur écriture et commandes. Les permissions doivent être vérifiées sur les mutations natives utilisées.

Les tests sont sous `infra/tests/s10/`, avec une base jetable et des ports libres. Consigner leurs commandes exactes. Les données de développement sont `.data/v1-s10-a/`, ports 4101/5101/3101 réservé/5541.

## Livraison et G1

Fournir le plugin, les extensions, migrations candidates, fixtures synthétiques et tests, puis `docs/livraisons/S10/RESULTAT.md`. Y inscrire base, branche, commits, état du push, vérifications, limites et raccordements.

S11 peut référencer un produit synthétique pour ses tests indépendants. En G1, ses références seront vérifiées contre les produits créés ici. Les politiques commerciales des agents restent à raccorder avec S12 et à éprouver avant activation. Ne pas lancer S20.
