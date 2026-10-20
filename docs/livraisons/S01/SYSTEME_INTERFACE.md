# Système d'interface proposé pour G0

Direction confirmée par Victor le 20 octobre 2026, avec la réponse « oui » à la proposition claire, ivoire, graphite, accent bleu et listes de travail denses mais lisibles. Cette confirmation porte sur la direction ; les maquettes qui suivent restent une proposition à examiner.

La source des valeurs du prototype est [styles.css](prototype/styles.css). Ce document explique les choix et leur usage. L'intégrateur pourra les traduire vers les variables publiques de Vendure après vérification du socle.

## Intention

Le marchand doit repérer une commande bloquée et comprendre ce qu'il peut faire ensuite. La composition donne donc la priorité aux objets et aux actions. Les chiffres de synthèse viennent après la file de travail.

Le dossier d'action relie les informations dans cinq composants précis : référence de l'objet, source datée, comparaison des versions, récapitulatif de décision et résultat confirmé ou incertain. La même structure apparaît dans le suivi du paiement, avec les champs propres à cette opération.

Le vocabulaire vient des commandes, colis, stocks, versions et preuves d'exécution. L'ivoire rappelle un support de travail, le graphite l'information principale. Le bleu identifie une action disponible. Vert et orange ont un sens métier explicite.

## Couleurs et profondeur

| Token CSS | Valeur | Usage |
|---|---|---|
| `--paper` | `#f6f5f1` | Fond et navigation, dans le même espace visuel |
| `--sheet` | `#fcfbf8` | Listes, fiches et sections |
| `--overlay` | `#fffefa` | Fenêtres de détail et confirmation |
| `--ink` | `#242925` | Texte principal |
| `--ink-secondary` | `#505750` | Explication utile |
| `--ink-metadata` | `#646b64` | Date, source et référence secondaire |
| `--ink-disabled` | `#747a74` | Entrée indisponible, accompagnée d'un libellé |
| `--line` / `--line-soft` | `#dcded6` / `#e8e9e2` | Limites de sections et séparations internes |
| `--control-border` | `#858e84` | Limite perceptible des contrôles |
| `--action` | `#2856ba` | Action principale, liens et focus |
| `--action-hover` / `--action-pressed` | `#204697` / `#193a80` | Survol et pression |
| `--control` | `#efeee8` | Contrôle en retrait et état neutralisé |
| `--confirmed` | `#266344` | Confirmation connue |
| `--attention` | `#8a4d13` | Attente ou élément à vérifier |
| `--blocked` | `#a03d36` | Refus ou conflit bloquant |

Profondeur par bordures, sans ombres décoratives. Les surfaces restent proches en luminosité. Les aplats colorés sont réservés aux messages et aux changements proposés.

Les contrastes sont calculés avec la luminance sRGB. Texte principal sur fond : 13,57:1. Texte secondaire sur section : 7,20:1. Métadonnée sur section : 5,30:1. Texte blanc sur action bleue : 6,71:1. Les trois couples d'état dépassent 5,5:1. La bordure des contrôles sur section atteint 3,27:1. Les résultats reproductibles sont dans [preuves/verification-statique.json](preuves/verification-statique.json).

Ces mesures portent sur les couples de tokens indiqués, pas sur tous les pixels d'une page rendue.

## Typographie et dimensions

Le prototype utilise la police système sans sérif pour reprendre les formes familières des outils de bureau et éviter un téléchargement. Les références emploient la police système monospace ; les montants ont des chiffres tabulaires. Les PNG des planches utilisent Arial Unicode, disponible localement. Cette différence interdit de les traiter comme des captures exactes du prototype.

| Usage | Ordinateur | Mobile |
|---|---|---|
| Titre de page | 30 px, graisse 650, interligne 1,2 | 26 px, interligne 1,25 |
| Titre de section | 17 px, graisse 650 | 16 px |
| Texte d'une ligne de travail | 13 px, graisse 600 | 13 px |
| Explication | 12 à 13 px | 11 à 12 px selon le composant |
| Métadonnée courte | 10 à 12 px | 10 à 11 px |
| Action | 12 px, graisse 600 | 12 px |

Grille d'espacement de 4 px : 4, 8, 12, 16, 20, 24, 32 et 40. Marge de contenu de 36 px sur ordinateur, 28 px sur tablette, 16 px sur mobile. La navigation occupe 224 px quand elle est visible.

Rayons de 6 px pour les contrôles, 8 px pour les panneaux, 12 px pour les dialogues. Les contrôles tactiles ont une hauteur minimale de 44 px. Les icônes sont des tracés SVG simples de même épaisseur ; elles accompagnent un libellé ou possèdent un nom accessible.

## Composants à reprendre

| Composant | Règle | États à conserver |
|---|---|---|
| Contexte | Boutique, marché, environnement et objet identifiables | Données fictives marquées ; accès refusé sans détails sensibles |
| Navigation d'activité | Entrée courante lisible ; sous-sections au voisinage | Courant, survol, focus ; hors maquette signalé |
| Ligne de travail | Raison, objet et action forment une unité | Blocage, tâche, proposition ; filtres avec compteurs cohérents |
| Trois états de commande | Paiement, préparation, livraison séparés | Confirmé, attendu, absent, partiel selon la future donnée |
| Message attaché à l'objet | Expliquer la conséquence et la suite | Attention, erreur, progression et incertitude |
| Source | Nom, périmètre, période, collecte et limite | Disponible, non connectée, ancienne, quota, collecte échouée |
| Comparaison | « Actuel » puis « Proposé », versions visibles | Deux colonnes si lisibles ; empilement sinon |
| Décision | Objet, version, modifications, coûts et autorisation | Consultable, bloquée, approuvée ; aucune publication implicite |
| Résultat | Fait établi, preuve et date | Non appliqué, à vérifier, observation en cours, non concluant |
| Assistant contextuel | Fermé au départ ; objet et autonomie affichés | Panneau latéral ou vue mobile ; fermeture sans annulation métier |

Les boutons ont des états normal, survol, pression, focus et désactivé. Les actions indisponibles ont une raison visible. Un succès temporaire ne remplace pas le résultat dans le dossier.

## Responsive et clavier

- À partir de 1280 px, navigation visible. En dessous, elle s'ouvre dans un panneau refermable.
- En dessous de 768 px, les objets de la file, articles et états de commande s'empilent. L'information métier reste présente.
- La comparaison SEO s'empile dès que ses colonnes seraient trop étroites. La décision précède le résultat dans l'ordre mobile.
- Les fenêtres utilisent le dialogue HTML natif. Échap ferme ; le focus revient au déclencheur s'il existe encore. Ces interactions ont été exercées dans Responsively pendant la [recette G0](../G0/RECETTE_RESPONSIVELY.md).
- La navigation vers un écran place le focus sur son titre. Un filtre conserve le focus sur le contrôle choisi.
- Le lien d'évitement, les noms des boutons, les titres de sections et les en-têtes du tableau sont présents dans le code.
- Les animations se limitent aux changements de couleur de 120 ms ; le mode de réduction des animations les supprime.

## Limites de la livraison

Le prototype ne possède ni serveur métier, ni prestataire de paiement, ni modèle d'IA. La validation SEO change seulement un état en mémoire, perdu au rechargement. Les sources et montants sont fictifs.

Les planches sont des dessins vectoriels indépendants du moteur de rendu HTML. Elles reprennent les couleurs et la composition. La recette G0 ajoute des contrôles du prototype réellement rendu dans Responsively, aux quatre dimensions du projet ; elle ne constitue pas un audit exhaustif d'accessibilité ni une vérification sur appareils physiques.
