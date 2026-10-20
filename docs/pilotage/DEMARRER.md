# Lancer les sessions Codex

Le [plan](PLAN_EXECUTION.md) couvre le produit complet. S00, S01 et S02 sont livrées et G0 vérifié. **Ne pas relancer leurs messages ci-dessous : ils décrivent la première vague historique.** Le premier commit de `main` porte la base G0 locale ; son [résultat](../livraisons/G0/RESULTAT.md) donne les preuves et limites.

## 1. Dossier à ouvrir

Ouvrir ce checkout local dans Codex :

```text
/Users/lavic/Desktop/Amboras REA/E-com-system-AI
```

Le dépôt distant est [Lavic69/E-com-system-AI](https://github.com/Lavic69/E-com-system-AI). Il était vide lors de cette préparation. Les fichiers présents ont été préparés localement ; ils ne sont pas encore accessibles depuis un clone effectué sur une autre machine.

## 2. Première vague historique, avec trois sessions

Ouvrir trois conversations **Local** sur ce dossier. Pour cette première vague, les destinations autorisées sont disjointes et précisées dans chaque fiche.

### Session A

```text
Dans /Users/lavic/Desktop/Amboras REA/E-com-system-AI, prends la mission S00.
Lis AGENTS.md puis docs/pilotage/missions/S00-socle.md et les références indiquées.
Réalise seulement cette mission, en respectant ses chemins autorisés.
Les sessions S01 et S02 peuvent travailler en parallèle : ne modifie pas leurs dossiers.
Travaille localement et livre les résultats et preuves dans docs/livraisons/S00/RESULTAT.md.
Ne crée pas de commit, de push ou de déploiement sans mon autorisation.
```

### Session B

```text
Dans /Users/lavic/Desktop/Amboras REA/E-com-system-AI, prends la mission S01.
Lis AGENTS.md puis docs/pilotage/missions/S01-interface.md et les références indiquées.
Reprends les parcours et la proposition de direction déjà écrits.
Travaille uniquement dans docs/livraisons/S01/ et respecte la coordination des outils graphiques.
Livre une conception concrète avec les états et vérifications ; aucune publication externe.
Ne touche pas au socle technique ni aux contrats de S02.
```

### Session C

```text
Dans /Users/lavic/Desktop/Amboras REA/E-com-system-AI, prends la mission S02.
Lis AGENTS.md puis docs/pilotage/missions/S02-contrats.md et les références indiquées.
Travaille uniquement dans docs/livraisons/S02/.
Prépare les contrats communs minimaux, exemples et scénarios d'acceptation.
Ne modifie pas les schémas, dépendances ou fichiers d'application de S00.
Livre docs/livraisons/S02/RESULTAT.md avec les décisions proposées et les points à arbitrer.
```

Ces missions peuvent démarrer ensemble. Cela ne signifie pas que trois branches de fonctionnalités peuvent déjà être intégrées : la première base commune n'existe pas encore.

## 3. Avec deux sessions

Lancer S00 et S01. Quand l'une est livrée, utiliser une nouvelle conversation pour S02. Ne pas mélanger S01 et S02 dans un même lot actif. G0 attend les trois livraisons.

## 4. Intégration des trois livraisons

Dans la session A ou dans une conversation d'intégration :

```text
Dans E-com-system-AI, prépare le point d'intégration G0 décrit dans le plan.
Lis les livraisons S00, S01 et S02. Vérifie les contrats, les versions et les preuves.
Réconcilie les propositions, exécute les contrôles d'intégration, puis mets à jour le plan.
Prépare les fiches S10, S11 et S12 avec leurs chemins exacts et critères.
Présente l'état à versionner et les fichiers du commit initial ; ne committe ni ne pousse sans autorisation.
```

Les autorisations déjà données dans la conversation d'intégration restent valables. Le commit initial devra correspondre à l'état réellement revu. Le dépôt ne doit pas inclure les preuves privées Amboras, les secrets ou les bases locales.

## 5. À partir de la deuxième vague

Après G0, le plan contient un SHA de base réel et les fiches suivantes marquées `Prêt`.

Les fiches [S10](missions/S10-catalogue.md), [S11](missions/S11-pages.md) et [S12](missions/S12-operations.md) sont prêtes, mais non lancées. Les branches prévues sont `feat/s10-catalogue`, `feat/s11-pages` et `feat/s12-operations`. Toutes partent du même SHA G0, identifié dans le plan ; le cycle vers `integration/g1` puis `main` est défini dans [COORDINATION.md](COORDINATION.md#branches-commits-push-et-intégration).

Dans Codex, ouvrir chaque mission de code en mode **Worktree**, depuis la branche qui contient cette base. Vérifier que les trois sessions partent du même état intégré. [Documentation des worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)

Le message de lancement prend ensuite cette forme :

```text
Prends le lot Sxx dont la fiche est indiquée dans docs/pilotage/PLAN_EXECUTION.md.
Lis AGENTS.md et la fiche avant de modifier des fichiers.
Vérifie ton worktree, le SHA de base et les ressources qui te sont attribuées.
Réalise le lot jusqu'à ses critères de sortie, dans les chemins autorisés.
Livre les changements, preuves, limites et raccordements requis.
Respecte les autorisations de commit, fusion, publication et dépense de cette conversation.
```

Sxx est remplacé par l'identifiant d'une mission réellement prête. Ne pas lancer les seuls intitulés S20 à S92 avant leur détail et leurs dépendances.

## 6. Ce que Victor doit suivre

- Chaque session annonce son lot et son résultat attendu.
- Une question concerne une décision qui change le produit, le périmètre ou une action nécessitant une autorisation.
- Une livraison contient un parcours démontré, ses preuves et ses limites.
- Après chaque vague, une intégration vérifie le fonctionnement combiné avant les lots suivants.

Le nom final, les marchands pilotes, le budget des API et la licence de publication pourront être décidés au moment où ils conditionnent un lot. Ils ne bloquent pas les trois missions préparatoires.
