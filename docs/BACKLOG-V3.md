# BACKLOG V3

Demandes et idées hors périmètre V2. Rien de cette liste n'est implémenté en V2. Chaque ligne : date, origine, description, estimation éventuelle.

## Déjà identifié (SPEC-V2 section 25 et décisions client)

| Date | Origine | Sujet | Note |
|---|---|---|---|
| 2026-10-01 | Cédric | Contre-offre structurée | Statut `counter_offer` prévu ; en V2 la négociation passe par la messagerie |
| 2026-09 | Proposition | Signature électronique (Yousign) | Option chiffrée 1 500 € HT |
| 2026-09 | Proposition | Diffusion sur les portails externes | Écartée : exclusivité Leenkey |
| — | SPEC | Application mobile native | — |
| — | SPEC | Édition de la base de connaissances depuis le back office | En V2 : import de fichiers |
| — | SPEC | Services à l'unité, portail client Stripe, abonnements | — |
| — | SPEC | Multi-langue | — |
| — | SPEC | Import depuis un logiciel métier | — |
| — | SPEC | Purge automatique des données des ventes conclues après 12 mois | À cadrer avec la politique de confidentialité |
| — | SPEC | Connexion Google / Apple | — |
| — | SPEC | Statistiques avancées pour l'admin | — |
| 2026-10-01 | Cédric | Remise multi-biens, formule investisseur | Possible techniquement (`plans.scope`, `discount_cents`) |
| 2026-10-01 | Cédric | Bilan de vente avec économie estimée face à une agence | Q8, `sold_price_cents` déjà stocké |

## Ajouts pendant le développement

| Date | Origine | Sujet | Note |
|---|---|---|---|
| 2026-10-05 | Younes (session 0) | Pages SEO par ville `/acheter/[ville]` (ancienne partie de L1-20) | Hors cahier des charges. Environ 1,5 j. Pertinent quand la zone compte ≥ 3 annonces par ville |
| 2026-10-05 | Younes (session 0) | Bouton « Expliquer cette offre » (prompt `offer-explain.md`, `MODELS.smart`) | En V2, le vendeur pose la question à l'assistant (`summarize_offer`). Environ 0,5 j |
| 2026-10-05 | Younes (session 0) | Séries de créneaux de visite (ex. tous les samedis de 10 h à 12 h pendant 4 semaines) | En V2 : créneaux ponctuels. Environ 1 j |
