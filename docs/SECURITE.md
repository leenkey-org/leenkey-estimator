# SÉCURITÉ · checklist de mise en production (P-01)

À cocher avant la mise en ligne de la V2 (changement de la branche de production dans Vercel, avant le 30 novembre 2026 ; jamais de fusion dans `main`). Chaque point est vérifié sur la préprod (`leenkey-v2.vercel.app`) avec les comptes de seed.

## Données et permissions
- [ ] RLS activée sur toutes les tables du schéma `public` (requête de contrôle dans `supabase/tests/rls_enabled.sql`)
- [ ] Tests RLS verts pour `seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin`, anonyme
- [ ] Vue `public_listings` : aucun champ privé (adresse exacte, téléphone, email)
- [ ] Vue `offer_for_seller` : coordonnées de l'acquéreur masquées avant acceptation
- [ ] Trigger `offers_freeze_after_submit` actif et testé
- [ ] Clé service utilisée uniquement dans `lib/supabase/admin.ts`, importé seulement par les webhooks, les crons et `leenkey/admin/actions.ts` (jamais dans `core/ai/`)
- [ ] Fonctions `security definer` (`create_case`, transitions de statut, `financing_document_check`) : `search_path` fixé, contrôle de `auth.uid()` et des paramètres, testées
- [ ] Statut `suspended` : aucune fonction ni politique ne permet au vendeur d'en sortir (test)
- [ ] Buckets Storage privés, URLs signées de courte durée, aucune URL permanente (photos : route `/img`, politiques `photos_files_*`, test `supabase/tests/rls_photos.sql`)
- [ ] Modération d'une annonce en ligne (L1-14) : aucune modification sans relecture de Leenkey. Aujourd'hui, le vendeur peut encore changer directement, par l'API, le titre, la description, le prix, les caractéristiques et les légendes d'une annonce en ligne (droits de L1-04) ; et une URL d'envoi signée de Supabase Storage (valable 2 h, les politiques ne sont contrôlées qu'à sa création) obtenue pendant la création permet de remplacer un fichier de photo après l'envoi. À fermer avec `listing_revisions`, et pour les photos par une lecture publique limitée aux fichiers inchangés depuis la publication (test dans `rls_photos.sql`)

## Entrées et abus
- [ ] Validation Zod sur toutes les Server Actions et routes API
- [ ] Uploads : type MIME vérifié côté serveur, taille maximale, conversion des images (photos : format lu dans le contenu, 60 millions de pixels au plus, métadonnées retirées, `core/images/webp.ts`)
- [ ] Limites de débit : connexion, inscription, messages, assistant IA, offres (messages : 20 par heure et par expéditeur, 5 nouvelles conversations par jour et par acquéreur, contrôlées par la base depuis L1-21, test `supabase/tests/rls_messaging.sql`)
- [ ] Quotas IA par utilisateur actifs, journalisation dans `ai_*`

## Secrets et infrastructure
- [ ] Aucun secret dans le code ni dans l'historique Git (`gitleaks` ou équivalent)
- [ ] Variables par environnement dans Vercel, clés prod différentes des clés staging
- [ ] Webhook Stripe : signature vérifiée, idempotence testée (même événement envoyé deux fois)
- [ ] Routes `/api/cron/*` protégées par `CRON_SECRET`
- [ ] En-têtes : CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy (la CSP autorise l'origine du stockage Supabase dans `img-src` : les photos signées en viennent ; et le WebSocket de Supabase Realtime dans `connect-src`, `wss://<projet>.supabase.co` : la messagerie en dépend, L1-21)
- [ ] Clés Google Maps restreintes au domaine (référents HTTP) et à la Maps JavaScript API, quota journalier et budget fixés
- [ ] Préprod : mot de passe du middleware actif, `X-Robots-Tag: noindex`, aucune variable de prod dans le projet Vercel `leenkey-v2`

## RGPD
- [ ] Pages légales publiées (mentions, CGU, CGV, confidentialité, cookies)
- [ ] Export et suppression de compte fonctionnels depuis `/compte`
- [ ] Emails hors prod redirigés vers `EMAIL_TEST_INBOX`
- [ ] Sauvegarde quotidienne et restauration testée (P-03)
