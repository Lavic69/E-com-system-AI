# S01 Conception de l'administration

20 octobre 2026. Session B. Conception proposée et planches statiques livrées. **Recette UI du prototype exécutée pendant G0**, avec correction d'un débordement mobile. Voir le [rapport actuel](../G0/RECETTE_RESPONSIVELY.md). L'approbation des maquettes finales par Victor reste distincte.

Après une première reprise partielle, la recette a abouti dans la seule version stable de Responsively : trois écrans, quatre dimensions du projet, interactions et dix variantes d'état. Les constats ci-dessous décrivent la session S01 d'origine ; les preuves G0 les complètent.

## Consulter la livraison

- [Planches des trois écrans](PLANCHES.md), avec variantes ordinateur, tablette et mobile.
- [Prototype local](http://127.0.0.1:5102/) : [vue d'ensemble](http://127.0.0.1:5102/#overview), [commande](http://127.0.0.1:5102/#order), [dossier SEO](http://127.0.0.1:5102/#seo).
- [Système d'interface](SYSTEME_INTERFACE.md) : couleurs, typographie, espacements, composants, états et règles responsive.
- [Conception fonctionnelle](CONCEPTION.md) et [raccordement Vendure](VENDURE.md).
- [Vérifications et limites](VERIFICATION.md), [rapport des contrôles statiques](preuves/verification-statique.json).

## Décisions et résultat

Victor a confirmé la direction claire, ivoire, graphite, accent bleu et listes de travail denses mais lisibles avec la réponse « oui » dans cette session. Cette confirmation porte sur la direction ; elle ne constitue pas encore une approbation des maquettes finales.

La conception reprend la navigation par activité, l'accueil orienté tâches et l'assistant contextuel des parcours produit. Le dossier SEO a été retenu pour montrer sources, comparaison, coûts, versions et résultat.

Les trois écrans sont représentés par douze planches aux dimensions 1440 × 900, 1024 × 768, 390 × 844 et 360 × 800. Une treizième planche détaille la comparaison SEO mobile. Les SVG restent éditables. Les PNG sont des dessins rendus, pas des captures de l'application.

Le prototype HTML/CSS/JavaScript contient les liens entre les écrans, les filtres de file, les dialogues de paiement et de validation, les sources, le panneau assistant et un choix de variantes. Il est autonome, sans dépendance installée par S01 et sans appel métier. Ces interactions sont écrites et relues, mais n'ont pas été exécutées dans un navigateur autorisé.

Toutes les données sont fictives et marquées « données de démonstration ». Une approbation dans le prototype ne change qu'un état en mémoire, perdu au rechargement ; aucune page n'est appliquée ou publiée.

## Plan local et critères

| Étape | Résultat | Vérification | État |
|---|---|---|---|
| Reprendre les parcours | Hiérarchie des trois écrans et matrice d'états | Relecture contre parcours et glossaire | Réalisé |
| Confirmer la direction | Accord de Victor | Réponse explicite « oui » | Confirmé |
| Concevoir | Planches, prototype et règles de composants | Revue des dessins et du code | Réalisé |
| Examiner les planches | Douze formats et une comparaison détaillée | Ouverture des PNG, corrections de conversion | Réalisé |
| Vérifier le prototype | Navigation, filtres, dialogues, clavier et CSS rendu | Navigateur autorisé puis Responsively | En attente d'accès |
| Préparer G0 | Exports Vendure et raccordements documentés | Lecture du paquet 3.8.0 et des sources officielles | Réalisé, exécution d'intégration à S00/G0 |

Les critères de conception sont couverts : priorité et objet identifiables, trois états de commande, sources et différences du dossier, coûts et résultat, états d'erreur, comportements clavier et formats mobiles. La compréhension par un marchand n'a pas fait l'objet d'un test utilisateur.

## Vérifications

26 contrôles statiques réussissent avec `python3 docs/livraisons/S01/verifier.py` :

- syntaxe JavaScript et présence des ressources locales ;
- langue du document et destinations des liens documentaires ;
- cohérence du total de commande et du CTR de démonstration ;
- neuf couples de contraste ;
- dimensions des douze planches principales, en SVG et PNG.

Le rapport conserve les empreintes SHA-256 du prototype et des images. La revue visuelle porte sur les planches, avec une police de rendu distincte de celle du navigateur.

Le paquet public `@vendure/dashboard` installé par S00 indique la version 3.8.0. Les principaux exports de mise en page et d'extension nécessaires ont été trouvés dans son entrée publique et ses déclarations, sans modifier le paquet ni le socle.

La tentative d'accès graphique a été refusée par l'outil pour Chrome et Responsively. Aucun clic, parcours clavier ou rendu web n'est déclaré validé. Le serveur local retourne HTTP 200, ce qui ne prouve pas le parcours.

## Périmètre et fichiers

Répertoire de travail : `/Users/lavic/Desktop/Amboras REA/E-com-system-AI`. La branche `main` ne comportait pas de commit au démarrage. Les changements S01 restent non commités.

Toutes les écritures S01 se trouvent dans `docs/livraisons/S01/` :

| Chemin | Rôle |
|---|---|
| `RESULTAT.md` | Livraison et points ouverts |
| `CONCEPTION.md` | Parcours, données d'exemple et états |
| `SYSTEME_INTERFACE.md` | Règles et composants de la direction validée |
| `VENDURE.md` | Réemploi, extensions et contrôles d'intégration |
| `VERIFICATION.md` | Scénarios et limites des preuves |
| `PLANCHES.md` | Index des maquettes statiques |
| `prototype/index.html`, `styles.css`, `app.js` | Prototype autonome |
| `planches/generer.py` et ses SVG/PNG | Sources et rendus des dessins |
| `verifier.py`, `preuves/verification-statique.json` | Contrôles reproductibles et empreintes |
| `preuves/*-controle.png` | Rendus de contrôle de la commande et du SEO mobiles |

Les documents produit, le plan global, le code applicatif, les dépendances communes et les dossiers S00/S02 n'ont pas été modifiés par S01.

## Ressources locales

Un serveur Python propre à S01 reste disponible sur le port 5102, lié uniquement à `127.0.0.1`. Il sert le dossier `prototype/`, pas le dépôt. Aucun serveur métier, base ou worker n'a été lancé par S01.

Commande de reprise, depuis la racine du dépôt, si ce serveur a été arrêté :

```sh
python3 -m http.server 5102 --bind 127.0.0.1 --directory docs/livraisons/S01/prototype
```

Ne pas lancer une deuxième instance si le port est occupé. Ne pas arrêter un processus d'une autre session.

Reproduction des planches :

```sh
python3 docs/livraisons/S01/planches/generer.py
```

La conversion PNG a été réalisée avec ImageMagick et la police locale `/System/Library/Fonts/Supplemental/Arial Unicode.ttf`. Exemple :

```sh
magick -font "/System/Library/Fonts/Supplemental/Arial Unicode.ttf" -background none \
  docs/livraisons/S01/planches/commande-mobile.svg \
  docs/livraisons/S01/planches/commande-mobile.png
```

Aucune installation de dépendance, migration, publication, modification de permission, configuration MCP, dépense, commit, push ou envoi externe.

## Suite pour l'intégrateur

1. Ouvrir le prototype dans Responsively sur un créneau exclusif lorsque l'accès graphique sera autorisé. Exécuter les scénarios de `VERIFICATION.md`, corriger les défauts observés et conserver les captures.
2. Présenter la conception finale à Victor. La direction est confirmée ; la revue de ces maquettes reste distincte.
3. Rapprocher les états, coûts, sources datées, versions et permissions des contrats S02.
4. Reprendre le thème et la navigation dans les points d'extension publics de Vendure, avec S00, puis vérifier le parcours intégré.

S01 ne modifie pas le statut global des lots et n'autorise ni l'intégration ni le lancement d'une autre mission.
