# Recette S00/S01 dans Responsively

20 octobre 2026. Reprise explicitement demandée par Victor après correction de l'installation de Responsively. Application utilisée : `/Applications/ResponsivelyApp.app`, stable 1.18.0, pilotage graphique CUA. Aucune bêta ni connexion MCP utilisée pendant cette reprise.

**Les contrôles de recette S00/S01 ont été exécutés.** Un débordement mobile du prototype a été corrigé puis revérifié. La base Git de G0 reste à créer sur autorisation.

## Formats et ressources

| Format du projet | Aperçu utilisé |
|---|---|
| 1440 × 900 | MacBook Pro |
| 1024 × 768 | Appareil personnalisé `G0 Tablette paysage` |
| 390 × 844 | iPhone 12 Pro |
| 360 × 800 | Galaxy S21 |

L'iPad 768 × 1024 habituel a aussi servi au début de la recette. Les quatre formats du projet ont ensuite été activés et relevés dans [l'état des appareils](preuves/ui/formats-projet.txt).

- S00 : `http://127.0.0.1:5101/dashboard/`, API 4101, PostgreSQL 5541. Base synthétique isolée sous `.data/g0-ui/`, secrets hors des preuves.
- S01 : serveur existant `http://127.0.0.1:5102/`, conservé après la recette.
- Les services S00 démarrés pour cette recette ont été arrêtés proprement.
- La sélection habituelle iPhone 12 Pro, iPad et MacBook Pro a été [restaurée](preuves/ui/configuration-restauree.txt). Le format personnalisé reste disponible dans la bibliothèque, hors sélection active.

## S00 : administration réelle

| Contrôle | Résultat et preuve |
|---|---|
| Connexion administrateur | Réussie dans les quatre aperçus avec les identifiants locaux synthétiques |
| Navigation et accès direct | Groupe « Environnement local », entrée « Vérification du socle », puis accès direct à la route ; [capture](preuves/ui/s00-acces-direct-4-formats.jpg) |
| Réponse de l'API | Message autorisé, session `v0-s00-a` et canal réel `__default_channel__` affichés ; le canal natif est en anglais/USD, distinct des marchés fictifs de S01 |
| Actualisation à la souris | Requête réelle puis retour au succès |
| Actualisation au clavier | Focus placé par Tab sur le bouton, activation par Entrée ; API temporairement suspendue pour observer le [bouton en chargement](preuves/ui/s00-clavier-entree-charge.jpg) |
| Erreur réelle | Services de recette arrêtés, requête relancée dans les aperçus mobiles puis ordinateur/tablette ; les quatre affichent l'erreur et retirent le succès ; [capture](preuves/ui/s00-api-indisponible-4-formats.jpg) |
| Reprise | Redémarrage de la même base ; les quatre aperçus retrouvent le résultat autorisé ; [état](preuves/ui/s00-reprise-api.txt) |
| Rôle `ReadCatalog` | Entrée du socle absente de la navigation ; URL directe avec [refus visible](preuves/ui/s00-catalogue-refus-direct.jpg) dans les quatre formats |
| Rôle `ReadPlatformFoundation` | Socle autorisé, catalogue absent de la navigation ; [capture](preuves/ui/s00-socle-seul-autorise.jpg) |
| Protection serveur des rôles | Les deux comptes ont aussi été interrogés par API réelle : requête autorisée réussie, autre domaine refusé ; [rapport](preuves/ui/permissions-api.json) |
| Responsive | Textes, refus, résultat et bouton lisibles aux quatre dimensions ; navigation mobile ouverte et examinée |

La suspension de l'API était bornée avec reprise automatique. Seuls les processus créés pour cette recette ont été arrêtés. Le chargement observé est celui d'une nouvelle vérification : la dernière réponse reste visible pendant l'attente et disparaît lorsque l'erreur est établie.

## S01 : prototype de conception

| Parcours | Résultat |
|---|---|
| File de travail | Quatre éléments au départ ; filtre Blocages ramené à deux dans les aperçus ; accès à D-1042 |
| Commande | Paiement, préparation et livraison distincts ; total de 86 EUR et articles lisibles ; parcours vers le dialogue de vérification puis résultat incertain |
| Dossier SEO | Versions v12/v13, sources datées et limites, comparaison avant/après, coût connu/réservé/plafond et résultat non appliqué |
| Approbation | Confirmation puis « Proposition approuvée », sans application ni publication ; état uniquement en mémoire |
| Sources et assistant | Dialogue du relevé daté ; panneau lié à l'objet et au mode recommandation ; aucune connexion fournisseur |
| États | Chargement, vide, accès refusé, erreur, opération longue, incertitude, conflit, compte non connecté, source ancienne et quota : chacun observé dans les quatre aperçus |
| Blocages | Validation désactivée en cas d'expérience active, de source ancienne, d'opération longue et d'incertitude ; reprise depuis l'erreur testée |
| Clavier | Tab/Maj+Tab, Entrée, Espace et Échap exercés sur navigation et dialogues ; fermeture et retour au déclencheur observés |
| Responsive | Vue d'ensemble, commande et SEO examinés aux quatre dimensions, avec défilement des contenus et comparaison empilée sur mobile |

Les états finaux sont conservés dans les fichiers `preuves/ui/s01-final-*.txt`. Les captures montrent la [vue d'ensemble](preuves/ui/s01-final-vue-ensemble.jpg), la [commande corrigée](preuves/ui/s01-commande-corrigee-4-formats.jpg) et la [comparaison après défilement](preuves/ui/s01-comparaison-bas.jpg).

## Défaut trouvé et correction

Dans le bloc d'alerte mobile, `.notice .button` cumulait `width: 100%` et `margin-left: 32px`. Le bouton débordait sur la droite en 390 et 360 pixels. La [capture avant correction](preuves/ui/s01-commande-clavier.jpg) conserve ce constat.

La largeur est maintenant `calc(100% - 32px)`, avec la marge prévue pour l'alignement du texte. Le bouton reste entièrement dans le bloc sur les deux mobiles ; tablette et ordinateur restent lisibles. La [capture après correction](preuves/ui/s01-commande-corrigee-4-formats.jpg) a été examinée. Les 26 contrôles statiques S01 ont été rejoués avec succès.

## Portée des preuves

Responsively peut reproduire les clics entre aperçus dont les structures diffèrent. Chaque résultat a été relu ; les boutons S00 sur mobile et ordinateur/tablette ont notamment été actionnés séparément pour le test d'erreur. Les vérifications clavier sont ciblées, principalement dans l'aperçu mobile ; ce travail n'est pas un audit exhaustif d'accessibilité.

La synchronisation d'un lien peut recharger les aperçus. Le placement du focus sur le titre après une navigation sans rechargement n'est donc pas certifié par cette recette ; le retour du focus après fermeture d'un dialogue a, lui, été observé.

Les captures sont des vues de l'application Responsively, pas des captures d'appareils physiques. Safari, les lecteurs d'écran et les appareils réels n'ont pas été testés.

S01 demeure un prototype avec données fictives. La recette ne prouve aucun paiement, publication, fournisseur ou effet d'agent. La direction graphique est confirmée ; l'approbation personnelle des maquettes finales par Victor reste distincte de ces contrôles techniques.
