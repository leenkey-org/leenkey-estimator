# CHANGELOG

Format : une entrée par PR fusionnée dans `v2`, la plus récente en haut. Les versions taguées regroupent les entrées d'un lot.

## [Non publié]

<!-- Modèle :
### YYYY-MM-DD · L1-03 · PR #12
- Ajouté : …
- Modifié : …
- Corrigé : …
- Migration : 20261012_profiles.sql
-->

### 2026-10-08 · L1-02 · Environnements et préprod
- Ajouté : `lib/env.ts` (`NEXT_PUBLIC_ENV`), protection HTTP Basic de la préprod dans `middleware.ts` (comparaison en temps constant, webhooks et crons exemptés), `X-Robots-Tag: noindex, nofollow` et `robots.ts` fermé hors production, bandeau « Environnement de test », clients Supabase server, client et admin (`server-only`), règle ESLint qui limite le client service role aux webhooks, crons et actions admin.
- Modifié : GA4 et GTM chargés uniquement en production ; fonctions Vercel à Paris (`cdg1`) ; CI construite et testée en mode production.

### 2026-10-08 · L1-01 · PR #4 · Projet Next.js 15 et reprise de la V1
- Ajouté : tests de non-régression du moteur d'estimation (24 cas, tous types de bien, résultats V1 figés avant le portage) ; Vitest, Playwright (21 parcours : pages, formulaire de contact, estimateur, page_view GA4), CI GitHub Actions (lint, typecheck, test, build, E2E).
- Modifié : passage de Vite + TanStack Router à Next.js 15 (App Router). Estimateur et moteur dans `leenkey/estimator/` sans changement de logique ; pages V1 dans `app/(public)/` ; 4 endpoints en route handlers aux mêmes chemins ; GA4, GTM (noscript compris), Vercel Analytics, en-tête no-cache sur `/pages/*`, redirections leenkey.com et www.
- Corrigé : modèle IA de l'analyse écrite (`claude-sonnet-5-5`, report du correctif Q22 de `main`).
- Vérifié : rendu identique au pixel près à la V1 sur les 9 pages, en 390 et 1280 px.
- Signalé : bug V1 du moteur (bien atypique à 0 € quand le budget travaux dépasse la valeur, Q29), figé dans les tests et non corrigé.

### 2026-10-05 · Session 0 · docs/session-0
- Ajouté : pack de démarrage V2 (CLAUDE.md fusionné avec le contexte V1, SPEC, DECISIONS, PLANNING, RECETTE, SECURITE, maquettes, FAQ de Cédric, commandes Claude Code).
- Modifié : intégration du pack corrigé du 2026-10-07 (décisions Hoguet, libellé « validé », paiement des 20 % à la préprod validée) puis du pack « Façade » (nouvelle direction artistique et maquettes) et corrections de cadrage de la session 0 (branche `v2` comme staging, hiérarchie des documents, statut `suspended`, `financing_documents`, bucket `offers`, quotas IA, outils, règles éditoriales, planning rééquilibré).

## v2.0.0-lot1 · à venir
## v2.0.0-lot2 · à venir
## v2.0.0-lot3 · à venir
## v2.0.0 · mise en production · à venir
