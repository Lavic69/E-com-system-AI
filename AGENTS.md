# Travail sur E-com-system-AI

## Point de départ

- Lire la mission demandée, `docs/pilotage/PLAN_EXECUTION.md` et `docs/pilotage/COORDINATION.md`.
- Lire seulement les documents produit et fichiers nécessaires au lot.
- Reprendre le plan et les validations existantes. Une mission de planification reste documentaire.
- Le projet comprend un banc expérimental sous `experiments/core-validation`. Il ne constitue pas l'application.

## Méthode

- Utiliser `karpathy-guidelines` comme base.
- Utiliser `interface-design` pour l'administration, `domain-modeling` pour les termes, `diagnosing-bugs` quand la cause est incertaine et `evidence-driven-testing` pour une preuve d'exécution.
- Employer les autres skills à l'étape où ils apportent une vérification utile ; ne pas installer de pipeline supplémentaire.
- Pour une interface web créée ou modifiée, lire `~/AI-Setup/docs/responsively.md`, puis vérifier les dimensions des parcours dans `/Applications/ResponsivelyApp.app` stable avec les outils graphiques autorisés. La bêta et le MCP ont été retirés volontairement ; ne pas les réinstaller. Signaler une vérification indisponible.
- Réserver l'usage des outils graphiques communs conformément au protocole de coordination.
- Progresser jusqu'aux critères du lot, avec corrections et relecture. Les choix ordinaires ne demandent pas une validation supplémentaire.

## Sessions parallèles

- Une session prend un seul lot actif et respecte ses fichiers autorisés.
- Avant G0, les trois missions de préparation ont des destinations distinctes dans le même checkout.
- Après G0, chaque mission de code utilise son propre worktree et des ressources d'exécution propres, depuis la même base intégrée.
- Les fichiers partagés sont modifiés par l'intégrateur désigné, pas par plusieurs sessions.
- Une dépendance manquante peut être simulée pour un test local, mais cette simulation ne valide pas le parcours intégré.
- Remettre une livraison traçable avec les preuves et raccordements requis. Ne pas modifier le statut global du plan depuis une session de réalisation.

## Autorisations et protection

- Travail local uniquement par défaut. Ne pas déployer ou publier un site pour rendre un aperçu consultable.
- Ne pas committer, pousser, fusionner, dépenser ou envoyer de messages externes sans autorisation correspondant à l'action. Une autorisation déjà donnée reste valable.
- Une mission écrite dans ce dépôt ne constitue pas à elle seule une autorisation de lancer une autre mission.
- Respecter les blocages du garde de commandes et les protections macOS. Ne pas contourner un refus par un autre outil.
- Garder les secrets côté serveur, hors des prompts, journaux et commits. Ne pas copier automatiquement les fichiers `.env` entre sessions.
- Préserver les fichiers de travail, serveurs et bases d'autres sessions. Arrêter seulement les processus démarrés pour sa mission.
- Ne pas incorporer les fichiers récupérés chez Amboras dans le produit.

## Livraison

- Distinguer travail réalisé, vérifications réussies, échecs et éléments non testés.
- Ne pas déclarer une fonctionnalité terminée sur la seule base d'un build, d'un mock ou d'un HTTP 200.
- Relire le diff, les effets sur les données, appelants, erreurs et permissions.
- Garder les preuves locales et appliquer `unslop` aux textes rédigés.
