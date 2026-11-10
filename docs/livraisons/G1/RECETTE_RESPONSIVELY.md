# Recette Responsively G1

10 novembre 2026. Application stable `/Applications/ResponsivelyApp.app`, pilotage graphique natif. La configuration commune G1 sert les quatre extensions : socle, catalogue, contenu et opérations. Aucun prototype ni serveur de recette propre à S10/S11/S12 n'est utilisé pour cette vérification.

URL de cette exécution : `http://127.0.0.1:60438/dashboard/`. API 60437. Session `v1-g1-b`, issue d'une copie G0 migrée et du parcours commun. Les versions finales du code serveur sont vérifiées séparément dans `preuves/integration.json` et `preuves/test-all.txt` ; la correction de conservation du shopId ne change pas le rendu. Le manifeste final rattache les fichiers livrés à leurs empreintes.

## Parcours observés

| Parcours | Résultat |
|---|---|
| Connexion locale | Compte administrateur de démonstration authentifié ; identifiants lus localement, jamais publiés |
| Préférences natives | Français et thème clair sélectionnés ; conservés après rechargement des quatre aperçus |
| Marché | Belgique/fr sélectionné ; présence du contexte et des valeurs EUR dans l'import |
| Pages | Liste issue de la vraie base ; page intégrée en révision 2, deux versions, produit S10 référencé |
| Historique | Bascule de v2 vers v1 puis retour à v2 ; texte initial et texte appliqué distincts |
| Aperçu | `Produit G1` relu depuis le catalogue, sans prix ou stock recopié dans la version |
| Actions | Réussites et refus conservés ; preuve `content-version:<page>:2`, coût local 0 EUR |
| Trace au clavier | Depuis la ligne sélectionnée, Tab vers le lien puis vers la trace, Entrée ; identifiants, révision 3, une transmission et une approbation visibles |
| Lien d'action | Ouverture effective de la page et de son historique depuis le dossier d'action |
| Import | Contexte, emplacement, formulaire CSV et bouton désactivé en l'absence de ligne valide |
| Lecteur | Accès direct à l'import refusé ; page consultable avec écritures et sélection désactivées ; dossiers d'action lisibles |

## Dimensions et preuves

| Dimensions | Contenu | Actions | Import |
|---|---|---|---|
| 1440 × 900 | `page-1440.png`, comparaison avant/après | `actions-1440.png` | `import-1440.png` |
| 1024 × 768 | `page-1024.png` | `actions-1024.png` | `import-1024.png`, capture finale après chargement |
| 390 × 844 | `page-390.png` | `actions-390.png` | `import-390.png` |
| 360 × 800 | `page-360.png` | `actions-360.png`, `trace-clavier-360.png` | `import-360.png` |

Toutes les captures et lectures d'accessibilité sont dans `preuves/responsively/`. Les éléments s'empilent sur mobile ; les libellés et actions contrôlés restent lisibles. Le contrôle est visuel, sans prétendre à une mesure automatique exhaustive des débordements.

Le chargement des aperçus masqués peut rester visible jusqu'à leur activation. La capture tablette de l'import a été complétée après chargement pour conserver son état final. L'écran vide du canal principal a été observé avant le choix Belgique.

## Limites

La recette G1 vérifie la composition, les nouvelles couleurs communes, les liens et la lecture des résultats. Le dialogue de fichier CSV, la saisie des stocks/prix et les autres interactions détaillées ont leur recette S10 ; la création et les conflits graphiques ont leur recette S11 ; les erreurs réseau ont leur recette S12. Ils ne sont pas tous rejoués graphiquement en G1. Leurs scénarios API sont rejoués depuis l'intégration.

Le compte conserve ses préférences natives de langue et de thème. Le français n'est pas imposé à tous les comptes. Aucun appareil physique, Safari ou audit complet d'accessibilité n'est couvert.

Le créneau graphique est libéré. Les services de recette sont arrêtés et leurs ports vérifiés libres dans `preuves/resources.json`.
