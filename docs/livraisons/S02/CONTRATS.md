# Contrats communs proposés pour G0

Version `s02-draft-1`, 20 octobre 2026. Ce document précise les invariants et les responsabilités. Le [schéma commun](../../../packages/contracts/contracts.schema.json) décrit les formats d'échange ; les [exemples](../../../packages/contracts/examples.json) contiennent exclusivement des données fictives. Leur emplacement de référence a été arrêté en G0. Aucun de ces fichiers ne crée une API, une table ou une permission Vendure.

Le [glossaire produit](../../produit/GLOSSARY.md) reste la référence des termes. Les propriétés techniques sont en anglais ; les libellés destinés à l'interface restent en français.

## 1. Références et propriétaires

Les choix déjà inscrits dans l'[architecture](../../produit/ARCHITECTURE.md) sont repris : Vendure pour le commerce, cellule isolée par boutique, canaux pour les marchés, autorisations serveur, versions immuables, budgets réservés et reprise après rapprochement. Les formats, transitions détaillées et règles proposées ci-dessous attendent G0.

| Donnée ou terme | Propriétaire de référence | Réutilisation et première responsabilité |
|---|---|---|
| Boutique et cellule | Exploitation | Identité de l'installation ; S00 puis S62 |
| Marché | Configuration commerciale de la cellule | Liaison proposée vers un `Channel` Vendure ; S10 puis S70 |
| Produit, variante, prix, taxes, stock, emplacement | Vendure | Références opaques ; S10, S20, S40 |
| Client, compte d'authentification et groupe client | Vendure | Distinguer `Customer`, `User` et `CustomerGroup` ; S10 |
| Commande, paiement, remboursement, préparation | Vendure | Aucun état local ne les remplace ; S20, S30 |
| Acteur et délégation | Opérations | Identité authentifiée du membre via Vendure ; identité d'agent et délégation propres ; S12 |
| Dossier d'action, approbation, opération et preuve | Opérations | Trace de la décision et des effets ; S12 |
| Connexion, quota et budget | Opérations | Connecteurs lit et traduit l'état du compte externe ; S12 |
| Réservation de stock et tentative asynchrone | Extension commerciale de Vendure | Cycle durable rattaché aux allocations et paiements du moteur ; S20 |
| Version de contenu, artefact et publication | Contenu | S11 puis S21 |
| Réservation d'édition | Contenu | Registre partagé avec SEO et Mesure ; S11 |
| Expérience, attribution et exposition | Mesure | S22 puis S51 |
| Événement de domaine | Module producteur | Opérations transporte et déduplique ; Mesure possède ses projections ; S12 puis S22 |
| Consentement, désinscription et sélection d'audience | Marketing | Référence au client Vendure, avec historique propre ; S32 puis S52 |
| Création, provenance et droits d'utilisation | Marketing | Références au catalogue et aux fichiers, sans dupliquer le produit ; S32 |

Termes précisés pour intégration éventuelle au glossaire :

- **Opération** : un effet métier identifiable dans un dossier d'action. Une nouvelle tentative de transport ne crée pas une nouvelle opération.
- **Résultat incertain** : l'effet externe ne peut pas être confirmé ou exclu. Il ne signifie ni échec ni absence de coût.
- **Réservation de stock** : engagement temporaire d'une quantité pour une commande. Son échéance ne prouve pas que le paiement peut encore être annulé.
- **Réservation d'édition** : protection d'une portée de contenu contre des changements incompatibles pendant une durée ou une expérience.
- **Preuve** : référence à une observation vérifiable, datée et conservée avec un niveau d'accès adapté.

Les IDs sont des chaînes opaques, qualifiées par `shopId` et par type. Ne pas fusionner deux clients à partir de leur seule adresse email. Les entités Vendure ne possèdent pas toutes une révision métier exploitable : `updatedAt` seul n'est pas une garantie de comparaison atomique. Les révisions propres seront contrôlées par comparaison et écriture dans une même transaction ; les cibles commerciales demandent un adaptateur vérifié en G0/S12.

## 2. Contexte

Format : `Context`. Un marché pointe vers un canal explicite. Une langue et une devise doivent appartenir aux valeurs autorisées pour ce canal. Le modèle permet plusieurs langues et devises par canal, mais chaque commande conserve sa devise. Les exemples ont deux marchés fictifs, `market-be` / `channel-be` en EUR et `market-us` / `channel-us` en USD.

Le serveur résout la boutique depuis l'installation et le marché depuis la configuration autorisée. Le navigateur peut demander un contexte ; il ne peut ni déclarer ses propres permissions ni sélectionner la cellule d'un autre marchand. Le jeton de canal ne vaut pas authentification.

`actor` distingue `member`, `customer`, `guest`, `agent` et `system`. Un acteur invité possède un identifiant de session opaque, sans secret dans les journaux. `permissionCodes` représente un constat serveur daté, pas un jeton d'autorisation. `policyVersion` identifie les règles appliquées. Le worker recharge les droits, la délégation et les limites au moment de l'effet.

Pour chaque appel commercial, contrôler côté serveur : identité, canal autorisé, accès à l'objet, permission métier, délégation éventuelle, version cible et limites. Les mêmes règles doivent protéger les mutations natives accessibles et les nouvelles routes. Masquer un bouton ne protège aucune mutation. `Public` ou `Owner` ne donnent pas des droits administratifs. Les exemples `platform.content.propose` sont des codes proposés, pas des permissions natives prétendument existantes.

Ne pas sérialiser de session Vendure complète, de jeton ou de secret dans un contexte commun. La correspondance vers `RequestContext` utilise les points publics du moteur vérifiés dans [SOURCES.md](SOURCES.md).

## 3. Montants

Formats : `Money`, `AmountObservation`, `Quote`.

- `Money.minor` est un entier positif ou nul dans l'unité mineure ; `2500 EUR` avec `scale: 2` représente 25,00 EUR. Pour ce premier contrat, EUR et USD seulement, échelle 2. Toute autre devise est refusée jusqu'à son contrat d'adaptation et ses tests en S70.
- La borne proposée est `2147483647` unités mineures pour rester compatible avec le stockage `int` de la stratégie monétaire par défaut. Pas de somme, de comparaison budgétaire ou de conversion implicite entre devises.
- `AmountObservation.status` vaut `known`, `estimated` ou `unknown`. `unknown` impose `value: null`. Un montant estimé ou inconnu ne permet pas de confirmer un débit. Une estimation a une date de validité ; un montant connu est un constat historique daté.
- Une `Quote` associe commande, version, marché, instant de calcul et validité. `netMinor + taxMinor = totalMinor`, dans une seule devise. Ces valeurs sont les totaux du moteur, après remises et livraison. Ne pas recalculer le total en additionnant des prix unitaires arrondis dans l'interface.
- L'arrondi commercial est celui de la stratégie Vendure configurée, identifié par `roundingPolicy`. La stratégie par défaut consultée applique `Math.round(value * quantity)`. Ce n'est pas une règle fiscale universelle. Les montants négatifs, remboursements et arrondis de conversion devront recevoir leurs propres tests ; un remboursement référence un montant positif et une opération distincte.

Les exemples de taxe à zéro sont une configuration de test fictive, sans prétention fiscale. Un changement d'adresse, de livraison, de quantité, de promotion ou de devise invalide le devis et oblige à recalculer puis reconfirmer le montant. Un coût fournisseur conserve sa devise d'origine. Un budget dans une autre devise bloque l'appel jusqu'à l'existence d'une règle de conversion approuvée.

## 4. Événements

Format : `Event`. `schemaVersion` versionne l'enveloppe ; `type` et `payloadVersion` versionnent le sens et la charge utile. `eventId` est stable lors d'une retransmission. `source` comprend module, type de source, compte externe éventuel et identifiant source. `occurredAt` décrit l'occurrence, `receivedAt` la réception serveur, `recordedAt` la persistance locale. Ces dates ne prouvent pas un ordre causal.

`deduplicationKey` est stable dans le périmètre boutique + source + compte. `aggregate` référence l'objet concerné ; `sequence` est nullable et n'est renseignée que si un producteur garantit une séquence monotone par agrégat. Un horodatage fournisseur ne devient pas une séquence. `correlationId` relie un parcours ; `causationId` pointe vers l'événement causal connu ou vaut `null`.

Le schéma commun ne normalise pas toutes les charges utiles futures. `payload` est un objet dont le producteur doit fournir le schéma avant consommation. Les exemples de paiement transportent seulement une référence, un état observé et un montant.

Règles de traitement proposées :

1. Persister le changement métier et la ligne de sortie dans une même transaction. Pour un événement Vendure, vérifier le point d'émission et la transaction ; un handler bloquant peut être étudié, sans appel distant dans cette transaction.
2. Livrer au moins une fois depuis le journal durable. Chaque consommateur utilise une contrainte unique `(shopId, consumerId, source, accountId, deduplicationKey)`.
3. Enregistrer ensemble la réception dédupliquée, la projection et les opérations sortantes. Deux événements fournisseur distincts concernant le même effet restent protégés par une clé d'opération métier distincte de la clé d'événement.
4. Même clé et même contenu canonique : aucun nouvel effet. Même clé et contenu différent : anomalie conservée, traitement suspendu. Le condensat exclut les dates de réception et de retransmission.
5. Séquence ancienne : conserver la réception mais ne pas rétrograder la projection. Trou dans une séquence garantie : suspendre les effets dépendants et rapprocher. Sans séquence fiable : relire la référence métier et appliquer des transitions compatibles.
6. Schéma majeur inconnu, source non vérifiée ou objet hors boutique : mettre en quarantaine, sans effet commercial.
7. Après interruption ou silence anormal, rapprocher les commandes, paiements et reçus. Conserver un curseur et une fenêtre de recouvrement ; une date de réception seule ne suffit pas.

L'EventBus consulté utilise un flux en mémoire et attend les transactions pour les abonnements ordinaires. Cela ne prouve pas la persistance des messages après un crash. Les événements navigateur restent `source.kind: browser` et ne confirment jamais un paiement. Les durées de rétention, la protection des preuves et l'effacement des données personnelles restent à préciser par lot ; aucune adresse email ni charge fournisseur brute n'est nécessaire dans cette enveloppe.

## 5. Dossier d'action

Formats : `Action`, `Operation`. Le dossier contient le contexte, une cible versionnée, une proposition immuable, un condensat d'approbation, l'autorité d'exécution éventuelle et les opérations prévues. Le condensat lie au minimum boutique, marché, cible/version, proposition, capacités, compte fournisseur, effets et plafond monétaire. Le format de canonisation sera fixé en S12.

`authorization` est soit une approbation humaine, soit une délégation bornée ; elle référence la même liaison. Elle comprend auteur, date, expiration et version de politique. Un changement significatif rend la liaison obsolète. Ne pas recopier l'approbation sur une nouvelle proposition.

| État technique | Libellé et condition |
|---|---|
| `prepared` | Préparée, proposition consultable |
| `awaiting_approval` | En attente de validation |
| `queued` | En file, autorité enregistrée |
| `running` | En cours, prise de travail exclusive |
| `awaiting_provider` | En attente fournisseur, demande acceptée mais non terminée |
| `succeeded` | Réussie, chaque effet requis possède sa preuve |
| `partial` | Partielle, résultats séparés par opération |
| `failed` | Échec établi, avec erreur et caractère reprenable |
| `uncertain` | Résultat incertain, réconciliation nécessaire |
| `cancelled` | Annulée avant effet, ou arrêt des opérations restantes |

Transitions : `prepared → awaiting_approval/queued/cancelled`, `awaiting_approval → queued/cancelled`, `queued → running/awaiting_approval/cancelled`, `running → awaiting_provider/succeeded/partial/failed/uncertain`. L'attente fournisseur mène à `running/failed/uncertain` selon une observation. Une réconciliation peut faire sortir `uncertain` vers un résultat prouvé, sans rejouer les effets acquis. `partial/failed → queued` exige une reprise autorisée des seules opérations restantes.

Avant toute exécution, relire la version et acquérir la protection nécessaire dans la même transaction que l'inscription de l'opération. Une version modifiée avant le premier effet renvoie à `awaiting_approval`, erreur `TARGET_VERSION_CHANGED`. Après un effet partiel, conserver cet effet et produire une nouvelle proposition pour le reste.

Chaque `Operation` porte un `operationId` durable, un `idempotencyKey`, un `requestDigest`, une capacité, la connexion éventuelle, le nombre de tentatives et les références de preuves. Les tentatives réutilisent la même clé et le même contenu. Un changement de contenu exige une nouvelle opération et une nouvelle autorisation. Les erreurs distinguent au minimum refus d'accès, conflit de version, réservation d'édition, données périmées, quota, budget, refus fournisseur et résultat inconnu.

Un accusé de réception fournisseur prouve `awaiting_provider`, pas `succeeded`. En cas de délai dépassé, conserver `uncertain` et chercher la requête avant toute relance. Sans recherche ni idempotence garantissant l'absence de double effet, la reprise automatique est bloquée. Une demande d'arrêt ne transforme pas un paiement ou un message déjà envoyé en opération annulée.

## 6. Connexion et budget

Formats : `Connection`, `BudgetReservation`. Une connexion décrit le fournisseur, le compte, l'environnement, les capacités réellement disponibles, l'état d'accès, le quota observé et une référence serveur vers le secret. Aucun secret n'est exporté. `simulation`, `sandbox` et `production` sont distincts.

Chaque capacité indique les possibilités d'idempotence et de recherche d'état, ainsi que la durée de validité de la clé quand elle est connue. Une capacité `unknown` ne donne aucune garantie. Un quota inconnu reste `remaining: null` et ne devient pas illimité ; une opération payante attend une politique explicite permettant cet appel. Les comptes exemple `provider-demo` ne correspondent à aucun fournisseur choisi.

Avant chaque effet, le serveur contrôle le compte, l'environnement, les capacités, le quota, la permission et la limite par opération. Il réserve atomiquement le plafond de coût dans un budget de même devise. Deux workers ne peuvent pas réserver le même solde.

Une réservation de budget est unique par `(shopId, budgetId, operationId)` et contient `ceiling`, `held`, `knownCost`, l'état et la période d'imputation :

- `held` : plafond entièrement réservé, coût encore inconnu.
- `uncertain` : le même plafond reste réservé. La fin de période ne libère pas cette obligation.
- `reconciled` : coût connu avec reçu, réserve à zéro, coût imputé une fois.
- `released` : absence de coût prouvée, coût zéro, réserve à zéro.

Pour un budget, `disponible = plafond − coûts connus imputés − réserves ouvertes`. Les coûts incertains font partie des réserves ouvertes ; ils ne sont pas soustraits une seconde fois. Exemple : 10,00 EUR de plafond, 2,00 EUR connus, 3,00 EUR réservés dont l'état est incertain donnent 5,00 EUR disponibles.

Une reprise de transport du même effet réutilise sa réservation. Un nouvel effet réellement facturable réserve un budget supplémentaire ; il ne se cache pas derrière le compteur de tentative. Un reçu au-dessus du plafond doit rester enregistrable et déclencher un incident avec blocage des nouveaux appels. Ne jamais tronquer le coût constaté pour faire respecter le plafond. Les plafonds publicitaires continus et les conversions de devises attendent leurs lots spécifiques.

## 7. Contenu et expérience

Formats : `ContentVersion`, `EditLease`, `Publication`, `Exposure`. Une version validée est immuable et référence son contenu par condensat. Un changement crée une autre version avec son parent. La publication pointe vers un artefact construit et vérifié, lié aux versions de page et de thème. Elle change ce pointeur par comparaison de révision, sans reconstruire l'artefact.

La réservation d'édition protège une ressource, une portée et une langue, avec un détenteur, une raison, une date d'expiration et un jeton croissant de génération `fencingToken`. Après expiration ou renouvellement, un ancien éditeur ne peut pas écrire avec son ancien jeton. La création, le renouvellement, la libération et la vérification d'une réservation doivent être atomiques.

Une expérience active protège aussi sa version dans le registre d'expériences. L'expiration accidentelle de la réservation ne permet pas à SEO de publier silencieusement : la publication doit vérifier le registre, ou suspendre l'expérience avant de lever la protection. Observer reste permis ; modifier une portée protégée renvoie `EDIT_RESERVED`. Une dérogation humaine arrête ou invalide d'abord le protocole et ses expositions futures.

`Exposure` lie expérience/version/protocole, variante réellement rendue, version de page, artefact, contexte de marché et sujet pseudonyme. `assignmentId` est stable pour une unité expérimentale définie. L'attribution seule n'est pas une exposition. Les événements ne sont émis qu'après le critère de rendu fixé par le protocole. Une expérience email utilise une définition de mesure distincte ; aucune ouverture fiable n'est déduite d'un simple envoi.

Clé du cache public proposée, encodée sans ambiguïté :

`shopId + marketId + channelId + languageCode + currencyCode + publicationId + artifactId + pageId + pageVersion + experimentId/version + variantId + audiencePartition + catalogRevision`

Les champs d'expérience valent explicitement `none` hors expérience. `audiencePartition` vaut `public` pour le premier jalon ; prix client, panier, session et B2B privé excluent le cache partagé. Tout autre facteur qui change le rendu entre dans une partition bornée ou entraîne la désactivation du cache. Un prix ou une remise expérimentale reste validé par le serveur commercial.

Le champ `Publication.cache` illustre une clé dérivée pour un rendu précis de cette publication. Il ne fixe pas la variante de tous les visiteurs : la requête résout son contexte et son attribution avant de construire sa propre clé.

Publication et retour arrière invalident le pointeur courant, les routes touchées et leurs partitions ; un changement catalogue invalide les pages produit dépendantes. Les artefacts immuables restent identifiés. Le retour arrière du site ne rétablit ni une ancienne commande ni un ancien paiement. Les tests devront servir successivement deux marchés et deux variantes, puis vérifier qu'aucun rendu ne traverse les partitions.

## 8. Paiement et stock

Formats : `StockReservation`, `PaymentAttempt`. Les commandes, allocations, paiements et remboursements restent dans Vendure. Les objets proposés ajoutent la durée de réservation, la clé d'opération et la connaissance de l'appel externe.

Proposition à éprouver en S20 : créer une allocation Vendure avant l'appel distant, dans une transaction courte qui verrouille les niveaux, relit la disponibilité, inscrit la réservation et prépare l'opération durable. La réservation référence les mouvements du moteur ; elle ne soustrait pas une deuxième fois la quantité au stock vendable. La stratégie d'allocation doit être adaptée pour empêcher une deuxième allocation lors de l'autorisation ou du règlement. Tous les chemins d'achat et de modification de stock concernés doivent respecter ce protocole.

Les sources offrent `StockAllocationStrategy` et les services de mouvements de stock. Leur existence ne valide pas encore ce raccordement. L'entrée dans `ArrangingPayment`, le retour au panier, les modifications de ligne, l'annulation et la préparation nécessitent une recette combinée. Le checker synchrone expérimental ne peut pas être conservé tel quel s'il interprète la propre allocation de la commande comme du stock indisponible.

| Réservation | Sens et sortie |
|---|---|
| `held` | Quantité allouée avant envoi ; sortie vers paiement, expiration sûre ou annulation sûre |
| `payment_pending` | Appel parti ou envoi possible après interruption ; allocation conservée |
| `uncertain` | Échéance dépassée ou résultat inconnu ; allocation conservée |
| `confirmed` | Paiement rapproché ; allocation conservée jusqu'au parcours normal de préparation |
| `expired` | Échéance dépassée et absence d'encaissement futur prouvée ; allocation libérée une fois |
| `released` | Annulation/refus définitif prouvé ; allocation libérée une fois |

Une réservation est liée à une version et une empreinte de commande, à une devise, à des lignes et emplacements, à un paiement éventuel et à une échéance serveur. Un changement du panier n'est pas appliqué à une réservation active sans annulation sûre et nouveau calcul. Les tests initiaux portent sur stock suivi, sans survente et sur un emplacement.

`PaymentAttempt.state` distingue `prepared`, `submitted`, `pending`, `authorized`, `settled`, `declined`, `cancel_pending`, `cancelled`, `unknown`. `vendurePaymentId` peut être `null` avant la création du paiement moteur. L'état `unknown` décrit notre connaissance ; il ne crée pas un état Vendure natif nommé ainsi.

Avant de contacter le fournisseur, persister l'opération et sa clé ; un crash entre marquage d'envoi et réception du résultat doit pouvoir être traité comme incertain. Après réponse ou webhook authentifié, vérifier compte fournisseur, environnement, montant, devise, commande et identité de transaction. Rapprocher l'état fournisseur et le paiement moteur avant d'annoncer l'achat. Le retour du navigateur n'est pas une confirmation.

À l'échéance :

1. Si aucun appel n'a pu partir, passer à `expired` et libérer transactionnellement.
2. Si un appel peut avoir abouti, demander l'état ou l'annulation idempotente. Passer à `uncertain` tant que le résultat reste inconnu et garder l'allocation.
3. Après refus définitif ou annulation confirmée qui exclut un règlement tardif, libérer une fois.
4. Après confirmation du paiement, conserver l'allocation et confirmer la commande une fois.

Les jobs d'expiration et webhooks se sérialisent sur la même réservation et relisent son état. Aucun verrou SQL ne reste ouvert pendant l'attente fournisseur. Une ancienne réservation `expired/released` ne ressuscite pas : une confirmation contradictoire crée un incident et une compensation autorisée. Si une politique future libère du stock malgré une incertitude, elle doit prévoir un nouveau contrôle atomique et un remboursement en cas d'indisponibilité. Cette politique n'est pas proposée pour le premier jalon.

Une autorisation de paiement et un règlement sont distincts. L'expiration d'une autorisation ne se déduit pas de notre minuterie locale. Rembourser ne réapprovisionne pas automatiquement des articles expédiés.

## 9. Audience

Format : `AudienceMember`. L'identité renvoie au `Customer` Vendure et à une référence de destination serveur. Les groupes sont des références Vendure datées ; un groupe n'est pas un consentement. Le registre conserve un état par finalité, canal et marché : `granted`, `denied`, `withdrawn`, `unknown`, avec version, date d'effet, validité et preuve.

Une désinscription effective bloque les futurs envois marketing de son périmètre, y compris les messages déjà en file mais non transmis. Elle prime sur une ancienne sélection d'audience. La finalité d'un message transactionnel est distincte et ne sert pas à contourner une désinscription marketing. Ces règles techniques ne constituent pas une qualification juridique des bases de traitement.

Une campagne prépare une photographie de sélection ; le serveur recharge avant chaque diffusion le consentement, la désinscription, les groupes utiles, les droits sur la création, l'offre et la disponibilité commerciale. Les observations expirées ou inconnues bloquent les destinataires concernés. Un changement de prix, d'offre ou de contenu exige une nouvelle validation de la proposition ; un simple filtre de destinataires n'autorise pas à inventer un autre message.

Si désinscription et envoi se chevauchent, sérialiser la prise en charge locale et l'événement de désinscription. Une transmission déjà partie ne peut pas être rappelée avec certitude ; conserver l'heure d'envoi et la preuve, arrêter les suivantes et afficher la limite. La déduplication porte sur destinataire pseudonyme + finalité + occurrence de diffusion, pas sur l'email en clair.

## 10. Création

Format : `Creation`. La création possède sa version, les références de produits/variantes et leurs versions observées, le fournisseur et son modèle éventuels, la version du brief, les sources utilisées et le condensat de l'artefact. Une image créée par IA ne prouve pas une caractéristique produit.

`rights` indique `unknown`, `restricted`, `cleared` ou `expired`, avec titulaire déclaré, usages, canaux, territoires, période et référence de preuve. Un champ manquant ou inconnu n'accorde aucun droit. La diffusion exige une vérification applicable au canal, marché et instant ; elle contrôle aussi les autorisations de voix, image ou créateur lorsqu'elles sont requises pour ce contenu.

`fidelityStatus` sépare `unreviewed`, `approved` et `rejected`. L'approbation lie version de la création et versions produit consultées. Une modification du produit invalide la vérification concernée ; elle ne change pas silencieusement le fichier déjà diffusé. Une nouvelle génération crée une nouvelle version et conserve la provenance antérieure.

## 11. Limites de validation et passage à l'implémentation

Le schéma vérifie les formes, états et quelques contraintes conditionnelles. Le validateur d'exemples contrôle aussi des égalités entre champs et références. Il ne prouve ni autorisation, ni signature fournisseur, ni transaction, ni unicité SQL, ni comportement concurrent.

Les [scénarios d'acceptation](SCENARIOS.md) sont les exigences de preuve pour S11, S12, S20 et les lots suivants. Les [décisions G0](../G0/DECISIONS.md) arrêtent les conventions et les points à éprouver. `packages/contracts` contient la seule source des formats ; d'éventuels types seront générés à partir de ce schéma, jamais maintenus en parallèle.
