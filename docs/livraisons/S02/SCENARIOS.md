# Scénarios d'acceptation S02

Ces huit recettes décrivent les comportements à implémenter. Elles ne sont pas exécutées par `verify.py`, qui vérifie seulement les formats et la cohérence des exemples. Les références `fixture:` désignent des preuves fictives. Aucun envoi ni paiement réel n'a eu lieu.

Toutes les dates sont en UTC. Les montants sont en unités mineures de EUR sauf mention explicite. Les jeux de données portent sur `shop-demo`, `market-be`, `channel-be`, langue `fr`. Les identifiants commerciaux seront ceux retournés par le moteur lors de la recette, pas des IDs à imposer à Vendure.

Chaque future exécution conservera version du code, configuration, événements, opérations et assertions. Utiliser une base isolée et un fournisseur simulé contrôlable, puis un compte de test pour la recette du connecteur. Un simulateur ne clôt pas la vérification du fournisseur réel.

## SC01 : deux acheteurs et confirmation différée

Responsable : S20, avec les garanties d'opérations de S12.

**Préconditions.** Une variante suivie, un emplacement, une unité physique, aucune allocation, aucune survente autorisée. Deux commandes A et B de quantité 1 sont préparées avec le même contexte. Deux paiements démarrent à une barrière commune ; la confirmation du premier fournisseur est suspendue jusqu'après la tentative de réservation du second.

**Déroulement.**

1. Les deux requêtes tentent de réserver la dernière unité.
2. Attendre la validation des transactions de réservation sans confirmer le paiement.
3. Redémarrer le worker normalement ; relire les réservations.
4. Confirmer le paiement gagnant avec un événement fournisseur authentifié, puis le retransmettre.
5. Refaire la recette avec deux unités disponibles.

**Résultat attendu.** Avec une unité, une seule réservation devient active et un seul effet de création de paiement part au fournisseur. La seconde commande reçoit un refus de disponibilité avant débit. Pendant l'attente, `stockOnHand = 1`, `stockAllocated = 1`, disponible = 0. Après confirmation, une commande au plus est payée et l'allocation reste 1 jusqu'à préparation. Avec deux unités, deux réservations et deux paiements sont possibles, sans refus artificiel.

**Preuves.** Relecture des commandes, tentatives, allocations et journal durable après redémarrage ; nombre d'effets fournisseur par clé ; réception dédupliquée ; absence de deuxième allocation à la transition de paiement. Ne pas se contenter du compteur de stock : le banc historique a accepté deux paiements avec une seule allocation.

**Variantes nécessaires.** Retour au panier, changement de quantité, annulation et achat simultané à un ajustement de stock. Vérifier les chemins natifs disponibles en plus du nouveau checkout. Le banc synchrone existant reste une preuve antérieure, pas le résultat de cette recette.

## SC02 : échéance pendant un paiement incertain

Responsable : S20. Exemples : `reservation_uncertain`, `payment_unknown`, `quote_be`.

**Préconditions.** A réserve une unité à 10:00, échéance 10:15. Le fournisseur reçoit la demande de 5 500, puis la réponse est perdue. À 10:16, l'état fournisseur ne peut pas être lu. Aucun refus définitif n'est connu.

**Déroulement.** Déclencher ensemble le job d'expiration et une notification tardive. Répéter avec deux issues contrôlées : paiement finalement réglé ; annulation définitivement confirmée. Interrompre aussi le worker juste après le marquage d'envoi, avant de connaître la réception fournisseur.

**Résultat attendu.** Tant que le résultat reste inconnu, réservation `uncertain`, tentative `unknown`, stock alloué = 1, disponible = 0. Un autre achat est refusé. La simple échéance ne libère rien et ne crée pas de nouvelle tentative payante. Après règlement, la réservation passe à `confirmed` une seule fois. Après annulation prouvée excluant un règlement futur, elle passe à `expired` et libère exactement une unité.

**Preuves.** Les deux ordres d'exécution expiration/webhook aboutissent au même état compatible ; une seule libération ou confirmation ; journal de réconciliation conservé après crash ; aucune transaction SQL maintenue pendant l'attente distante. Une confirmation contradictoire après `expired` déclenche un incident et n'autorise pas la préparation d'une commande sans stock.

**Arbitrage G0.** Proposition conservatrice : garder l'allocation jusqu'à résolution, avec alerte humaine et cadence de rapprochement configurable. Les 15 minutes sont une donnée de recette, pas une politique universelle ni une garantie fournisseur.

## SC03 : doublon et événement ancien reçu plus tard

Responsables : S12 pour le journal, S22 pour les projections, S20 pour le paiement.

**Entrées.** `event_settled`, sa copie `event_settled_duplicate`, puis `event_authorized_late`. Le simulateur garantit ici une séquence par paiement : règlement en séquence 2, autorisation en séquence 1 reçue ensuite. Un connecteur sans cette garantie fournit `sequence: null`.

**Résultat attendu.** Deux événements de domaine distincts et trois réceptions de transport peuvent être observés, mais un seul règlement de 5 500, une seule confirmation de commande et une seule opération de notification. L'événement tardif ne fait pas revenir le paiement de réglé à autorisé. Le rejeu après redémarrage ne double ni revenu ni envoi.

**Preuves.** Contraintes de déduplication, IDs source, contenu canonique et projection rapprochée de Vendure. Tuer le processus après écriture de la sortie puis après l'appel fournisseur mais avant accusé local. Au redémarrage, chercher le résultat avec la clé existante avant tout nouvel effet.

**Contre-épreuves.** Même clé avec un montant différent : quarantaine. Version de charge inconnue : quarantaine. Événement navigateur prétendant confirmer un paiement : aucun effet commercial. Sans séquence garantie, relire le paiement de référence. Un trou de séquence ne doit pas devenir une perte silencieuse. Un événement légitime d'un autre compte ne doit pas être éliminé à cause d'une clé locale identique.

## SC04 : cible modifiée après approbation

Responsables : S11 pour la comparaison de version, S12 pour l'approbation. Exemple : `action_approved`, cible `home/page-v7`.

**Préconditions.** Une proposition de modification de titre est approuvée sur `page-v7`, coût maximal 0. Un autre membre crée et sélectionne `page-v8` avant la prise en charge.

**Résultat attendu.** Le serveur refuse l'application avec `TARGET_VERSION_CHANGED`. La page reste en version 8, le dossier revient à `awaiting_approval`, aucun effet externe ne part et le journal conserve l'approbation initiale. Une proposition mise à jour doit recevoir sa propre approbation. Une nouvelle version de politique ou une délégation révoquée bloque également l'exécution.

**Preuves.** Diff avant/après, version stockée, liaison d'approbation et compteur d'appels externes à zéro. Provoquer le changement entre la lecture préparatoire et l'écriture pour vérifier que la comparaison est atomique. Une vérification uniquement dans l'interface échoue à cette recette.

**Variante partielle.** Si une opération a déjà produit un effet, conserver sa preuve. Une nouvelle autorisation concerne les opérations restantes et ne réexécute pas celles réussies.

## SC05 : SEO face à une page réservée par une expérience

Responsables : S11, puis S41/S51. Exemples : `lease_experiment`, `content_home`, `publication_home`, `exposure_b`.

**Préconditions.** L'expérience `exp-home`, version 1, protège `home/page-v7`, langue `fr`, portée `/`, jeton 4. L'agent SEO prépare une réécriture du titre.

**Résultat attendu.** L'observation SEO reste possible. L'écriture ou la publication est refusée avec `EDIT_RESERVED`, sans nouvelle version sélectionnée ni changement d'artefact. La proposition peut attendre la fin de l'expérience. Une réservation renouvelée avec jeton 5 refuse toute écriture munie du jeton 4. Si le bail expire alors que l'expérience reste active, la protection du protocole reste vérifiée.

**Preuves.** Publication et condensat identiques avant/après ; refus serveur ; journal de réservation ; exposition toujours rattachée à l'artefact et au protocole réellement rendus. Tester deux variantes et deux marchés avec le cache activé : aucune réponse ne contient la version ou la devise de l'autre contexte. Le retour arrière restaure le pointeur d'artefact et laisse les commandes intactes.

**Dérogation.** Un arrêt explicitement autorisé invalide ou clôt l'expérience avant modification. Ne pas annoncer un gagnant après changement non prévu du contenu.

## SC06 : campagne devenue incompatible

Responsables : S32/S52, avec lectures commerciales S10/S20.

**Préconditions.** Une campagne pour la variante disponible est approuvée à 10:00, audience de deux clients consentants, création approuvée et droits valides. Avant 10:06, le premier client se désinscrit ; la dernière unité est achetée. `audience_granted` puis `audience_withdrawn` illustrent deux photographies du même client.

**Résultat attendu.** La diffusion de cette offre indisponible est bloquée et requiert une nouvelle préparation. Zéro message part dans cette combinaison. Refaire séparément avec du stock : le client désinscrit reste exclu, l'autre peut recevoir une seule occurrence après revalidation. Refaire sans désinscription mais avec un prix modifié : la proposition commerciale doit être revalidée.

**Preuves.** Versions de campagne et de consentement, lecture du stock à l'envoi, motifs d'exclusion par destinataire pseudonyme, absence d'appel pour les destinataires bloqués. Tester une désinscription arrivée après mise en file mais avant prise en charge. Si le fournisseur avait déjà accepté un envoi au moment de la désinscription, afficher cet état réel et arrêter les suivants.

**Contre-épreuves.** Un groupe client ne suffit pas à autoriser une diffusion. Droits de création inconnus, consentement périmé ou lecture indisponible : diffusion bloquée. La suppression d'un destinataire ne transforme pas le contenu approuvé en une nouvelle offre.

## SC07 : silence après une demande payante

Responsable : S12, puis S32/S42 pour la génération. Exemples : `operation_uncertain`, `connection_media`, `budget_uncertain`, `budget_reconciled`, `budget_overrun`.

**Préconditions.** Budget de période 1 000, coûts déjà connus 200, plafond de l'opération 300. Le fournisseur simulé reçoit une demande et perd sa réponse.

**Résultat attendu.** État `uncertain`, coût connu `null`, réserve 300, budget disponible 500. Le timeout ne crée ni coût zéro ni succès. La recherche retrouve une requête facturée 240 : réserve à zéro, coûts connus cumulés 440, disponible 560. Un reçu dupliqué ne change plus ces valeurs.

**Preuves.** Une clé stable, un seul effet facturé, reçu rattaché à l'opération, transitions du budget. Sans recherche d'état ni idempotence, conserver la réserve et bloquer toute relance automatique. Vérifier aussi la fin de période : elle ne fait pas disparaître l'obligation incertaine.

**Contre-épreuve.** Si le reçu réel est 400 malgré le plafond 300, enregistrer 400, ouvrir un incident et bloquer les appels selon la politique. Ne pas tronquer ce reçu à 300 ou le rejeter du journal.

## SC08 : reprise sans deuxième message ni deuxième engagement

Responsables : S12 puis S52/S60.

**Préconditions.** Une diffusion possède une clé métier stable `(shop-demo, occurrence-1, destinataire-1, marketing)`, une opération, un contenu figé et une seule réservation de budget. Deux workers prennent le même travail. Le fournisseur accepte l'envoi, puis le worker tombe avant d'enregistrer le reçu.

**Résultat attendu avec connecteur compatible.** Un seul effet externe et une seule imputation de budget. Le redémarrage cherche l'envoi existant, récupère le reçu et clôt l'opération. Toutes les tentatives utilisent la même clé et le même condensat de requête. Un autre contenu ou une autre occurrence impose une nouvelle opération autorisée.

**Résultat attendu avec connecteur limité.** Pour `connection_email`, idempotence et recherche ne sont pas disponibles. La première transmission à résultat inconnu reste bloquée pour réconciliation manuelle ; la file ne renvoie pas le message. Le contrat privilégie l'absence de doublon à une relance aveugle, et affiche que la livraison reste inconnue.

**Preuves.** Prise en charge locale atomique, unicité des opérations et réservations, journal d'envoi, compteur d'effets du simulateur et reçu fournisseur. Rejouer après expiration de la garantie d'idempotence : aucune nouvelle transmission automatique sans preuve d'absence d'effet. Un SMTP local acceptant un message ne prouve pas une livraison dans une boîte réelle.

## Contrôles transversaux à reprendre en G0

| Contrôle | Attendu |
|---|---|
| Droits serveur | Refus d'une mutation sans permission, d'un agent hors délégation et d'un objet hors boutique/canal |
| Données monétaires | Refus des décimales en unité mineure, devise incompatible et estimation utilisée comme paiement confirmé |
| Transaction | Retour arrière métier sans événement durable orphelin ; crash après commit récupéré par le journal |
| Retrait de droits | Revalidation lors de la prise en charge d'une opération différée |
| Publication | Preuve liée à l'artefact publié ; cache séparé ; retour arrière sans modification commerciale |
| Audit | Résultats inconnus visibles ; références de preuve privées et dates conservées |

Les validations documentaires de S02 ne cochent aucun de ces tests d'intégration à la place des lots responsables.
