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
| 2026-10-15 | Younes (dossier juridique) | Effacement automatique des données par catégorie (comptes inactifs, annonces, messages, offres, justificatifs, factures) | Hors périmètre V2. Durées à fixer avec l'avocat (`DECISIONS.md` Q37) |
| 2026-10-15 | Dossier juridique | Procédure de recours formalisée pour la modération (au-delà de la version minimale du SPEC section 17) | Seulement si l'avocat la juge obligatoire pour Leenkey (DSA) |
| 2026-10-19 | Claude Code (L1-13b) | Mesure du passage de l'analyse de valeur à l'annonce (événements GA4 « analyse terminée », « Créer mon annonce », « annonce envoyée ») | Après consentement (L1-37). Sans elle, le taux de conversion de l'estimateur vers la vente n'est pas connu. Environ 0,5 j |
| 2026-10-20 | Claude Code (revue de L1-47) | Graphique des demandes de visite sur 7 jours dans le tableau de bord vendeur, comme dans l'aperçu de l'accueil V1 | SPEC 8.7 prévoit trois chiffres sans graphique. Environ 0,5 j |
| 2026-10-26 | Younes (maquette de la direction C) | « Carte des prix » (pilule du hero de l'accueil) : les prix au m² par quartier sur une carte, depuis les ventes DVF | Aucune carte des prix au périmètre ; les ventes DVF sont déjà lues par l'estimateur. Remplacée par « Nos formules » en attendant. Environ 3 j |
| 2026-10-26 | Younes (maquette de la direction C) | Catégories « Plain-pied » et « Proche gare » du carrousel de l'accueil | Demandent une caractéristique « plain-pied » du bien (nouvelle colonne, SPEC section 4) et la distance à une gare (données ouvertes SNCF) ; laissées de côté faute de données. Environ 1,5 j |
| 2026-10-27 | Younes (refonte D, L1-57) | Recherche en langage naturel (« Maison 4 pièces avec jardin à Savigny ») et dictée par micro, sous la barre « Acheter » de l'accueil | Demande l'assistant acquéreur (lot 2) ou un analyseur de requête, et l'API de reconnaissance vocale du navigateur ; ni dans la SPEC ni dans le plan |
