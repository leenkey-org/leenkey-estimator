# Leenkey V2 : spécification complète

**Destinataire :** Claude Code, qui développe la V2 en autonomie.
**Emplacement dans le repo :** `docs/SPEC-V2.md`
**Documents liés :** `CLAUDE.md` (règles du repo, à la racine), `docs/cahier-des-charges.md` (périmètre contractuel), `docs/plan-de-mise-en-oeuvre.md` (planning), `docs/maquettes/` (maquettes de référence).

Ce document est la source de vérité fonctionnelle, technique et visuelle de la V2. Le `CLAUDE.md` donne les règles de travail ; ce document dit **quoi** construire et **à quoi ça doit ressembler**. Ordre de priorité (arbitrage de Younes, 2026-10-05) : pour le fonctionnel, `docs/DECISIONS.md` > ce document > `CLAUDE.md` ; pour les règles techniques et de sécurité, `CLAUDE.md` l'emporte. Le cahier des charges et le plan de mise en œuvre servent uniquement à vérifier le périmètre contractuel. Signaler tout écart dans `docs/DECISIONS.md`.

---

## Sommaire

0. Mode d'emploi pour Claude Code
1. Le produit
2. Utilisateurs, rôles et parcours
3. Architecture technique
4. Modèle de données (DDL)
5. Permissions (RLS)
6. Direction artistique « Façade »
7. Design system : tokens, typographie, composants
8. Écrans : spécification détaillée
9. Moteur d'étapes de vente
10. Messagerie et notifications
11. Paiement Stripe
11 bis. Formules, droits et montée en gamme
12. Assistant IA
13. Offre d'achat et qualification acquéreur
14. Visites
15. Documents et analyse IA
16. Alertes acheteur
17. Back office
18. Emails transactionnels
19. Jobs planifiés
20. SEO, performance, accessibilité
21. Sécurité et RGPD
22. Tests
23. Plan de travail détaillé (tâches par semaine)
24. Contenus attendus du client et placeholders
25. Hors périmètre

---

## 0. Mode d'emploi pour Claude Code

### Comment travailler avec ce document

1. Lire `CLAUDE.md` en entier, puis ce document en entier, avant la première ligne de code.
2. Travailler **dans l'ordre de la section 23**. Chaque tâche a un identifiant (`L1-03`, etc.), des dépendances et des critères d'acceptation.
3. Pour chaque tâche : branche `feature/<id>-<slug>`, PR vers `v2` (la branche de préprod), mise à jour de `docs/CHANGELOG.md` et cochage de la tâche dans `docs/PLANNING.md`.
4. Quand une information manque (contenu client, choix non tranché) : **ne pas bloquer**. Utiliser le placeholder prévu en section 24, le marquer `// TODO(client): ...`, et ajouter une ligne dans `docs/DECISIONS.md` avec la question à poser.
5. Quand une demande sort du périmètre : ne pas l'implémenter, l'ajouter dans `docs/BACKLOG-V3.md`.

### Ce que Claude Code ne peut pas faire seul (actions humaines)

Ces étapes sont faites par Younes. Si elles ne sont pas faites, Claude Code travaille en local avec des valeurs de test et le signale.

| Action | Qui | Quand |
|---|---|---|
| Créer les projets Supabase `leenkey-dev`, `leenkey-staging`, `leenkey-prod` | Younes (prod : compte de Cédric) | Avant L1-01 |
| Créer le compte Stripe Leenkey (au nom de la SAS), les produits et prix en mode test | Younes avec Cédric | Avant L1-26 |
| Créer les clés Resend (L1-09, emails d'auth), Mapbox (L1-11) et Anthropic (L1-28) par environnement | Younes | Avant la tâche concernée |
| Configurer le projet Vercel `leenkey-v2` (branche `v2`) : variables de préprod dans son onglet « Production », dont `NEXT_PUBLIC_ENV=staging`, `PREPROD_USER`, `PREPROD_PASSWORD` | Younes | Avant L1-02 |
| Vérifier le domaine `leenkey.fr` dans Resend | Younes | Avant la mise en production |
| Fournir les contenus client (section 24) | Cédric via Younes | Au kick-off |
| Passer Stripe en mode live, faire le passage en prod | Younes | S10 |

---

## 1. Le produit

### En une phrase

Leenkey est une plateforme de vente immobilière entre particuliers, où chaque annonce est complète, chaque acquéreur est identifié et chaque vente est accompagnée par Leenkey et par un assistant IA.

### Positionnement

- **Ni agence, ni vendeur seul.** Le propriétaire garde la main (« vous gardez les clés »), Leenkey fournit les outils, l'IA et, selon la formule, un conseiller.
- **Forfait fixe par bien, jamais de commission.** Trois formules (contenu exact en section 11 bis) :
  - **Autonomie, gratuit** : « Tous les outils pour vendre vous-même. » Les outils + l'IA.
  - **Accompagné, 990 € TTC** : « Vous vendez. On vous accompagne à chaque étape. » Les outils + l'IA + un conseiller pour les décisions importantes.
  - **Sérénité, 1 500 € TTC** : « On pilote avec vous jusqu'à la signature. » Tout Accompagné + constitution et suivi du dossier jusqu'à la signature définitive.
- **Règle freemium non négociable : aucune étape essentielle de la vente n'est bloquée par un paywall.** Un vendeur Autonomie publie, reçoit des contacts, organise ses visites, reçoit, accepte ou refuse une offre et va jusqu'au bout de sa vente. Les formules payantes vendent de l'expertise, du temps humain et de la prise en charge, pas le droit de terminer sa transaction. La montée en gamme est proposée au moment où le besoin apparaît (déclencheurs contextuels, section 11 bis).
- **Annonces exclusives à Leenkey.** Aucune diffusion vers les portails externes, et rien dans l'interface ne doit laisser croire le contraire.
- **Acquéreurs mieux renseignés, jamais « garantis ».** L'acquéreur crée un compte et renseigne son projet et son financement. Le vendeur voit des statuts factuels (informations déclarées, justificatif fourni, justificatif vérifié). Leenkey ne garantit jamais la solvabilité d'un acquéreur ni l'obtention d'un financement, et le mot « validé » n'est jamais employé pour un financement.

### Ce qui existe déjà (V1)

- Site marketing sur `leenkey.fr` (accueil, concept, investir, tarifs, FAQ : pages HTML statiques), design tokens en place.
- Analyse de valeur (estimateur : données DVF, rapport PDF par email), déployée sur Vercel.
- **Stack V1 : Vite + React 19 + TanStack Router**, endpoints serverless dans `api/`. Contrairement à ce qu'indique le cahier des charges (§5, « Next.js (existant) »), la V1 n'est pas en Next.js : la V2 est un nouveau projet Next.js 15 dans le même repo, qui reprend l'existant en L1-01 (voir `CLAUDE.md` section 16).
- Aucun compte utilisateur, aucune base de données applicative, aucun test.

La V2 **conserve** l'estimateur (moteur inchangé, sous tests de non-régression), les 4 endpoints (`/api/estimate`, `/api/contact`, `/api/send-report`, `/api/dvf-comparables`, en route handlers aux mêmes chemins), les pages marketing, GA4, GTM, Vercel Analytics et les redirections, et construit l'application autour. L'estimateur devient l'entrée du parcours vendeur : à la fin d'une estimation, bouton « Publier ce bien », qui crée un compte et préremplit la fiche du bien.

### Les trois lots

| Lot | Semaines | Contenu |
|---|---|---|
| Lot 1 : socle | S1 à S5 | Reprise de l'existant en Next.js, comptes, fiche du bien, annonce, recherche, messagerie (acquéreurs, puis conseiller en fin de lot), dashboard vendeur avec moteur d'étapes, formules et droits, Stripe, assistant IA (vendeur + admin), back office. Les déclencheurs de montée en gamme (L2-09) et l'export RGPD (L2-10) sont livrés avec le lot 2 |
| Lot 2 : qualification | S6 à S7 | Offre d'achat structurée (co-acquéreurs et SCI compris) avec synthèse automatique par gabarits, qualification acquéreur, assistant IA acquéreur |
| Lot 3 : accompagnement | S8 à S9 | Visites sur invitation (créneaux ponctuels), dossier de vente et partage de documents, analyse IA des documents, alertes acheteur |
| Mise en production | S10 | Recette, durcissement, livraison de la préprod validée le 18 décembre ; bascule en production le 4 janvier 2027 (à confirmer avec Cédric) |

---

## 2. Utilisateurs, rôles et parcours

### Rôles

| Rôle | Qui | Accès |
|---|---|---|
| `seller` | Propriétaire qui vend | Espace vendeur : biens, annonce, dashboard, documents, visites, offres reçues, formule |
| `buyer` | Acquéreur | Espace acquéreur : profil et financement, favoris, conversations, visites, offres envoyées, alertes |
| `admin` | Cédric et l'équipe Leenkey | Back office complet |
| anonyme | Visiteur | Pages publiques, recherche, annonces publiées, estimateur |

Un profil peut cumuler `seller` et `buyer` (tableau `roles user_role[]`). `admin` est attribué uniquement en base par un admin existant ou par seed.

### Parcours vendeur

Le parcours suit les six étapes de vente de la section 9, identiques dans leur logique pour les trois formules. Le dashboard répond toujours à quatre questions : où j'en suis, ce que j'ai déjà fait, ce qu'il me reste à faire, ma prochaine action.

1. Estimation sur l'estimateur existant (anonyme).
2. « Publier ce bien » → inscription avec rôle `seller`. Formule Autonomie par défaut.
3. Fiche du bien en 4 étapes, préremplie depuis l'estimation.
4. Prévisualisation → « Envoyer en validation ». Statut `pending`. Leenkey relit sous 24 h.
5. L'admin valide → `published`. Email au vendeur. Le moteur d'étapes avance.
6. À tout moment, et surtout aux moments clés (annonce prête, offre reçue, offre acceptée), le vendeur se voit proposer une formule payante. S'il souscrit : paiement Stripe, conversation « Mon conseiller Leenkey » ouverte, dossier créé côté back office.
7. Contacts, conversations, visites, offres, préparation avec le notaire, signature, puis bilan de la vente.

### Parcours acquéreur

1. Recherche (anonyme) → page annonce.
2. Action « Contacter », « Sauvegarder », « Demander une visite » ou « Faire une offre » → inscription avec rôle `buyer`.
3. Onboarding acquéreur : projet (résidence principale, secondaire, investissement), situation, financement (apport, prêt, accord de principe).
4. Premier message au vendeur → conversation.
5. Invitation à visiter reçue du vendeur → réservation d'un créneau.
6. Offre d'achat structurée → le vendeur la reçoit avec une synthèse.

### Parcours admin

1. Tableau de bord : ce qui attend une action.
2. Validation des annonces avec pré-analyse IA.
3. Suivi des dossiers d'accompagnement (formules payantes et demandes « parler à un conseiller »).
4. Modération des signalements.
5. Gestion de la base de connaissances de l'assistant (lecture et import en V2, édition en V3).

---

## 3. Architecture technique

### Stack

Voir `CLAUDE.md` section 2. Résumé : Next.js 15 (App Router, TypeScript strict), Tailwind + shadcn/ui, Supabase (Postgres, Auth, Storage, Realtime, pgvector), Stripe Checkout, Anthropic API, Resend + React Email, Mapbox, Vercel Pro, Zod, Vitest, Playwright.

### Embeddings de la base de connaissances

L'API Anthropic ne fournit pas d'embeddings. Utiliser le modèle **`gte-small` intégré à Supabase** (Edge Function avec `Supabase.ai.Session('gte-small')`), dimension **384**. Avantages : aucun fournisseur de plus, aucune clé de plus, gratuit dans le quota Supabase. La colonne est donc `embedding vector(384)`. Si la qualité de recherche est insuffisante en recette, la question sera posée dans `DECISIONS.md` (option : Voyage AI).

### Modèles IA

Déclarés dans `core/ai/models.ts`, jamais en dur ailleurs :

```ts
export const MODELS = {
  fast: process.env.AI_MODEL_FAST ?? 'claude-haiku-4-5-20251001',   // conversation, suggestions, pré-analyse
  smart: process.env.AI_MODEL_SMART ?? 'claude-sonnet-5-5',         // analyse de documents
} as const;
```

Identifiants vérifiés le 2026-10-05 sur la documentation Anthropic (platform.claude.com, « Models overview ») : `claude-sonnet-5-5` (Claude Sonnet 5.5, modèle courant) et `claude-haiku-4-5-20251001` (Claude Haiku 4.5). `claude-sonnet-5` est un modèle « legacy » : ne pas l'utiliser. **Attention** : Haiku 4.5 est annoncé avec un retrait « pas avant le 15 octobre 2026 » ; il peut donc être retiré pendant le projet. Vérifier la page des dépréciations avant la mise en production et basculer `AI_MODEL_FAST` si besoin (voir `DECISIONS.md`).

Les identifiants sont surchargeables par variables d'environnement pour pouvoir changer de modèle sans déploiement de code.

### Schéma des flux

```
Navigateur
  ├─ Server Components ──► queries.ts ──► Supabase (session utilisateur, RLS)
  ├─ Server Actions ─────► actions.ts ──► Zod ──► Supabase (session utilisateur, RLS)
  ├─ Route /api/ai/chat ─► core/ai ─────► Anthropic (streaming) + outils ──► Supabase
  └─ Realtime ───────────► Supabase Realtime (messages, notifications)

Stripe ──webhook──► /api/webhooks/stripe ──► Supabase (service role, idempotent)
Vercel Cron ──────► /api/cron/* ─────────► Supabase (service role)
Resend ◄────────── core/notifications (file notifications → emails)
```

### Routes applicatives

```
(public)
  /                         accueil (existant, enrichi)
  /estimer                  estimateur (existant)
  /acheter                  recherche liste + carte
  /annonce/[slug]           page annonce publique
  /vendre                   page vendeur (existante, CTA vers inscription)
  /mentions-legales, /cgu, /confidentialite, /cgv
(auth)
  /inscription, /connexion, /mot-de-passe-oublie, /reinitialiser
(app)  — connecté
  /vendeur                  dashboard vendeur
  /vendeur/biens/nouveau    création de bien (étapes)
  /vendeur/biens/[id]       fiche du bien (onglets : infos, photos, annonce, documents, visites, offres)
  /vendeur/formule          choix et gestion de la formule
  /acquereur                accueil acquéreur (favoris, conversations, visites, offres)
  /acquereur/profil         projet et financement
  /acquereur/alertes
  /messages                 liste des conversations (dont « Mon conseiller Leenkey » pour les formules payantes)
  /messages/[id]            conversation
  /offres/nouvelle?listing= formulaire d'offre (L2)
  /offres/[id]              détail d'une offre
  /visites/reserver/[token] réservation d'un créneau sur invitation (L3)
  /assistant                assistant plein écran (mobile)
  /compte                   paramètres, notifications, suppression de compte
(admin)
  /admin                    tableau de bord
  /admin/annonces
  /admin/annonces/[id]
  /admin/utilisateurs
  /admin/utilisateurs/[id]
  /admin/dossiers
  /admin/messages           conversations conseiller avec les clients
  /admin/dossiers/[id]
  /admin/offres
  /admin/signalements
  /admin/assistant          base de connaissances + journal des conversations
api
  /api/ai/chat              streaming assistant
  /api/webhooks/stripe
  /api/cron/*
  /api/og/[slug]            image Open Graph d'une annonce
```

---

## 4. Modèle de données (DDL)

Migrations dans `supabase/migrations/`. Le DDL ci-dessous est la cible ; le découper en migrations par tâche (section 23). Toute table a ses RLS dans la même migration (section 5).

### Enums

```sql
create type user_role        as enum ('seller','buyer','admin');
create type plan_code        as enum ('autonomie','accompagne','serenite');
create type property_type    as enum ('appartement','maison','terrain','autre');
create type listing_status   as enum ('draft','pending','published','paused','suspended','sold','rejected');
-- 'suspended' : posé et levé uniquement par l'admin (listing_suspend / listing_unsuspend) ; le vendeur ne peut pas en sortir
create type offer_status     as enum ('draft','submitted','viewed','accepted','declined','expired','withdrawn','superseded');
create type visit_status     as enum ('requested','confirmed','done','cancelled');
create type case_status      as enum ('new','in_progress','closed');
create type case_source      as enum ('plan_purchase','assistant_handoff','manual');
create type financing_status as enum ('not_provided','declared','document_provided','document_checked');
create type acquisition_mode   as enum ('own_name','joint','sci','other');
create type financing_mode     as enum ('no_loan','loan');
create type financing_progress as enum ('not_presented','simulation_done','broker_consulted','agreement_in_principle','other');
create type financing_document_type as enum ('accord_principe','attestation_courtier','simulation_bancaire','preuve_fonds_propres','autre');
create type conversation_kind as enum ('listing','advisor');
create type plan_feature as enum ('advisor','human_price_strategy','human_listing_review','human_offer_analysis','negotiation_support','sale_file_building','deep_document_review','notary_coordination','closing_follow_up');
create type buyer_project    as enum ('residence_principale','residence_secondaire','investissement');
create type document_type    as enum ('dpe','amiante','plomb','electricite','gaz','termites','erp','carrez',
                                      'titre_propriete','taxe_fonciere','pv_ag','reglement_copro',
                                      'appel_charges','facture_travaux','autre');
create type notification_channel as enum ('in_app','email');
```

### Utilisateurs

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text, last_name text, phone text,
  avatar_path text,
  roles user_role[] not null default '{}',
  ai_messages_today int not null default 0,
  notification_prefs jsonb not null default '{"email_messages":true,"email_offers":true,"email_alerts":true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table buyer_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  project buyer_project,
  target_cities text[],
  budget_max_cents bigint,
  down_payment_cents bigint,
  loan_needed boolean,
  loan_amount_cents bigint,
  financing_status financing_status not null default 'not_provided',
  current_financing_document_id uuid,  -- FK vers financing_documents(id), ajoutée en L2-02 avec la table
  situation_note text,                 -- texte libre court, 280 car. max
  updated_at timestamptz
);
```

Statuts de financement, libellés affichés et sens (à reprendre mot pour mot) :

| Statut | Libellé | Sens |
|---|---|---|
| `not_provided` | Financement non renseigné | L'acquéreur n'a rien indiqué |
| `declared` | Informations déclarées | Projet, budget, apport et besoin de prêt renseignés par l'acquéreur lui-même |
| `document_provided` | Justificatif fourni | Un justificatif a été transmis, pas encore contrôlé |
| `document_checked` | Justificatif vérifié | Leenkey a contrôlé la présence du document et sa cohérence apparente avec les informations déclarées |

Mention obligatoire partout où un statut de financement est affiché à un vendeur (infobulle ou ligne sous le badge) : « Leenkey vérifie la présence et la cohérence apparente des justificatifs transmis. Leenkey ne garantit ni l'obtention du financement ni la solvabilité de l'acquéreur. »

Justificatifs acceptés : accord de principe bancaire, attestation d'un courtier, simulation ou offre bancaire nominative de moins de 3 mois environ, preuve de fonds propres (attestation bancaire) en cas d'achat comptant total ou partiel. Le contrôle signale un justificatif daté de plus de 3 mois (à confirmer par Cédric pour les types autres que la simulation, voir `DECISIONS.md`).

Justificatifs de financement (table créée en L2-02, lot 2) :

```sql
create table financing_documents (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  type financing_document_type not null,
  document_date date,                  -- date figurant sur le justificatif (alerte au-delà de 3 mois)
  storage_path text not null,          -- bucket 'documents', privé : {buyer_id}/financing/{uuid}.pdf
  mime_type text not null,
  size_bytes int not null,
  checked_at timestamptz,              -- contrôle par Leenkey : présence + cohérence apparente
  checked_by uuid references profiles(id),
  check_note text,                     -- note interne admin, jamais visible par l'acquéreur ni le vendeur
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table buyer_profiles add constraint buyer_profiles_current_doc_fk
  foreign key (current_financing_document_id) references financing_documents(id);
```

Un acquéreur peut avoir plusieurs justificatifs dans le temps ; `buyer_profiles.current_financing_document_id` pointe vers celui en vigueur. `financing_status` passe à `document_provided` au dépôt et à `document_checked` quand l'admin marque le justificatif comme vérifié (fonction SQL `financing_document_check`, admin uniquement, écrite dans `audit_log`). Libellé affiché après contrôle : « Contrôlé par Leenkey le JJ/MM/AAAA ».

Création automatique d'une ligne `profiles` à l'inscription par trigger sur `auth.users`.

### Biens et annonces

```sql
create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  type property_type not null,
  address_line text not null,
  postal_code text not null,
  city text not null,
  district text,                        -- quartier affiché publiquement
  location geography(point, 4326),      -- précise, jamais exposée publiquement
  public_location geography(point, 4326), -- floutée à ~200 m pour l'affichage
  surface_m2 numeric(7,2) not null,
  carrez_m2 numeric(7,2),
  rooms int not null,
  bedrooms int,
  floor int, floors_total int,
  has_elevator boolean, has_balcony boolean, has_terrace boolean,
  has_garden boolean, has_parking boolean, has_cellar boolean,
  orientation text,
  build_year int,
  is_new_build boolean not null default false,  -- neuf ou VEFA : frais d'acquisition indicatifs différents
  dpe_class char(1) check (dpe_class in ('A','B','C','D','E','F','G')),
  ges_class char(1) check (ges_class in ('A','B','C','D','E','F','G')),
  heating text,
  charges_monthly_cents int,
  property_tax_yearly_cents int,
  copro_lots int,
  estimation_id uuid,                   -- lien vers l'estimation d'origine
  estimation_value_cents bigint,
  estimation_low_cents bigint, estimation_high_cents bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references properties(id),
  slug text not null unique,            -- ex: appartement-3-pieces-savigny-sur-orge-lk0142
  reference text not null unique,       -- ex: LK-0142
  title text not null,
  description text not null,
  price_cents bigint not null,
  status listing_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz, published_at timestamptz, sold_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,               -- motif admin, communiqué au vendeur par email
  views_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,           -- bucket 'photos'
  width int, height int,
  position int not null,
  is_cover boolean not null default false,
  caption text,
  created_at timestamptz not null default now()
);

create table listing_views (             -- agrégation des vues, pas de tracking individuel
  listing_id uuid references listings(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (listing_id, day)
);

create table listing_revisions (         -- historique simplifié : quels champs ont changé, quand, par qui
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  changed_by uuid not null references profiles(id),
  field text not null check (field in ('price','description','title')),
  old_value jsonb,                      -- ancienne valeur brute (le prix en centimes, le texte tel quel)
  new_value jsonb,
  created_at timestamptz not null default now()
);
-- Alimentée par trigger sur listings, uniquement quand status = 'published'. Pas de diff visuel : une liste chronologique « champ · ancienne → nouvelle valeur ».
create index on listing_revisions (listing_id, created_at desc);

create table favorites (
  buyer_id uuid references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);
```

Référence `LK-XXXX` : séquence Postgres dédiée, formatée sur 4 chiffres.

### Formules, droits et paiements

```sql
create table plans (
  code plan_code primary key,
  name text not null,
  tagline text not null,                -- ex: « Tous les outils pour vendre vous-même. »
  price_cents int not null,             -- TTC
  stripe_price_id text,                 -- null pour autonomie
  scope text not null default 'property' check (scope in ('property','account')), -- réservé : formule investisseur
  description text not null,
  features text[] not null,             -- liste affichée sur la page formules
  position int not null,
  active boolean not null default true
);

create table plan_entitlements (         -- droits fonctionnels par formule (le code ne teste jamais un nom de formule)
  plan plan_code references plans(code),
  feature plan_feature not null,
  primary key (plan, feature)
);

create table subscriptions (             -- formule active d'un bien
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  owner_id uuid not null references profiles(id),
  plan plan_code not null,
  amount_paid_cents int not null default 0,
  discount_cents int not null default 0,          -- réservé : remise multi-biens
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_promotion_code text,                     -- réservé : codes promo Stripe
  activated_at timestamptz not null default now(),
  replaced_by uuid references subscriptions(id),  -- upgrade
  refunded_at timestamptz
);

create table stripe_events (             -- idempotence
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create table upgrade_prompts (           -- déclencheurs de montée en gamme affichés
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  trigger_code text not null,           -- voir section 11 bis
  target_plan plan_code not null,
  shown_at timestamptz not null default now(),
  dismissed_at timestamptz,
  clicked_at timestamptz,
  unique (property_id, trigger_code)
);
```

**Extensibilité demandée par le client** : la formule reste rattachée au bien, mais rien dans le code ne doit l'empêcher d'introduire plus tard une remise multi-biens ou une formule investisseur. Conséquences :
- Les droits se testent uniquement par `hasEntitlement(propertyId, feature)` (`core/billing/entitlements.ts`), jamais par `plan === 'serenite'`.
- Les prix viennent de `plans` et de Stripe, jamais du code.
- Le checkout accepte des codes promo Stripe (`allow_promotion_codes`) et enregistre la remise.
- `plans.scope` et `subscriptions.discount_cents` existent dès la V2 sans être utilisés.

### Moteur d'étapes

```sql
create table sale_steps (                -- modèle, chargé par seed
  id uuid primary key default gen_random_uuid(),
  plan plan_code not null,
  code text not null,                   -- 'prepare', 'publish', 'contacts_visits', 'offers', 'notary', 'closing'
  position int not null,
  title text not null,
  description text not null,
  owner text not null check (owner in ('seller','leenkey','both')),   -- qui agit, pour cette formule
  auto_trigger text,                    -- événement qui la complète, ex: 'listing.published'
  unique (plan, code)
);

create table sale_step_tasks (           -- tâches modèle par étape
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references sale_steps(id) on delete cascade,
  code text not null,
  title text not null,
  auto_trigger text,                    -- ex: 'document.uploaded:dpe'
  position int not null
);

create table sale_progress (             -- instance par bien
  property_id uuid primary key references properties(id) on delete cascade,
  plan plan_code not null default 'autonomie',
  current_step_code text not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz
);

create table sale_task_status (
  property_id uuid references properties(id) on delete cascade,
  task_id uuid references sale_step_tasks(id) on delete cascade,
  done_at timestamptz,
  done_by uuid references profiles(id),
  primary key (property_id, task_id)
);
```

### Messagerie

Une seule mécanique pour deux types de conversation : vendeur ↔ acquéreur sur une annonce (`listing`), et vendeur ↔ équipe Leenkey sur un bien (`advisor`, formules payantes).

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  kind conversation_kind not null default 'listing',
  property_id uuid not null references properties(id),
  listing_id uuid references listings(id),        -- obligatoire si kind = 'listing'
  seller_id uuid not null references profiles(id),
  buyer_id uuid references profiles(id),          -- obligatoire si kind = 'listing', null si 'advisor'
  last_message_at timestamptz,
  seller_last_read_at timestamptz,
  buyer_last_read_at timestamptz,
  leenkey_last_read_at timestamptz,               -- lecture côté équipe Leenkey (advisor)
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'listing' and listing_id is not null and buyer_id is not null)
      or (kind = 'advisor' and buyer_id is null))
);
create unique index on conversations (listing_id, buyer_id) where kind = 'listing';
create unique index on conversations (property_id) where kind = 'advisor';

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),  -- pour 'advisor', un admin écrit au nom de « l'équipe Leenkey »
  body text not null check (char_length(body) between 1 and 4000),
  kind text not null default 'text' check (kind in ('text','system','visit_invite','offer_notice','assistant_handoff')),
  meta jsonb,
  ai_suggested boolean not null default false,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id),
  reporter_id uuid not null references profiles(id),
  reason text not null,
  resolved_at timestamptz, resolved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
```

### Offres (lot 2)

Modèle d'offre fourni par Cédric le 2026-10-05 (section 13). Une offre envoyée est **figée** : ni modifiée ni supprimée, jamais. Une correction = une nouvelle offre (`version` + 1, l'ancienne passe en `superseded` et pointe vers la nouvelle via `superseded_by`). L'historique complet reste dans le dossier du bien.

Le gel est garanti en base, pas seulement dans l'interface : un trigger `offers_freeze_after_submit` refuse toute mise à jour des colonnes de contenu (identité, bien, prix, financement, conditions, déclarations, validité) dès que `submitted_at` est renseigné. Seules les colonnes de statut et d'horodatage restent modifiables, et uniquement via les fonctions de transition.

```sql
-- enums acquisition_mode, financing_mode, financing_progress : section 4 (Enums)
create table offers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,                -- LK-AAAA-NNNNN, générée à la création du brouillon
  version int not null default 1,
  listing_id uuid not null references listings(id),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),

  -- 1. Acquéreur (photographie au moment de l'envoi, jamais relue depuis le profil ensuite)
  buyer_identity jsonb not null default '{}',    -- { last_name, first_name, birth_date, address, email, phone }
  co_buyers jsonb not null default '[]',         -- [{ last_name, first_name, birth_date, address, email, phone }]
  acquisition_mode acquisition_mode not null default 'own_name',
  acquisition_mode_other text,                   -- si 'other'
  sci_details jsonb,                             -- si 'sci' : { name, status: 'registered'|'in_formation', siren (obligatoire si registered), head_office_address, representative }

  -- 2. Bien (photographie de l'annonce au moment de l'envoi, préremplie, non saisie par l'acquéreur)
  property_snapshot jsonb not null default '{}', -- { listing_reference, address, type, surface_m2, annexes[], asking_price_cents }

  -- 3. Prix
  price_cents bigint not null,
  price_in_words text not null,                  -- généré en code (core/lib/number-to-words-fr.ts), jamais saisi

  -- 4. Financement déclaré
  financing_mode financing_mode not null,
  down_payment_cents bigint not null default 0,
  loan_amount_cents bigint not null default 0,
  loan_duration_years int,
  loan_rate_max_pct numeric(4,2),
  lender_name text,                              -- banque ou courtier, facultatif
  financing_progress financing_progress,
  financing_progress_other text,
  financing_document_id uuid references financing_documents(id), -- justificatif joint (celui du profil ou un nouveau), table créée en L2-02
  financing_status_at_submit financing_status,   -- photographie du statut ; affiché au vendeur, jamais imprimé dans le PDF

  -- 5. Conditions (cases + précisions ; aucune clause libre rédigée par l'acquéreur)
  condition_prior_sale boolean not null default false,       -- vente préalable d'un autre bien
  condition_authorization boolean not null default false,    -- obtention d'une autorisation particulière
  condition_other boolean not null default false,
  conditions_details text check (char_length(conditions_details) <= 500),

  -- 6. Validité
  validity_until timestamptz not null,           -- 5 jours par défaut, de 2 à 10 jours

  -- 7. Déclarations de l'acquéreur (toutes obligatoires, horodatées)
  visited boolean not null,                      -- true = a visité ; false = offre sans visite préalable
  declarations jsonb not null default '{}',      -- { accuracy, price_and_financing_checked, legal_effects_understood, info_read, accepted_at }

  message text,                                  -- message facultatif au vendeur (hors PDF)
  status offer_status not null default 'draft',
  synthesis jsonb,                               -- section 13
  pdf_path text,                                 -- bucket 'offers', privé
  superseded_by uuid references offers(id),

  submitted_at timestamptz, viewed_at timestamptz, answered_at timestamptz,
  withdrawn_at timestamptz, expired_at timestamptz,
  seller_acceptance jsonb,                       -- { confirmed_read: true, confirmed_at, ip_hash } (écran intermédiaire)
  precontract_signed_at date,                    -- saisi après l'acceptation (section 13)
  withdrawal_period_start date,                  -- point de départ du délai légal, saisi, jamais calculé par défaut
  created_at timestamptz not null default now()
);

create table offer_events (               -- journal horodaté, jamais modifié
  id bigint generated always as identity primary key,
  offer_id uuid not null references offers(id) on delete cascade,
  actor_id uuid references profiles(id),
  event text not null,                   -- created, submitted, viewed, accepted, declined, withdrawn, expired, superseded, pdf_generated, precontract_recorded
  meta jsonb,
  created_at timestamptz not null default now()
);
```

### Visites (lot 3)

```sql
create table visit_slots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 1,
  created_at timestamptz not null default now()
);

create table visit_invitations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  token text not null unique,           -- lien de réservation
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (property_id, buyer_id)
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references visit_slots(id),
  property_id uuid not null references properties(id),
  buyer_id uuid not null references profiles(id),
  status visit_status not null default 'confirmed',
  buyer_feedback text, buyer_interest int check (buyer_interest between 1 and 5),
  seller_feedback text,
  created_at timestamptz not null default now()
);
```

### Documents (lot 3)

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  type document_type not null,
  title text not null,
  storage_path text not null,           -- bucket 'documents', privé
  mime_type text not null,
  size_bytes int not null,
  page_count int,
  extracted_text text,                  -- texte brut, jamais exposé côté client
  analysis jsonb,                       -- résultat IA, voir section 15
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table document_shares (
  document_id uuid references documents(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete cascade,
  shared_at timestamptz not null default now(),
  primary key (document_id, buyer_id)
);

create table document_access_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  buyer_id uuid not null references profiles(id),
  status text not null default 'pending' check (status in ('pending','granted','declined')),
  created_at timestamptz not null default now(),
  unique (property_id, buyer_id)
);
```

### Alertes (lot 3)

```sql
create table alerts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  criteria jsonb not null,              -- même schéma que les filtres de recherche (Zod SearchFilters)
  last_sent_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### Accompagnement, assistant, notifications, audit

```sql
create table cases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id),
  profile_id uuid not null references profiles(id),
  source case_source not null,
  plan plan_code,
  status case_status not null default 'new',
  subject text not null,
  ai_summary text,
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table knowledge_base (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('seller','buyer','both')),
  category text not null,
  step_code text,
  question text not null,
  answer text not null,
  embedding vector(384),
  source_file text,
  updated_at timestamptz not null default now()
);
create index on knowledge_base using hnsw (embedding vector_cosine_ops);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  context text not null check (context in ('seller','buyer','admin')),
  property_id uuid references properties(id),
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  model text, input_tokens int, output_tokens int,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,                   -- ex: 'message.new', 'listing.published', 'offer.received'
  title text not null,
  body text,
  link text,
  channels notification_channel[] not null default '{in_app}',
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,                 -- ex: 'listing.validate', 'user.suspend'
  entity text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
```

### Vue publique des annonces

Les pages publiques ne lisent jamais `properties` directement : elles passent par une vue `public_listings` qui expose uniquement les champs publics (pas d'adresse exacte, pas de `location` précise, pas d'`owner_id`, prénom du vendeur uniquement).

```sql
create view public_listings with (security_invoker = true) as
select l.id, l.slug, l.reference, l.title, l.description, l.price_cents, l.published_at,
       p.type, p.city, p.postal_code, p.district, p.public_location,
       p.surface_m2, p.rooms, p.bedrooms, p.floor, p.has_elevator, p.has_balcony,
       p.has_terrace, p.has_garden, p.has_parking, p.has_cellar, p.orientation,
       p.build_year, p.dpe_class, p.ges_class, p.charges_monthly_cents,
       p.property_tax_yearly_cents,
       pr.first_name as seller_first_name,
       s.plan
from listings l
join properties p on p.id = l.property_id
join profiles pr on pr.id = p.owner_id
left join sale_progress s on s.property_id = p.id
where l.status = 'published' and l.deleted_at is null and p.deleted_at is null;
```

### Storage

| Bucket | Accès | Contenu | URL |
|---|---|---|---|
| `photos` | privé, lecture via URL signée 1 h | photos redimensionnées : `{property_id}/{uuid}-{size}.webp`, tailles 400, 800, 1600 | signée |
| `documents` | privé | documents du dossier de vente (`{property_id}/…`), justificatifs de financement (`{buyer_id}/financing/…`) | signée 10 min |
| `offers` | privé | PDF des offres d'achat : `{offer_id}/v{version}.pdf`, jamais réécrit | signée 10 min |
| `avatars` | privé | photos de profil | signée 1 h |

Les photos des annonces publiées sont servies via une route Next.js `/img/[...path]` qui vérifie que l'annonce est publiée puis redirige vers une URL signée, avec cache CDN de 50 minutes. Aucune URL permanente.

---

## 5. Permissions (RLS)

Principe : **tout est interdit par défaut**, chaque accès est une politique explicite. Fonctions utilitaires :

```sql
create function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and 'admin' = any(roles));
$$;

create function owns_property(p uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from properties where id = p and owner_id = auth.uid());
$$;

create function has_buyer_relation(p uuid, b uuid) returns boolean language sql stable security definer as $$
  -- l'acquéreur b a contacté ou fait une offre sur le bien p
  select exists (select 1 from conversations c join listings l on l.id = c.listing_id
                 where l.property_id = p and c.buyer_id = b)
      or exists (select 1 from offers o join listings l on l.id = o.listing_id
                 where l.property_id = p and o.buyer_id = b and o.status <> 'draft');
$$;
```

Matrice (L = lecture, E = écriture) :

| Table | Anonyme | Vendeur | Acquéreur | Admin |
|---|---|---|---|---|
| `profiles` | — | L/E soi | L/E soi | L tous, E `roles` |
| `buyer_profiles` | — | L des acquéreurs ayant une relation avec ses biens : `project`, `financing_status`, type et date de contrôle du justificatif uniquement, via la fonction `buyer_summary_for_seller()` ; jamais le justificatif ni les montants du profil (Q5) | L/E soi | L tous, E statut `document_checked` via `financing_document_check` |
| `financing_documents` | — | — (jamais) | L/E les siens (pas `check_note`, pas `checked_*`) | L tous, E contrôle via fonction SQL |
| `properties` | — (via vue) | L/E ses biens | — (via vue) | L tous, E |
| `listings` | L si `published` | L/E ses annonces sauf si `suspended` (lecture seule) ; `status` uniquement via fonctions : `draft`↔`pending`, `published`↔`paused`, `→sold` ; jamais vers ou depuis `suspended` | L si `published` | L/E tous ; seul rôle autorisé à `→suspended` et `suspended→published/paused` |
| `photos` | via route `/img` | L/E ses biens | via route `/img` | L tous |
| `favorites` | — | — | L/E les siens | L |
| `plans` | L | L | L | L/E |
| `subscriptions` | — | L les siennes | — | L tous |
| `sale_*` | — | L ses biens, E `sale_task_status` sur tâches `owner in (seller,both)` | — | L/E |
| `conversations` | — | L participant (`listing` et `advisor` de ses biens) | L/E participant (création `listing` uniquement) | L tous, E sur `advisor` |
| `messages` | — | L/E participant | L/E participant | L tous ; E uniquement dans les conversations `advisor` |
| `reports` | — | E | E | L/E |
| `offers` | — | L sur ses annonces **uniquement via la vue `offer_for_seller`** (aucune lecture directe de la table, qui exposerait les données personnelles avant acceptation), transitions `viewed/accepted/declined` via fonctions SQL | L les siennes, création, retrait (`submitted`/`viewed` → `withdrawn`) via fonction SQL | L, E `precontract_signed_at` et `withdrawal_period_start` |
| `offer_events`, `listing_revisions` | — | L ses biens | L les siennes (`offer_events`) | L |
| `plan_entitlements` | L | L | L | L/E |
| `upgrade_prompts` | — | L/E ses biens | — | L |
| `visit_slots` | — | L/E ses biens | L si invitation valide | L |
| `visit_invitations` | — | L/E ses biens | L les siennes | L |
| `visits` | — | L ses biens, E feedback | L/E les siennes | L |
| `documents` | — | L/E ses biens | L si `document_shares` | L |
| `document_shares` | — | L/E ses biens | L les siennes | L |
| `alerts` | — | — | L/E les siennes | L |
| `cases` / `case_notes` | — | L ses cases (sans notes internes) | L ses cases (sans notes internes) | L/E |
| `knowledge_base` | — | — | — | L/E (lecture par l'assistant via fonction serveur) |
| `ai_*` | — | L les siennes | L les siennes | L |
| `notifications` | — | L/E (`read_at`) les siennes | idem | L |
| `audit_log` | — | — | — | L |

Les transitions de statut (annonces, offres) sont contrôlées par des **fonctions SQL** `security definer` appelées depuis les server actions (`listing_submit`, `listing_pause`, `listing_suspend`, `listing_unsuspend`, `offer_submit`, `offer_answer`…), pas par des `update` libres. Les politiques `update` directes sur `status` sont refusées. `listing_suspend` et `listing_unsuspend` vérifient `is_admin()`, exigent un motif pour la suspension et écrivent dans `audit_log` ; toutes les fonctions vendeur refusent une annonce `suspended`.

Les écritures que l'assistant fait au-delà des droits de l'utilisateur passent aussi par des fonctions `security definer` dédiées, jamais par la clé service role : `create_case(p_property_id, p_subject, p_summary, p_source)` vérifie que `auth.uid()` est le propriétaire du bien (ou un acquéreur sans bien, `p_property_id` nul), force `profile_id = auth.uid()`, limite la longueur des textes et le nombre de dossiers ouverts par utilisateur (5), puis notifie l'admin.

Tests : `supabase/tests/rls_*.sql` avec les comptes de seed `seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin`. Chaque ligne de la matrice a au moins un test positif et un test négatif.

---

## 6. Direction artistique « Façade »

Pour toute question d'UX, `docs/DESIGN.md` fait foi (décision du 2026-10-08) ; cette section donne les règles métier et les contenus.

Décidée le 2026-10-07 (remplace la direction « Plan d'architecte »), validée par Cédric le 2026-10-08. **Les valeurs exactes (couleurs, typographie, espacements, composants, écrans) sont dans `docs/DESIGN.md`, qui fait foi pour tout ce qui est visuel.** Cette section en donne l'esprit ; références visuelles : `docs/maquettes/png/`.

### Intention

Leenkey vend des logements, pas un logiciel. L'interface doit faire voir les biens d'abord et s'effacer derrière eux : grandes photos, chiffres lisibles, le bleu Leenkey en aplats francs pour les moments qui comptent (en-têtes, action principale), des neutres couleur pierre pour le reste. Pas de décor qui fasse « interface générée » : pas de dégradés, pas d'ombres douces, pas d'étiquettes en capitales, pas de numérotation décorative.

### Les quatre signatures

**1. La photo d'abord.** Sur l'annonce, la recherche, les cartes de bien et l'accueil acquéreur, la photo occupe la plus grande place possible (galerie pleine largeur en mobile, mosaïque 1 grande + 4 petites en desktop). Une annonce sans photo affiche le dessin `facade.svg` sur aplat pierre, jamais un bloc gris avec « Photo ».

**2. Le bleu en aplat.** `--lk-blue` s'utilise en surfaces pleines : en-tête de l'accueil connecté et des écrans de fin de parcours, bouton principal, sélection active, marqueur de prix sélectionné sur la carte. Jamais en dégradé, jamais en ombre colorée. Le navy sert aux en-têtes sombres (dashboard vendeur, back office).

**3. La typographie élargie.** Une seule famille, **Archivo**, dont on utilise l'axe de largeur : titres, prix et chiffres clés en Archivo élargie (`font-stretch: 116%`, 700, interlettrage -0,02 em) ; tout le reste en Archivo normale. Les étiquettes restent en casse normale (« Prochaine action », jamais « PROCHAINE ACTION »).

**4. Des formes nettes.** Angles de 4 px (boutons, champs, vignettes) et 6 px (cartes, panneaux) ; pastilles arrondies réservées aux statuts, compteurs, avatars et marqueurs de carte ; les filtres et puces sont des rectangles à angles de 4 px. Pas d'ombre portée sur les cartes : une bordure 1 px `--lk-line` suffit. Seuls les éléments flottants (marqueurs de carte, bouton assistant, menus) ont une ombre courte et neutre.

**Le dessin de marque.** Un dessin au trait d'une façade de maison (traits 1,5 px, toit, fenêtres, porte, une ligne de cote en haut avec sa valeur), fichier unique `public/brand/facade.svg`. Utilisé : en-tête de l'accueil connecté (blanc à 55 % sur aplat bleu), états vides, annonce sans photo, page 404, image Open Graph par défaut. C'est le seul clin d'œil au plan d'architecte qui reste.

### Ce qu'on s'interdit

- Dégradés de couleur, ombres colorées ou diffuses sur les cartes.
- Étiquettes en majuscules espacées, police monospace dans l'interface, numérotation décorative (« 01 · … ») hors étapes réelles d'un parcours.
- Séparateurs « · » empilés dans un même libellé (deux au maximum, par exemple « 3 pièces · 68 m² »).
- Icônes de maison ou de clé en dehors du logo et du dessin de marque.
- Illustrations 3D, isométriques, personnages.
- Photos de banque d'images dans l'interface marketing (couple souriant, main qui tend des clés). Les photos de l'interface sont celles des vendeurs.
- Emoji dans l'interface.
- Bordure colorée sur un seul côté d'une carte.

### Le ton

Direct, clair, rassurant, sans jargon et sans ton commercial. Vouvoiement. Phrases courtes. Nous disons ce qui se passe et ce qui vient ensuite.

Règles éditoriales du site existant, applicables à tous les textes V2 (interface, emails, PDF, prompts) : voir `CLAUDE.md` section 16. En particulier :
- Leenkey parle à la première personne du pluriel : **« nous »**, jamais « on ». Les phrases de Cédric qui contiennent « on » sont en attente de reformulation (`DECISIONS.md`, Q18) et ne sont pas modifiées d'ici là.
- **« Analyse de valeur » / « valorisation »**, pas « estimation » seul dans les libellés visibles (prudence loi Hoguet). Lien de navigation : « Valoriser mon bien » (libellé du site actuel), pas « Estimer mon bien » comme sur les maquettes. Le mot reste permis dans le code (`estimation_id`, `/estimer`) et dans « estimation indicative des frais d'acquisition », qui ne porte pas sur la valeur du bien.
- Paiement « à la souscription », jamais « au succès ».
- Pas de mention « Prix ferme ».

La phrase de marque : **« Vous gardez les clés. »** Elle apparaît au maximum une fois par parcours (hero, écran de fin de publication), jamais en slogan répété.

| Situation | À écrire | À éviter |
|---|---|---|
| Annonce envoyée | « C'est envoyé. Nous relisons votre annonce sous 24 h et vous prévenons par email. » | « Félicitations !!! Votre annonce a été soumise avec succès » |
| Annonce publiée | « C'est en ligne. On vous prévient au premier contact. » | « Votre annonce est maintenant visible par des milliers d'acheteurs » |
| Aucun contact | « Pas encore de contact. Une annonce complète et bien illustrée reçoit ses premiers messages plus vite : vérifiez vos photos et votre description. » | « Aucun résultat » |
| Offre reçue | « Une offre est arrivée. Prenez le temps de la lire avant de répondre : la synthèse vous aide à repérer les points importants. » | « Nouvelle offre ! Répondez vite ! » |
| Refus d'annonce | « Votre annonce n'a pas été publiée. Voici ce qu'il faut corriger : … » | « Annonce refusée » |
| Financement non renseigné | « Renseignez votre financement pour pouvoir faire une offre. Le vendeur voit le statut de votre dossier ; vos montants n'apparaissent que dans les offres que vous envoyez. » | « Profil incomplet » |
| Statut de financement (vendeur) | « Justificatif vérifié. Leenkey a contrôlé la présence du document et sa cohérence apparente ; cela ne garantit pas l'obtention du financement. » | « Financement validé », « Acquéreur solvable » |
| Montée en gamme | « Vous avez reçu une offre de 327 000 € pour un prix affiché de 340 000 €. Vous pouvez la traiter vous-même ou demander à un conseiller Leenkey de l'analyser avec vous. » | « Passez à Accompagné pour débloquer… », « Offre limitée » |
| Erreur | « Ça n'a pas fonctionné. Réessayez dans un instant ; si le problème continue, écrivez-nous. » | « Erreur 500 » |

Tous les textes d'interface sont centralisés dans `lib/i18n/fr.ts`.

---

## 7. Design system : tokens, typographie, composants

### Tokens et typographie

Définis dans `docs/DESIGN.md` sections 2 et 3 (fichier `app/globals.css` complet en Tailwind 4, chargement d'Archivo avec l'axe de largeur, échelle typographique, formatage des nombres). Ne pas redéfinir ici.

Badges DPE : couleurs dans `docs/DESIGN.md` section 2.1.

### Composants

Liste de référence ci-dessous ; anatomie, dimensions, variantes et états de chaque composant dans `docs/DESIGN.md` section 10.

Tous dans `components/shared/`, construits sur shadcn/ui quand un primitif existe. Chaque composant a une story de démonstration sur la page interne `/design` (accessible uniquement quand `NEXT_PUBLIC_ENV !== 'production'`), qui sert de catalogue vivant.

| Composant | Rôle | Spécification |
|---|---|---|
| `Button` | Action | Variantes `primary` (bleu plein), `secondary` (contour `--lk-blue-line`, texte bleu), `outline-ink` (contour et texte `--lk-ink`, actions de page publique), `ghost`, `on-dark` (fond `--lk-ink`), `success` (validation admin), `danger` (contour et texte `--lk-danger`), `inverse` (blanc à texte bleu, sur aplat bleu uniquement). Tailles `sm` 36–40 px, `md` 44–48 px, `lg` 52 px. Rayon 4 px (`docs/DESIGN.md` 10.1). Toujours ≥ 44 px de zone tactile. |
| `Input`, `Select`, `Textarea` | Saisie | Hauteur 48 px (44 px dans la barre de filtres desktop), bordure 1,5 px `--lk-field`, focus bordure bleue + halo 3 px `--lk-blue-line`, erreur bordure `--lk-danger` + message sous le champ. Label toujours visible au-dessus. |
| `UnitInput` | Saisie avec unité | Input + suffixe (`m²`, `€`, `%`) dans le champ. |
| `ChipToggle` | Sélection multiple | Rectangle à angles de 4 px, hauteur 40 px (36 px dans la barre de filtres mobile), sélectionné : fond `--lk-blue-tint`, bordure et texte bleus. |
| `SegmentedPicker` | Choix unique court | Utilisé pour le DPE (A à G) : boutons égaux, sélectionné en bleu plein. |
| `StatusBadge` | Statut | Mappage fixe statut → couleurs (voir ci-dessous). Pastille arrondie, 11 px, 600. |
| `DpeBadge` | Classe énergie | Couleurs du tableau DPE. |
| `FinancingBadge` | Statut de financement | Libellés exacts de la section 4 : « Financement non renseigné » (fond `--lk-stone-2`), « Informations déclarées » (fond `--lk-warning-bg`), « Justificatif fourni » (fond `--lk-blue-tint`), « Justificatif vérifié » (fond `--lk-success-bg`) ; couleurs exactes dans `docs/DESIGN.md` 10.2. Jamais « validé ». Icône d'information qui affiche la mention obligatoire. |
| `UpgradePrompt` | Proposition de formule | Encart `--lk-blue-tint`, bordure 1 px `--lk-blue-line`, rayon 6 px (`docs/DESIGN.md` 10.4) : titre, phrase contextuelle chiffrée, action `ghost` « Voir l'accompagnement » vers la page formules, bouton de fermeture `X` (masque ce déclencheur pour ce bien). Toujours placé après le contenu utile. Jamais de modale bloquante, jamais devant une action essentielle. |
| `SaleRecap` | Bilan de vente | Écran « Vente terminée » sur `BrandPanel` : prix de vente, durée de commercialisation, contacts, visites, offres reçues. |
| `KeyFigures` | Chiffres clés | 4 tuiles en mobile (surface, pièces, chambres, étage), 6 tuiles en desktop : valeur en Archivo élargie 700, libellé dessous en secondaire, sur tuiles `--lk-stone-2` (`docs/DESIGN.md` 10.2). |
| `BrandPanel` | Aplat de marque | Conteneur en aplat `--lk-blue` (variante `navy`), dessin `facade.svg` en option. Pour les en-têtes d'accueil et les écrans de fin de parcours. |
| Titre de section | Titre de section (pas un composant) | Titre de section (H3, `docs/DESIGN.md` 3.2) : Archivo 600, casse normale, 16–17 px. Pas de majuscules, pas de numéro. |
| `PropertyCard` | Carte de bien | Variantes `compact` (recherche mobile, photo 110 × 96), `wide` (recherche desktop, photo 200 × 140) et `tile` (accueil, biens similaires, photo 120 px de haut) (`docs/DESIGN.md` 10.3). Contenu : photo (obligatoire, sinon `facade.svg`), prix (Archivo élargie), type · pièces · surface, lieu, 2 à 3 atouts en puces, badge DPE, mention « Dossier complet » si ≥ 5 documents du dossier et diagnostics complets. Toute la carte est un lien. Survol desktop : bordure `--lk-ink-3` (pas d'ombre). Favori : bouton séparé 44 × 44 en haut à droite de la photo. |
| `Gallery` | Galerie | Mobile : une photo pleine largeur 280 px, défilement à l'aimant, compteur `1 / 12` en bas à droite, boutons retour et favori en haut ; toucher = plein écran. Desktop : mosaïque 1 grande + 4 petites, dernière avec « + N photos » ; clic = visionneuse plein écran (fond `--lk-ink` 95 %, flèches 44 px, compteur, `Échap` pour fermer, focus piégé, clavier et swipe) (`docs/DESIGN.md` 10.3). |
| `PriceBlock` | Prix | Prix en Archivo élargie ; dessous, sur une seule ligne en secondaire : « 5 147 € / m², sans commission ». |
| `KeyFactsTable` | Ce qu'on sait avant de visiter | Lignes libellé / valeur (valeur en 600, chiffres tabulaires), séparateurs 1 px. |
| `StepProgress` | Avancement de vente | Segments horizontaux (un par étape), étape courante en bleu, « Étape 3 sur 6 » et titre de l'étape en titre de section (H3, `docs/DESIGN.md` 3.2). Version compacte (barre seule) et étendue (liste verticale des étapes avec état). |
| `TaskList` | Tâches | Case ronde : faite = pastille verte avec coche, à faire = cercle bleu, future = cercle gris. Tâche faite barrée et grisée. Chevron vers l'action. |
| `NextActionCard` | Prochaine action | Icône dans un carré teinté, titre, explication, 1 ou 2 boutons. Toujours en tête du dashboard. |
| `StatTile` | Indicateur | Chiffre Archivo élargie 22 px, libellé 11 px secondaire. |
| `MessageBubble` | Message | Largeur max 82 %, rayon 6 px. Reçu : fond blanc, bordure `--lk-line`, coin inférieur gauche 2 px. Envoyé : fond `--lk-blue`, texte blanc, coin inférieur droit 2 px. Auteur et heure en dessous (« Thomas · 9:12 », « Vous · 9:40 »). Séparateur de date centré. Message système (offre, visite) : pleine largeur, fond `--lk-stone-2`, icône à gauche, lien d'action (`docs/DESIGN.md` 10.5). |
| `ConversationHeader` | En-tête de conversation | Retour, vignette du bien 44 × 44, titre du bien tronqué, sous-titre, menu (`docs/DESIGN.md` 10.5). Variante conseiller : avatar « LK » fond `--lk-blue` à la place de la vignette, titre « Mon conseiller Leenkey », formule du bien, mention « Réponse sous 24 h ». Messages Leenkey signés « L'équipe Leenkey » avec le prénom de l'admin qui répond. |
| `AssistantSuggestion` | Suggestion IA | Encart `--lk-blue-tint`, bordure `--lk-blue-line`, icône `Sparkles`, titre « Réponse suggérée par l'assistant » pour une suggestion de réponse en messagerie, « Proposition de l'assistant » pour une proposition de description d'annonce (second libellé : décision en attente d'ajout dans `docs/DESIGN.md`), texte, boutons Utiliser / Modifier / Ignorer. **C'est la seule forme d'une proposition de l'IA dans l'interface.** |
| `AssistantPanel` | Chat assistant | Mobile : page plein écran `/assistant`, ouverte depuis l'onglet ou le bouton d'en-tête. Desktop : panneau latéral droit 400 px, ouvert depuis le bouton flottant `AssistantFab` en bas à droite (`docs/DESIGN.md` 10.5). Suggestions de départ sous forme de pastilles. Actions proposées par l'IA affichées en carte de confirmation (section 12). |
| `ConfirmActionCard` | Action IA à confirmer | Résumé de l'action (« Remplacer la description de l'annonce »), aperçu avant / après si texte, boutons Confirmer / Annuler. |
| `EmptyState` | État vide | Dessin `facade.svg`, titre, phrase utile, action. |
| `BottomNav` | Navigation mobile | 4 onglets, icônes au trait 22 px, libellé 11 px, actif en bleu. Vendeur : Ma vente, Dossier, Messages (dont le conseiller), Compte. Acquéreur : Chercher, Favoris, Messages, Compte. Admin : Annonces, Dossiers, Utilisateurs, Assistant. |
| `TopNav` | Navigation desktop | 72 px, logo, liens ; à droite « Vendre mon bien » (`primary`), cloche de notifications, favoris, avatar (ou « Mon compte » si non connecté) (`docs/DESIGN.md` 10.6). L'assistant s'ouvre par `AssistantFab`, pas depuis la barre. |
| `AdminShell` | Coque back office | Barre latérale 240 px fond `--lk-ink`, lien actif fond `--lk-blue`, compteurs en pastilles, zone principale fond `--lk-bg`. |
| `DataTable` | Tableaux admin | En-têtes 12 px 600 casse normale sur `--lk-stone-2`, lignes 56 px min, actions de ligne alignées à droite sous la ligne. |
| `Toast` | Retour d'action | Mobile : en bas au centre, au-dessus de la `BottomNav`. Desktop : en bas à droite. Fond `--lk-ink`, texte blanc, 5 s, `role="status"`. |
| `Dialog`, `Sheet` | Modales | shadcn. `Sheet` du bas sur mobile pour les filtres. Confirmations : dialogue centré 520 px en desktop, écran plein en mobile ; les confirmations à portée juridique (acceptation d'offre) sont toujours des écrans pleins (`docs/DESIGN.md` 10.8). |

Mappage `StatusBadge` :

| Statut | Fond | Texte | Libellé |
|---|---|---|---|
| `draft` | `--lk-stone-2` | `--lk-ink-2` | Brouillon |
| `pending` | `--lk-warning-bg` | `--lk-warning-fg` | En attente de validation |
| `published` | `--lk-success` | blanc | En ligne |
| `paused` | `--lk-blue-tint` | `--lk-blue` | En pause |
| `suspended` | `--lk-danger-bg` | `--lk-danger-fg` | Suspendue par Leenkey |
| `sold` | `--lk-ink` | blanc | Vendu |
| `rejected` | `--lk-danger-bg` | `--lk-danger-fg` | À corriger |

Les libellés ci-dessus sont ceux de la SPEC (« En ligne », « En attente de validation ») ; les couleurs sont celles de `docs/DESIGN.md` 10.2.

Icônes : **Lucide** uniquement (déjà dans shadcn), trait 2 px, jamais remplies ; l'assistant est représenté par l'icône Lucide `Sparkles` (`docs/DESIGN.md` 6).

### Mouvement

- Transitions de 140 à 220 ms, courbe `--ease-out-lk`, sur couleur, ombre, opacité, transformation. Jamais sur la hauteur ou la largeur (`docs/DESIGN.md` 9).
- Aucune animation d'entrée des listes ni des sections. Seul moment orchestré : l'écran de fin de parcours (« C'est envoyé », « C'est activé »), avec `facade.svg` en fondu.
- `prefers-reduced-motion` : toutes les animations désactivées.

### Maquettes de référence

Les maquettes du dossier `docs/maquettes/` (sources `.dc.html` ; versions HTML autonomes dans `docs/maquettes/html/` ; captures dans `docs/maquettes/png/`) appliquent la direction « Façade » (section 6) : elles font référence pour la structure, le contenu, la hiérarchie **et** le style (photos, aplats, Archivo, angles de 4 et 6 px). Ordre de priorité en cas d'écart : `docs/DESIGN.md` > captures `docs/maquettes/png/` > sources `.dc.html` ; les écarts connus sont listés dans `docs/DESIGN.md` section 17. Les photos sont des exemples libres de droits.

| Maquette | Écran |
|---|---|
| `Main.dc.html` | Planche du design system (couleurs, champs, boutons, statuts, carte de bien) |
| `Inscription.dc.html` | Inscription mobile |
| `Bien.dc.html` | Fiche du bien, étape 2 |
| `Annonce.dc.html` | Page annonce mobile |
| `Recherche.dc.html` | Recherche mobile |
| `Messagerie.dc.html` | Conversation mobile avec suggestion IA |
| `Dashboard.dc.html` | Dashboard vendeur mobile |
| `Formule.dc.html` | Choix de formule |
| `AdminAnnonces.dc.html` | Back office mobile |
| `RechercheDesktop.dc.html` | Recherche desktop |
| `AnnonceDesktop.dc.html` | Page annonce desktop |
| `AdminDesktop.dc.html` | Back office annonces desktop |
| `AccueilDesktop.dc.html` | Accueil acquéreur connecté `/acquereur` (desktop) : reprise de la dernière recherche, dossier acquéreur, nouveaux biens de l'alerte, visites et offres en cours, services |
| `Notifications.dc.html` | Panneau de notifications ouvert depuis la cloche : liste filtrée (Toutes, Mes recherches, Visites et offres) et état vide |
| `PlanEcrans.dc.html` | Plan de tous les écrans V2 |

Captures PNG de chaque maquette dans `docs/maquettes/png/` (à regarder en priorité, elles s'ouvrent sans navigateur).

---

## 8. Écrans : spécification détaillée

Pour toute question d'UX, `docs/DESIGN.md` fait foi (décision du 2026-10-08) ; cette section donne les règles métier et les contenus.

Pour chaque écran : route, contenu dans l'ordre, états (chargement, vide, erreur), règles. Tous les écrans sont conçus d'abord à 390 px (largeur des maquettes) puis étendus à 768 et 1280 px.

### 8.1 Accueil `/` (enrichissement de l'existant)

Garder la page actuelle. Ajouter :
- Hero sur `BrandPanel` avec le dessin `facade.svg` à droite.
- Deux entrées égales dans le hero, en boutons blancs sur l'aplat bleu (`docs/DESIGN.md` 13.1) : « Je vends » (→ `/estimer`) et « J'achète » (→ `/acheter`).
- Bloc « Les derniers biens » : 3 `PropertyCard` (variante `tile`) publiées les plus récentes (masqué s'il y en a moins de 3).
- Ne pas toucher au reste du contenu marketing sans validation.

### 8.2 Inscription `/inscription`

Maquette : `Inscription.dc.html`.
- Choix « Je vends » / « J'achète » en deux grandes cartes (préselectionné selon `?role=` ou la page d'origine).
- Champs : prénom et nom, email, téléphone (facultatif), mot de passe (8 caractères min., indicateur de robustesse discret).
- Case CGU + confidentialité obligatoire.
- Email de confirmation Supabase (template personnalisé, section 18).
- Après confirmation : vendeur → `/vendeur/biens/nouveau` (ou reprise de l'estimation si `?estimation=`), acquéreur → `/acquereur/profil`, ou retour à l'action d'origine (`?next=`).
- Mention en bas : « Vos données restent confidentielles. Aucune diffusion à des tiers. »

### 8.3 Création et fiche du bien `/vendeur/biens/nouveau` puis `/vendeur/biens/[id]`

Maquette : `Bien.dc.html`.

Création en 4 étapes (ordre de `docs/DESIGN.md` 12.2), `ProgressBar` « Étape 2 sur 4 · Caractéristiques » :
1. **Adresse** : autocomplétion Mapbox (France uniquement). Géocodage → `location`, calcul de `public_location` (décalage aléatoire stable de 150 à 250 m, graine = id du bien).
2. **Caractéristiques et photos** : type de bien, surface (`UnitInput` m²), Carrez, pièces, chambres, étage / nombre d'étages, année, DPE et GES (`SegmentedPicker`), chauffage, atouts (`ChipToggle`), charges mensuelles, taxe foncière, nombre de lots. Photos (`PhotoUploader`) : glisser-déposer ou sélection, 15 max, 10 Mo max chacune, JPEG/PNG/HEIC/WebP. Conversion serveur en WebP 400/800/1600. Réordonnancement par glisser. Choix de la photo principale. Légende optionnelle.
3. **Prix et description** : prix (`UnitInput` €), rappel de l'analyse de valeur (fourchette + valeur) avec écart en pourcentage, description (1 200 caractères max, compteur), bouton « Rédiger avec l'assistant » qui génère une proposition dans un `AssistantSuggestion`. Titre généré automatiquement (« Appartement 3 pièces 68 m² · Savigny-sur-Orge ») et modifiable.
4. **Aperçu** : prévisualisation exacte de la page annonce, puis « Envoyer en validation ».

Préremplissage depuis l'estimateur : `InfoNote` « Repris de votre analyse de valeur du [date]. Vérifiez et complétez. »

Sauvegarde automatique à chaque étape (statut `draft`). Bouton « Enregistrer » explicite en haut.

Fin : « Envoyer en validation » → statut `pending`, écran de fin sur `BrandPanel` : « C'est envoyé. Nous relisons votre annonce sous 24 h et vous prévenons par email. »

Fiche du bien (après création) : onglets **Infos**, **Photos**, **Annonce**, **Documents** (L3), **Visites** (L3), **Offres** (L2). Récapitulatif en tête avec `KeyFigures` (surface, pièces, étage, prix/m²) et `StatusBadge`. Actions selon statut : modifier, mettre en pause, remettre en ligne, marquer vendu (confirmation), supprimer (brouillon uniquement). Toute modification d'une annonce publiée (prix, description, titre, photos) **la laisse en ligne** (décision client), enregistre une ligne dans `listing_revisions` et crée une notification admin « annonce modifiée » pour contrôle a posteriori. L'historique des modifications, notamment du prix, est visible par le vendeur (onglet Annonce) et par l'admin. Il n'est pas affiché publiquement en V2.

### 8.4 Recherche `/acheter`

Maquettes : `Recherche.dc.html`, `RechercheDesktop.dc.html`.

- Barre de recherche : ville ou code postal (autocomplétion Mapbox), rayon (2, 5, 10, 20 km).
- Filtres : type, budget min/max, surface min/max, pièces min, chambres min, extérieur (balcon, terrasse, jardin), stationnement, ascenseur, DPE max, « Dossier complet uniquement ». Mobile (`docs/DESIGN.md` 10.3 et 12.5) : `SearchBar` (champ + bouton filtres avec le nombre de filtres actifs), rangée de `ChipToggle` défilante horizontalement, `Sheet` du bas pour tous les filtres, bouton « Voir N biens ». Desktop : `FilterBar` avec `Select` en ligne + « Plus de filtres ».
- Tri : plus récents (défaut), prix croissant, prix décroissant, surface, prix au m².
- Filtres sérialisés dans l'URL (`?ville=savigny-sur-orge&rayon=5&budget_max=400000&pieces_min=3`), schéma Zod `SearchFilters` partagé avec les alertes.
- Liste : `PropertyCard`, pagination par 20 avec « Voir plus ».
- Carte Mapbox : marqueurs en pastille de prix (« 350 k€ »), marqueur de l'annonce survolée en bleu plein, regroupement au dézoom. Mobile : carte réduite de 200 px au-dessus de la liste, bouton « Carte » pour la plein écran. Desktop : liste 620 px à gauche, carte à droite, recherche « dans cette zone » au déplacement.
- Bouton « Créer une alerte » (L3 ; en L1, bouton masqué).
- Requête : fonction SQL `search_listings(filters jsonb, bbox, sort, page)` qui lit `public_listings`, avec index GIST sur `public_location` et index sur `price_cents`, `surface_m2`, `rooms`, `city`.
- Vide : « Aucun bien ne correspond. Élargissez le rayon ou le budget, ou créez une alerte pour être prévenu. »

### 8.5 Page annonce `/annonce/[slug]`

Maquettes : `Annonce.dc.html`, `AnnonceDesktop.dc.html`.

Ordre du contenu (mise en page mobile et desktop : `docs/DESIGN.md` 12.7 et 12.8) :
1. `Gallery`. Boutons retour et favori uniquement (pas de bouton de partage en V2).
2. En mobile, prix (`PriceBlock`) et `DpeBadge` en premier, puis titre, lieu (quartier, ville), `StatusBadge` si non publiée (aperçu vendeur), pastille « Dossier complet » si applicable. En desktop, le prix est dans la colonne de droite.
3. **`KeyFigures`** : surface, pièces, chambres, étage (6 tuiles en desktop), juste sous la galerie photo.
4. Vendeur (`ContactCard`) : prénom, « Vente accompagnée par Leenkey » si formule payante, « Répond en général sous 24 h » uniquement si le temps de réponse médian réel est < 24 h (sinon rien).
5. Description (repliée à 6 lignes sur mobile).
6. **« Ce que vous savez avant de visiter »** : une seule `KeyFactsTable` qui regroupe les caractéristiques complètes et les informations utiles avant visite : charges, taxe foncière, lots, travaux votés et procédures (issus de l'analyse des documents en L3 ; « Non renseigné » sinon), documents disponibles avec « Demander l'accès ». En desktop, grille de 2 colonnes : `KeyFactsTable` à gauche, carte à droite.
7. Carte avec la zone approximative (cercle de 400 m de rayon autour de `public_location`), jamais l'adresse.
8. Résumé de l'assistant (L2) : 2 phrases factuelles générées à la publication, stockées, régénérées à chaque modification. `AssistantNote` (encart `--lk-blue-tint`) ; en desktop, sous la `PriceColumn`.
9. Barre d'action : mobile, `ActionBar` fixée en bas (« Contacter le vendeur » + bouton visite) ; desktop, `PriceColumn` collante à droite avec `PriceBlock`, `ContactCard` et les boutons « Contacter le vendeur », « Demander une visite », « Faire une offre » (L2).

Règles d'accès aux actions :
- Non connecté → inscription avec `?next=` vers l'action.
- « Contacter » : compte acquéreur requis.
- « Demander une visite » : envoie une demande dans la conversation ; la réservation se fait via invitation du vendeur (L3).
- « Faire une offre » : financement au moins `declared` (L2). Sinon renvoi vers le profil avec explication.

SEO : `generateMetadata` (titre « Appartement 3 pièces 68 m² à Savigny-sur-Orge · 350 000 € · Leenkey »), données structurées `RealEstateListing` + `Offer`, image Open Graph générée (`/api/og/[slug]`) avec photo principale, prix et surface en Archivo élargie sur bandeau bleu. Compteur de vues incrémenté côté serveur une fois par visiteur et par jour (cookie), hors vendeur et admin.

### 8.6 Messagerie `/messages`, `/messages/[id]`

Maquette : `Messagerie.dc.html`.

- Liste : une ligne par conversation, vignette du bien, interlocuteur, dernier message, heure, pastille non lu. Vendeur : regroupement par bien si plusieurs biens.
- Conversation : en-tête `ConversationHeader` avec vignette, titre du bien et sous-titre « Avec [prénom] · [libellé exact du statut de financement] » ; le statut de financement de l'acquéreur n'est affiché qu'au vendeur (l'acquéreur voit « Avec [prénom] »), toujours avec le libellé exact de `FinancingBadge`, jamais « validé ». Bulles, séparateurs de date, messages système (visite confirmée, offre reçue).
- Côté vendeur, bouton « Suggérer une réponse » → `AssistantSuggestion` au-dessus de la zone de saisie. « Utiliser » remplit le champ (n'envoie pas) ; « Modifier » idem avec focus ; « Ignorer » ferme. Le message envoyé porte `ai_suggested = true` si issu d'une suggestion.
- Côté vendeur, bouton calendrier → inviter cet acquéreur à réserver une visite (L3).
- Signaler la conversation (menu).
- Temps réel : Supabase Realtime sur `messages` filtré par `conversation_id`. Mise à jour de `*_last_read_at` à l'ouverture.
- Le premier message d'un acquéreur crée la conversation (limite : 1 conversation par acquéreur et par annonce).
- Anti-abus : 20 messages / heure / utilisateur, 5 nouvelles conversations / jour / acquéreur.

**Conversation conseiller (`kind = 'advisor'`)**
- Créée automatiquement par le webhook Stripe à l'activation d'Accompagné ou Sérénité, une par bien, avec un premier message système signé « L'équipe Leenkey » : « Bonjour, je suis votre conseiller Leenkey pour la vente de votre bien. Écrivez-moi ici à tout moment : je vous réponds sous 24 h. »
- Côté vendeur : épinglée en tête de `/messages` avec `ConversationHeader` (variante conseiller, avatar « LK »), et accessible depuis le dashboard (bouton « Écrire à mon conseiller »).
- Côté Leenkey : `/admin/messages` (boîte partagée, non-lus en tête) et onglet « Messages » du dossier client. Tout admin peut répondre ; le message affiche le prénom de l'admin.
- L'assistant IA du vendeur dispose de l'outil `contact_advisor` : il poste dans cette conversation un résumé de la question (type `assistant_handoff`) après confirmation du vendeur.
- En Autonomie, pas de conversation conseiller : à la place, un `UpgradePrompt` « Échanger avec un conseiller Leenkey » vers la page formules.

### 8.7 Dashboard vendeur `/vendeur`

Maquette : `Dashboard.dc.html`.

- En-tête `SellerHeader` (fond `--lk-navy`, `docs/DESIGN.md` 10.4) : salutation, bouton assistant, carte du bien (vignette, titre, prix, date de publication, `StatusBadge`), `StepProgress` compact avec « Étape 3 sur 6 · Contacts et visites » et le nom de la formule.
- Plusieurs biens : sélecteur de bien sous la salutation.
- **Prochaine action** (`NextActionCard`) : calculée par une fonction `getNextAction(property)` selon des priorités fixes : 1) annonce refusée à corriger ; 2) offre reçue non lue ; 3) message du conseiller non lu ; 4) visite à confirmer ; 5) message acquéreur sans réponse depuis plus de 24 h ; 6) première tâche non faite de l'étape en cours ; 7) sinon, conseil de l'étape. Le dashboard a la même logique pour les trois formules : seules les tâches et le libellé de qui agit changent.
- `StatTile` × 3 : vues sur 7 jours, contacts, acquéreurs qualifiés (financement ≥ `declared`).
- « À faire » : `TaskList` de l'étape en cours, lien « Toutes les étapes » vers la vue étendue.
- Conversations récentes (3), lien vers `/messages`.
- Offres (L2) : dernières offres avec montant, écart au prix, statut.
- Visites à venir (L3).
- Formule payante : bouton « Écrire à mon conseiller » et dernier message du conseiller.
- `UpgradePrompt` : au plus un à la fois, placé après le contenu utile, choisi par `getUpgradePrompt(property)` (section 11 bis). Jamais en Sérénité.
- Bien vendu : le dashboard est remplacé par `SaleRecap`.
- Brouillon non publié : le dashboard est remplacé par une invitation à terminer la fiche.
- Aucun bien : `EmptyState` « Publiez votre premier bien » → estimateur ou création directe.

### 8.8 Formule `/vendeur/formule`

Maquette : `Formule.dc.html` (contenu à mettre à jour selon la section 11 bis).

- Titre « Un forfait fixe par bien. Jamais de commission. »
- Trois cartes, contenu lu depuis `plans` : nom, phrase d'accroche, prix, liste des inclusions. Autonomie : formule actuelle par défaut. Sérénité mise en avant « Le plus complet ».
- Sous les cartes : le tableau comparatif de la section 11 bis (19 lignes, coches et tirets), repliable sur mobile.
- Formule actuelle marquée d'une coche verte. Formule inférieure : non sélectionnable. Passage Accompagné → Sérénité : bouton « Passer à Sérénité pour 510 € ».
- Si la page est ouverte depuis un déclencheur (`?from=offer_received`), rappel du contexte en tête : « Vous avez reçu une offre de 327 000 €… ».
- Rassurance : « Paiement sécurisé par carte via Stripe. Reçu envoyé par email. Forfait payé une fois, pour ce bien. Sans abonnement. »
- Retour de Stripe : `/vendeur/formule?paiement=ok` (écran de confirmation sur `BrandPanel` : « C'est activé. Votre conseiller Leenkey vous écrit sous 24 h. Vous pouvez déjà lui écrire. ») ou `?paiement=annule`.

### 8.9 Espace acquéreur `/acquereur`, `/acquereur/profil`

- Accueil (maquette `AccueilDesktop.dc.html`, mise en page `docs/DESIGN.md` 12.10) : `BrandPanel` avec salutation, carte « Reprendre votre dernière recherche » avec le nombre de nouveaux biens, complétude du dossier acquéreur (si financement non renseigné ou sans justificatif, bloc en tête ; pas de ligne « Identité vérifiée », aucune vérification d'identité n'étant prévue : `DECISIONS.md` Q25), favoris, conversations, visites à venir (L3), offres envoyées avec leur statut et leur historique (L2), alertes (L3). Le carrousel « Nouveaux biens dans votre alerte » n'apparaît qu'à partir du lot 3. « Nos services » : premier bouton « Valoriser mon bien » (→ `/estimer`) ; « Calculer mon budget » et « Prix au m² de la zone » en attente de `DECISIONS.md` Q25.
- Profil : projet (`SegmentedPicker`), villes ciblées, budget max, apport, besoin de prêt et montant, situation (texte court). Passe le statut à `declared` dès que projet, budget, apport et besoin de prêt sont renseignés.
- Justificatif (L2) : type (liste des justificatifs acceptés), date du document, fichier PDF ou image (5 Mo). Statut `document_provided`. Avertissement non bloquant si le document a plus de 3 mois.
- Encart explicatif permanent : « Le vendeur voit le statut de votre dossier de financement (déclaré, justificatif fourni, justificatif vérifié). Il ne voit ni votre justificatif ni les montants de votre profil. Les montants figurent uniquement dans les offres que vous choisissez d'envoyer. » (à ajuster selon la réponse de Cédric sur l'accès au justificatif, voir `DECISIONS.md`.)

### 8.10 Offre d'achat `/offres/nouvelle`, `/offres/[id]` (lot 2)

Voir section 13.

### 8.11 Visites (lot 3)

Voir section 14.

### 8.12 Documents (lot 3)

Voir section 15.

### 8.13 Assistant `/assistant` et panneau

Voir section 12.

### 8.14 Compte `/compte`

Informations personnelles, email (changement avec confirmation), mot de passe, préférences de notification (messages, offres, alertes), rôles (ajouter « Je vends » / « J'achète »), export de mes données (JSON, RGPD), suppression du compte (confirmation par saisie de l'email ; suppression logique immédiate, anonymisation sous 30 jours par cron ; biens publiés dépubliés).

### 8.15 Back office

Voir section 17.

---

## 9. Moteur d'étapes de vente

### Principe

Chaque bien a un parcours de vente fait d'étapes, elles-mêmes faites de tâches. Le modèle d'étapes dépend de la formule. Les tâches se cochent soit manuellement (par le vendeur ou par Leenkey), soit automatiquement sur un événement.

### Les six étapes (validées par le client)

Fichier `supabase/seed/sale_steps.yaml`. Une ligne `sale_steps` par étape **et par formule** : même code et même titre, tâches et `owner` qui varient. Les déclencheurs automatiques sont entre parenthèses.

| # | Code | Titre affiché | Objectif |
|---|---|---|---|
| 01 | `prepare` | Préparer ma vente | Déterminer la valeur du bien et préparer tout ce qui est nécessaire avant la commercialisation |
| 02 | `publish` | Créer et publier mon annonce | Créer une annonce attractive et mettre le bien en vente sur Leenkey |
| 03 | `contacts_visits` | Gérer mes contacts et mes visites | Centraliser les acquéreurs intéressés et organiser les visites |
| 04 | `offers` | Recevoir et négocier mes offres | Recevoir des offres structurées et décider de façon éclairée |
| 05 | `notary` | Préparer ma vente avec le notaire | Préparer un dossier complet pour que le notaire prenne le relais |
| 06 | `closing` | Finaliser ma vente | Suivre la transaction jusqu'à la signature définitive |

Tâches par étape et par formule (A = Autonomie, C = Accompagné, S = Sérénité ; « vendeur » ou « Leenkey » = qui coche) :

**01 Préparer ma vente**
- A, C, S : Analyse de valeur faite (`estimation.linked`) · Fiche du bien complète (`property.complete`) · Photos ajoutées, 6 minimum (`photos.min6`) · Documents à préparer identifiés (`documents.checklist_viewed`) · Diagnostics nécessaires identifiés (`documents.diagnostics_listed`).
- C, S en plus : Stratégie de prix définie avec le conseiller (Leenkey).
- S en plus : Dossier de vente ouvert (Leenkey) · Pièces disponibles contrôlées (Leenkey) · Pièces manquantes listées (Leenkey).

**02 Créer et publier mon annonce**
- A, C, S : Annonce rédigée (`listing.draft_complete`) · Annonce envoyée (`listing.submitted`) · Annonce en ligne (`listing.published`).
- C, S en plus : Annonce relue et optimisée par le conseiller (Leenkey) · Prix revu avec le conseiller (Leenkey).

**03 Gérer mes contacts et mes visites**
- A, C, S : Premier contact reçu (`conversation.created`) · Créneaux de visite ouverts (`visit_slot.created`, L3) · Première visite effectuée (`visit.done`, L3).
- C, S en plus : Point sur les retours de visite avec le conseiller (Leenkey).

**04 Recevoir et négocier mes offres**
- A, C, S : Offre reçue (`offer.submitted`, L2) · Offre acceptée (`offer.accepted`, L2).
- C, S en plus : Offre analysée avec le conseiller (Leenkey).
- S en plus : Transmission du dossier vers le notaire préparée (Leenkey).

**05 Préparer ma vente avec le notaire**
- A, C, S : Notaire choisi (vendeur) · Dossier notaire complet (`documents.notary_ready`, L3) · Dossier transmis au notaire (vendeur en A et C, Leenkey en S) · Avant-contrat signé (vendeur ou Leenkey, saisie de la date).
- S en plus : Pièces contrôlées et points de vigilance signalés (Leenkey) · Coordination avec le notaire en cours (Leenkey).

**06 Finaliser ma vente**
- A, C, S : Conditions suspensives levées (vendeur ou Leenkey) · Acte authentique signé (vendeur ou Leenkey → `listing.sold`).
- S en plus : Échéances suivies avec le notaire (Leenkey).

Fin de parcours : statut « Vendu », `SaleRecap` (prix de vente, durée de commercialisation en jours depuis `published_at`, contacts, visites, offres reçues). L'économie estimée par rapport à une commission d'agence est en attente de décision (`DECISIONS.md`) : ne pas l'afficher tant qu'elle n'est pas confirmée, mais stocker `sold_price_cents` (colonne à ajouter sur `listings`) pour pouvoir la calculer plus tard.

### Implémentation

- `core/steps/engine.ts` : `emitEvent(propertyId, event)` coche les tâches dont `auto_trigger` correspond, puis avance `current_step_code` si toutes les tâches obligatoires de l'étape sont faites. Appelé depuis les server actions et les webhooks concernés.
- `core/steps/next-action.ts` : `getNextAction` (règles de la section 8.7).
- Passage à une formule payante : bascule du modèle d'étapes en conservant les tâches déjà faites (correspondance par `code`).
- Toute progression d'étape crée une notification in-app.

---

## 10. Messagerie et notifications

### Notifications

Fonction unique `notify(profileId, type, payload)` dans `core/notifications/`. Elle crée la ligne `notifications` et, si le canal email est actif pour ce type et que la préférence de l'utilisateur l'autorise, programme l'email.

| Type | In-app | Email | Regroupement |
|---|---|---|---|
| `message.new` | oui | oui | Un email maximum par conversation toutes les 15 min ; si l'utilisateur a lu entre-temps, pas d'email |
| `listing.published` | oui | oui | — |
| `listing.rejected` | oui | oui | — |
| `listing.pending` (admin) | oui | oui | Digest si > 3 en 1 h |
| `offer.received` | oui | oui | — |
| `offer.answered` | oui | oui | — |
| `offer.expired` | oui | oui | — |
| `visit.invited` | oui | oui | — |
| `visit.booked` | oui | oui | — |
| `visit.reminder` | non | oui | J-1 à 8 h |
| `document.shared` | oui | oui | Un email par bien et par jour |
| `document.access_requested` | oui | oui | — |
| `case.created` (admin) | oui | oui | — |
| `advisor.message` | oui | oui | Même regroupement que `message.new` |
| `advisor.message_from_client` (admin) | oui | oui | — |
| `offer.withdrawn` | oui | oui | — |
| `listing.revised` (admin) | oui | non | — |
| `plan.activated` | oui | oui | — |
| `alert.match` | non | oui | Digest quotidien |
| `step.advanced` | oui | non | — |

Cloche de notifications dans `TopNav` (desktop) et en haut du dashboard (mobile), avec compteur de non lues (Realtime). Au clic : panneau `NotificationPanel` (maquette `Notifications.dc.html`, `docs/DESIGN.md` 10.7), latéral droit de 420 px en desktop, plein écran en mobile, regroupé par « Aujourd'hui » / « Cette semaine » / « Plus ancien », filtres par catégorie, « Tout marquer comme lu », état vide qui invite à créer une alerte (acquéreur) ou à compléter l'annonce (vendeur).

---

## 11. Paiement Stripe

### Produits

Créés par Younes dans Stripe (test puis live), identifiants reportés dans `plans.stripe_price_id` via seed et variables `STRIPE_PRICE_ACCOMPAGNE`, `STRIPE_PRICE_SERENITE`. Prix TTC : 990 € et 1 500 €. Un prix supplémentaire « Passage Accompagné → Sérénité » à 510 €, variable `STRIPE_PRICE_UPGRADE`.

### Flux

1. Server action `startCheckout(propertyId, plan)` : vérifie la propriété, la formule actuelle, crée une Checkout Session (`mode: 'payment'`, `customer_email`, `metadata: { property_id, owner_id, plan, kind: 'new'|'upgrade' }`, `success_url`, `cancel_url`, `locale: 'fr'`, factures automatiques activées `invoice_creation.enabled = true`, `allow_promotion_codes: true`).
2. Redirection vers Stripe.
3. Webhook `checkout.session.completed` sur `/api/webhooks/stripe` :
   - vérification de la signature ;
   - insertion dans `stripe_events` (si déjà présent → 200 sans rien faire) ;
   - création de `subscriptions` (et `replaced_by` sur l'ancienne en cas d'upgrade) ;
   - mise à jour de `sale_progress.plan`, bascule du modèle d'étapes ;
   - création d'un `case` source `plan_purchase` ;
   - création de la conversation conseiller (`kind = 'advisor'`) si elle n'existe pas, avec le message d'accueil (section 8.6) ;
   - notifications vendeur (`plan.activated`) et admin (`case.created`).
4. Le retour sur `success_url` n'active rien : l'écran de confirmation lit l'état en base et affiche « Paiement en cours de confirmation » tant que le webhook n'est pas passé (rafraîchissement toutes les 2 s, 30 s max).

Événements écoutés : `checkout.session.completed`, `charge.refunded` (formule marquée remboursée, `case` note automatique, pas de rétrogradation automatique : signalé à l'admin).

Remboursements : faits par Cédric depuis le dashboard Stripe (hors application en V2).

Tests : Stripe CLI (`npm run stripe:listen`) en local, cartes de test documentées dans `docs/RECETTE.md`.

---

## 11 bis. Formules, droits et montée en gamme

### Contenu des formules (texte client, à charger dans `plans`)

**Autonomie, gratuit.** « Tous les outils pour vendre vous-même. » 0 € · Sans engagement.
Analyse et rapport de valeur du bien · Espace vendeur · Création de la fiche du bien · Création et rédaction de l'annonce avec l'IA · Publication de l'annonce sur Leenkey · Tableau de bord de suivi de la vente · Messagerie avec les acquéreurs · Agenda et demandes de visites · Accès aux informations déclarées par les acquéreurs · Réception des offres d'achat structurées · Assistant IA Leenkey pour vous accompagner dans le parcours · Checklist des étapes de la vente · Identification des documents et diagnostics à préparer.

**Accompagné, 990 €.** « Vous vendez. On vous accompagne à chaque étape. » Tout Autonomie, plus :
Conseiller Leenkey dédié · Stratégie de prix et de mise en vente · Échanges avec le conseiller pendant la commercialisation · Relecture et optimisation humaine de l'annonce · Conseils sur les photos et la présentation du bien · Suivi de la performance de l'annonce · Ajustement de la stratégie de vente si nécessaire · Accompagnement dans la gestion des acquéreurs · Conseils pour préparer les visites · Analyse des offres reçues · Analyse des informations et justificatifs de financement disponibles · Aide à la négociation · Accompagnement jusqu'à l'acceptation d'une offre.
Le propriétaire continue de gérer sa vente et réalise ses visites.

**Sérénité, 1 500 €.** « On pilote avec vous jusqu'à la signature. » Tout Accompagné, plus :
Constitution du dossier de vente complet · Contrôle des pièces nécessaires · Identification et suivi des documents manquants · Anticipation des diagnostics nécessaires · Analyse des documents · Signalement des éventuels points de vigilance · Préparation du dossier destiné au notaire · Coordination avec le notaire · Suivi de l'avancement du dossier · Accompagnement jusqu'au compromis ou avant-contrat · Suivi des conditions suspensives · Accompagnement jusqu'à la signature définitive.

Ne jamais mentionner de « garantie juridique » ni de « relecture des actes » (exclu par le client), ni de photos professionnelles ou de visites réalisées par Leenkey (non proposées).

### Tableau comparatif (page formules)

| Fonctionnalité | Autonomie | Accompagné | Sérénité |
|---|---|---|---|
| Analyse de valeur | ✓ | ✓ | ✓ |
| Espace vendeur / tableau de bord | ✓ | ✓ | ✓ |
| Assistant IA | ✓ | ✓ | ✓ |
| Création de l'annonce avec l'IA | ✓ | ✓ | ✓ |
| Publication sur Leenkey | ✓ | ✓ | ✓ |
| Messagerie acquéreurs | ✓ | ✓ | ✓ |
| Agenda / visites | ✓ | ✓ | ✓ |
| Réception d'offres structurées | ✓ | ✓ | ✓ |
| Checklist des documents | ✓ | ✓ | ✓ |
| Conseiller dédié | — | ✓ | ✓ |
| Stratégie de vente humaine | — | ✓ | ✓ |
| Optimisation humaine de l'annonce | — | ✓ | ✓ |
| Analyse accompagnée des offres | — | ✓ | ✓ |
| Aide à la négociation | — | ✓ | ✓ |
| Constitution du dossier complet | — | — | ✓ |
| Analyse approfondie des documents | — | — | ✓ |
| Coordination notaire | — | — | ✓ |
| Suivi jusqu'à la signature | — | — | ✓ |

### Droits (`plan_entitlements`)

| Feature | Autonomie | Accompagné | Sérénité | Effet dans l'application |
|---|---|---|---|---|
| `advisor` | | ✓ | ✓ | Conversation conseiller, bouton « Écrire à mon conseiller », outil IA `contact_advisor` |
| `human_price_strategy` | | ✓ | ✓ | Tâche Leenkey « stratégie de prix » à l'étape 01 |
| `human_listing_review` | | ✓ | ✓ | Tâches Leenkey de relecture à l'étape 02 ; badge admin « relecture humaine due sous 24 h » |
| `human_offer_analysis` | | ✓ | ✓ | Tâche Leenkey « offre analysée » ; bouton admin « Marquer comme analysée » |
| `negotiation_support` | | ✓ | ✓ | Affichage dans le dossier admin |
| `sale_file_building` | | | ✓ | Tâches Leenkey de constitution du dossier ; Leenkey peut déposer des documents sur le bien |
| `deep_document_review` | | | ✓ | Revue humaine des analyses IA : l'admin annote et marque les documents « revus par Leenkey » |
| `notary_coordination` | | | ✓ | Tâches Leenkey des étapes 05 et 06 |
| `closing_follow_up` | | | ✓ | Rappels d'échéances, suivi des conditions suspensives |

Tout le reste (annonce, messagerie acquéreurs, visites, offres, documents, checklist, assistant IA, résumé IA des documents) est ouvert aux trois formules.

### Déclencheurs de montée en gamme

`core/billing/upgrade-prompts.ts` : `getUpgradePrompt(property)` renvoie au plus un déclencheur, le premier de la liste dont la condition est vraie, qui n'a pas été masqué pour ce bien et dont la formule cible est supérieure à la formule actuelle. Seuils dans `plans`-like config `lib/config/upgrade.ts`, modifiables sans migration.

| Code | Condition | Cible | Texte |
|---|---|---|---|
| `offer_accepted` | Offre acceptée, formule < Sérénité | Sérénité | « Votre offre est acceptée. La prochaine étape consiste à constituer et transmettre votre dossier au notaire. Vous pouvez continuer seul ou confier à Leenkey la préparation et le suivi de votre dossier jusqu'à la signature. » (Accompagné : « Passer à Sérénité : +510 € ») |
| `offer_received` | Offre `submitted` ou `viewed` en attente, formule Autonomie | Accompagné | « Vous avez reçu une offre de {prix} pour un prix affiché de {prix affiché}. Vous pouvez la traiter vous-même ou demander à un conseiller Leenkey de l'analyser avec vous et de vous accompagner dans votre négociation. » |
| `visits_no_offer` | ≥ 3 visites effectuées, 0 offre | Accompagné | « Plusieurs visites ont déjà eu lieu sans offre. Un conseiller Leenkey peut analyser avec vous les retours et votre positionnement. » |
| `contacts_no_visit` | ≥ 5 contacts, 0 visite, publiée depuis ≥ 21 jours | Accompagné | « Vous recevez des contacts mais peu de demandes de visite. Faisons le point sur votre annonce et votre stratégie. » |
| `low_contacts` | < 3 contacts, publiée depuis ≥ 14 jours | Accompagné | « Votre annonce génère peu de demandes. Faites le point sur votre prix et votre stratégie avec un conseiller Leenkey. » |
| `file_incomplete` | Étape 05 atteinte ou ≥ 3 pièces obligatoires manquantes après 30 jours de publication | Sérénité | « Plusieurs documents sont encore nécessaires pour préparer votre vente. Leenkey peut constituer et suivre votre dossier avec vous jusqu'au notaire. » |
| `listing_ready` | Annonce complète, juste avant « Envoyer en validation » | Accompagné | « Votre annonce est prête. Vous souhaitez faire vérifier votre prix, votre présentation et votre annonce par un conseiller Leenkey ? » |
| `valuation_done` | Bien créé depuis l'estimation, étape 01 | Accompagné | « Vous connaissez maintenant la valeur de votre bien. Besoin d'aide pour définir votre prix et votre stratégie de mise en vente ? » |

Les seuils (3, 5, 14, 21, 30) sont des propositions en attente de validation par Cédric (`DECISIONS.md`).

Règles :
- Jamais de modale, jamais à la place ou devant un bouton d'action essentiel (accepter une offre, publier, répondre).
- Le traitement d'une offre reçue est identique pour les trois formules ; le déclencheur s'affiche à côté, pas avant.
- Un déclencheur masqué (bouton de fermeture `X` de l'`UpgradePrompt`) ne réapparaît pas pour ce bien ; `offer_received` et `offer_accepted` peuvent réapparaître pour une nouvelle offre.
- Mesure : `shown_at`, `clicked_at`, `dismissed_at` et la conversion (subscription créée dans les 7 jours suivant `clicked_at`) sont visibles dans le tableau de bord admin.

## 12. Assistant IA

### Principes

1. L'assistant **agit** sur les données de la plateforme, pas seulement en conversation.
2. Toute action qui modifie quelque chose passe par une **confirmation explicite** de l'utilisateur (`ConfirmActionCard`).
3. Il répond à partir de la **base de connaissances de Leenkey** (l'expertise de Cédric), pas de connaissances générales sur l'immobilier quand une fiche existe.
4. Il ne donne **aucun avis juridique ou fiscal engageant**. Il explique, il oriente, il renvoie vers Cédric ou le notaire.
5. Il peut **passer la main à un humain** à tout moment.

### Contextes

| Contexte | Où | Outils disponibles |
|---|---|---|
| `seller` | Espace vendeur, panneau et `/assistant` | voir ci-dessous |
| `buyer` | Espace acquéreur, page annonce (L2) | voir ci-dessous |
| `admin` | Back office | voir ci-dessous |

### Outils

Chaque outil : `core/ai/tools/<nom>.ts` exportant `{ name, description, input: ZodSchema, requiresConfirmation, contexts, execute(input, ctx) }`. `execute` utilise le client Supabase **avec la session de l'utilisateur** (RLS appliquée), **jamais le service role**. Quand l'écriture dépasse les droits de l'utilisateur (`create_case`), l'outil appelle en RPC une fonction SQL `security definer` dédiée (section 5).

| Outil | Contexte | Écrit ? | Description |
|---|---|---|---|
| `search_knowledge` | tous | non | Recherche sémantique dans `knowledge_base` filtrée par audience ; renvoie 5 fiches max |
| `get_my_properties` | seller | non | Liste des biens du vendeur avec statut, formule, étape |
| `get_property_details` | seller | non | Détail d'un bien du vendeur (caractéristiques, annonce, estimation) |
| `get_sale_progress` | seller | non | Étape en cours, tâches faites et à faire, prochaine action |
| `get_listing_stats` | seller | non | Vues, contacts, conversations, offres |
| `draft_listing_description` | seller | non | Produit une proposition de description (renvoyée à l'UI en `AssistantSuggestion`, pas écrite) |
| `update_listing_description` | seller | **oui** | Remplace la description (confirmation avec avant / après) |
| `update_listing_price` | seller | **oui** | Modifie le prix (confirmation, rappel de l'écart à l'estimation) |
| `summarize_offer` | seller | non | Répond aux questions du vendeur sur une offre reçue à partir de sa `synthesis`, dans la conversation avec l'assistant (L2). Pas de bouton « Expliquer cette offre » en V2 (V3). |
| `summarize_contacts` | seller | non | Résume les contacts reçus : qui, statut de financement, dernière activité |
| `create_case` | seller, buyer | **oui** | Crée un `case` avec résumé de la conversation (Autonomie et acquéreurs), via la fonction SQL `create_case` (`security definer`) |
| `contact_advisor` | seller (`advisor`) | **oui** | Poste un résumé de la question dans la conversation conseiller du bien |
| `get_upgrade_context` | seller | non | Renvoie la formule, les droits et le déclencheur actif, pour que l'assistant sache ce qui est inclus |
| `search_listings` | buyer | non | Traduit une demande en `SearchFilters` (Zod) et renvoie 5 biens + le lien de recherche (L2) |
| `get_listing_public` | buyer | non | Détails publics d'une annonce (L2) |
| `summarize_shared_documents` | buyer | non | Résume les documents partagés avec cet acquéreur pour ce bien (L3) |
| `create_alert` | buyer | **oui** | Crée une alerte à partir des filtres (L3) |
| `prefill_offer` | buyer | **oui** | Ouvre le formulaire d'offre prérempli (redirection, pas d'envoi) (L2) |
| `propose_visit_slot` | seller | **oui** | Propose à un acquéreur ayant une conversation sur le bien un ou plusieurs créneaux existants du vendeur, ou en crée un ponctuel : après confirmation, crée l'invitation (`visit_invitations`) et poste le message `visit_invite` dans la conversation (L3, exigé par le cahier des charges) |
| `admin_daily_brief` | admin | non | Annonces à valider, dossiers ouverts, offres du jour, signalements |
| `admin_review_listing` | admin | non | Pré-analyse d'une annonce (complétude, cohérence prix / estimation, qualité photos par nombre et résolution) |
| `admin_case_summary` | admin | non | Synthèse d'un dossier avant un appel |
| `admin_draft_message` | admin | non | Brouillon de message de refus, relance ou suivi |

### Prompts

Fichiers versionnés dans `core/ai/prompts/` : `base.md` (commun), `seller.md`, `buyer.md`, `admin.md`, `listing-description.md`, `document-analysis/<type>.md`, `listing-summary.md`, `reply-suggestion.md`.

Contenu obligatoire de `base.md` :
- Identité : « Tu es l'assistant de Leenkey, une plateforme de vente immobilière entre particuliers accompagnée par des conseillers. »
- Ton : vouvoiement, phrases courtes, direct, rassurant, pas de jargon, pas d'emoji, pas de superlatifs commerciaux.
- Sources : utiliser `search_knowledge` avant de répondre à une question de méthode, de délai ou de démarche ; si aucune fiche ne correspond, le dire et proposer un conseiller.
- Limites : pas d'avis juridique, fiscal ou financier engageant ; pas d'estimation de prix nouvelle (renvoyer vers l'estimation existante) ; pas d'information sur d'autres utilisateurs que celles fournies par les outils.
- Actions : ne jamais annoncer qu'une action est faite avant la confirmation de l'utilisateur et le retour de l'outil.
- Passage à l'humain : en formule payante, proposer `contact_advisor` quand une intervention humaine apporte de la valeur ; en Autonomie, répondre normalement sans faire du payant la réponse par défaut, et proposer `create_case` seulement si l'utilisateur le demande ou si le sujet est conflictuel.

Règles métier impératives, fournies par le client (à reprendre dans `base.md`) :
- Répondre en priorité à partir des informations réellement présentes dans le dossier du bien et de l'utilisateur : formule, étape en cours, tâches faites et à faire, documents présents et manquants, offres et leur statut. La FAQ est la base métier, le dossier est le contexte. Exemple : un vendeur Sérénité qui demande « que dois-je faire maintenant ? » alors qu'une offre vient d'être acceptée et que trois documents manquent reçoit la prochaine étape précise, pas une explication générale des formules.
- Ne jamais inventer une information manquante.
- Distinguer clairement une information déclarée, un document fourni et un élément vérifié par Leenkey.
- Expliquer simplement les termes immobiliers.
- Ne jamais prendre une décision à la place du vendeur ou de l'acquéreur ; ne jamais dire s'il faut accepter une offre.
- Ne jamais présenter l'analyse de valeur, l'analyse d'une offre ou la vérification d'un document comme une garantie.
- Ne jamais se présenter comme notaire, avocat, diagnostiqueur, courtier ou expert immobilier.
- Question juridique, fiscale, financière ou technique nécessitant une analyse individualisée : orienter vers le professionnel compétent.
- Ne jamais bloquer ni décourager une étape indispensable de la vente pour pousser à une formule payante.
- Ne jamais qualifier juridiquement l'activité de Leenkey (« agence », « mandataire »…).
- Ne jamais présenter comme disponibles des services qui ne le sont pas : photos professionnelles, visites par un professionnel, diffusion sur d'autres portails, garantie juridique, relecture d'actes.
- Retrait d'une offre : avant acceptation, le retrait est possible depuis l'espace acquéreur ; après acceptation, ne donner aucune conclusion juridique, informer et orienter vers le vendeur et le notaire ; après signature d'un avant-contrat, expliquer le délai légal applicable uniquement à partir de la date de départ enregistrée dans le dossier, et sinon renvoyer vers le notaire pour connaître cette date.

### Mise en œuvre

- Route `/api/ai/chat` (route handler, streaming SSE). Entrée : `conversationId?`, `context`, `propertyId?`, `message`. Vérifie la session, le quota, charge l'historique (20 derniers messages), appelle l'API Anthropic avec les outils du contexte, exécute les outils non confirmables, renvoie au client les appels d'outils confirmables sous forme d'événement `confirm_required`.
- Confirmation : le client appelle une server action `confirmToolCall(conversationId, toolCallId)` qui exécute l'outil et relance la génération avec le résultat.
- Prompt caching : `cache_control` sur le prompt système et les définitions d'outils.
- Quota : plafonds définis dans `core/ai/quotas.ts`, par rôle, sans colonne en base : acquéreur 20 messages / jour ; vendeur 30 ; vendeur ayant au moins un bien sous formule payante (Accompagné ou Sérénité) 100 ; admin illimité. Un compte à plusieurs rôles reçoit le plafond le plus élevé. Le compteur reste `profiles.ai_messages_today`. Valeurs provisoires, à ajuster après la recette selon la consommation réelle. L'assistant fait partie d'Autonomie : le quota gratuit doit permettre de vendre réellement. Message à la limite : « Vous avez atteint la limite de messages de l'assistant pour aujourd'hui. Elle se renouvelle à minuit. Besoin d'aide maintenant ? Écrivez à un conseiller. » avec bouton `create_case`.
- Journalisation : chaque message et appel d'outil dans `ai_messages`, avec modèle et tokens.
- Suggestions de réponse en messagerie : appel non-streamé `MODELS.fast` avec `reply-suggestion.md`, contexte = 10 derniers messages + fiche publique du bien + fiches KB pertinentes. Max 80 mots.
- Description d'annonce : `MODELS.fast` avec `listing-description.md`, entrée = caractéristiques + atouts + notes libres du vendeur. Règles : factuel, 800 à 1 100 caractères, pas de superlatifs (« exceptionnel », « rare », « coup de cœur »), pas d'information inventée.
- Pré-analyse admin : calculée à la soumission (`listing.submitted`), stockée dans `listings` (colonne `review jsonb` à ajouter) : `{ completeness: 0-100, price_gap_pct, photos_count, issues: string[], verdict: 'ok'|'check' }`. Les règles de complétude et d'écart sont **calculées en code**, le modèle ne rédige que la phrase de synthèse.

### Base de connaissances

- Source principale : `supabase/seed/knowledge/faq-cedric-v2.md`, rédigée par le client (73 fiches). Une fiche par section `## Question`, métadonnées en commentaire HTML sur la ligne suivante (`audience`, `category`, `step_code`).
- Import : `npm run kb:import` découpe, calcule les embeddings (Edge Function `embed`) et fait un upsert par question.
- La recherche filtre par `audience` (le contexte de l'assistant indique s'il parle à un vendeur ou à un acquéreur) et favorise les fiches dont `step_code` correspond à l'étape en cours du bien.
- Les réponses des fiches sont génériques et mentionnent les trois formules : l'assistant ne cite que la partie qui concerne la formule de l'utilisateur, sauf s'il demande la comparaison.
- Admin `/admin/assistant` : liste des fiches, recherche test, import. Édition en ligne : V3.

## 13. Offre d'achat et qualification acquéreur (lot 2)

Source : modèle d'offre transmis par Cédric le 2026-10-05, conservé tel quel dans `docs/client/modele-offre-cedric-2026-10-05.md`. Les textes entre guillemets sont à reprendre **mot pour mot** (centralisés dans `lib/i18n/fr.ts`, clé `offer.*`).

Principe directeur : **l'offre est un document, la qualification est une analyse Leenkey.** Les deux sont séparées. Le PDF de l'offre ne contient jamais de statut de qualification (ni « justificatif vérifié », ni « financement validé »). Le tableau de bord vendeur, lui, affiche la qualification.

### Qualification

- `declared` dès que projet, budget, apport et besoin de prêt sont renseignés.
- `document_provided` quand un justificatif accepté est déposé (type + date + fichier).
- `document_checked` uniquement par un admin, depuis la fiche utilisateur, après contrôle de la présence du document, de son type, de sa date et de sa cohérence apparente avec les informations déclarées. Tracé dans `audit_log`, date stockée dans `buyer_profiles.financing_checked_at`. Bouton : « Marquer le justificatif comme vérifié ». Jamais « Valider le financement ».
- Affichage côté vendeur : `FinancingBadge` + lignes de détail « Justificatif de financement fourni » puis « Contrôlé par Leenkey le JJ/MM/AAAA ».
- Le texte « financement validé » est interdit partout (test automatique sur `lib/i18n/fr.ts` et sur le gabarit PDF).

### Statuts

`draft` (Brouillon) → `submitted` (Envoyée) → `viewed` (Consultée) → `accepted` (Acceptée) / `declined` (Refusée) / `expired` (Expirée) / `withdrawn` (Retirée). `superseded` (Remplacée) est interne : offre remplacée par une nouvelle version. `counter_offer` est prévu en V3, **ne pas le créer en V2**.

### Formulaire d'offre `/offres/nouvelle?listing=`

Prérequis : compte acquéreur, `financing_status ≥ declared`, annonce `published`, pas d'offre `submitted` ou `viewed` en cours du même acquéreur sur ce bien. Le brouillon est enregistré à chaque étape (`draft`), la référence `LK-AAAA-NNNNN` est créée avec lui.

Formulaire en 7 étapes (`ProgressBar` « Étape N sur 7 · … », par exemple « Étape 3 sur 7 · Mon offre » ; mise en forme `docs/DESIGN.md` 13.3), dans cet ordre :

**1. L'acquéreur.** Nom, prénom, date de naissance, adresse complète, e-mail, téléphone, préremplis depuis le profil et modifiables. Bouton « Ajouter un co-acquéreur » (mêmes champs, jusqu'à 3). Acquisition envisagée : « En nom propre », « À deux / indivision », « SCI », « Autre » (champ texte). Si SCI : dénomination, état (« SCI déjà constituée » / « SCI en cours de constitution »), SIREN (obligatoire si constituée, masqué sinon), adresse du siège social, représentant.

**2. Le bien concerné.** Lecture seule, prérempli depuis l'annonce : adresse, type, surface déclarée, annexes comprises (parking, garage, cave, terrain…), référence de l'annonce Leenkey. L'acquéreur ne ressaisit rien. Ces données sont photographiées dans `property_snapshot` à l'envoi.

**3. Mon offre.** Prix proposé (`UnitInput` €), montant en toutes lettres affiché sous le champ et généré en code. Encart d'interface uniquement (jamais dans le PDF) : « Prix affiché », « Offre », « Écart » (en € et en %, couleur neutre).

**4. Financement.** « Comment financez-vous votre acquisition ? » : « Sans recours à un prêt immobilier » / « Avec recours à un prêt immobilier ». Pas de troisième catégorie : apport + prêt correspond à « avec recours à un prêt ». Si prêt : apport personnel, montant prévisionnel du prêt, durée envisagée, taux maximal envisagé, établissement bancaire ou courtier (facultatif). Situation du financement : « Projet non encore présenté », « Simulation réalisée », « Courtier consulté », « Accord de principe obtenu », « Autre ». Justificatif : reprend celui du profil s'il existe, sinon « Ajouter un document » (même règles que le profil, statut `document_provided`).
- Encart **Budget global estimé du projet** conservé : prix + frais d'acquisition indicatifs (7,5 % ancien, taux du neuf si `is_new_build`, Q3). « Estimation indicative des frais d'acquisition. Le montant exact dépend du bien et du régime applicable : votre notaire vous le précisera. » Comparaison neutre : « Votre apport et votre prêt représentent X € pour un budget global estimé à Y €. » **Jamais de verdict, jamais de blocage.**
- Deux libellés distincts à l'écran : « Déclaré par l'acquéreur » pour les montants, « Justificatif vérifié par Leenkey » pour le statut, uniquement si `document_checked`.

**5. Conditions de l'offre.** La mention de financement (« Offre formulée avec recours à un prêt immobilier. » ou « Offre formulée sans recours à un prêt immobilier. ») est **déduite de l'étape 4**, affichée en lecture seule, pas redemandée. Puis « Autres éléments à porter à la connaissance du vendeur » : « Vente préalable d'un autre bien », « Obtention d'une autorisation particulière », « Autre situation à préciser », et un champ « Précisions » (500 caractères). Aucune clause juridique libre. Encart affiché dès l'arrivée sur l'étape :

> « Attention : les conditions juridiques définitives de la vente seront déterminées avec le ou les notaires lors de la préparation de l'avant-contrat. Une information renseignée ici ne remplace pas la rédaction d'une condition suspensive adaptée par le professionnel chargé de l'acte. »

Si prêt : ajouter « Pour un achat financé par prêt, la condition suspensive de financement devra notamment être correctement reprise dans l'avant-contrat. »

**6. Durée de validité.** « La présente offre est valable jusqu'au : JJ/MM/AAAA à HH:MM ». 5 jours par défaut, réglable de 2 à 10 jours.

**7. Déclarations et envoi.** Encart très visible, en tête de l'étape :

> **Avant d'envoyer votre offre**
> « Une offre d'achat n'est pas une simple manifestation d'intérêt. Elle formalise votre volonté d'acquérir le bien aux conditions indiquées et peut produire des effets juridiques lorsqu'elle est acceptée par le vendeur.
> Leenkey facilite la création, la transmission et la compréhension de l'offre mais ne se substitue pas au notaire ou à un professionnel du droit.
> Aucun versement n'est demandé ou encaissé par Leenkey au titre de cette offre d'achat. »

Visite (choix obligatoire) : « Je confirme avoir visité le bien » ou « Je formule mon offre sans visite préalable ». Puis quatre cases obligatoires :
- « Je confirme l'exactitude des informations que j'ai renseignées. »
- « J'ai vérifié le prix proposé et les modalités de financement indiquées. »
- « J'ai compris que cette offre constitue une démarche susceptible de produire des effets juridiques en cas d'acceptation. »
- « J'ai lu les informations relatives au fonctionnement de l'offre d'achat sur Leenkey. » (lien vers la fiche FAQ correspondante)

Bouton « Relire mon offre » (actif seulement quand tout est coché) → aperçu du document tel que le vendeur le recevra → bouton « Envoyer mon offre au vendeur ». Jamais un simple bouton « Envoyer ».

Envoi (fonction `offer_submit`, transaction unique) → statut `submitted`, `submitted_at`, photographies (`buyer_identity`, `property_snapshot`, `financing_status_at_submit`), gel par trigger, `offer_events`, génération du PDF, synthèse, notification vendeur, message système dans la conversation.

### PDF de l'offre

`@react-pdf/renderer`, charte Leenkey, titre « OFFRE D'ACHAT LEENKEY ». Contient : référence, version, date et heure d'émission ; sections 1 à 7 ci-dessus (acquéreur et co-acquéreurs, acquisition envisagée, bien, prix en chiffres et en lettres, financement **déclaré**, situation du financement, conditions et précisions, validité, déclarations cochées avec horodatage) ; l'encadré « Avant d'envoyer votre offre ». Ne contient pas : l'écart au prix affiché, le statut de qualification, la synthèse, le message au vendeur. Stocké dans le bucket privé `offers`, URL signée de courte durée.

### Synthèse pour le vendeur

Stockée dans `offers.synthesis`. **Tout est calculé en code à partir de gabarits**, y compris le paragraphe « Analyse Leenkey » : pas d'appel au modèle pour la synthèse vendeur en V2 (plus fiable, sans risque d'invention, sans coût). En V2, le vendeur peut poser des questions sur l'offre à l'assistant (outil `summarize_offer`, `MODELS.fast`), qui répond à partir des seules données de l'offre, sans recommander d'accepter ou de refuser, en reprenant le libellé exact du statut de financement. Le bouton dédié « Expliquer cette offre » est reporté en V3 (`BACKLOG-V3.md`).

```json
{
  "asking_price_label": "350 000 €",
  "offer_price_label": "338 000 €",
  "price_gap_label": "−12 000 € / −3,4 %",
  "financing_declared": ["Apport : 90 000 €", "Prêt envisagé : 275 000 €"],
  "financing_status": "document_checked",
  "financing_lines": ["Document fourni", "Contrôlé par Leenkey le 30/09/2026"],
  "conditions": ["Vente préalable d'un autre bien"],
  "validity_until": "2026-10-09T18:00:00+02:00",
  "analysis": [
    "L'offre est inférieure de 3,4 % au prix demandé.",
    "L'acquéreur déclare financer l'acquisition avec 90 000 € d'apport et un prêt. Un justificatif de financement a été fourni et contrôlé par Leenkey.",
    "L'offre mentionne également une vente préalable d'un autre bien.",
    "Avant de prendre votre décision, vérifiez notamment le prix proposé, les modalités de financement et les conditions indiquées."
  ]
}
```

Gabarits de l'analyse (une phrase par ligne, ignorée si sans objet) : écart (« supérieure de », « égale au », « inférieure de X % au prix demandé ») ; financement selon `financing_mode` et `financing_status_at_submit` ; conditions cochées ; dernière phrase toujours présente. Jamais de recommandation d'accepter ou de refuser. La synthèse est identique pour les trois formules ; en Autonomie, l'`UpgradePrompt` `offer_received` s'affiche à côté, jamais avant.

### Côté vendeur

Pas de PDF envoyé directement : le tableau de bord affiche une carte « Nouvelle offre reçue » (`docs/DESIGN.md` 13.3) : en-tête avec le titre et la durée de validité en compte à rebours (« 4 jours et 7 heures restantes », en pastille), puis, dans cet ordre : Prix demandé, Offre reçue, Écart, Financement déclaré, Justificatif financement, Analyse Leenkey. Puis « Voir l'offre complète » (page `/offres/[id]` : le document à l'écran, données personnelles masquées avant acceptation ; le PDF n'est téléchargeable par le vendeur qu'après acceptation, voir « Confidentialité des données de l'offre ») et trois actions :
- **« Accepter l'offre »** → écran intermédiaire (voir ci-dessous).
- **« Refuser l'offre »** (message facultatif).
- **« Discuter avec l'acquéreur »** → ouvre la conversation du bien dans la messagerie. Pas de contre-offre structurée en V2.

Première ouverture par le vendeur → `viewed`, `viewed_at` (« Consultée »), notification à l'acquéreur. Offre expirée : plus aucun bouton « Accepter », mention « Offre expirée le … ».

Onglet « Offres » de la fiche du bien : **historique complet** (retirées, expirées, remplacées comprises) avec le journal `offer_events`.

### Acceptation par le vendeur

Jamais d'acceptation en un clic. « Accepter l'offre » ouvre l'écran `/offres/[id]/accepter` :

> **Vous êtes sur le point d'accepter cette offre**
> Récapitulatif en `KeyFactsTable` (`docs/DESIGN.md` 13.3), une ligne par élément : Prix proposé (338 000 €), Acquéreur (Jean Dupont), Financement (prêt + apport), Validité (jusqu'au JJ/MM à HH:MM).
> « L'acceptation d'une offre d'achat peut produire des conséquences juridiques. Prenez connaissance de l'intégralité de l'offre avant de confirmer.
> En cas de doute, contactez votre notaire ou un conseiller Leenkey avant de poursuivre. »

Case obligatoire « J'ai lu l'intégralité de l'offre et souhaite confirmer mon acceptation. », puis bouton « Confirmer mon acceptation ». Le lien « conseiller Leenkey » ouvre la conversation conseiller si la formule le permet, sinon la page des formules. Enregistrement dans `seller_acceptance` et `offer_events`. Contrôle serveur : refus si l'offre est expirée, retirée ou remplacée au moment du clic.

Après acceptation : tâche cochée, `UpgradePrompt` `offer_accepted`, notification au conseiller si formule payante. Les autres offres en cours restent visibles ; le vendeur est invité à y répondre.

Avant-contrat : le vendeur (ou Leenkey en Sérénité, depuis le back office) enregistre la date de signature de l'avant-contrat et, s'il la connaît, la date de départ du délai légal de rétractation (`withdrawal_period_start`). Saisie côté vendeur et côté admin (Q7). Leenkey n'affiche une date de fin de délai que si `withdrawal_period_start` est renseignée, avec la mention « Date indicative calculée à partir de la date que vous avez renseignée. Votre notaire fait foi. »

### Ce que Leenkey conserve

Pour chaque offre, sans modification rétroactive possible : identifiant, référence, version, date et heure de création, identité de l'acquéreur et des co-acquéreurs, données du bien au moment de l'offre, prix, financement déclaré, conditions, documents associés, date et heure d'envoi, durée de validité, statut, date et heure de consultation par le vendeur, acceptation ou refus, historique des événements. Une correction = une nouvelle offre.

### Côté acquéreur : suivi et retrait de l'offre

Trois états, textes à reprendre exactement :

**Offre envoyée** (`submitted` ou `viewed`)
- Bouton **« Retirer mon offre »**.
- Confirmation : « Vous êtes sur le point de retirer votre offre. Le vendeur en sera immédiatement informé et votre retrait sera enregistré dans Leenkey. »
- Après confirmation : statut **« Offre retirée »** avec date et heure, notification au vendeur, message système, `offer_events`.
- Pour modifier un élément : « Faire une nouvelle offre » duplique le contenu dans un nouveau brouillon (`version` + 1) ; à l'envoi, l'ancienne passe en `superseded` avec `superseded_by`.

**Offre acceptée** (`accepted`)
- Le bouton « Retirer mon offre » disparaît.
- À la place, un encart : « Vous souhaitez renoncer à votre projet ? Votre offre a déjà été acceptée par le vendeur. Les conséquences dépendent de votre situation et de l'avancement de la transaction. Contactez le vendeur et votre notaire avant toute démarche. »
- Aucun bouton de rétractation, aucune conclusion juridique.

**Avant-contrat signé** (`precontract_signed_at` renseignée)
- Si `withdrawal_period_start` est renseignée : rappel du délai légal de rétractation calculé à partir de cette date, avec la mention « Date indicative. Votre notaire fait foi. »
- Sinon : « Le point de départ de votre délai de rétractation dépend de la date de notification ou de remise de l'avant-contrat. Votre notaire peut vous l'indiquer. » Ne jamais calculer « 10 jours après la signature ».
- Ne jamais écrire que l'acquéreur doit signer un avant-contrat pour pouvoir se rétracter.

Expiration automatique à `validity_until` (cron) → `expired`, `expired_at`, notifications, statut clairement affiché « Offre expirée ».

### Confidentialité des données de l'offre

Avant acceptation, le vendeur voit le nom, le prénom et la ville de l'acquéreur, le financement déclaré et la qualification. Date de naissance, adresse complète, téléphone et e-mail ne lui sont visibles qu'après acceptation (vue `offer_for_seller` qui masque ces champs selon le statut ; avant acceptation, le vendeur consulte l'offre complète à l'écran avec ces champs masqués, le PDF n'est téléchargeable par lui qu'après acceptation). Validé par Cédric le 2026-10-05.

## 14. Visites (lot 3)

### Principe

Personne ne réserve une visite sans y avoir été invité par le vendeur. Le vendeur ouvre des créneaux ; il invite un acquéreur précis ; l'acquéreur réserve un créneau.

### Vendeur : onglet « Visites »

- Créneaux : ajout ponctuel uniquement (date, heure de début, durée 30 / 45 / 60 min). Pas de séries en V2 (V3). Capacité 1 par défaut.
- Invitations : depuis une conversation (bouton calendrier) ou depuis la liste des contacts. Crée `visit_invitations` avec un jeton (validité 7 jours) et un message système dans la conversation avec le lien.
- Liste des visites à venir et passées, avec `FinancingBadge`.
- Après la visite (J+1) : demande de retour au vendeur et à l'acquéreur (formulaire court : intérêt 1 à 5, commentaire).

### Acquéreur : `/visites/reserver/[token]`

- Vérifie jeton, expiration, compte.
- Affiche les créneaux libres en grille de `ChipToggle` groupés par date (date en titre de groupe), en mobile comme en desktop (`docs/DESIGN.md` 13.1).
- Réservation → `visits` (`confirmed`), message système, notifications, fichier `.ics` joint à l'email.
- Annulation possible jusqu'à 2 h avant.

### Adresse

L'adresse exacte n'est communiquée qu'à l'acquéreur qui a une visite confirmée : dans l'email de confirmation et sur la page de la visite. Jamais ailleurs.

---

## 15. Documents et analyse IA (lot 3)

### Dossier de vente

Onglet « Documents » de la fiche du bien :
- Checklist par catégorie, selon le type de bien : Diagnostics (DPE, amiante, plomb, électricité, gaz, termites, ERP, Carrez), Propriété (titre, taxe foncière), Copropriété (PV des 3 dernières AG, règlement, appels de charges), Travaux (factures). Chaque ligne : déposé / manquant, date, bouton déposer.
- Dépôt : PDF, JPEG, PNG, 20 Mo max, type choisi à l'envoi (préselectionné par le nom de fichier si possible).
- Indicateur « Dossier notaire : 12 / 15 pièces ». Déclencheur `documents.notary_ready` quand toutes les pièces obligatoires sont présentes.
- Partage : par document ou par lot (« Partager les diagnostics »), à un acquéreur ayant une relation avec le bien. Demandes d'accès des acquéreurs listées en tête avec Accorder / Refuser.

### Analyse IA

Déclenchée après dépôt (tâche en arrière-plan via route interne appelée sans attendre, ou `after()` de Next.js) :
1. Extraction du texte : `unpdf` pour les PDF avec couche texte. Si le texte extrait fait moins de 200 caractères (scan), envoyer le PDF directement à l'API Anthropic en bloc `document` (lecture native des PDF), 100 pages max ; au-delà, analyser les 100 premières et le signaler.
2. Analyse avec `MODELS.smart` et le prompt du type (`document-analysis/pv_ag.md`, etc.), sortie JSON validée par Zod :

```json
{
  "type_detected": "pv_ag",
  "date": "2026-03-14",
  "key_facts": [{"label": "Travaux votés", "value": "Ravalement de façade, 42 000 € pour l'immeuble, appel en 2027"}],
  "points_of_attention": [{"level": "info|attention", "text": "…"}],
  "summary_seller": "…",
  "summary_buyer": "…",
  "public_facts": {"travaux_votes": "Ravalement 2027", "procedures": "Aucune"}
}
```

3. Stockage dans `documents.analysis`. Les `public_facts` alimentent le bloc « Ce que vous savez avant de visiter » de l'annonce **uniquement après validation par le vendeur** (bouton « Afficher sur l'annonce »).

Consignes par type :

| Type | À extraire |
|---|---|
| DPE | Classes énergie et GES, consommation, date, validité, recommandations principales |
| Amiante, plomb, termites, électricité, gaz | Présence ou absence, anomalies, date, validité |
| ERP | Risques recensés |
| Carrez | Surface, comparaison avec la surface déclarée (écart signalé si > 5 %) |
| PV d'AG | Date, travaux votés (nature, montant, échéance), procédures, impayés de la copropriété, questions à venir |
| Règlement de copropriété | Destination de l'immeuble, restrictions d'usage (location courte durée, activité professionnelle, animaux), parties communes à usage privatif |
| Appel de charges | Montant, périodicité, fonds travaux |
| Taxe foncière | Montant, année |
| Titre de propriété | Date d'acquisition, servitudes mentionnées |

Mention permanente sous chaque résumé : « Aide à la lecture générée automatiquement. Elle ne remplace ni le diagnostiqueur ni le notaire. »

Côté acquéreur : résumé acquéreur des seuls documents partagés, sur la page annonce (connecté) et via l'outil `summarize_shared_documents`.

Accès par formule : le dépôt, la checklist, le partage et le **résumé automatique par l'IA** sont ouverts aux trois formules (proposition en attente de confirmation, voir `DECISIONS.md` ; si Cédric réserve le résumé IA à Sérénité, il suffit de le conditionner à `deep_document_review`). En Sérénité, Leenkey peut en plus déposer des documents pour le vendeur (`sale_file_building`) et marquer chaque analyse « revue par Leenkey » avec une note (`deep_document_review`) ; ce marquage s'affiche au vendeur, jamais comme une garantie.

---

## 16. Alertes acheteur (lot 3)

- Création depuis la recherche (« Créer une alerte » enregistre les filtres de l'URL) ou via l'assistant.
- Gestion dans `/acquereur/alertes` : nom, résumé des critères, activer / désactiver, supprimer. 5 alertes max par acquéreur.
- Cron quotidien à 7 h : pour chaque alerte active, annonces publiées depuis `last_sent_at` correspondant aux critères (même fonction SQL que la recherche) → un email digest par acquéreur (toutes alertes confondues), 6 biens max, lien vers la recherche.
- Bien vendu : les acquéreurs ayant eu une conversation ou une offre sur ce bien reçoivent, s'ils ont au moins une alerte active, les biens similaires (même ville, ±20 % de prix, ±1 pièce). Pas d'email s'ils n'ont pas d'alerte (RGPD).

---

## 17. Back office

Maquettes : `AdminAnnonces.dc.html`, `AdminDesktop.dc.html`. Conçu desktop d'abord (Cédric travaille sur ordinateur), mobile pour la validation rapide.

### Tableau de bord `/admin`

- Tuiles : annonces à valider (avec l'ancienneté de la plus vieille, objectif 24 h), messages clients en attente, dossiers ouverts, offres des 7 derniers jours, signalements ouverts, formules vendues sur 30 jours (nombre et montant), inscriptions sur 30 jours (vendeurs / acquéreurs), déclencheurs de montée en gamme (affichés, cliqués, convertis).
- « Résumé du jour » par l'assistant (outil `admin_daily_brief`), généré à l'ouverture, mis en cache 1 h.
- Liste « À traiter » : les éléments qui attendent Cédric, par ancienneté.

### Annonces `/admin/annonces`

- Filtres par statut avec compteurs, recherche (référence, ville, vendeur), export CSV.
- Tableau : bien (vignette, titre, ville), vendeur, prix, formule, date de réception, pré-analyse (pastille verte ou orange + phrase).
- Détail `/admin/annonces/[id]` (en desktop, panneau de détail à droite de 420 px, `docs/DESIGN.md` 13.1) : aperçu exact de l'annonce, pré-analyse complète, historique (`audit_log`), actions :
  - **Valider et publier** → `published`, email vendeur, `listing.published`.
  - **Refuser avec motif** → `rejected`, motif obligatoire (modèles de motifs + texte libre, bouton « Rédiger avec l'assistant »), email au vendeur. Le vendeur corrige et renvoie.
  - **Suspendre** (motif obligatoire, email au vendeur) → `suspended` ; **Remettre en ligne** → `published`. Le vendeur voit l'annonce en lecture seule avec le motif et un lien vers la messagerie conseiller ou le formulaire de contact ; il ne peut pas la remettre en ligne lui-même.
  - **Modifier** (champs de l'annonce, traçé).

### Utilisateurs `/admin/utilisateurs`

Liste avec rôles, date d'inscription, biens, formule, statut de financement. Fiche : informations, biens, conversations (métadonnées, pas le contenu sauf signalement), offres, dossiers, justificatif de financement (type, date avec alerte au-delà de 3 mois, aperçu du fichier) avec **Marquer le justificatif comme vérifié** et une note interne, suspension du compte (motif, email).

### Dossiers `/admin/dossiers`

Liste (source, formule, bien, statut, ancienneté, assigné). Détail : résumé IA, bien, historique d'étapes, notes internes (`case_notes`), changement de statut, bouton « Synthèse avant appel » (`admin_case_summary`), cocher les tâches `owner = leenkey` de l'étape du bien.

### Messages clients `/admin/messages`

Boîte partagée des conversations conseiller (`advisor`) : non-lues en tête, filtre par formule, indicateur « en attente de réponse depuis plus de 24 h » en orange. Répondre depuis la liste ou depuis le dossier.

### Offres `/admin/offres`

Lecture seule : toutes les offres et leur journal, filtres, accès à la synthèse et au PDF. Pour les biens en formule payante, bouton « Marquer comme analysée » (tâche « Offre analysée avec le conseiller »). Saisie des dates d'avant-contrat et de départ du délai de rétractation pour les biens en Sérénité.

### Signalements `/admin/signalements`

Conversation signalée (lecture complète autorisée dans ce cadre, traçée), actions : clore, avertir, suspendre un utilisateur.

### Assistant `/admin/assistant`

Base de connaissances (liste, recherche test, import), journal des conversations de l'assistant (filtres par contexte, recherche), consommation de tokens par jour et par environnement.

---

## 18. Emails transactionnels

React Email dans `emails/`, envoi par Resend depuis `Leenkey <bonjour@leenkey.fr>` (prod) pour tous les emails utilisateurs ; les notifications internes (annonce à valider, dossier créé, message client, signalement) sont envoyées à `admin@leenkey.fr` (variable `ADMIN_NOTIFICATION_EMAIL`) ; en staging, préfixe `[PREPROD]` et redirection de tous les envois vers `EMAIL_TEST_INBOX`.

Gabarit commun (`docs/DESIGN.md` 14) : fond `#F4F4F1`, carte blanche 560 px rayon 6 px, bandeau haut 8 px `#1156FC`, logo « Leenkey » en texte 20 px 700, titres Archivo avec repli Arial gras (les clients mail ignorent `font-stretch`), corps 15 px / 1,6 `#0F1E35`, un bouton principal `#1156FC` 48 px rayon 4 px texte blanc 600, pied de page 12 px `#5B6474` avec lien vers les préférences de notification et adresse légale (placeholder).

| Email | Déclencheur | Contenu clé |
|---|---|---|
| Confirmation d'inscription | Supabase Auth (template personnalisé) | Lien de confirmation |
| Réinitialisation du mot de passe | Supabase Auth | Lien |
| Annonce reçue | `listing.submitted` | « Nous relisons sous 24 h » |
| Annonce publiée | `listing.published` | Lien vers l'annonce, conseils pour les premiers jours |
| Annonce à corriger | `listing.rejected` | Motif, lien vers la fiche |
| Nouveau message | `message.new` | Aperçu (140 car.), lien vers la conversation |
| Offre reçue | `offer.received` | Montant, écart, statut financement, lien (pas de PDF joint) |
| Réponse à votre offre | `offer.answered` | Acceptée / refusée, message éventuel |
| Offre expirée | `offer.expired` | — |
| Invitation à visiter | `visit.invited` | Lien de réservation, validité |
| Visite confirmée | `visit.booked` | Date, adresse exacte (acquéreur uniquement), `.ics` |
| Rappel de visite | cron J-1 | Idem |
| Documents partagés | `document.shared` | Liste, lien |
| Demande d'accès aux documents | `document.access_requested` | Acquéreur, statut financement, lien |
| Formule activée | `plan.activated` | Formule, prochaine étape, lien vers la conversation conseiller |
| Message du conseiller | `advisor.message` | Aperçu, lien |
| Offre retirée | `offer.withdrawn` | Date et heure du retrait |
| Alertes | cron | Digest de biens |
| Admin : annonce à valider, dossier créé | admin | Lien back office |

Aperçu de tous les emails : `npm run email:dev`.

---

## 19. Jobs planifiés

Voir `CLAUDE.md` section 13. Détail :

| Route | Fréquence (UTC) | Rôle |
|---|---|---|
| `/api/cron/ping-db` | `0 3 * * *` | Requête légère pour éviter la mise en pause du projet Supabase gratuit |
| `/api/cron/reset-ai-quotas` | `0 22 * * *` (minuit Paris en été) | Remise à zéro de `ai_messages_today` ; à ajuster à l'heure d'hiver ou calculer côté SQL en `Europe/Paris` |
| `/api/cron/expire-offers` | `0 5 * * *` | Offres `submitted`/`viewed` dont `validity_until` est passée → `expired` |
| `/api/cron/buyer-alerts` | `0 5 * * *` | Digest d'alertes (7 h Paris) |
| `/api/cron/visit-reminders` | `0 6 * * *` | Rappels J-1 |
| `/api/cron/visit-feedback` | `0 8 * * *` | Demandes de retour J+1 |
| `/api/cron/send-notification-emails` | `*/5 * * * *` | Envoi des emails de notification en attente (regroupement) |
| `/api/cron/anonymize-deleted` | `0 2 * * 0` | Anonymisation des comptes supprimés depuis plus de 30 jours |

Tous protégés par `CRON_SECRET`, idempotents, journalisés.

---

## 20. SEO, performance, accessibilité

### SEO

- Pages annonces : rendu serveur, `generateMetadata`, canonical, données structurées, image OG.
- Pages de recherche par ville (`/acheter/[ville]`) : reportées en V3 (`BACKLOG-V3.md`). En V2, `/acheter?ville=` avec filtres dans l'URL suffit.

### Zone de lancement (décision client)

Rayon d'environ 10 km autour d'Épinay-sur-Orge (91). Fichier `lib/config/launch-zone.ts`, codes INSEE et codes postaux à récupérer via l'API Géo (`geo.api.gouv.fr`) au moment du seed et vérifiés.

- **Zone 1, cœur de marché** : Épinay-sur-Orge, Villemoisson-sur-Orge, Morsang-sur-Orge, Savigny-sur-Orge, Longjumeau, Ballainvilliers, Villiers-sur-Orge, Sainte-Geneviève-des-Bois.
- **Zone 2, extension immédiate** : Viry-Châtillon, Juvisy-sur-Orge, Athis-Mons, Morangis, Chilly-Mazarin, Saulx-les-Chartreux, La Ville-du-Bois, Montlhéry, Linas, Longpont-sur-Orge, Fleury-Mérogis, Grigny.

Usages : centre et zoom par défaut de la carte de recherche (Épinay-sur-Orge, rayon 10 km), suggestions de villes dans la recherche et le profil acquéreur, données de seed. Les annonces hors zone restent acceptées (pas de blocage), l'admin les voit signalées « hors zone ».
- `sitemap.ts` dynamique (pages publiques, annonces publiées), `robots.ts` (bloque tout hors prod, bloque `/vendeur`, `/acquereur`, `/admin`, `/messages`, `/api`).
- Annonce vendue : page conservée 90 jours avec bandeau « Vendu » et biens similaires, puis 410.

### Performance

- Objectifs mobile (Lighthouse, 4G simulée) sur la page annonce et la recherche : LCP < 2,5 s, CLS < 0,1, INP < 200 ms.
- Images : `next/image` sur la route `/img`, tailles adaptées, `priority` sur la photo principale uniquement.
- Mapbox chargé dynamiquement (`next/dynamic`, `ssr: false`) au premier affichage de la carte.
- Pas de bibliothèque de plus de 50 ko gzip côté client sans justification dans la PR.

### Accessibilité

- WCAG 2.1 AA visé (`docs/DESIGN.md` 15) : contrastes des paires de `docs/DESIGN.md` 2.1 (le texte tertiaire `--lk-ink-3` `#5B6474` est le plus clair autorisé), focus visible (anneau 2 px `--lk-blue` décalé de 2 px sur tout élément interactif ; halo 3 px `--lk-blue-line` en plus sur les champs de saisie), navigation clavier complète (galerie, carte : liste alternative, modales), `aria-label` sur les boutons icônes, formulaires avec labels et messages d'erreur liés (`aria-describedby`).
- Dessin `facade.svg` : décoratif (`aria-hidden`).
- Zones tactiles ≥ 44 px.
- Test automatique `@axe-core/playwright` sur les parcours E2E.

---

## 21. Sécurité et RGPD

Règles de sécurité : `CLAUDE.md` section 11. Compléments :

- **Données personnelles traitées** : identité, contact, bien (adresse), financement déclaratif et justificatif, messages, documents du bien, conversations avec l'assistant.
- **Minimisation** : montants de financement jamais visibles du vendeur ; adresse exacte uniquement après visite confirmée ; justificatifs visibles uniquement du propriétaire et de l'admin.
- **Sous-traitants** (à lister dans la politique de confidentialité fournie par le client) : Supabase (hébergement UE, région `eu-west` à choisir à la création des projets), Vercel, Stripe, Anthropic, Resend, Mapbox.
- **Anthropic** : aucune donnée n'est utilisée pour l'entraînement via l'API ; ne pas envoyer à l'assistant les montants de financement d'un acquéreur à un vendeur.
- **Droits** : export JSON et suppression depuis `/compte` ; anonymisation à 30 jours.
- **Conservation** : messages et documents d'une annonce vendue conservés 12 mois puis supprimés (cron à ajouter en V3 ; noter dans `BACKLOG-V3.md`).
- **Cookies** : uniquement fonctionnels + mesure d'audience. GA4 et GTM sont présents sur le site actuel **sans bandeau de consentement** (vérifié dans `index.html` le 2026-10-06) : un bandeau doit être ajouté (voir `DECISIONS.md`, Q23). Aucun pixel publicitaire tiers.

---

## 22. Tests

Voir `CLAUDE.md` section 10. Parcours E2E obligatoires (Playwright, sur staging, données de seed) :

1. **Vendeur** : inscription → création de bien complète → envoi en validation → admin valide → annonce visible en recherche.
2. **Acquéreur** : recherche filtrée → annonce → inscription → profil financement → message au vendeur → vendeur répond avec une suggestion IA (mock du modèle en E2E).
3. **Paiement** : vendeur choisit Sérénité → Stripe Checkout (carte de test) → webhook → formule activée → dossier créé côté admin.
4. **Offre (L2)** : acquéreur au financement déclaré → offre → vendeur voit la synthèse → accepte → acquéreur notifié.
5. **Visite (L3)** : vendeur ouvre des créneaux → invite l'acquéreur → acquéreur réserve → rappel programmé.
6. **Documents (L3)** : dépôt d'un PV d'AG de test → analyse → vendeur publie les faits → affichés sur l'annonce → partage à un acquéreur → acquéreur lit le résumé.
7. **Permissions** : `seller_b` tente d'accéder au bien, aux documents et aux offres de `seller_a` → refusé ; `buyer_d` tente de réserver sans invitation → refusé.

Mocks : un client IA factice (`AI_MOCK=1`) renvoie des réponses déterministes pour les tests. Documents de test anonymisés dans `supabase/seed/documents/`.

Seed (`npm run db:seed`) : comptes `seller_a@test.leenkey.fr`, `seller_b@…`, `buyer_c@…`, `buyer_d@…`, `admin@…` (mot de passe commun en variable `SEED_PASSWORD`), 12 biens publiés répartis dans la zone de lancement (section 20) avec photos libres de droits générées (aplats ou photos Unsplash sous licence, jamais de photos de vraies annonces), 3 en attente, 1 refusé, conversations, 2 offres, fiches de la FAQ de Cédric.

---

## 23. Plan de travail détaillé

Chaque tâche : identifiant, contenu, dépendances, critères d'acceptation. Les livraisons contractuelles sont en fin de S5 (lot 1), S7 (lot 2), S9 (lot 3), S10 (livraison de la préprod validée, 18 décembre). La bascule en production est prévue le lundi 4 janvier 2027 (à confirmer avec Cédric). Les semaines et leurs dates sont dans `docs/PLANNING.md` ; ce tableau-ci donne les dépendances et les critères.

Rééquilibrage du 2026-10-05 : L1-20 est réduite au sitemap et aux robots (pages villes en V3) ; L1-27 avance en S4 et L1-35 en S3 ; les déclencheurs de montée en gamme (non contractuels) deviennent L2-09 en S6 ; l'export RGPD et la suppression de compte deviennent L2-10 en S7.

### Semaine 1 : fondations

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L1-01 | **(a)** Avant tout déplacement : tests de non-régression Vitest sur `estimation.ts` (au moins 20 cas réels, tous types de bien, résultats actuels figés), verts sur le code V1. **(b)** Nouveau projet Next.js 15 dans le repo, structure selon `CLAUDE.md` (dossiers, ESLint, Prettier, Vitest, Playwright, scripts npm, `.env.example`, GitHub Actions lint/typecheck/test/build). **(c)** Reprise de l'existant : wizard et moteur (sans changement de logique), 4 endpoints en route handlers aux mêmes chemins, pages marketing `public/pages/`, GA4, GTM, Vercel Analytics, redirections. Suppression du code Vite une fois la reprise validée | — | Les mêmes tests de non-régression passent à l'identique avant et après ; CI verte ; sur la préprod, une analyse de valeur de bout en bout (wizard → PDF → email de test) donne le même chiffre qu'en prod V1 pour 3 biens de référence ; formulaires des pages marketing et événements GA4 vérifiés |
| L1-02 | Environnements : `NEXT_PUBLIC_ENV`, bannière « Environnement de test », `noindex` (`X-Robots-Tag` + `robots.ts`) hors prod, protection HTTP Basic de la préprod dans `middleware.ts` (`PREPROD_USER` / `PREPROD_PASSWORD`, exclusions webhooks et crons), clients Supabase server/client/admin | L1-01 | Bannière et mot de passe actifs sur `leenkey-v2.vercel.app`, absents en prod ; webhooks et crons accessibles sans mot de passe |
| L1-03 | Migration enums + `profiles` + trigger d'inscription + `buyer_profiles` + RLS + tests | L1-01 | Tests RLS verts |
| L1-04 | Migrations `properties`, `listings`, `photos`, `listing_views`, `favorites`, vue `public_listings`, séquence référence, fonctions de transition de statut + RLS + tests | L1-03 | Tests RLS verts, vue ne renvoie aucun champ privé |
| L1-05 | Migrations `plans`, `subscriptions`, `stripe_events`, `sale_*`, `conversations`, `messages`, `reports`, `cases`, `case_notes`, `notifications`, `audit_log`, `knowledge_base`, `ai_*` + RLS + tests | L1-04 | Tests RLS verts |
| L1-06 | Seed complet (comptes, biens, plans, étapes de vente de la section 9, fiches de `faq-cedric-v2.md`) | L1-05 | `npm run db:seed` idempotent en local et staging, refus en prod |
| L1-07 | Design system : tokens, polices, composants de base (Button, Input, Select, UnitInput, ChipToggle, SegmentedPicker, StatusBadge, DpeBadge, titre de section (H3, `docs/DESIGN.md` 3.2), BrandPanel, KeyFigures, PropertyCard), page `/design` | L1-01 | Page `/design` conforme à `docs/DESIGN.md` 12.14 (tous les composants de la section 10), contrastes vérifiés |
| L1-08 | Dessin `public/brand/facade.svg` et composant `EmptyState` | L1-07 | SVG conforme à `docs/DESIGN.md` 7.3, utilisé dans `/design` sur fond clair et sur aplat bleu |

### Semaine 2 : comptes et biens

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L1-09 | Auth : inscription (choix du rôle), connexion, mot de passe oublié, confirmation, middleware de protection des routes, redirection `?next=`, templates email Supabase | L1-03, L1-07 | Parcours complet en staging, emails reçus |
| L1-10 | Shells de navigation : `TopNav`, `BottomNav` par rôle, `AdminShell`, cloche de notifications (vide) | L1-09 | Navigation cohérente sur 390, 768, 1280 px |
| L1-11 | Création de bien étapes 1 et 2 (Mapbox autocomplétion, géocodage, `public_location`, caractéristiques) avec sauvegarde auto | L1-04, L1-09 | Un bien brouillon complet se crée en mobile |
| L1-12 | Photos (dans l'étape 2) : upload, conversion WebP 3 tailles, réordonnancement, couverture, route `/img` | L1-11 | 15 photos max, rejets propres, aucune URL permanente |
| L1-13 | Étape 3 prix et description, rappel de l'analyse de valeur, reprise depuis l'estimateur (`?estimation=`), étape 4 aperçu, envoi en validation | L1-12 | Parcours estimateur → annonce `pending` complet |
| L1-14 | Fiche du bien (onglets Infos, Photos, Annonce), actions de statut | L1-13 | Pause / remise en ligne / vendu fonctionnent via fonctions SQL ; une annonce `suspended` est en lecture seule pour le vendeur (test) |

### Semaine 3 : recherche, annonce, back office minimum

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L1-15 | Fonction `search_listings`, index, schéma `SearchFilters`, page `/acheter` liste + filtres + tri + URL | L1-04 | Filtres combinés corrects sur le seed, URL partageable |
| L1-16 | Carte Mapbox (marqueurs prix, regroupement, synchronisation liste/carte, recherche dans la zone) | L1-15 | Mobile et desktop conformes à `docs/DESIGN.md` (8, 12.5, 12.6) |
| L1-17 | Page annonce complète (galerie photo, KeyFigures, KeyFacts, carte approximative, barre d'action), métadonnées, JSON-LD, OG image, compteur de vues | L1-15 | Lighthouse objectifs atteints, validation Rich Results OK |
| L1-18 | Favoris | L1-17 | Ajout / retrait, liste dans l'espace acquéreur |
| L1-19 | Back office v0 : `/admin/annonces` + détail, valider / refuser avec motif / suspendre (`listing_suspend`, motif obligatoire) / remettre en ligne, audit, emails | L1-14 | Parcours vendeur → admin → publication de bout en bout ; le vendeur ne peut pas lever une suspension (test RLS) |
| L1-20 | Sitemap et robots (pages SEO par ville reportées en V3) | L1-17 | Sitemap valide, robots bloque hors prod |
| L1-35 | `listing_revisions` simplifié : trigger sur les champs prix, titre, description d'une annonce publiée, historique chronologique côté vendeur et admin, notification `listing.revised` à l'admin | L1-14 | Changement de prix tracé avec ancienne et nouvelle valeur |

### Semaine 4 : messagerie, notifications, dashboard

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L1-21 | Messagerie : création de conversation depuis l'annonce, liste, fil, Realtime, lu / non lu, signalement, limites anti-abus | L1-17 | Deux navigateurs échangent en temps réel |
| L1-22 | Notifications : `notify()`, table, cloche Realtime, préférences, cron d'envoi groupé, emails React Email (gabarit + messages + annonce) | L1-21 | Regroupement des emails vérifié |
| L1-23 | Moteur d'étapes : `emitEvent`, bascule de modèle, `getNextAction`, branchement sur les événements existants | L1-06, L1-14 | Les tâches se cochent automatiquement sur le parcours E2E 1 |
| L1-24 | Dashboard vendeur complet (`SellerHeader`, StepProgress, NextActionCard, StatTile, TaskList, conversations) | L1-23 | Conforme à `docs/DESIGN.md` 12.3 |
| L1-25 | Espace acquéreur v1 (accueil, profil projet et financement déclaratif, `FinancingBadge` côté vendeur) | L1-21 | Le vendeur voit le statut, jamais les montants (test) |
| L1-27 | Embeddings (Edge Function `embed`), import KB, `search_knowledge` | L1-05 | Recherche test pertinente sur les fiches de `faq-cedric-v2.md` |

### Semaine 5 : paiement, assistant, back office → livraison lot 1

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L1-26 | Stripe : `startCheckout`, webhook idempotent, upgrade, écran de confirmation, page formule | L1-23 | E2E 3 vert avec Stripe CLI |
| L1-28 | Assistant : route de streaming, outils vendeur, confirmation, quotas, journalisation, panneau desktop ouvert par `AssistantFab` + page mobile | L1-27 | Modification de description via assistant avec confirmation |
| L1-29 | Suggestion de réponse en messagerie + rédaction de description | L1-28 | `AssistantSuggestion` conforme, `ai_suggested` enregistré |
| L1-30 | Back office complet lot 1 : tableau de bord + résumé du jour, utilisateurs, dossiers, signalements, pré-analyse des annonces, `/admin/assistant` (lecture + import) | L1-19, L1-28 | Cédric peut traiter une journée type sans accès base |
| L1-31 | Passage à l'humain (`create_case`) côté vendeur, via la fonction SQL `create_case` (`security definer`) | L1-28, L1-30 | Dossier créé avec résumé, notification admin ; aucun import du client service role dans `core/ai/` (test) |
| L1-33 | `plan_entitlements`, `hasEntitlement`, contenu des formules dans `plans`, page formules avec tableau comparatif | L1-26 | Aucun test de droit ne compare un nom de formule ; un vendeur Autonomie va jusqu'à la publication sans blocage |
| L1-34 | Conversation conseiller, version simple : `kind = 'advisor'` sur la messagerie existante (mêmes écrans, mêmes composants), créée au webhook de paiement, épinglée en tête de liste côté vendeur, vue admin `/admin/messages` (liste filtrée), outil IA `contact_advisor` | L1-21, L1-26 | Après paiement test, le vendeur et l'admin échangent en temps réel |
| L1-32 | Recette interne lot 1 : E2E 1, 2, 3, 7 verts, Lighthouse, axe, revue RLS | tout L1 | Tag `v2.0.0-lot1`, déploiement staging, `docs/RECETTE.md` à jour avec comptes et scénarios |

### Semaines 6 et 7 : lot 2

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L2-01 | Migration `offers` (enums `acquisition_mode`, `financing_mode`, `financing_progress`, référence, version, photographies) + fonctions de transition + trigger de gel + RLS + tests | L1-32 | Tests verts |
| L2-02 | Table `financing_documents` (+ FK depuis `buyer_profiles` et `offers`) + RLS + tests, dépôt du justificatif (type, date, fichier, bucket `documents`), contrôle admin « Marquer comme vérifié » (fonction `financing_document_check`), `FinancingBadge` et mention obligatoire | L2-01 | Statuts `document_provided` et `document_checked` fonctionnels ; aucun texte « validé » dans l'interface (test de recherche dans `lib/i18n/fr.ts`) |
| L2-03 | Formulaire d'offre en 7 étapes (acquéreur et co-acquéreurs, bien prérempli, prix en lettres, financement, conditions, validité, déclarations), relecture, envoi, trigger de gel, PDF | L2-01 | PDF conforme au modèle de Cédric ; une mise à jour du contenu d'une offre envoyée échoue en base (test) ; aucun « financement validé » dans le PDF |
| L2-04 | Synthèse et « Analyse Leenkey » par gabarits (sans IA), carte vendeur, écran d'acceptation intermédiaire, masquage des données personnelles avant acceptation, page offre vendeur, historique et journal, actions accepter / refuser, retrait acquéreur en trois états, offre de remplacement, saisie avant-contrat et délai, expiration, déclencheurs `offer_received` et `offer_accepted` | L2-03 | E2E 4 vert ; le bouton de retrait disparaît après acceptation |
| L2-05 | Résumé de l'annonce par l'assistant (page annonce) | L1-28 | Régénéré à chaque modification |
| L2-06 | Assistant acquéreur : `search_listings`, `get_listing_public`, `prefill_offer`, `create_case` | L2-04 | Recherche en langage naturel → filtres corrects sur 10 requêtes de test |
| L2-07 | Outil vendeur `summarize_offer`, `summarize_contacts` ; back office offres | L2-04 | — |
| L2-09 | Déclencheurs de montée en gamme : `upgrade_prompts`, `getUpgradePrompt`, `UpgradePrompt`, déclencheurs `valuation_done`, `listing_ready`, `low_contacts`, `contacts_no_visit`, `offer_received`, `offer_accepted` (seuils Q2) | L1-33, L2-04 | Un déclencheur masqué ne réapparaît pas ; aucun déclencheur ne bloque une action (test) |
| L2-10 | RGPD : export JSON des données du compte et suppression depuis `/compte`, cron `anonymize-deleted` | L1-09 | L'export contient profil, biens, messages, offres ; un compte supprimé est anonymisé au bout de 30 jours (test sur date simulée) |
| L2-08 | Recette lot 2 | tout L2 | Tag `v2.0.0-lot2` |

### Semaines 8 et 9 : lot 3

| ID | Tâche | Dépend de | Accepté quand |
|---|---|---|---|
| L3-01 | Migrations visites, documents, partages, demandes d'accès, alertes + RLS + tests | L2-08 | Tests verts |
| L3-02 | Créneaux ponctuels (pas de séries), invitations avec jeton, réservation, `.ics`, annulation, adresse révélée, outil IA `propose_visit_slot` | L3-01 | E2E 5 vert ; `propose_visit_slot` n'écrit rien sans confirmation |
| L3-03 | Retours de visite (cron J+1 et formulaires) | L3-02 | — |
| L3-04 | Dossier de vente : checklist, dépôt, indicateur notaire, partage, demandes d'accès | L3-01 | — |
| L3-05 | Analyse IA des documents (extraction, prompts par type, JSON validé), affichage vendeur, publication des faits sur l'annonce, résumé acquéreur | L3-04 | E2E 6 vert sur les documents de test |
| L3-06 | Alertes : création, gestion, cron digest, biens similaires après vente, outil `create_alert` | L3-01 | Digest reçu en staging |
| L3-07 | `summarize_shared_documents`, tâches L3 dans le moteur d'étapes | L3-05 | — |
| L3-08 | Recette lot 3 | tout L3 | Tag `v2.0.0-lot3` |

### Semaine 10 : production

| ID | Tâche | Accepté quand |
|---|---|---|
| P-01 | Revue sécurité (RLS avec tous les comptes, en-têtes, rate limits, secrets, uploads) | Checklist `docs/SECURITE.md` cochée |
| P-02 | Performance et accessibilité finales | Objectifs section 20 atteints |
| P-03 | Sauvegarde GitHub Action + restauration testée sur un projet vide | Restauration réussie documentée |
| P-04 | Guide back office (`docs/GUIDE-BACK-OFFICE.md` + PDF) | Relu par Younes |
| P-05 | Répétition complète de la mise en prod sur staging ; livraison de la préprod validée par Cédric (18 décembre) | Procédure jouée de bout en bout sur staging, retour arrière documenté |
| P-05b | Bascule le lundi 4 janvier 2027 (à confirmer avec Cédric) : migrations prod, seed des `plans` et `sale_steps` uniquement, Stripe live, domaine `leenkey.fr` vers le nouveau déploiement, Resend vérifié, vérification de l'identifiant du modèle IA rapide (dépréciations) | Site en ligne, parcours 1 et 3 testés en prod avec un vrai paiement remboursé ; retour arrière vers la V1 possible en un « Promote » |
| P-06 | Tag `v2.0.0`, `CHANGELOG.md` complet | — |

---

## 24. Contenus attendus du client et placeholders

État au 5 octobre 2026.

| Contenu | Statut | Utilisé par |
|---|---|---|
| Contenu des formules | **Reçu** (section 11 bis) | `plans`, page formules |
| Étapes de vente par formule | **Reçu** (section 9) | `sale_steps` |
| FAQ vendeur et acquéreur | **Reçu** (`supabase/seed/knowledge/faq-cedric-v2.md`) | `knowledge_base` |
| Décisions 1 à 9 | **Reçues** (`docs/DECISIONS.md`) | Toute la spec |
| Modèle d'offre et mention juridique | Reçu et précisé le 2026-10-05 (section 13). Reste ouvert : relecture des textes par la notaire (Q9) | Valeurs provisoires de `DECISIONS.md` |
| Mentions légales, CGU, CGV (rétractation, médiateur), confidentialité, cookies, mention IA, procédure de signalement | Demandés le 2026-10-05, **bloquant pour la prod** | Pages légales (page « En cours de rédaction » en staging) |
| Adresse légale et coordonnées | Présente sur le site V1 (mentions légales : 36 rue Pierre Brossolette, 91360 Épinay-sur-Orge), à confirmer par Cédric | Emails, pages légales |
| Biens et documents de test | Non reçu | Seed (en attendant : biens fictifs dans la zone de lancement) |
| Précisions en attente (Q1 à Q10, Q15) | Envoyées, valeurs provisoires utilisées | Voir `docs/DECISIONS.md` |

Chaque placeholder est tracé dans `docs/DECISIONS.md` et remplacé dès réception.

## 25. Hors périmètre (ne pas implémenter)

À noter dans `docs/BACKLOG-V3.md` si demandé :

- Diffusion sur les portails externes (choix stratégique : exclusivité Leenkey).
- Signature électronique (option Yousign chiffrée à part).
- Contre-offre structurée (la contre-proposition passe par la messagerie en V2).
- Application mobile native.
- Édition de la base de connaissances depuis le back office.
- Services additionnels vendus à l'unité, portail client Stripe, abonnements.
- Multi-langue.
- Import depuis un logiciel métier.
- Suppression automatique des données des ventes conclues après 12 mois.
- Connexion Google / Apple.
- Tableau de bord statistique avancé pour l'admin (au-delà des tuiles de la section 17).
- Pages SEO par ville `/acheter/[ville]` (reportées en V3 ; L1-20 ne garde que le sitemap et les robots).
- Bouton « Expliquer cette offre » côté vendeur (reporté en V3 le 2026-10-05 ; en V2 le vendeur interroge l'assistant).
- Séries de créneaux de visite (en V2 : créneaux ponctuels uniquement).
