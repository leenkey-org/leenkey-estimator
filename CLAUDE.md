# CLAUDE.md : Leenkey V2

Ce fichier est lu automatiquement par Claude Code au début de chaque session. Il est la référence du projet : ce qui est écrit ici prime sur toute habitude ou convention par défaut. Le mettre à jour dès qu'une règle change.

**Avant toute tâche, lire aussi `docs/SPEC-V2.md`** : la spécification fonctionnelle, technique et visuelle complète (modèle de données, écrans, direction artistique « Plan d'architecte », assistant IA, plan de travail tâche par tâche). Ce fichier-ci donne les règles ; la spec dit quoi construire.

---

## 1. Le projet en bref

Leenkey est une plateforme immobilière française où des propriétaires publient et vendent leur bien accompagnés par Leenkey, et où des acquéreurs identifiés et qualifiés consultent les annonces, contactent les vendeurs, réservent des visites et déposent des offres d'achat structurées. Un assistant IA accompagne vendeurs, acquéreurs et l'administrateur. Les formules vendeur (Autonomie gratuite, Accompagné 990 € TTC, Sérénité 1 500 € TTC) sont vendues via Stripe. Les annonces sont exclusives à Leenkey : aucune diffusion vers des portails externes.

Trois publics :
- **Vendeur** (`seller`) : publie un bien, suit sa vente par étapes, gère documents, visites et offres.
- **Acquéreur** (`buyer`) : cherche, sauvegarde, contacte, réserve une visite sur invitation, dépose une offre.
- **Admin** (`admin`) : Cédric, gérant de Leenkey. Valide les annonces, suit les dossiers, pilote depuis le back office.

Un même compte peut être vendeur et acquéreur. L'admin est un rôle distinct.

Trois lots contractuels. Le périmètre est figé : tout ce qui n'est pas dans `docs/cahier-des-charges.md` va dans `docs/BACKLOG-V3.md`, jamais dans le code.

- **Lot 1 (S1 à S5)** : comptes, bien, annonce, recherche, messagerie, dashboard vendeur avec moteur d'étapes, Stripe, assistant IA vendeur + admin, back office.
- **Lot 2 (S6 à S7)** : offre d'achat structurée (modèle client, SPEC-V2 section 13) avec synthèse automatique et explication IA à la demande, qualification acquéreur, assistant IA acquéreur.
- **Lot 3 (S8 à S9)** : agenda et visites sur invitation, dossier de vente et partage sélectif, analyse IA des documents, alertes acheteur.
- **S10** : recette globale, mise en production.

---

## 2. Stack

| Couche | Choix | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | Server Components par défaut, `"use client"` seulement si nécessaire |
| UI | Tailwind CSS + shadcn/ui | Composants dans `components/ui/`, jamais modifiés à la main : on les étend |
| Base, auth, storage, realtime | Supabase (Postgres, RLS, Auth, Storage, Realtime) | Un projet par environnement, voir section 4 |
| Vecteurs | pgvector dans Supabase | Base de connaissances de l'assistant |
| Paiement | Stripe Checkout + webhooks | Mode test en dev et preprod, live en prod uniquement |
| IA | Anthropic API (SDK `@anthropic-ai/sdk`) | Tool use pour les actions, voir section 8 |
| Emails | Resend + React Email | Templates dans `emails/` |
| Cartes et géocodage | Mapbox GL JS + Mapbox Geocoding | Clé publique côté client restreinte par domaine |
| Images | `sharp` côté serveur | Redimensionnement à l'upload, jamais d'image brute servie |
| Validation | Zod | Tout input utilisateur passe par un schéma Zod, côté serveur |
| Hébergement | Vercel Pro (compte Nebula Creativ) | Preview par PR, preprod sur branche `staging`, prod sur `main` |
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
│   ├── (public)/              ← pages publiques : accueil, recherche, annonce, estimateur, légal
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
│   ├── properties/            ← bien, photos, DPE
│   ├── listings/              ← annonce, statuts, validation
│   ├── search/                ← filtres, carte, tri
│   ├── offers/                ← offre d'achat, synthèse
│   ├── buyers/                ← profil et qualification acquéreur
│   ├── visits/                ← spécialisation de core/scheduling
│   └── admin/                 ← écrans et actions du back office
├── components/
│   ├── ui/                    ← shadcn, ne pas éditer
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

| | Local (dev) | Preprod (staging) | Prod |
|---|---|---|---|
| Branche Git | branches de fonctionnalité | `staging` | `main` |
| URL | `localhost:3000` | `preprod.leenkey.fr` | `leenkey.fr` |
| Vercel | preview automatique par PR | environnement Preview lié à `staging`, domaine `preprod.leenkey.fr` | environnement Production |
| Supabase | projet `leenkey-dev` (compte Nebula) | projet `leenkey-staging` (compte Nebula) | projet `leenkey-prod` (compte Leenkey, gratuit puis Pro au premier client payant) |
| Stripe | mode test | mode test | mode live |
| Anthropic | clé dev, quota bas | clé staging | clé prod |
| Resend | domaine de test, envois vers une boîte de test uniquement | idem, préfixe `[PREPROD]` dans les sujets | domaine `leenkey.fr` vérifié |
| Mapbox | clé restreinte à `localhost` | clé restreinte à `preprod.leenkey.fr` | clé restreinte à `leenkey.fr` |
| Données | seed de test | seed de test + données saisies par Cédric en recette | données réelles |
| Robots | `noindex` | `noindex` + protection par mot de passe Vercel | indexable |

### Variables d'environnement

Fichier `.env.example` à jour dans le repo, sans valeur. Les valeurs réelles sont uniquement dans Vercel (par environnement) et dans `.env.local` (jamais commité, dans `.gitignore`).

```
# Public (exposées au navigateur, préfixe obligatoire)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
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

---

## 5. Workflow Git et déploiement

```
feature/xxx  →  PR vers staging  →  preview Vercel  →  review + merge
staging      →  déploiement preprod.leenkey.fr automatique
staging      →  PR vers main (uniquement à une livraison de lot ou un correctif validé)
main         →  déploiement leenkey.fr automatique
```

- `main` et `staging` sont protégées : pas de push direct, PR obligatoire, `npm run lint && npm run typecheck && npm run test` doivent passer (GitHub Actions).
- Une PR = une fonctionnalité ou un correctif. Titre au format `feat(listings): validation par l'admin` / `fix(messaging): notification en double`.
- Chaque PR fusionnée ajoute une ligne dans `docs/CHANGELOG.md`.
- Correctif urgent en prod : branche `hotfix/xxx` depuis `main`, PR vers `main`, puis merge de `main` dans `staging` pour resynchroniser.
- Rollback : Vercel « Promote » du déploiement précédent. Si une migration est en cause, migration inverse écrite et jouée sur staging d'abord.

### Migrations Supabase

- Fichier `supabase/migrations/YYYYMMDDHHMMSS_description.sql`. Une fonctionnalité par migration.
- **Toute table créée a ses politiques RLS dans la même migration**, avec `alter table ... enable row level security`. Une table sans RLS est un bug bloquant.
- Toute migration est jouée dans l'ordre : local → staging (`supabase db push --linked` sur le projet staging) → prod, jamais directement en prod.
- Après chaque migration : `npm run db:types` pour régénérer `types/database.ts`, commité avec la migration.
- Pas de modification de migration déjà jouée sur staging : on en écrit une nouvelle.
- Les données de référence (plans, étapes de vente) sont dans `supabase/seed/`, jamais en dur dans le code.

---

## 6. Modèle de données : règles fixes

Les statuts sont ceux-ci, sous forme d'enums Postgres. Ne pas en inventer d'autres.

```
listing_status:    draft | pending | published | paused | sold | rejected
offer_status:      draft | submitted | viewed | accepted | declined | expired | withdrawn | superseded
visit_status:      requested | confirmed | done | cancelled
case_status:       new | in_progress | closed
financing_status:  not_provided | declared | document_provided | document_checked   (jamais « validé » dans l'interface)
conversation_kind: listing | advisor
acquisition_mode:  own_name | joint | sci | other
financing_mode:    no_loan | loan
financing_progress: not_presented | simulation_done | broker_consulted | agreement_in_principle | other
user_role:         seller | buyer | admin
plan_code:         autonomie | accompagne | serenite
```

Conventions :
- Tables en `snake_case` pluriel (`properties`, `listings`, `offers`). Colonnes en `snake_case`.
- Toute table a `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz` (trigger), et `owner_id` ou équivalent quand une ligne appartient à quelqu'un.
- Suppression logique (`deleted_at`) pour `properties`, `listings`, `documents`, `profiles`. Suppression physique uniquement pour les tables techniques.
- Les fichiers (photos, documents) sont dans Supabase Storage, buckets `photos` (public en lecture pour les annonces publiées via URL signée courte) et `documents` (privé, URL signée 10 minutes, jamais d'URL permanente).
- Toute écriture passe par une server action ou un route handler qui valide avec Zod puis écrit via le client Supabase serveur avec la session de l'utilisateur. Le client `admin` (service role) n'est utilisé que là où la RLS ne peut pas s'appliquer (webhooks, crons).

Le schéma complet des tables est dans `docs/SPEC-V2.md`, section 4 (référence à jour). `docs/plan-de-mise-en-oeuvre.md` est un document contractuel antérieur : ne pas s'en servir pour le schéma.

---

## 7. Permissions (RLS) : règles à respecter dans chaque migration

- Un vendeur lit et modifie uniquement ses `properties`, `listings`, `photos`, `documents`, `sale_progress`, `visit_slots`.
- Une `listing` en `published` est lisible par tous, y compris anonymes. Tout autre statut : propriétaire et admin seulement.
- Une `conversation` et ses `messages` sont lisibles et modifiables uniquement par ses participants. L'admin lit, ne modifie pas.
- Un `document` n'est lisible par un acquéreur que s'il existe une ligne `document_shares (document_id, buyer_id)`.
- Un `visit_slot` n'est réservable par un acquéreur que s'il existe une `visit_invitations (property_id, buyer_id)`.
- Une `offer` est lisible par son auteur, par le vendeur du bien concerné, et par l'admin. Le vendeur lit via la vue `offer_for_seller`, qui masque date de naissance, adresse, téléphone et e-mail de l'acquéreur tant que l'offre n'est pas acceptée.
- Une offre envoyée est figée : trigger `offers_freeze_after_submit` en base. Ne jamais le contourner ni le désactiver dans une migration.
- `buyer_profiles.financing_status` est lisible par le vendeur uniquement pour les acquéreurs qui l'ont contacté ou ont fait une offre sur son bien, via `buyer_summary_for_seller()`. Le justificatif et les montants du profil ne lui sont jamais exposés.
- L'admin (`profiles.role = 'admin'`) a un accès en lecture global et des droits d'écriture limités aux actions de modération : statuts d'annonce, suspension, dossiers, base de connaissances.
- Aucune politique `using (true)` en écriture. Jamais.

Chaque migration qui touche aux permissions est accompagnée d'un test dans `supabase/tests/` qui vérifie, avec les trois comptes de seed (`seller_a`, `seller_b`, `buyer_c`) et `admin`, qu'un utilisateur ne voit pas ce qu'il ne doit pas voir. Ne pas fusionner sans ce test.

---

## 8. Assistant IA : règles

- Client unique dans `core/ai/client.ts`. Modèles définis dans `core/ai/models.ts` : un modèle rapide pour la conversation et les suggestions, un modèle plus capable pour l'analyse de documents et l'explication d'une offre à la demande. La synthèse vendeur d'une offre est produite par gabarits en code, sans appel au modèle. Ne pas appeler le SDK ailleurs.
- Le prompt système est dans `core/ai/prompts/` en fichiers versionnés, un par contexte (`seller.md`, `buyer.md`, `admin.md`, `document-analysis/*.md`). Jamais de prompt en dur dans un composant.
- Cadre non négociable dans tous les prompts : pas d'avis juridique ou fiscal engageant, renvoi vers Cédric sur tout sujet sensible, réponses ancrées sur la base de connaissances, ton Leenkey (direct, clair, sans jargon).
- Outils (tool use) : chaque outil est un fichier dans `core/ai/tools/` avec son schéma Zod, sa description, sa fonction d'exécution, et un flag `requiresConfirmation`. Les outils qui écrivent (`update_listing_description`, `create_alert`, `propose_visit_slot`, `create_case`, `prefill_offer`) ont `requiresConfirmation: true` : l'interface affiche l'action proposée et l'utilisateur confirme avant exécution. Aucune écriture silencieuse.
- Quota : `profiles.ai_messages_today` réinitialisé par cron ; limite lue depuis `plans.ai_daily_quota`. Réponse claire quand le quota est atteint.
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
- Mobile-first : chaque écran est d'abord conçu pour 375 px de large.

---

## 10. Tests et définition de « fini »

Une fonctionnalité est finie quand :
1. La migration et ses RLS sont jouées sur local et staging, avec le test de permissions qui passe.
2. `npm run lint`, `npm run typecheck`, `npm run test` passent.
3. Le parcours est testé à la main sur la preview Vercel avec les trois comptes de seed, en mobile et en desktop.
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
npm run stripe:listen    # Stripe CLI vers /api/webhooks/stripe en local
npm run backup           # pg_dump du projet lié vers ./backups/ (utilisé par la GitHub Action nocturne)
```

Scripts à créer dans `scripts/` et déclarés dans `package.json` dès la semaine 1.

---

## 13. Jobs planifiés (Vercel Cron)

Déclarés dans `vercel.json`, tous protégés par `CRON_SECRET` :
- `0 3 * * *` : `/api/cron/ping-db` (évite la mise en pause du projet Supabase gratuit).
- `0 6 * * *` : `/api/cron/expire-offers` (offres dont la validité est dépassée → `expired`).
- `0 7 * * *` : `/api/cron/buyer-alerts` (nouveaux biens correspondant aux alertes).
- `0 0 * * *` : `/api/cron/reset-ai-quotas`.
- `0 8 * * *` : `/api/cron/visit-reminders` (rappels J-1).

Sauvegarde : GitHub Action nocturne qui exécute `npm run backup` sur le projet prod et pousse l'archive vers un stockage privé, rétention 14 jours. Indépendante de Vercel.

---

## 14. Ce que Claude Code ne fait pas sans demander

- Ajouter une dépendance.
- Modifier une migration déjà jouée sur staging.
- Toucher aux politiques RLS existantes sans le signaler explicitement dans la PR.
- Utiliser le client service role en dehors de `webhooks`, `cron` et `leenkey/admin/actions.ts`.
- Créer une route API là où une server action suffit.
- Ajouter un statut, un rôle ou un plan qui n'est pas dans la section 6.
- Tester un droit en comparant un nom de formule : toujours `hasEntitlement(propertyId, feature)`.
- Bloquer une étape essentielle de la vente (publier, échanger, visiter, recevoir, accepter ou refuser une offre, finaliser) selon la formule : règle freemium du client, voir SPEC-V2 section 11 bis.
- Implémenter quelque chose qui n'est pas dans `docs/cahier-des-charges.md` : le noter dans `docs/BACKLOG-V3.md` et le signaler.
- Écrire en prod. La prod se déploie par merge de `staging` vers `main`, jamais autrement.
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
8. Vérification manuelle sur preview, entrée dans `CHANGELOG.md`.

### Ordre de priorité des documents

En cas de contradiction : `docs/DECISIONS.md` (décisions datées du client) > `docs/SPEC-V2.md` > `CLAUDE.md` pour le contenu fonctionnel ; `CLAUDE.md` > tout le reste pour les règles techniques et de sécurité ; `docs/cahier-des-charges.md` et `docs/plan-de-mise-en-oeuvre.md` servent uniquement à vérifier le périmètre contractuel. Signaler toute contradiction relevée.

### Documents de suivi

`docs/PLANNING.md` (tâches à cocher), `docs/CHANGELOG.md`, `docs/RECETTE.md`, `docs/SECURITE.md`, `docs/BACKLOG-V3.md`, `docs/PROMPTS.md`, maquettes dans `docs/maquettes/png/`. Commandes : `/tache`, `/revue`, `/bug`, `/vendredi`, `/recette`.

Quand une instruction de session contredit ce fichier, le signaler avant d'agir. Quand ce fichier est incomplet sur un point, proposer la règle et l'ajouter ici dans la même PR.
