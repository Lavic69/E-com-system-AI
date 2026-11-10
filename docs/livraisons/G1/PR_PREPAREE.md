# Intégrer le catalogue, les pages versionnées et les actions durables

S10, S11 et S12 étaient livrées dans des worktrees isolés. Cette intégration compose leurs plugins et migrations, puis permet à une action approuvée d'enregistrer une vraie version de page référençant un produit catalogue. Le worker reprend les actions locales et remet les événements à un consommateur durable dédupliqué.

L'écriture de contenu, l'état de l'action et l'événement partagent la transaction. Les conflits de révision, baux expirés, retraits de droits et références manquantes sont refusés avant effet. La restauration conserve l'identité de boutique malgré le changement de nom de base. La canonisation accepte les littéraux JSON GraphQL sans changer le condensat des valeurs équivalentes.

Validation : `npm run test:all` réussi, dont 15 scénarios G1, 23 S10, 19 S11, 17 tests S12, 16 scénarios du socle et 81 contrôles de contrats. TypeScript et build Dashboard réussis. Recette Responsively sur 1440×900, 1024×768, 390×844 et 360×800. Voir `docs/livraisons/G1/RESULTAT.md`.

Limites : actions locales de membre uniquement ; pas de storefront publié, paiement, envoi externe ou agent commercial. Les transports de simulation S12 restent dans leur recette isolée. Le scheduler général et les appareils physiques ne sont pas vérifiés.

Base des trois lots : `2b4c84e7f1e7187c2e1d18905cf6a3d723e5c086`. Les sources non commitées sont identifiées par `preuves/transfert.json`. Le SHA du commit G1 et les contrôles qui lui correspondent sont à compléter après autorisation de versionnement. Ce document est un brouillon local, aucune PR n'a été ouverte.
