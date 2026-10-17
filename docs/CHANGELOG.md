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

### 2026-10-17 · L1-36, L1-37 · PR #? · Pages légales et bandeau cookies
- Ajouté : bandeau de consentement aux cookies (Accepter, Refuser de même forme, Personnaliser), choix gardé 6 mois et modifiable par « Gérer mes cookies » ; GA4 et GTM chargés seulement après accord, en production (Consent Mode, publicité toujours refusée, cookies GA de 13 mois au plus) ; retrait qui efface les cookies Google.
- Ajouté : pages `/cgv`, `/cookies` (liste des cookies du site), `/signalement`, `/intelligence-artificielle` (en cours de rédaction, adresse légale) ; pied de page V2 avec tous les liens légaux et l'identité de Leenkey ; mêmes liens dans le pied des pages marketing ; `ConsentBanner` et `SiteFooter` sur `/design`.
- Modifié : mentions légales (paragraphe « Cookies » corrigé, renvoi à `/cookies`) ; `/confidentialite` sur le gabarit des pages légales ; le `noscript` de GTM est retiré.
- Tests : unitaires (cookie de consentement, liens légaux) ; E2E : aucun script ni cookie Google avant accord, refus gardé, acceptation, personnalisation, réouverture depuis les deux pieds de page, retrait, pages légales et pieds de page, accessibilité.

### 2026-10-16 · L1-09 · PR #14 · Inscription et connexion
- Ajouté : `/inscription` (choix « Je vends » / « J'achète », indicateur de robustesse du mot de passe, case CGU et confidentialité), `/connexion`, `/mot-de-passe-oublie`, `/reinitialiser`, `/auth/confirm` et `/confirmation` (liens des emails : le jeton est gardé dans un cookie et utilisé par un bouton, valable depuis n'importe quel navigateur, jamais consommé par un antivirus de messagerie, jamais dans l'adresse d'une page), « Renvoyer l'email » à la connexion d'un compte non confirmé, retour à la page d'origine (`?next=`, chemins du site uniquement), `/conditions` (nouvelle version des textes à accepter), pages d'attente `/vendeur`, `/acquereur` et `/admin` (rôle admin, 404 sinon), `/confidentialite` (en cours de rédaction).
- Ajouté : middleware qui renouvelle la session Supabase et protège les espaces connectés ; modèles d'email Supabase (`supabase/templates/`) ; composants `RoleCards` et `Checkbox`, ton « succès » d'`InlineAlert`, sur `/design` ; `scripts/local-stack.sh` (pile locale Supabase Auth, API et emails capturés).
- Migrations : `20261016110000_legal_acceptances.sql` (acceptations datées et versionnées, contexte `update`, `legal_accept`, trigger d'inscription) ; `20261016120000_legal_accept_update.sql` (après revue : contexte `update` sur `/conditions`, pas de doublon, pas de version datée dans le futur).
- Sécurité (revue) : aucune redirection hors du site après connexion (chemins normalisés vérifiés), déconnexion de cet appareil seulement, autres sessions fermées après un changement de mot de passe, réponses identiques qu'un compte existe ou non, rôle admin vérifié sur chaque page du back office, routes de Leenkey sorties de `core/`.
- Tests : 33 tests de permissions (les cinq comptes et un visiteur anonyme) ; tests unitaires (redirections, validation, robustesse) ; E2E sans base (protection, erreurs, accessibilité) et parcours complet avec emails réels sur la pile locale (inscription, confirmation depuis un autre navigateur, lien déjà utilisé, mot de passe oublié, conditions des comptes de seed, back office refusé à un vendeur).

### 2026-10-16 · L1-15, L1-17 · PR #15 · Recherche et page annonce
- Ajouté : recherche `/acheter` (fonction `search_listings`, filtres combinés et partageables dans l'URL, suggestions des communes de la zone de lancement, panneau de filtres « Voir N biens », tri, « Voir plus ») ; page annonce `/annonce/[slug]` (galerie, chiffres clés, « Ce que vous savez avant de visiter », actions vers l'inscription acquéreur, métadonnées, JSON-LD, image de partage `/api/og/[slug]`, une vue comptée par visiteur et par jour) ; composants `FilterSelect`, `ChipButton`, `InlineAlert`, `Skeleton`, `PriceBlock`, `ContactCard`, `KeyFactsTable`, `Gallery` dans `/design`.
- Modifié : `public_listings` (5 colonnes publiques de plus, lignes lues dans `public_listings_details()`, vue remplacée sans suppression) ; `listing_view_increment` ne compte ni le propriétaire ni l'admin.
- Migration : `20261016100000_search_listings.sql`.
- Tests : `rls_search_listings.sql` (73 assertions), 53 tests unitaires, `tests/e2e/search.spec.ts` (mode `E2E_SEED=1` sur base de seed, mode sans base en CI).

### 2026-10-16 · L1-06 · PR #13 · Seed complet
- Ajouté : `npm run db:seed` (local) et `npm run db:seed:staging`, refusés en production ; une transaction, idempotent. Formules et droits, six étapes de vente par formule (section 9), 73 fiches de la FAQ de Cédric, comptes `seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin` (`@test.leenkey.fr`), 16 biens fictifs dans la zone de lancement (12 publiés, 3 en attente, 1 refusé), formules Accompagné et Sérénité sur deux biens avec leur conversation conseiller, conversations acquéreurs, favoris, vues.
- Migration : `20261015140000_seed_support.sql` (colonne `sale_step_tasks.owner`, clé d'import de la base de connaissances).
- Tests : les tests de permissions passent sur une base vide et sur une base seedée ; la CI vérifie l'idempotence et les volumes du seed.
- Corrigé : FAQ de Cédric, fiche « Combien coûtent les formules ? » : deux séparateurs de ligne invisibles (U+2028) remplacés par de vrais retours à la ligne.
- Préprod : migration et seed joués sur `leenkey-staging` ; FAQ, biens et messages vérifiés identiques au dépôt par empreinte.

### 2026-10-16 · L1-07, L1-08 · PR #12 · Design system Façade
- Ajouté : design system Façade (tokens préfixés `lk`, Archivo avec axe de largeur, formats de prix, surfaces et dates, 17 composants partagés dont `Button`, `Input`, `UnitInput`, `ChipToggle`, `SegmentedPicker`, `StatusBadge`, `DpeBadge`, `KeyFigures`, `BrandPanel`, `PropertyCard`), page `/design` hors production, dessin `public/brand/facade.svg` et `EmptyState`.
- Vérifié : les 9 pages V1 sont identiques à l'octet près en 390 et 1280 px avant et après ; axe sans violation sérieuse ni critique sur `/design`.

### 2026-10-15 · Q29 · PR #11 · Bien atypique à restaurer jamais à 0 €
- Corrigé : moteur de valorisation, biens atypiques : le budget de travaux déclaré est déduit dans la limite de 70 % de la valeur avant travaux. Seul cas modifié parmi les 24 cas de non-régression : château à restaurer (650 m², 600 000 € de travaux) **0 € → 168 000 €** (fourchette 0 – 0 → 119 000 – 217 000 €, 258 €/m²). Les 23 autres cas sont identiques. V2 uniquement : la V1 en ligne n'est pas modifiée.
- Tests : snapshot du château mis à jour, test ajouté (aucun budget de travaux ne ramène un bien atypique à 0 €).

### 2026-10-15 · Documentation · PR #10 · Décisions du 15 octobre
- Ajouté : `docs/juridique/` (dossier juridique du 9 octobre converti, non publiable en l'état ; index avec ce qui est intégré au produit et questions pour l'avocat ; liste des prestataires techniques).
- Modifié : CLAUDE.md, SPEC, DEMARRAGE et SECURITE : rien n'est jamais poussé ni fusionné dans `main` ; mise en ligne de la V2 avant le 30 novembre par changement de la branche de production dans Vercel (P-05b).
- Modifié : SPEC : date de fin des formules (`ends_at`, retour en Autonomie), table `legal_acceptances`, vente conforme des formules (section 11, nouvelle tâche L1-40), signalement en version minimale, aucun justificatif envoyé à l'IA, Opus 5.5 pour les analyses et Sonnet 5.5 pour la conversation, prestataires techniques.
- Modifié : DECISIONS (décisions du 15 octobre, Q17 et Q29 closes, questions Q30 à Q37 pour Cédric), PLANNING recalé (lot 1 au 13 novembre, quatre éléments décalés en S6, mise en ligne la semaine du 23 novembre), BACKLOG-V3 (effacement automatique des données).

### 2026-10-15 · L1-05 · PR #9 · Formules, étapes de vente, messagerie, dossiers
- Ajouté : tables `plans`, `plan_entitlements`, `subscriptions` (durée de 12 mois calculée à l'activation, `ends_at`), `stripe_events`, `upgrade_prompts`, `sale_steps`, `sale_step_tasks`, `sale_progress` (créée avec le bien), `sale_task_status`, `conversations`, `messages`, `reports`, `cases`, `case_notes`, `notifications`, `knowledge_base` (vecteurs 384), `ai_conversations`, `ai_messages`, toutes avec RLS ; formule en cours d'un bien (`property_current_plan` : retour en Autonomie à l'échéance) ; ouverture d'une conversation par l'acquéreur sur une annonce publiée (`conversation_start`), lecture (`conversation_mark_read`) ; l'admin écrit seulement dans les conversations conseiller ; résumé acquéreur pour le vendeur sans montants (`buyer_summary_for_seller`) ; rôles et suspension de compte par l'admin, journalisés (`admin_set_roles`, `admin_suspend_user`, `admin_unsuspend_user`) ; formule de la vente affichée dans `public_listings`.
- Modifié : fonctions d'aide (`is_admin`, `owns_property`…) réservées aux utilisateurs connectés.
- Tests : 82 tests de permissions (184 au total).
- Migration : 20261015130000_plans_sales_messaging.sql

### 2026-10-15 · L1-04 · PR #8 · Biens et annonces
- Ajouté : tables `estimations`, `properties`, `listings`, `photos`, `listing_views`, `favorites`, `audit_log` (avancée de L1-05) avec RLS et droits par colonne ; référence `LK-0001` et adresse de page (slug) générées en base ; position publique du bien arrondie à environ 200 m, calculée en base et jamais fournie par le client ; vue `public_listings` (annonces publiées, champs publics uniquement, coordonnées approximatives) ; fonctions de transition de statut côté vendeur (envoi en validation, retrait, pause, remise en ligne, vendu, suppression d'un brouillon) et côté admin (publication, refus motivé, suspension motivée, levée), journalisées dans `audit_log` ; enregistrement et rattachement des analyses de valeur (`estimation_record`, `estimation_claim`) ; compteur de vues agrégé par jour.
- Tests : 70 tests de permissions (5 comptes de seed et visiteur anonyme).
- Migration : 20261015120000_properties_listings.sql

### 2026-10-08 · L1-03 · PR #6 · Comptes et profils
- Ajouté : tous les enums de la SPEC, tables `profiles` et `buyer_profiles` avec RLS (lecture et modification de soi, lecture globale admin), droits par colonne (rôles, quota, suspension et suppression non modifiables par l'utilisateur), trigger d'inscription (rôle « vendeur » ou « acquéreur » repris du formulaire, jamais « admin »), fonction `profile_add_role` (ajout « Je vends » / « J'achète » depuis le compte), calcul automatique du statut `declared` du financement, fonction `is_admin()`.
- Ajouté : scripts `db:migrate:local|staging|prod` et `db:rls-test` (pgTAP sur l'image Postgres de Supabase), job CI `rls` qui rejoue migrations et tests de permissions à chaque PR.
- Migration : 20261008120000_profiles.sql

### 2026-10-08 · L1-02 · PR #5 · Environnements et préprod
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
