# Contrats communs

Source des formats retenus en G0, version de travail `s02-draft-1`. Les schémas et exemples ont été déplacés depuis S02 sans changement de contenu.

- [Schéma JSON](contracts.schema.json) : 17 formats publics.
- [Exemples](examples.json) : 29 exemples et 38 contre-exemples synthétiques.
- [Invariants et responsabilités](../../docs/livraisons/S02/CONTRATS.md).
- [Scénarios d'acceptation](../../docs/livraisons/S02/SCENARIOS.md).
- [Décisions d'intégration](../../docs/livraisons/G0/DECISIONS.md).

Les workspaces peuvent référencer `@ecom/contracts/schema`. S12 fournit des validateurs serveur autonomes et des types générés dans `apps/commerce/src/plugins/operations/generated/`, depuis ce schéma unique. G1 les utilise dans l'application intégrée. Le contrôle du condensat du schéma fait partie de `npm run test:s12`. La génération et ses dépendances locales sont décrites dans [les raccordements S12](../../docs/livraisons/S12/RACCORDEMENTS.md#contrats-et-génération). S10 et S11 ne recopient pas un deuxième schéma.

Depuis la racine :

```sh
python3 -m venv .data/contracts-venv
.data/contracts-venv/bin/python -m pip install -r packages/contracts/requirements.txt
PATH="$PWD/.data/contracts-venv/bin:$PATH" npm run test:contracts
```

Un Python possédant déjà la version indiquée peut exécuter directement `npm run test:contracts`. Le rapport courant est écrit sous `.data/`, hors Git. `ECOM_CONTRACT_REPORT` permet de choisir un rapport de livraison. Le contrôle porte sur les formats et les données ; les transactions, permissions, reprises et fournisseurs attendent les tests des modules.
