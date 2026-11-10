# Liaison d'approbation s12-c14n-v1

`canonical.ts` encode une valeur JSON en UTF-8. Les propriétés sont triées selon l'ordre des unités UTF-16 de JavaScript. Les tableaux conservent leur ordre. Les chaînes doivent déjà être normalisées en NFC et ne peuvent contenir de substitut Unicode isolé. Les nombres doivent être des entiers sûrs ; décimales, `-0`, infinis et `NaN` sont refusés. Les montants respectent en plus les limites du contrat `Money`.

Les objets avec prototype particulier, accesseurs ou propriétés symboliques sont refusés. Les tableaux creux, accesseurs et propriétés supplémentaires sont refusés. La profondeur maximale est 32 ; une empreinte ne peut porter sur plus de 65 536 octets canoniques. Aucun arrondi, remplacement de caractère ou retrait silencieux de propriété n'est effectué.

La liaison contient le nom de cette canonisation et les champs suivants :

| Groupe | Champs inclus |
|---|---|
| Contexte | Boutique, marché, canal, langue, devise ; type, identité et délégation de l'acteur ; version de politique |
| Cible | Boutique, type, identifiant et version attendue |
| Proposition | Version, référence de modification, condensat du contenu figé |
| Effet | Capacité et clé métier |
| Connexion | Identifiant, fournisseur, compte, environnement, capacité et garanties de recherche/idempotence, durée de garantie |
| Budget | Identifiant du budget, montant plafond entier, devise et échelle |

Les dates de résolution, identifiants de requête, quotas observés et références de secrets ne changent pas la proposition approuvée. Les droits, quotas, état de connexion et échéance d'approbation sont contrôlés séparément avant effet. Le changement de compte ou de garanties de capacité invalide la liaison.

Le résultat est `sha256:` suivi du SHA-256 des octets. Ce condensat lie une décision conservée côté serveur à son contenu ; ce n'est pas une signature client ni un jeton d'autorisation. `approveOperation` exige une identité et la permission serveur correspondantes.

Le condensat de la requête fournisseur porte sur `{ binding: bindingDigest, payload }`. La clé d'idempotence est persistée à la création de l'opération. Toutes les reprises utilisent cette clé et ce condensat, sans nouvelle transmission après résultat incertain.

Vecteur fixe, contrôlé indépendamment avec SHA-256 :

```text
Entrée : {"é":"été","a":1}
Canonique : {"a":1,"é":"été"}
SHA-256 : 86427212ab41a7b8c7d407ffa95aae7917146a6e3d2cbbe479c26276a0ad0619
```

La recette teste ce vecteur, un ordre de propriétés différent, les valeurs ambiguës et la modification de chacune des 31 feuilles sensibles attendues. Un contenu modifié sous la même clé métier est refusé par API.
