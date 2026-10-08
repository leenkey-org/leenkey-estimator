# CLAUDE.md : Leenkey V2

Ce fichier est lu automatiquement par Claude Code au début de chaque session. Il est la référence du projet : ce qui est écrit ici prime sur toute habitude ou convention par défaut. Le mettre à jour dès qu'une règle change.

**Avant toute tâche, lire aussi `docs/SPEC-V2.md`**, et **`docs/DESIGN.md` avant toute tâche qui touche à l'interface ou à l'UX (il fait foi sur la SPEC pour tout ce qui est UX)** : la spécification fonctionnelle, technique et visuelle complète (modèle de données, écrans, direction artistique « Façade », assistant IA, plan de travail tâche par tâche). Ce fichier-ci donne les règles ; la spec dit quoi construire.

---

## 1. Le projet en bref

Leenkey est une plateforme immobilière française où des propriétaires publient et vendent leur bien accompagnés par Leenkey, et où des acquéreurs identifiés et qualifiés consultent les annonces, contactent les vendeurs, réservent des visites et déposent des offres d'achat structurées. Un assistant IA accompagne vendeurs, acquéreurs et l'administrateur. Les formules vendeur (Autonomie gratuite, Accompagné 990 € TTC, Sérénité 1 500 € TTC) sont vendues via Stripe. Les annonces sont exclusives à Leenkey : aucune diffusion vers des portails externes.

Trois publics :
- **Vendeur** (`seller`) : publie un bien, suit sa vente par étapes, gère documents, visites et offres.
- **Acquéreur** (`buyer`) : cherche, sauvegarde, contacte, réserve une visite sur invitation, dépose une offre.
- **Admin** (`admin`) : Cédric, gérant de Leenkey. Valide les annonces, suit les dossiers, pilote depuis le back office.

Un même compte peut être vendeur et acquéreur. L'admin est un rôle distinct.

Trois lots contractuels. **Le périmètre à construire est celui de `docs/SPEC-V2.md` tel qu'amendé par `docs/DECISIONS.md`** (arbitrage de Younes du 2026-10-05). Toute demande qui n'y figure pas va dans `docs/BACKLOG-V3.md`, jamais dans le code. `docs/cahier-des-charges.md` et `docs/plan-de-mise-en-oeuvre.md` servent uniquement à vérifier le périmètre contractuel (voir section 15, ordre de priorité).

- **Lot 1 (S1 à S5)** : reprise de l'existant en Next.js (estimateur, pages marketing, endpoints), comptes, bien, annonce, recherche, messagerie, dashboard vendeur avec moteur d'étapes, Stripe, assistant IA vendeur + admin, back office. La conversation conseiller (`kind = 'advisor'`) est placée en fin de lot 1.
- **Lot 2 (S6 à S7)** : offre d'achat structurée (modèle client, SPEC-V2 section 13) avec synthèse automatique par gabarits, co-acquéreurs et SCI, qualification acquéreur, assistant IA acquéreur.
- **Lot 3 (S8 à S9)** : visites sur invitation (créneaux ponctuels uniquement), dossier de vente et partage sélectif, analyse IA des documents, alertes acheteur.
- **S10** : recette globale ; le 18 décembre 2026 = livraison de la préprod validée. Bascule en production prévue le lundi 4 janvier 2027 (à confirmer avec Cédric).
- **Garantie** : c'est le contrat qui fait foi : 60 jours pour les bugs majeurs, 30 jours pour les anomalies mineures, à compter de la mise en production.

---

## 2. Stack

| Couche | Choix | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | Server Components par défaut, `"use client"` seulement si nécessaire |
| UI | Tailwind CSS + shadcn/ui, police Archivo (axe de largeur), direction « Façade » (SPEC-V2 section 6) | Composants dans `components/ui/`, jamais modifiés à la main : on les étend. Seule exception : l'ajustement des rayons demandé par `docs/DESIGN.md` section 2.2, fait une fois à l'installation de chaque composant et signalé dans la PR |
| Base, auth, storage, realtime | Supabase (Postgres, RLS, Auth, Storage, Realtime) | Un projet par environnement, voir section 4 |
| Vecteurs | pgvector dans Supabase | Base de connaissances de l'assistant |
| Paiement | Stripe Checkout + webhooks | Mode test en dev et preprod, live en prod uniquement |
| IA | Anthropic API (SDK `@anthropic-ai/sdk`) | Tool use pour les actions, voir section 8 |
| Emails | Resend + React Email | Templates dans `emails/` |
| Cartes et géocodage | Mapbox GL JS + Mapbox Geocoding | Clé publique côté client restreinte par domaine |
| Images | `sharp` côté serveur | Redimensionnement à l'upload, jamais d'image brute servie |
| Validation | Zod | Tout input utilisateur passe par un schéma Zod, côté serveur |
| Hébergement | Vercel Pro (compte Nebula Creativ) | Preview par PR (build seulement), préprod sur la branche `v2` (projet `leenkey-v2`), prod sur `main` (projet `leenkey-estimator-main`) |
| Tests | Vitest (unitaires), Playwright (parcours critiques) | Voir section 10 |
| Lint / format | ESLint + Prettier, config du repo | `npm run lint` doit passer avant tout commit |

Ne pas ajouter de librairie sans le demander explicitement. Si une librairie semble nécessaire, proposer d'abord, avec l'alternative sans librairie.

---

## 3. Structure du repo

```
leenkey/
├── CLAUDE.md                  ← ce fichier
├── docs/
│   ├── SPEC-V2.md             ← spécification complète, à lire avant toute tâche
│   ├── cahier-des-charges.md  ← périmètre contractuel, ne pas modifier
│   ├── maquettes/             ← maquettes .dc.html (structure des écrans)
│   ├── plan-de-mise-en-oeuvre.md
│   ├── PLANNING.md            ← objectifs de la semaine en cours
│   ├── DECISIONS.md           ← décisions datées (question, décision, qui)
│   ├── BACKLOG-V3.md          ← toute demande hors périmètre, datée
│   └── CHANGELOG.md           ← une ligne par PR fusionnée
├── app/
│   ├── (public)/              ← pages publiques : accueil, recherche, annonce, estimateur (wizard V1 porté), légal
│   ├── (auth)/                ← inscription, connexion, mot de passe
│   ├── (app)/                 ← espace connecté vendeur et acquéreur
│   │   ├── vendeur/
│   │   ├── acquereur/
│   │   └── assistant/
│   ├── (admin)/admin/         ← back office, rôle admin obligatoire
│   └── api/
│       ├── webhooks/stripe/
│       ├── cron/              ← jobs Vercel Cron (alertes, ping DB, expirations)
│       └── ai/                ← endpoints de l'assistant (streaming)
├── core/                      ← GÉNÉRIQUE, réutilisable hors Leenkey
│   ├── auth/                  ← session, rôles, guards
│   ├── steps/                 ← moteur d'étapes et de tâches
│   ├── documents/             ← upload, classement, partage, extraction de texte
│   ├── ai/                    ← client Anthropic, outils, base de connaissances, quotas
│   ├── billing/               ← Stripe : checkout, webhooks, plans
│   ├── messaging/             ← conversations, messages, notifications
│   ├── scheduling/            ← créneaux, réservations
│   └── notifications/         ← file de notifications in-app et email
├── leenkey/                   ← MÉTIER immobilier
│   ├── estimator/             ← moteur d'estimation repris de la V1 (estimation.ts), sous tests de non-régression
│   ├── properties/            ← bien, photos, DPE
│   ├── listings/              ← annonce, statuts, validation
│   ├── search/                ← filtres, carte, tri
│   ├── offers/                ← offre d'achat, synthèse
│   ├── buyers/                ← profil et qualification acquéreur
│   ├── visits/                ← spécialisation de core/scheduling
│   └── admin/                 ← écrans et actions du back office
├── components/
│   ├── ui/                    ← shadcn, ne pas éditer (sauf rayons à l'installation, DESIGN.md 2.2)
│   └── shared/                ← composants du design system Leenkey
├── emails/                    ← templates React Email
├── supabase/
│   ├── migrations/            ← SQL horodaté, une fonctionnalité par migration
│   ├── seed/                  ← données de test (biens, comptes, fiches KB)
│   └── tests/                 ← tests RLS (pgTAP ou scripts)
├── lib/
│   ├── supabase/              ← clients server / client / admin
│   ├── validations/           ← schémas Zod partagés
│   └── utils/
├── types/
│   └── database.ts            ← généré, ne jamais éditer à la main
├── tests/
│   ├── unit/
│   └── e2e/
└── scripts/                   ← backup, ping, seed, génération de types
```

Règle de séparation : `core/` ne connaît ni « bien », ni « annonce », ni « acquéreur ». Il manipule des entités génériques (`entity_id`, `owner_id`, `document`, `step`). `leenkey/` importe `core/`, jamais l'inverse. Si une fonction dans `core/` a besoin d'un concept immobilier, elle est au mauvais endroit.

---

## 4. Environnements

Trois environnements, strictement séparés. Aucun secret d'un environnement ne doit apparaître dans un autre.

Dans ce document, « staging » désigne l'environnement de préprod : branche Git `v2`, projet Supabase `leenkey-staging`, `NEXT_PUBLIC_ENV=staging`.

| | Local (dev) | Preprod (staging) | Prod |
|---|---|---|---|
| Branche Git | une branche par tâche | `v2` (joue le rôle de staging) | `main` |
| URL | `localhost:3000` | `leenkey-v2.vercel.app` | `leenkey.fr` |
| Vercel | preview automatique par PR (vérification du build uniquement, pas de test manuel) | projet `leenkey-v2`, déploiement « production » du projet à chaque push sur `v2` | projet `leenkey-estimator-main` |
| Supabase | projet `leenkey-dev` (compte Nebula) | projet `leenkey-staging` (compte Nebula) | projet `leenkey-prod` (compte Leenkey, gratuit puis Pro au premier client payant) |
| Stripe | mode test | mode test | mode live |
| Anthropic | clé dev, quota bas | clé staging | clé prod |
| Resend | domaine de test, envois vers une boîte de test uniquement | idem, préfixe `[PREPROD]` dans les sujets | domaine `leenkey.fr` vérifié |
| Mapbox | clé restreinte à `localhost` | clé restreinte à `leenkey-v2.vercel.app` | clé restreinte à `leenkey.fr` |
| Données | seed de test | seed de test + données saisies par Cédric en recette | données réelles |
| Robots | `noindex` | `noindex` + protection par mot de passe dans le middleware (`PREPROD_USER` / `PREPROD_PASSWORD`) | indexable |

### Variables d'environnement

Fichier `.env.example` à jour dans le repo, sans valeur. Les valeurs réelles sont uniquement dans Vercel (par environnement) et dans `.env.local` (jamais commité, dans `.gitignore`).

```
# Public (exposées au navigateur, préfixe obligatoire)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_MAPBOX_STYLE=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_ENV=local|staging|production

# Serveur uniquement
SUPABASE_SERVICE_ROLE_KEY=      # jamais côté client, jamais dans un Server Component rendu au client
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ACCOMPAGNE=
STRIPE_PRICE_SERENITE=
STRIPE_PRICE_UPGRADE=           # Accompagné → Sérénité, 510 €
ADMIN_NOTIFICATION_EMAIL=       # admin@leenkey.fr en prod
EMAIL_TEST_INBOX=               # destinataire unique des emails hors prod
ANTHROPIC_API_KEY=
RESEND_API_KEY=
CRON_SECRET=                    # vérifié sur chaque route /api/cron/*
PREPROD_USER=                   # préprod uniquement : authentification Basic dans middleware.ts
PREPROD_PASSWORD=               # préprod uniquement ; absentes en prod = pas de protection
AI_MODEL_FAST=                  # facultatif, surcharge de core/ai/models.ts
AI_MODEL_SMART=                 # facultatif
AI_MOCK=                        # 1 en tests E2E : réponses IA déterministes
SEED_PASSWORD=                  # mot de passe commun des comptes de seed (local et staging uniquement)
```

Règles :
- Une variable sans préfixe `NEXT_PUBLIC_` ne doit jamais être lue dans un fichier `"use client"`.
- `SUPABASE_SERVICE_ROLE_KEY` n'est utilisée que dans `lib/supabase/admin.ts`, importé uniquement par les webhooks, les crons et les actions admin explicitement protégées.
- Le code lit `NEXT_PUBLIC_ENV` pour adapter les comportements (bannière preprod, `noindex`, préfixe des emails), jamais `NODE_ENV`.

### Preprod : à quoi elle sert

- Recette de Cédric à chaque livraison de lot, sur des données de test qu'il peut casser.
- Test des migrations avant prod : toute migration passe par staging au moins 24 h avant `main`.
- Test des webhooks Stripe en mode test avec le Stripe CLI ou un endpoint de test.
- Répétition de la mise en production : la procédure de déploiement prod est d'abord jouée sur staging.

Une bannière visible « Environnement de test » s'affiche sur toutes les pages quand `NEXT_PUBLIC_ENV=staging`.

Protection de la préprod : `leenkey-v2.vercel.app` est une URL publique. On n'utilise pas l'option payante de Vercel : `middleware.ts` exige une authentification HTTP Basic quand `NEXT_PUBLIC_ENV=staging` et que `PREPROD_USER` / `PREPROD_PASSWORD` sont définies. Exclusions : `/api/webhooks/*` et `/api/cron/*` (qui ont leur propre vérification). En-tête `X-Robots-Tag: noindex, nofollow` sur toutes les réponses hors prod. Comparaison des identifiants en temps constant.

Attention : sur le projet Vercel `leenkey-v2`, la préprod est l'environnement « Production » du projet. Ses variables (dont `NEXT_PUBLIC_ENV=staging`, les clés de test Stripe et le Supabase `leenkey-staging`) se saisissent donc dans l'onglet *Production* de **ce** projet, jamais dans `leenkey-estimator-main`.

Les tests manuels se font sur la préprod **après fusion** dans `v2`, pas sur les previews de PR (pas de Supabase ni de clé Mapbox pour les previews).

---

## 5. Workflow Git et déploiement

```
feature/<id>-<slug>  →  PR vers v2  →  CI (lint, typecheck, test, build)  →  review + merge
v2                   →  déploiement leenkey-v2.vercel.app automatique  →  test manuel en préprod
v2                   →  PR vers main (bascule V2 prévue le 4 janvier 2027, puis livraisons validées)
main                 →  déploiement leenkey.fr automatique
```

- Une tâche = une branche = une PR vers `v2`. **Claude Code fusionne lui-même sa PR dans `v2`** quand la CI est verte et que `/revue` ne relève rien de bloquant (décision du 2026-10-08) ; Younes teste en préprod à chaque fin de lot. Pas de push direct sur `v2` ni sur `main` (règle de travail ; la protection de branche GitHub n'est pas disponible sur un repo privé en plan gratuit, la CI GitHub Actions `npm run lint && npm run typecheck && npm run test && npm run build` doit être verte avant fusion).
- `main` reste le site V1 en ligne (Vite) jusqu'à la bascule. Aucun commit V2 n'y arrive avant.
- Une PR = une fonctionnalité ou un correctif. Titre au format `feat(listings): validation par l'admin` / `fix(messaging): notification en double`.
- Chaque PR fusionnée ajoute une ligne dans `docs/CHANGELOG.md`.
- Correctif urgent en prod : branche `hotfix/xxx` depuis `main`, PR vers `main`. Avant la bascule, la V1 et la V2 n'ont plus de code commun : reporter le correctif à la main dans `v2` s'il concerne l'estimateur ou les pages marketing. Après la bascule : merge de `main` dans `v2` pour resynchroniser.
- Rollback : Vercel « Promote » du déploiement précédent. Si une migration est en cause, migration inverse écrite et jouée sur staging (préprod) d'abord.

### Migrations Supabase

- Fichier `supabase/migrations/YYYYMMDDHHMMSS_description.sql`. Une fonctionnalité par migration.
- **Toute table créée a ses politiques RLS dans la même migration**, avec `alter table ... enable row level security`. Une table sans RLS est un bug bloquant.
- Toute migration est jouée dans l'ordre : local → staging (`supabase db push --linked` sur le projet staging) → prod, jamais directement en prod.
- Après chaque migration : `npm run db:types` pour régénérer `types/database.ts`, commité avec la migration.
- Pas de modification de migration déjà jouée sur staging : on en écrit une nouvelle.
- Les données de référence (plans, étapes de vente) sont dans `supabase/seed/`, jamais en dur dans le code.

---

## 6. Modèle de données : règles fixes

**La liste de référence des enums est `docs/SPEC-V2.md` section 4 (« Enums »).** Ne pas en inventer d'autres ; toute nouvelle valeur passe par `docs/DECISIONS.md` puis la SPEC avant d'arriver dans une migration.

Rappel des points qui ont déjà prêté à confusion :
- `listing_status` contient `suspended` : statut posé uniquement par l'admin, dont le vendeur ne peut pas sortir (seul l'admin le lève).
- `financing_status` : `not_provided | declared | document_provided | document_checked`. Jamais « validé » dans l'interface.
- Les rôles sont un tableau : `profiles.roles user_role[]`. Un compte peut être `seller` et `buyer`. Un admin est un profil tel que `'admin' = any(roles)`, testé en SQL par la fonction `is_admin()`.

Conventions :
- Tables en `snake_case` pluriel (`properties`, `listings`, `offers`). Colonnes en `snake_case`.
- Toute table a `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz` (trigger), et `owner_id` ou équivalent quand une ligne appartient à quelqu'un.
- Suppression logique (`deleted_at`) pour `properties`, `listings`, `documents`, `profiles`. Suppression physique uniquement pour les tables techniques.
- Les fichiers sont dans Supabase Storage, buckets `photos` (lecture des annonces publiées via URL signée courte), `documents` (privé : dossier de vente et justificatifs de financement, URL signée 10 minutes) et `offers` (privé : PDF des offres d'achat, URL signée 10 minutes). Jamais d'URL permanente pour un fichier privé.
- Toute écriture passe par une server action ou un route handler qui valide avec Zod puis écrit via le client Supabase serveur avec la session de l'utilisateur. Le client `admin` (service role) n'est utilisé que là où la RLS ne peut pas s'appliquer (webhooks, crons).

Le schéma complet des tables est dans `docs/SPEC-V2.md`, section 4 (référence à jour). `docs/plan-de-mise-en-oeuvre.md` est un document contractuel antérieur : ne pas s'en servir pour le schéma.

---

## 7. Permissions (RLS) : règles à respecter dans chaque migration

- Un vendeur lit et modifie uniquement ses `properties`, `listings`, `photos`, `documents`, `sale_progress`, `visit_slots`.
- Une `listing` en `published` est lisible par tous, y compris anonymes. Tout autre statut : propriétaire et admin seulement.
- Le statut `suspended` n'est posé et levé que par l'admin. Le vendeur ne peut ni y entrer ni en sortir (transitions contrôlées par fonction SQL, jamais par un `update` direct du statut).
- Une `conversation` et ses `messages` sont lisibles et modifiables uniquement par ses participants. L'admin lit, ne modifie pas.
- Un `document` n'est lisible par un acquéreur que s'il existe une ligne `document_shares (document_id, buyer_id)`.
- Un `visit_slot` n'est réservable par un acquéreur que s'il existe une `visit_invitations (property_id, buyer_id)`.
- Une `offer` est lisible par son auteur, par le vendeur du bien concerné, et par l'admin. Le vendeur lit via la vue `offer_for_seller`, qui masque date de naissance, adresse, téléphone et e-mail de l'acquéreur tant que l'offre n'est pas acceptée.
- Une offre envoyée est figée : trigger `offers_freeze_after_submit` en base. Ne jamais le contourner ni le désactiver dans une migration.
- `buyer_profiles.financing_status` est lisible par le vendeur uniquement pour les acquéreurs qui l'ont contacté ou ont fait une offre sur son bien, via `buyer_summary_for_seller()`. Le justificatif et les montants du profil ne lui sont jamais exposés.
- L'admin (`'admin' = any(profiles.roles)`, via `is_admin()`) a un accès en lecture global et des droits d'écriture limités aux actions de modération : statuts d'annonce, suspension, dossiers, base de connaissances.
- Aucune politique `using (true)` en écriture. Jamais.

Chaque migration qui touche aux permissions est accompagnée d'un test dans `supabase/tests/` qui vérifie, avec les cinq comptes de seed (`seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin`) et un visiteur anonyme, qu'un utilisateur ne voit pas ce qu'il ne doit pas voir. Ne pas fusionner sans ce test.

---

## 8. Assistant IA : règles

- Client unique dans `core/ai/client.ts`. Modèles définis dans `core/ai/models.ts` (identifiants par défaut vérifiés sur la documentation Anthropic le 2026-10-05, voir SPEC-V2 section 3) : un modèle rapide pour la conversation et les suggestions, un modèle plus capable pour l'analyse de documents et l'explication d'une offre à la demande. La synthèse vendeur d'une offre est produite par gabarits en code, sans appel au modèle. Ne pas appeler le SDK ailleurs.
- Le prompt système est dans `core/ai/prompts/` en fichiers versionnés, un par contexte (`seller.md`, `buyer.md`, `admin.md`, `document-analysis/*.md`). Jamais de prompt en dur dans un composant.
- Cadre non négociable dans tous les prompts : pas d'avis juridique ou fiscal engageant, renvoi vers Cédric sur tout sujet sensible, réponses ancrées sur la base de connaissances, ton Leenkey (direct, clair, sans jargon).
- Outils (tool use) : chaque outil est un fichier dans `core/ai/tools/` avec son schéma Zod, sa description, sa fonction d'exécution, et un flag `requiresConfirmation`. La liste de référence est SPEC-V2 section 12. Tous les outils qui écrivent (`update_listing_description`, `update_listing_price`, `create_case`, `contact_advisor`, `create_alert`, `prefill_offer`, `propose_visit_slot`) ont `requiresConfirmation: true` : l'interface affiche l'action proposée et l'utilisateur confirme avant exécution. Aucune écriture silencieuse.
- Les outils s'exécutent avec la session de l'utilisateur (RLS). Quand une écriture doit dépasser les droits de l'utilisateur (ex. `create_case`, qui crée un dossier visible par l'admin), elle passe par une fonction SQL `security definer` dédiée, appelée en RPC, qui vérifie elle-même `auth.uid()` et ses paramètres. Jamais la clé service role dans `core/ai/`.
- Quota : compteur `profiles.ai_messages_today` réinitialisé par cron. Les plafonds sont définis dans `core/ai/quotas.ts`, par rôle (acquéreur, vendeur, admin), avec un plafond plus élevé pour un vendeur qui a au moins un bien sous formule payante. Un compte vendeur et acquéreur reçoit le plafond le plus élevé de ses rôles. Pas de colonne de quota dans `plans`. Réponse claire quand le quota est atteint.
- Toutes les conversations sont journalisées dans `ai_conversations` / `ai_messages` pour relecture par l'admin.
- Base de connaissances : table `knowledge_base` avec `content`, `embedding vector(384)` (modèle `gte-small` intégré à Supabase, voir SPEC-V2 section 3), `category`, `step_code`. Recherche par similarité dans `core/ai/knowledge.ts`. Les fiches sont importées depuis `supabase/seed/knowledge/*.md`.
- Streaming des réponses via route handler, jamais depuis une server action.
- Coût : logguer `input_tokens` / `output_tokens` par appel dans `ai_messages` pour suivre la consommation par environnement.

---

## 9. Conventions de code

- TypeScript strict, pas de `any`, pas de `as unknown as`. Types de base de données depuis `types/database.ts`.
- Server Components par défaut. `"use client"` uniquement pour l'interactivité (formulaires, carte, chat, realtime).
- Mutations via server actions dans `*/actions.ts`, chacune : vérification de session → validation Zod → requête → `revalidatePath` → retour typé `{ ok: true, data } | { ok: false, error }`. Pas de `throw` vers le client.
- Lecture de données dans des fonctions `*/queries.ts`, appelées depuis les Server Components.
- Nommage : fichiers `kebab-case.tsx`, composants `PascalCase`, fonctions et variables `camelCase`, tables et colonnes `snake_case`.
- Libellés d'interface en français, code, commentaires et commits en anglais. Textes utilisateur centralisés dans `lib/i18n/fr.ts` (pas de multi-langue prévu, mais pas de chaîne en dur dans les composants).
- Dates stockées en `timestamptz` UTC, affichées en `Europe/Paris` avec `date-fns` et `date-fns-tz`.
- Montants en centimes (`integer`), formatés à l'affichage. Jamais de `float` pour l'argent.
- Aucune requête Supabase dans un composant client : passer par une server action ou une route.
- Erreurs : logguer côté serveur avec contexte (`user_id`, `entity_id`), message générique côté utilisateur.
- Accessibilité minimale : labels sur tous les champs, focus visible, contrastes du design system, navigation clavier sur les modales.
- Mobile-first : chaque écran est d'abord conçu à 390 px de large (largeur des maquettes, points de rupture de `docs/DESIGN.md` section 4.2).

---

## 10. Tests et définition de « fini »

Une fonctionnalité est finie quand :
1. La migration et ses RLS sont jouées sur local et staging, avec le test de permissions qui passe.
2. `npm run lint`, `npm run typecheck`, `npm run test` passent.
3. Le parcours est testé à la main sur la préprod (`leenkey-v2.vercel.app`) après fusion, avec les comptes de seed, en mobile et en desktop.
4. Les emails déclenchés sont vérifiés dans la boîte de test.
5. Une ligne est ajoutée à `docs/CHANGELOG.md`.
6. Elle est démontrable à Cédric le vendredi.

Tests automatisés attendus :
- Unitaires (Vitest) : schémas Zod, calculs (synthèse d'offre : écart au prix), moteur d'étapes (transitions), quotas.
- Permissions (`supabase/tests/`) : chaque migration RLS.
- E2E (Playwright, sur staging) : inscription → création de bien → publication → validation admin → contact acquéreur → message ; paiement Stripe test → formule activée ; offre soumise → synthèse visible par le vendeur. Ces trois parcours tournent avant chaque merge vers `main`.

---

## 11. Sécurité

- Jamais de secret dans le code, les commits, les logs ou les messages d'erreur. Si un secret a fuité dans un commit, le révoquer immédiatement, pas seulement supprimer le commit.
- Routes `/api/cron/*` : vérifier l'en-tête `Authorization: Bearer ${CRON_SECRET}`.
- Webhook Stripe : vérifier la signature avec `STRIPE_WEBHOOK_SECRET`, traiter de façon idempotente (`stripe_event_id` unique en base).
- Rate limiting sur : inscription, connexion, formulaire de contact, envoi de message, assistant IA. Implémenté dans `lib/rate-limit.ts` (Upstash si disponible, sinon table Postgres).
- Uploads : types MIME vérifiés côté serveur, taille max 10 Mo par photo et 20 Mo par document, noms de fichiers régénérés (uuid), jamais le nom d'origine dans l'URL.
- En-têtes de sécurité dans `next.config.ts` : CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Les URL signées Storage expirent : 1 h pour les photos, 10 min pour les documents.
- Toute action admin est écrite dans `audit_log` (qui, quoi, sur quoi, quand).

---

## 12. Commandes

```bash
npm run dev              # serveur local
npm run build            # build de production
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # Vitest
npm run test:e2e         # Playwright (BASE_URL requis)
npm run db:types         # génère types/database.ts depuis le projet Supabase lié
npm run db:migrate:local # applique les migrations en local
npm run db:migrate:staging
npm run db:migrate:prod  # demande une confirmation explicite
npm run db:seed          # charge supabase/seed/ (local et staging uniquement, refuse en prod)
npm run db:rls-test      # tests de permissions
npm run a11y             # contrôle d'accessibilité axe sur les parcours E2E (docs/DESIGN.md section 15)
npm run stripe:listen    # Stripe CLI vers /api/webhooks/stripe en local
npm run backup           # pg_dump du projet lié vers ./backups/ (utilisé par la GitHub Action nocturne)
```

Scripts à créer dans `scripts/` et déclarés dans `package.json` dès la semaine 1.

---

## 13. Jobs planifiés (Vercel Cron)

Déclarés dans `vercel.json`, tous protégés par `CRON_SECRET`, idempotents et journalisés. **La liste, les horaires et les rôles de référence sont dans `docs/SPEC-V2.md` section 19** ; ne pas les dupliquer ici. Les crons de la préprod tournent aussi (projet Vercel `leenkey-v2`) : ils ne doivent jamais envoyer d'email hors de `EMAIL_TEST_INBOX`.

Sauvegarde : GitHub Action nocturne qui exécute `npm run backup` sur le projet prod et pousse l'archive vers un stockage privé, rétention 14 jours. Indépendante de Vercel.

---

## 14. Ce que Claude Code ne fait pas sans demander

- Ajouter une dépendance hors de la liste pré-approuvée de `docs/DECISIONS.md` (2026-10-08).
- Modifier une migration déjà jouée sur staging.
- Toucher aux politiques RLS existantes sans le signaler explicitement dans la PR.
- Utiliser le client service role en dehors de `webhooks`, `cron` et `leenkey/admin/actions.ts` (jamais dans `core/ai/` : passer par une fonction SQL `security definer`).
- Créer une route API là où une server action suffit.
- Ajouter un statut, un rôle, un plan ou une valeur d'enum qui n'est pas dans SPEC-V2 section 4.
- Tester un droit en comparant un nom de formule : toujours `hasEntitlement(propertyId, feature)`.
- Bloquer une étape essentielle de la vente (publier, échanger, visiter, recevoir, accepter ou refuser une offre, finaliser) selon la formule : règle freemium du client, voir SPEC-V2 section 11 bis.
- Implémenter quelque chose qui n'est ni dans `docs/SPEC-V2.md` ni dans `docs/DECISIONS.md` : le noter dans `docs/BACKLOG-V3.md` et le signaler.
- Modifier le chiffre produit par le moteur d'estimation (`estimation.ts`) sans que les tests de non-régression soient mis à jour dans la même PR et la différence expliquée.
- Écrire en prod, ou pousser quoi que ce soit sur `main`. La prod se déploie par merge de `v2` vers `main`, sur go explicite de Younes, jamais autrement.
- Désactiver un test, un lint ou un typecheck pour faire passer une PR.

---

## 15. Comment travailler avec ce projet

Pour chaque fonctionnalité, dans cet ordre :
1. Lire la tâche dans `docs/SPEC-V2.md` section 23 et les sections qu'elle cite, puis `docs/DECISIONS.md`. Commande : `/tache <ID>`.
2. Migration SQL + RLS + test de permissions.
3. `npm run db:types`.
4. Schémas Zod dans `lib/validations/`.
5. `queries.ts` puis `actions.ts`.
6. Composants, à partir de `components/shared/`.
7. Emails et notifications.
8. Entrée dans `CHANGELOG.md`, PR vers `v2`, vérification manuelle en préprod après fusion.

### Textes de Cédric hors règles éditoriales

Les textes fournis par Cédric qui ne respectent pas les règles de la section 16 (ex. « On pilote avec vous ») ne sont pas réécrits d'office : la reformulation est proposée dans `docs/DECISIONS.md` (Q18).

### Ordre de priorité des documents

En cas de contradiction :
- **Fonctionnel** : `docs/DECISIONS.md` (décisions datées) > `docs/SPEC-V2.md` > `CLAUDE.md`.
- **UX** (visuel, structure et ordre des écrans, composants, navigation, interactions, états, responsive) : `docs/DESIGN.md` > maquettes PNG > maquettes HTML > `docs/SPEC-V2.md`. Décision de Younes du 2026-10-08. La SPEC et `DECISIONS.md` gardent la main sur les règles métier, les données, les permissions, les textes réglementaires et les règles éditoriales de la section 16 (un libellé de DESIGN.md qui les enfreint est corrigé, pas recopié).
- **Technique et sécurité** : `CLAUDE.md` l'emporte sur tout le reste.
- **Périmètre contractuel** : `docs/cahier-des-charges.md` et `docs/plan-de-mise-en-oeuvre.md` servent uniquement à le vérifier ; ils ne décrivent pas ce qu'il faut construire. Pour la garantie, c'est le contrat signé qui fait foi (60 jours bugs majeurs, 30 jours anomalies mineures).

Signaler toute contradiction relevée, et l'inscrire dans `docs/DECISIONS.md`.

### Documents de suivi

`docs/DESIGN.md` (référence UX et visuelle, fait foi pour tout ce qui est UX), `docs/PLANNING.md` (tâches à cocher), `docs/CHANGELOG.md`, `docs/RECETTE.md`, `docs/SECURITE.md`, `docs/BACKLOG-V3.md`, `docs/PROMPTS.md`, maquettes dans `docs/maquettes/png/`. Commandes : `/tache`, `/revue`, `/bug`, `/vendredi`, `/recette`.

Quand une instruction de session contredit ce fichier, le signaler avant d'agir. Quand ce fichier est incomplet sur un point, proposer la règle et l'ajouter ici dans la même PR.

---

## 16. Existant et règles éditoriales (repris du CLAUDE.md V1)

### Le client et les sites

Plateforme PropTech française de vente immobilière sans agence, développée par Younes (Nebula Creativ) pour Cédric Da Cunha (SAS LEENKEY, RCS Évry 107 616 211). Sites : leenkey.fr (principal) et leenkey.com (redirigé vers leenkey.fr).

### La V1 en ligne (branche `main`, à préserver jusqu'à la bascule)

- **Stack V1** : Vite + React 19 + TypeScript + TanStack Router (routes fichiers dans `src/routes/`), Tailwind 4, shadcn. Pas de base, pas d'auth, pas de paiement, pas de tests.
- **Pages marketing** : HTML statiques dans `public/pages/` (landing, concept, investir, tarifs, faq, issus de Lovable), injectées par `src/components/site/HtmlPage.tsx`.
- **Estimateur** : wizard multi-étapes dans `src/components/leenkey/` (maison/appartement dans `steps.tsx`, puis `steps-terrain.tsx`, `steps-local.tsx`, `steps-immeuble.tsx`, `steps-atypique.tsx`, orchestrés par `flows.tsx`).
- **Moteur d'estimation** : `src/components/leenkey/estimation.ts` (~3 300 lignes). **Le moteur fait foi pour le chiffre** ; Claude ne rédige que l'analyse écrite.
- **API serverless** (`api/`) : `estimate.ts` (Claude + emails), `contact.ts` (formulaires → emails), `send-report.ts` (rapport PDF), `dvf-comparables.ts` (fichiers officiels Etalab ; api.cquest.org est morte, ne pas y revenir).
- **Emails V1** : Resend, expéditeur `noreply@leenkey.fr` (domaine vérifié ; DNS sur le compte IONOS de Cédric). Destinataire admin : `contact.leenkey@gmail.com`.
- **Analytics** : GA4 `G-27N3E3WP2D` + GTM `GTM-MTRM36P4` + Vercel Analytics.
- **Déploiement V1** : projet Vercel `leenkey-estimator-main`, team `nebula-creativ`, auto-deploy sur push `main` (~30 s). Secours : `npx vercel deploy --prod --scope nebula-creativ --yes`. Vérification : `curl https://leenkey.fr/...`.

### Reprise de l'existant dans la V2 (tâche L1-01)

1. **Avant tout déplacement** : tests de non-régression Vitest sur `estimation.ts`, au moins 20 cas réels couvrant tous les types de bien, avec les résultats actuels figés. Ces tests doivent passer avant et après le portage, à l'identique.
2. Estimateur porté en composants client (`"use client"`) sous `app/(public)/estimer`, moteur dans `leenkey/estimator/` sans modification de logique.
3. Les 4 endpoints deviennent des route handlers aux **mêmes chemins** (`/api/estimate`, `/api/contact`, `/api/send-report`, `/api/dvf-comparables`), même format de requête et de réponse, CORS de `send-report` conservé.
4. Pages marketing `public/pages/*.html` conservées, avec le comportement de `HtmlPage.tsx` (interception des `<form>`) et l'en-tête `Cache-Control: max-age=0, must-revalidate` sur `/pages/*`.
5. GA4, GTM (avec le `noscript`), Vercel Analytics et le `page_view` à chaque changement de route.
6. Redirections 301 : `leenkey.com` et `www.leenkey.fr` → `leenkey.fr` (hors `/api`). URLs, `sitemap.xml` et `robots.txt` conservés.

### Règles éditoriales (décisions client, ne pas régresser)

S'appliquent à tous les textes : interface, emails, prompts de l'assistant, PDF.

- Paiement **« à la souscription »**, jamais « au succès » ni « payé au succès ».
- Voix **« nous »**, jamais « on » dans les textes Leenkey.
- Réponse **« sous 48 h, 7 j/7 »** pour le formulaire de contact du site, jamais « ouvrées ». (Délais V2 décidés par Cédric : relecture d'annonce et contact après achat d'une formule sous 24 h, même non ouvrées.)
- Vocabulaire **« valorisation / analyse de valeur »** : éviter « estimation » seul dans les textes marketing et d'interface (décision client maintenue en V2, même si l'activité est couverte par la carte d'agent immobilier de Cédric : `DECISIONS.md`, 2026-10-07). Le nom technique `estimation` reste permis dans le code et les tables.
- Pas de chiffres ni de témoignages inventés sur le site.
- Pas de mention « Prix ferme » sur les écrans.
- Pas de pixel publicitaire tiers (Meta Pixel ou autre) hors décision écrite dans `docs/DECISIONS.md`.
- Bleu de marque : `#1156FC` (pas le bleu Tailwind `#3B82F6`).

### Pièges connus

- Les `.html` de `public/pages/` embarquent leurs styles inline + `leenkey.css` (versionné `?v=N` : incrémenter à chaque modification du CSS pour casser le cache).
- Le JS d'accordéon et de compteurs (`leenkey.js`) n'est pas chargé partout : préférer des valeurs statiques et une FAQ dépliée là où il est absent.
- `HtmlPage.tsx` intercepte les `<form>` des pages HTML et poste vers `/api/contact` avec une `source` déduite de l'id du formulaire ; le message de succès `.form-success` doit être un **sibling** du form, pas un enfant.
- Dans `generatePDF.ts`, mesurer le texte avec la même taille de police que le rendu.
- Le client (Younes) privilégie toujours la solution la plus simple : proposer le minimum d'abord.

