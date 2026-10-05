# PLANNING

Dates calées sur un démarrage le lundi 12 octobre 2026. **À recaler sur la date réelle de démarrage** (réception de l'acompte).

Claude Code coche une tâche (`[x]`) dans la même PR que son code, avec le numéro de PR. Younes coche la colonne « Testé en préprod » après vérification.

## S1 · semaine du 12 oct. · Fondations

- [ ] **L1-01** Initialiser la structure du repo selon `CLAUDE.md` (dossiers, ESLint, Prettier, Vitest, Playwright,… · PR : · Testé en préprod : ☐
- [ ] **L1-02** Environnements : `NEXT_PUBLIC_ENV`, bannière preprod, `noindex` hors prod, clients Supabase… · PR : · Testé en préprod : ☐
- [ ] **L1-03** Migration enums + `profiles` + trigger d'inscription + `buyer_profiles` + RLS + tests · PR : · Testé en préprod : ☐
- [ ] **L1-04** Migrations `properties`, `listings`, `photos`, `listing_views`, `favorites`, vue `public_listings`,… · PR : · Testé en préprod : ☐
- [ ] **L1-05** Migrations `plans`, `subscriptions`, `stripe_events`, `sale_*`, `conversations`, `messages`, `reports`,… · PR : · Testé en préprod : ☐
- [ ] **L1-06** Seed complet (comptes, biens, plans, étapes placeholder, KB placeholder) · PR : · Testé en préprod : ☐
- [ ] **L1-07** Design system : tokens, polices, composants de base (Button, Input, Select, UnitInput, ChipToggle,… · PR : · Testé en préprod : ☐
- [ ] **L1-08** Illustration `public/brand/plan.svg` et composant `EmptyState` · PR : · Testé en préprod : ☐

## S2 · semaine du 19 oct. · Comptes et biens

- [ ] **L1-09** Auth : inscription (choix du rôle), connexion, mot de passe oublié, confirmation, middleware de protection… · PR : · Testé en préprod : ☐
- [ ] **L1-10** Shells de navigation : `TopNav`, `BottomNav` par rôle, `AdminShell`, cloche de notifications (vide) · PR : · Testé en préprod : ☐
- [ ] **L1-11** Création de bien étapes 1 et 2 (Mapbox autocomplétion, géocodage, `public_location`, caractéristiques)… · PR : · Testé en préprod : ☐
- [ ] **L1-12** Photos : upload, conversion WebP 3 tailles, réordonnancement, couverture, route `/img` · PR : · Testé en préprod : ☐
- [ ] **L1-13** Étape 4 prix et description, rappel de l'estimation, reprise depuis l'estimateur (`?estimation=`),… · PR : · Testé en préprod : ☐
- [ ] **L1-14** Fiche du bien (onglets Infos, Photos, Annonce), actions de statut · PR : · Testé en préprod : ☐

## S3 · semaine du 26 oct. · Recherche, annonce, back office minimum

- [ ] **L1-15** Fonction `search_listings`, index, schéma `SearchFilters`, page `/acheter` liste + filtres + tri + URL · PR : · Testé en préprod : ☐
- [ ] **L1-16** Carte Mapbox (marqueurs prix, regroupement, synchronisation liste/carte, recherche dans la zone) · PR : · Testé en préprod : ☐
- [ ] **L1-17** Page annonce complète (galerie, cotations, KeyFacts, carte approximative, barre d'action), métadonnées,… · PR : · Testé en préprod : ☐
- [ ] **L1-18** Favoris · PR : · Testé en préprod : ☐
- [ ] **L1-19** Back office v0 : `/admin/annonces` + détail, valider / refuser avec motif / suspendre, audit, emails · PR : · Testé en préprod : ☐
- [ ] **L1-20** Pages SEO villes, sitemap, robots · PR : · Testé en préprod : ☐

## S4 · semaine du 2 nov. · Messagerie, notifications, dashboard

- [ ] **L1-21** Messagerie : création de conversation depuis l'annonce, liste, fil, Realtime, lu / non lu, signalement,… · PR : · Testé en préprod : ☐
- [ ] **L1-22** Notifications : `notify()`, table, cloche Realtime, préférences, cron d'envoi groupé, emails React Email… · PR : · Testé en préprod : ☐
- [ ] **L1-23** Moteur d'étapes : `emitEvent`, bascule de modèle, `getNextAction`, branchement sur les événements existants · PR : · Testé en préprod : ☐
- [ ] **L1-24** Dashboard vendeur complet (en-tête blueprint, StepProgress, NextActionCard, StatTile, TaskList, conversations) · PR : · Testé en préprod : ☐
- [ ] **L1-25** Espace acquéreur v1 (accueil, profil projet et financement déclaratif, `FinancingBadge` côté vendeur) · PR : · Testé en préprod : ☐

## S5 · semaine du 9 nov. · Paiement, assistant, back office → livraison lot 1 (ven. 13 nov.)

- [ ] **L1-26** Stripe : `startCheckout`, webhook idempotent, upgrade, écran de confirmation, page formule · PR : · Testé en préprod : ☐
- [ ] **L1-27** Embeddings (Edge Function `embed`), import KB, `search_knowledge` · PR : · Testé en préprod : ☐
- [ ] **L1-28** Assistant : route de streaming, outils vendeur, confirmation, quotas, journalisation, panneau desktop +… · PR : · Testé en préprod : ☐
- [ ] **L1-29** Suggestion de réponse en messagerie + rédaction de description · PR : · Testé en préprod : ☐
- [ ] **L1-30** Back office complet lot 1 : tableau de bord + résumé du jour, utilisateurs, dossiers, signalements,… · PR : · Testé en préprod : ☐
- [ ] **L1-31** Passage à l'humain (`create_case`) côté vendeur · PR : · Testé en préprod : ☐
- [ ] **L1-33** `plan_entitlements`, `hasEntitlement`, contenu des formules dans `plans`, page formules avec tableau… · PR : · Testé en préprod : ☐
- [ ] **L1-34** Conversation conseiller : `kind = 'advisor'`, création au webhook, épinglage côté vendeur,… · PR : · Testé en préprod : ☐
- [ ] **L1-35** `listing_revisions` : enregistrement des modifications d'annonce publiée, historique vendeur et admin,… · PR : · Testé en préprod : ☐
- [ ] **L1-32** Recette interne lot 1 : E2E 1, 2, 3, 7 verts, Lighthouse, axe, revue RLS · PR : · Testé en préprod : ☐

## S6-S7 · semaine du 16 et 23 nov. · Lot 2 : offre d'achat et qualification → livraison ven. 27 nov.

- [ ] **L2-01** Migration `offers` (enums `acquisition_mode`, `financing_mode`, `financing_progress`, référence, version,… · PR : · Testé en préprod : ☐
- [ ] **L2-02** Justificatif de financement (type, date, fichier), contrôle admin « Marquer comme vérifié »,… · PR : · Testé en préprod : ☐
- [ ] **L2-03** Formulaire d'offre en 7 étapes (acquéreur et co-acquéreurs, bien prérempli, prix en lettres, financement,… · PR : · Testé en préprod : ☐
- [ ] **L2-04** Synthèse et « Analyse Leenkey » par gabarits (sans IA), carte vendeur, écran d'acceptation intermédiaire,… · PR : · Testé en préprod : ☐
- [ ] **L2-05** Résumé de l'annonce par l'assistant (page annonce) · PR : · Testé en préprod : ☐
- [ ] **L2-06** Assistant acquéreur : `search_listings`, `get_listing_public`, `prefill_offer`, `create_case` · PR : · Testé en préprod : ☐
- [ ] **L2-07** Outil vendeur `summarize_offer`, `summarize_contacts` ; back office offres · PR : · Testé en préprod : ☐
- [ ] **L2-08** Recette lot 2 · PR : · Testé en préprod : ☐

## S8-S9 · semaine du 30 nov. et 7 déc. · Lot 3 : visites, documents, alertes → livraison ven. 11 déc.

- [ ] **L3-01** Migrations visites, documents, partages, demandes d'accès, alertes + RLS + tests · PR : · Testé en préprod : ☐
- [ ] **L3-02** Créneaux (ponctuels et séries), invitations avec jeton, réservation, `.ics`, annulation, adresse révélée · PR : · Testé en préprod : ☐
- [ ] **L3-03** Retours de visite (cron J+1 et formulaires) · PR : · Testé en préprod : ☐
- [ ] **L3-04** Dossier de vente : checklist, dépôt, indicateur notaire, partage, demandes d'accès · PR : · Testé en préprod : ☐
- [ ] **L3-05** Analyse IA des documents (extraction, prompts par type, JSON validé), affichage vendeur, publication des… · PR : · Testé en préprod : ☐
- [ ] **L3-06** Alertes : création, gestion, cron digest, biens similaires après vente, outil `create_alert` · PR : · Testé en préprod : ☐
- [ ] **L3-07** `summarize_shared_documents`, tâches L3 dans le moteur d'étapes · PR : · Testé en préprod : ☐
- [ ] **L3-08** Recette lot 3 · PR : · Testé en préprod : ☐

## S10 · semaine du 14 déc. · Production → mise en ligne ven. 18 déc.

- [ ] **P-01** Revue sécurité (RLS avec tous les comptes, en-têtes, rate limits, secrets, uploads) · PR : · Testé en préprod : ☐
- [ ] **P-02** Performance et accessibilité finales · PR : · Testé en préprod : ☐
- [ ] **P-03** Sauvegarde GitHub Action + restauration testée sur un projet vide · PR : · Testé en préprod : ☐
- [ ] **P-04** Guide back office (`docs/GUIDE-BACK-OFFICE.md` + PDF) · PR : · Testé en préprod : ☐
- [ ] **P-05** Répétition de mise en prod sur staging, puis migrations prod, seed des `plans` et `sale_steps` uniquement,… · PR : · Testé en préprod : ☐
- [ ] **P-06** Tag `v2.0.0`, `CHANGELOG.md` complet · PR : · Testé en préprod : ☐

## Livraisons et paiements

| Échéance | Date cible | Recette Cédric | Paiement |
|---|---|---|---|
| Signature du contrat | avant S1 | — | 50 % · 8 499,00 € TTC |
| Fin de la semaine 5 (livraison lot 1) | ven. 13 nov. | ☐ | 30 % · 5 099,40 € TTC |
| Lot 2 | ven. 27 nov. | ☐ | — |
| Lot 3 | ven. 11 déc. | ☐ | — |
| Livraison (mise en production) | ven. 18 déc. | ☐ | 20 % · 3 399,60 € TTC |
