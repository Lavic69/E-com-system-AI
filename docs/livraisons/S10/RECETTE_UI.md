# Recette graphique S10

10 novembre 2026, `/Applications/ResponsivelyApp.app` stable, administration réelle sur 5101 et API S10 sur 4101.

Dimensions sélectionnées : 1440×900, 1024×768, 390×844, 360×800. Le mobile 360×800 a aussi été inspecté en vue individuelle pour lire l'ensemble du résultat.

| Parcours | Observation | Preuve locale |
|---|---|---|
| État initial | Marché Belgique, devise EUR, emplacement nommé, aucun import possible sans contenu | `preuves/ui/import-vide-4-formats.*` |
| Aperçu | Une ligne prête et une ligne au prix invalide ; prix, stock et message lisibles | `preuves/ui/resultats-4-formats.*`, `mobile-360-resultat.*` |
| Création | Import confirmé par l'API, lien vers le produit natif | `preuves/ui/import-cree.txt` |
| Reprise | Les autres vues reconnaissent la même clé ; un seul produit | `preuves/ui/reprise-autres-formats.txt` |
| Clavier | Tab atteint Vérifier, Entrée lance l'aperçu ; Tab puis Entrée confirme l'import | `preuves/ui/clavier-focus.txt`, `clavier-import-confirme.txt` |
| Chargement | Suspension temporaire du processus API S10 ; quatre vues affichent la vérification et neutralisent les actions | `preuves/ui/chargement-api-suspendue.txt` |
| API arrêtée | Échec visible sur les quatre vues, sans confirmation de réussite | `preuves/ui/api-indisponible.txt` |
| Reprise de l'API | L'aperçu fonctionne de nouveau, puis import d'une nouvelle clé | `preuves/ui/reprise-api.txt` |
| Refus | Un compte lecture seule connecté par le formulaire natif ne peut pas importer, même par URL directe | `preuves/ui/refus-lecture-seule-4-formats.*` |
| Fiche native | Ouverture depuis le résultat, nom modifié et enregistré ; relecture du nom et du prix après rechargement avec le rôle limité | `preuves/ui/produit-modifie-mobile.txt`, `produit-natif-lecture-seule-4-formats.txt`, `produit-natif-4-formats.png` |
| Fichier CSV | Membre catalogue connecté ; sélection de `recette-fichier.csv` par le dialogue macOS, aperçu et import de la ligne valide ; ligne au stock négatif non créée | `preuves/ui/csv-import-confirme.*`, `csv-import-api.json` |
| Saisie prix et stocks | Fiche native de la variante importée, prix saisi à 18,90 EUR, stock de l'entrepôt à 9 et du magasin à 4 ; enregistrement réussi | `preuves/ui/stocks-prix-enregistres.txt` |
| Persistance prix et stocks | Rechargement de la fiche et relecture Admin API/Shop API ; mêmes valeurs, aucun doublon | `preuves/ui/stocks-prix-apres-rechargement.txt`, `stocks-prix-api.json` |
| Stocks en petit format | Libellés et quantités lisibles à 360×800 ; champs atteints au clavier, aucun changement en attente | `preuves/ui/stocks-prix-mobile-360.*`, `stocks-prix-ordinateur.png` |

La recette a corrigé le libellé de l'emplacement, qui affichait d'abord son ID. Les montants affichés sont identifiés comme ceux du fichier ; ils ne prétendent pas refléter une modification ultérieure de la fiche produit. La version finale affiche aussi le traitement des taxes et annonce que les produits créés seront activés.

Les événements de Responsively peuvent être reproduits entre vues de dispositions différentes. Ils ont notamment ouvert des rubriques différentes de navigation et envoyé deux requêtes d'import pour la même clé ; les reçus ont empêché les doublons. Des interactions ont ensuite été isolées par appareil et le petit mobile inspecté individuellement. La première tentative de saisie graphique des stocks avait été interrompue par un redémarrage de Responsively. Le complément, exécuté après confirmation de disponibilité par Victor, ferme cette vérification : les valeurs ont été saisies au clavier, enregistrées et relues. La saisie textuelle a été utilisée pour les champs numériques, après vérification du focus.

Les tableaux natifs de variantes utilisent un défilement horizontal en petit format. La page d'import propre à S10 empile ses informations, conserve ses libellés et permet le défilement vertical jusqu'aux résultats.

Cette recette ne couvre pas chaque écran natif de Vendure, Safari, un appareil physique ou un audit complet d'accessibilité. Le dialogue système d'ouverture de CSV est désormais couvert. Les manipulations enregistrées restent des tests locaux avec des données fictives.
