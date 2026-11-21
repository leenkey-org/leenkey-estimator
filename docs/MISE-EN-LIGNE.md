# MISE EN LIGNE · procédure de la bascule du 25 novembre 2026

Procédure de P-05b (SPEC-V2 section 23), à jouer une fois en répétition (P-05, lundi 23) puis le 25. Elle complète `docs/SECURITE.md` (checklist) et `docs/RECETTE.md` (sauvegarde). Règles permanentes : rien n'est jamais poussé ni fusionné dans `main` ; la bascule se fait en changeant la branche de production du projet Vercel de leenkey.fr, sur go explicite de Younes ; aucun secret n'est collé dans une conversation, un commit ou un journal.

Qui : **Y** = Younes (tableaux de bord, secrets), **C** = Cédric (comptes de Leenkey), **CC** = Claude Code (dépôt, vérifications).

## 0. Ce qui conditionne la vente des formules le 25

| Élément | Qui | Effet s'il manque |
|---|---|---|
| Médiateur de la consommation (nom, adresse, site) | C | `paidPlansOrderable()` reste faux en production : le site ouvre, les formules payantes ne se commandent pas |
| Compte Stripe de SAS LEENKEY vérifié, en mode réel | C | Pas de paiement |
| Boîte `contact@leenkey.fr` (renvoi vers la boîte Gmail) | C | Les réponses aux emails et les rétractations par email sont perdues |

Sans les deux premiers, la bascule reste possible : le site ouvre avec la formule Autonomie, les formules payantes s'ouvrent ensuite par un simple déploiement (étape 6).

## 1. Comptes et accès (avant lundi 23)

- [ ] **Supabase** (compte Nebula Creativ, Leenkey invité) : projet `leenkey-prod`, région `eu-west-3` (Paris), offre Pro (sauvegarde quotidienne). Y, ou CC par le connecteur Supabase sur go de Younes (création facturée).
- [ ] **Stripe** (compte Leenkey, Nebula invité), mode réel :
  - trois prix en paiement unique, en euros, TTC : Accompagné 990 €, Sérénité 1 500 €, passage d'Accompagné à Sérénité 510 € ;
  - un taux de taxe « TVA 20 % », **inclus dans le prix** (inclusive) : son identifiant `txr_…` va dans `STRIPE_TAX_RATE` ;
  - le numéro de TVA de la société (FR53 107 616 211) et son adresse dans les réglages des factures ; reçus et factures envoyés par email activés ;
  - un point de terminaison de webhook `https://leenkey.fr/api/webhooks/stripe`, événements `checkout.session.completed` et `charge.refunded` ; son secret va dans `STRIPE_WEBHOOK_SECRET`.
- [ ] **Anthropic** (compte Leenkey) : une clé de production, plafond de dépense mensuel.
- [ ] **Resend** (compte Leenkey) : domaine `leenkey.fr` vérifié (déjà le cas pour la V1 ; DNS chez IONOS), une clé pour le site et une clé dédiée au SMTP de Supabase Auth.
- [ ] **Google Cloud** (compte Leenkey) : une clé Maps JavaScript API restreinte aux référents `https://leenkey.fr/*`, quota journalier et budget fixés.
- [ ] **IONOS** (Cédric) : `contact@leenkey.fr` et `bonjour@leenkey.fr` (expéditeur des emails) créées ou renvoyées.

## 2. Base de production (Supabase `leenkey-prod`)

Depuis le dépôt, avec un fichier `.env.prod.local` jamais commité (`PROD_DATABASE_URL`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY`) : `set -a; . ./.env.prod.local; set +a`.

1. [ ] **Migrations** : `npm run db:migrate:prod` (demande de taper `leenkey-prod`). Toutes les migrations de `supabase/migrations/` ont été jouées en préprod.
2. [ ] **Données de référence** : `npm run db:seed:reference:prod` → « 3 plans, 14 entitlements, 18 sale steps, 74 tasks ». Ni comptes de test ni biens de démonstration.
3. [ ] **Coffre (Integrations → Vault)** : `site_url` = `https://leenkey.fr` ; `cron_secret` = la même valeur que `CRON_SECRET` de Vercel (64 caractères, `openssl rand -hex 32`, différente de la préprod). Sans eux, les tâches planifiées ne font rien.
4. [ ] **Edge Function** : `npx supabase functions deploy embed --project-ref <ref de leenkey-prod>`, « Verify JWT » activé.
5. [ ] **Authentication** :
   - URL Configuration : *Site URL* `https://leenkey.fr`, *Redirect URLs* `https://leenkey.fr/**` ;
   - Emails → Templates : les quatre fichiers de `supabase/templates/` (confirmation, recovery, email-change, password-changed), sujets **sans** `[PREPROD]` ;
   - SMTP : Resend (`smtp.resend.com`, port 465, utilisateur `resend`, clé dédiée, expéditeur `bonjour@leenkey.fr`) ;
   - Providers → Email : *Confirm email* et *Secure email change* activés ; protection contre les mots de passe divulgués activée (`docs/SECURITE.md`).
6. [ ] **Comptes de l'équipe** : après la bascule, Younes (Nebula Creativ) et Cédric (contact.leenkey) créent leur compte sur leenkey.fr, puis, dans l'éditeur SQL du projet : `update public.profiles set roles = '{admin}' where id in (select id from auth.users where email in ('<adresse 1>', '<adresse 2>'));`. Les demandes de validation et les emails de l'équipe partent aux deux comptes.
7. [ ] **Base de connaissances** : `scripts/kb-import.sh prod` avec `KB_ADMIN_EMAIL` et `KB_ADMIN_PASSWORD` d'un compte admin (donc après l'étape 6), ou, sans script : importer les fiches puis « Calculer les fiches manquantes » dans `/admin/assistant`. Attendu : 73 fiches, 73 avec leur index.
8. [ ] **Contrôle** : dans l'éditeur SQL, `select count(*) from cron.job;` (les tâches planifiées existent) et les avis de sécurité du projet (Advisors) sans alerte critique.

## 3. Variables du projet Vercel `leenkey-estimator-main` (onglet Production)

À saisir par Younes ; les valeurs ne passent jamais par une conversation. Aucune valeur de la préprod n'est reprise.

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | `https://leenkey.fr` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | projet `leenkey-prod` |
| `SUPABASE_SERVICE_ROLE_KEY` | projet `leenkey-prod` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | clé restreinte à leenkey.fr |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | mode réel |
| `STRIPE_PRICE_ACCOMPAGNE`, `STRIPE_PRICE_SERENITE`, `STRIPE_PRICE_UPGRADE` | identifiants des trois prix réels |
| `STRIPE_TAX_RATE` | identifiant du taux « TVA 20 % » inclus |
| `ANTHROPIC_API_KEY` | clé de production |
| `RESEND_API_KEY` | clé de production |
| `CRON_SECRET` | la valeur du coffre `cron_secret` |
| `ADMIN_NOTIFICATION_EMAIL` | facultatif |

**À ne pas définir en production** : `PREPROD_USER`, `PREPROD_PASSWORD` (sinon le site demande un mot de passe), `EMAIL_TEST_INBOX` (sinon aucun client ne reçoit d'email), `AI_MOCK`, `STRIPE_MOCK`, `GEOCODER`, `DPE_REGISTRY`, `E2E_SEED`, `E2E_MUTATE`, `SEED_PASSWORD`.

Les variables de la V1 encore présentes sur ce projet (clés de l'estimateur V1) restent en place jusqu'à la bascule : elles servent au retour arrière.

## 4. La bascule (mercredi 25, sur go de Younes)

1. [ ] **Branche de production de la V2** : créée depuis le commit de `v2` validé le 24 (nom proposé : `production`). CC ne pousse sur aucune autre branche que la sienne sans autorisation : Younes la crée dans GitHub, ou donne son go pour que CC la pousse.
2. [ ] **Vercel `leenkey-estimator-main` → Settings → Environments → Production → Branch Tracking** : `main` devient `production`. Le dépôt contient `vercel.json` (`"framework": "nextjs"`) : le réglage « Vite » du projet n'a pas à être changé à la main, à vérifier sur le premier build.
3. [ ] **Premier déploiement** : attendre l'état *Ready*, vérifier qu'il porte le domaine `leenkey.fr`.
4. [ ] **GitHub** : secrets `PROD_DATABASE_URL` (session pooler) et `BACKUP_PASSPHRASE` ; branche par défaut du dépôt = `v2` (les tâches planifiées de GitHub ne tournent que sur elle) ; lancer « Backup » une fois à la main et vérifier l'artefact (`docs/RECETTE.md`).

## 5. Vérifications après la bascule

- [ ] `https://leenkey.fr` répond 200, sans bannière « Environnement de test », sans demande de mot de passe, sans en-tête `X-Robots-Tag: noindex`.
- [ ] `https://www.leenkey.fr` et `https://leenkey.com` redirigent en 301 vers `https://leenkey.fr`.
- [ ] `/robots.txt` autorise l'indexation, `/sitemap.xml` liste les pages (sans `/investir`).
- [ ] Les quatre adresses de la V1 répondent : `/api/estimate`, `/api/contact`, `/api/send-report`, `/api/dvf-comparables`.
- [ ] Une analyse de valeur complète, jusqu'au rapport reçu par email.
- [ ] **Parcours 1 en production** : inscription, email de confirmation reçu (expéditeur leenkey.fr), création d'un bien, envoi en validation, email « Annonce à valider » reçu par les deux comptes admin, validation, annonce visible, contact par un second compte, message reçu.
- [ ] L'assistant répond à une question (clé Anthropic de production).
- [ ] La carte de la recherche s'affiche (clé Google Maps).
- [ ] **Si Stripe réel et médiateur en place** : achat d'une formule avec une vraie carte, formule activée, reçu et facture avec la TVA reçus, puis rétractation et remboursement depuis Stripe.
- [ ] Erreurs d'exécution de Vercel : aucune erreur nouvelle dans l'heure qui suit.
- [ ] Mesure d'audience : après « Accepter » dans le bandeau, la visite apparaît dans Google Analytics.

## 6. Ouvrir les formules payantes (dès que le médiateur est connu)

1. CC renseigne `mediator` (nom, adresse, site) dans `lib/config/sales.ts`, PR vers `v2`, vérification en préprod : le récapitulatif de commande et les CGV l'affichent.
2. Report sur la branche de production par cherry-pick, sur go de Younes.
3. Achat de contrôle (étape 5).

## 7. Retour arrière

- **Un déploiement défectueux** : Vercel → Deployments → « Promote » du déploiement précédent.
- **Retour à la V1** : Branch Tracking de nouveau sur `main`, puis « Redeploy » du dernier déploiement de `main`. La V1 n'a ni base ni comptes : aucune donnée à reprendre. Les comptes créés sur la V2 restent dans `leenkey-prod`.
- **Une migration en cause** : migration inverse écrite et jouée en préprod d'abord, puis en production.
- Seuil de décision proposé : inscription, publication ou paiement impossible pendant plus de 30 minutes après la bascule → retour à la V1, correction en préprod, nouvelle bascule.

## 8. Après la bascule

- Corrections urgentes : PR vers `v2`, vérification en préprod, cherry-pick sur la branche de production, sur go de Younes.
- La préprod garde sa protection, ses clés de test et ses données de test.
- La production part de `v2` tel que validé le 24 (`DECISIONS.md`, « Périmètre du 25 novembre ») ; ce qui est fusionné ensuite n'y arrive qu'après vérification en préprod, par cherry-pick.
