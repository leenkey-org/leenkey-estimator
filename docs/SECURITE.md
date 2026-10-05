# SÉCURITÉ · checklist de mise en production (P-01)

À cocher avant la bascule de `v2` vers `main`. Chaque point est vérifié sur la préprod (`leenkey-v2.vercel.app`) avec les comptes de seed.

## Données et permissions
- [ ] RLS activée sur toutes les tables du schéma `public` (requête de contrôle dans `supabase/tests/rls_enabled.sql`)
- [ ] Tests RLS verts pour `seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin`, anonyme
- [ ] Vue `public_listings` : aucun champ privé (adresse exacte, téléphone, email)
- [ ] Vue `offer_for_seller` : coordonnées de l'acquéreur masquées avant acceptation
- [ ] Trigger `offers_freeze_after_submit` actif et testé
- [ ] Clé service utilisée uniquement dans `lib/supabase/admin.ts`, importé seulement par les webhooks, les crons et `leenkey/admin/actions.ts` (jamais dans `core/ai/`)
- [ ] Fonctions `security definer` (`create_case`, transitions de statut, `financing_document_check`) : `search_path` fixé, contrôle de `auth.uid()` et des paramètres, testées
- [ ] Statut `suspended` : aucune fonction ni politique ne permet au vendeur d'en sortir (test)
- [ ] Buckets Storage privés, URLs signées de courte durée, aucune URL permanente

## Entrées et abus
- [ ] Validation Zod sur toutes les Server Actions et routes API
- [ ] Uploads : type MIME vérifié côté serveur, taille maximale, conversion des images
- [ ] Limites de débit : connexion, inscription, messages, assistant IA, offres
- [ ] Quotas IA par utilisateur actifs, journalisation dans `ai_*`

## Secrets et infrastructure
- [ ] Aucun secret dans le code ni dans l'historique Git (`gitleaks` ou équivalent)
- [ ] Variables par environnement dans Vercel, clés prod différentes des clés staging
- [ ] Webhook Stripe : signature vérifiée, idempotence testée (même événement envoyé deux fois)
- [ ] Routes `/api/cron/*` protégées par `CRON_SECRET`
- [ ] En-têtes : CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- [ ] Clés Mapbox restreintes au domaine
- [ ] Préprod : mot de passe du middleware actif, `X-Robots-Tag: noindex`, aucune variable de prod dans le projet Vercel `leenkey-v2`

## RGPD
- [ ] Pages légales publiées (mentions, CGU, CGV, confidentialité, cookies)
- [ ] Export et suppression de compte fonctionnels depuis `/compte`
- [ ] Emails hors prod redirigés vers `EMAIL_TEST_INBOX`
- [ ] Sauvegarde quotidienne et restauration testée (P-03)
