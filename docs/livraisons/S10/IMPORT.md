# Import simple S10

La page `catalogue-import` est accessible aux membres disposant de `CreateCatalog` ou `CreateProduct` dans le canal actif. Le serveur vérifie ces permissions pour le contexte, l'aperçu et l'import.

```csv
key,name,sku,price,stock
tasse-bleue,Tasse bleue,TASSE-BLEUE,1290,12
tasse-verte,"Tasse, verte",TASSE-VERTE,1390,5
```

Le fichier utilise une virgule comme séparateur. UTF-8 avec BOM, CRLF, valeurs entre guillemets et guillemets doublés sont acceptés. Les erreurs indiquent le numéro physique de la ligne. Les lignes vides sont ignorées. Limites : 100 lignes de données, 64 Ko, prix et stock entiers compris entre 0 et 2 147 483 647.

Une clé contient 1 à 100 caractères alphanumériques, points, tirets ou soulignés. Le nom est limité à 200 caractères, le SKU à 100. Deux lignes portant la même clé ou le même SKU dans un fichier sont signalées comme invalides. Les noms et SKU n'acceptent pas de caractères de contrôle.

Le prix est saisi en unités mineures de la devise du marché : 1290 représente 12,90 EUR ou 12,90 USD dans les démonstrations. L'emplacement est sélectionné dans la page. Les paramètres du marché, y compris le traitement des taxes, participent à l'empreinte de l'aperçu. Un changement impose un nouvel aperçu.

L'import est une création. Chaque ligne crée un produit et sa variante via `ProductService` et `ProductVariantService`. Les services natifs conservent leurs règles, événements et stock. Le reçu ne contient que la clé, son empreinte, le canal et les références des deux objets.

| État | Sens |
|---|---|
| `ready` | Ligne valide et SKU disponible dans le canal |
| `invalid` | Format ou valeur à corriger ; aucune écriture |
| `conflict` | Clé déjà utilisée avec un autre contenu/emplacement, ou SKU existant |
| `imported` | Produit, variante et reçu validés dans une même transaction |
| `alreadyImported` | Même ligne déjà validée ; aucune modification |
| `failed` | Résultat non confirmé ; reprendre avec la même clé |

Après interruption, conserver les clés et refaire l'aperçu. Les lignes déjà validées sont reconnues ; seules les autres sont créées. Pour modifier un produit, utiliser sa fiche native. Une ligne corrigée après un refus de validation peut être réutilisée sous sa clé puisque son reçu n'existe pas encore.

## Sources consultées

Les signatures et permissions ont été vérifiées dans les paquets Vendure **3.8.0 installés**, notamment les services et résolveurs produit/variante, `TransactionalConnection`, les champs personnalisés et les exports publics du Dashboard. La documentation actuelle sert de complément : [import de données](https://docs.vendure.io/current/framework/developer-guide/importing-data), [champs personnalisés](https://docs.vendure.io/current/framework/developer-guide/custom-fields). Les services usuels sont conservés pour ce petit import borné afin de garder les validations et événements natifs.
