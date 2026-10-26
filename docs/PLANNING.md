# PLANNING

Démarrage le **lundi 12 octobre 2026** (date provisoire, seule compatible avec les dates contractuelles : voir `DECISIONS.md` Q21). À recaler si l'acompte arrive plus tard ; les dates contractuelles ne bougent pas sans avenant.

Claude Code coche une tâche (`[x]`) dans la même PR que son code, avec le numéro de PR. Younes coche la colonne « Testé en préprod » après vérification sur `leenkey-v2.vercel.app`, une fois la PR fusionnée dans `v2`.

Rééquilibrage du 5 octobre : la semaine 5 passe de 10 à 8 tâches. L1-20 est réduite au sitemap et aux robots (pages villes en V3) ; L1-35 avance en S3 ; L1-27 (embeddings, sans dépendance au reste de S4) avance en S4 ; les déclencheurs de montée en gamme, non contractuels, deviennent L2-09 (S6) ; l'export RGPD et la suppression de compte deviennent L2-10 (S7). Aucune fonctionnalité du cahier des charges ne quitte le lot 1. Ajout du 8 octobre : L1-36 et L1-37 (S2), L1-38 et L1-39 (S4), L3-09 (S8-S9).

**Recalage du 15 octobre** (décision de Younes) : la semaine 1 a perdu deux jours (reprise après le cadrage, mise en pause du projet Supabase de staging). Le lot 1 reste livré le **vendredi 13 novembre** et la V2 est **mise en ligne avant le 30 novembre** (semaine du 23 novembre, P-05b). Pour tenir ces dates :
- L1-06, L1-07 et L1-08 sont terminées le lundi 19 octobre.
- Décalés en S6, sans effet sur les parcours du lot 1 : la carte avancée (regroupement, synchronisation liste et carte, « rechercher dans cette zone » ; L1-16 livre au lot 1 une carte avec les marqueurs de prix), les suggestions de l'assistant en messagerie et la rédaction de description (L1-29), l'historique des modifications d'annonce (L1-35), le résumé du jour par l'assistant dans le back office (partie de L1-30).
- Le bloc « vendre légalement » (environ 3 jours, inclus au forfait) est réparti : acceptation des CGU à l'inscription en L1-09 (S2), date de fin des formules en L1-05 (faite), récapitulatif de commande, cases, rétractation, e-mail récapitulatif et échéance en L1-40 (S5).
- Conditions : les clés et accès listés dans `DEMARRAGE.md` sont fournis avant la tâche qui en dépend (Mapbox avant L1-11, Resend avant L1-09, Anthropic avant L1-27, Stripe en mode test avant L1-26). Une question ouverte à Cédric ne bloque jamais le développement : la valeur provisoire de `DECISIONS.md` s'applique.

## S1 · semaine du 12 oct. · Fondations et reprise de l'existant

- [x] **L1-01** Tests de non-régression sur `estimation.ts` (≥ 20 cas réels) **avant tout déplacement**, puis projet Next.js 15 selon `CLAUDE.md` (ESLint, Prettier, Vitest, Playwright, CI), puis reprise de l’estimateur, des 4 endpoints, des pages marketing, d’Analytics et des redirections · PR : #4 · Testé en préprod : ☐
- [x] **L1-02** Environnements : `NEXT_PUBLIC_ENV`, bandeau « Environnement de test », `noindex`, mot de passe de préprod dans `middleware.ts`, clients Supabase… · PR : #5 · Testé en préprod : ☐
- [x] **L1-03** Migration enums + `profiles` + trigger d'inscription + `buyer_profiles` + RLS + tests · PR : #6 · Testé en préprod : ☐
- [x] **L1-04** Migrations `properties`, `listings`, `photos`, `listing_views`, `favorites`, vue `public_listings`,… · PR : #8 · Testé en préprod : ☐
- [x] **L1-05** Migrations `plans`, `subscriptions`, `stripe_events`, `sale_*`, `conversations`, `messages`, `reports`,… · PR : #9 · Testé en préprod : ☐
- [x] **L1-06** Seed complet (comptes, biens, formules, étapes de vente, FAQ) · PR : #13 · Testé en préprod : ☐
- [x] **L1-07** Design system : tokens, polices, composants de base (Button, Input, Select, UnitInput, ChipToggle,… · PR : #12 · Testé en préprod : ☐
- [x] **L1-08** Dessin `public/brand/facade.svg` et composant `EmptyState` · PR : #12 · Testé en préprod : ☐

Semaine chargée : L1-01 contient la reprise de l'existant, non prévue au contrat initial. L1-06, L1-07 et L1-08 se terminent le lundi 19 octobre (recalage du 15 octobre).

## S2 · semaine du 19 oct. · Comptes et biens

- [x] **L1-09** Auth : inscription (choix du rôle), connexion, mot de passe oublié, confirmation, middleware de protection, acceptation datée des CGU… · PR : #14 · Testé en préprod : ☐
- [x] **L1-10** Shells de navigation : `TopNav`, `BottomNav` par rôle, `AdminShell`, cloche de notifications (vide) · PR : #17 · Testé en préprod : ☐
- [x] **L1-11** Création de bien étapes 1 et 2 (Mapbox autocomplétion, géocodage, `public_location`, caractéristiques)… · PR : #20 (géocodage par la Base Adresse Nationale, Q46 ; photos avec L1-12) · Testé en préprod : ☐
- [x] **L1-12** Photos : upload, conversion WebP 3 tailles, réordonnancement, couverture, route `/img` · PR : #21 (photos du seed : Q48) · Testé en préprod : ☐
- [x] **L1-13** Étape 3 prix et description, rappel de l’analyse de valeur, reprise depuis l’estimateur (`?estimation=`),… · PR : #23 (L1-13a : étapes 3 et 4, envoi en validation), #25 (L1-13b : reprise depuis l’estimateur) · Testé en préprod : ☐
- [x] **L1-14a** Fiche du bien (onglets Infos, Photos, Annonce en lecture), actions de statut (pause, remise en ligne, vendu, suppression du brouillon), annonce suspendue en lecture seule, « Compléter mon annonce » du panneau de notifications vide (DESIGN 10.7, reporté de L1-11), onglet « Dossier » · PR : #30 · Testé en préprod : ☐
- [x] **L1-14b** Modification d'une annonce envoyée, en ligne ou en pause depuis sa fiche (Infos, Photos, Annonce), qui la laisse en ligne (SPEC 8.3) ; adresse figée une fois envoyée ; suspendue ou vendue en lecture seule · PR : #31 · Testé en préprod : ☐
- [x] **L1-36** Pages légales (CGU et mentions reprises de la V1, autres « En cours de rédaction ») · PR : #16 · Testé en préprod : ☐
- [x] **L1-37** Bandeau de consentement cookies, Google Consent Mode (Q23) · PR : #16 (« Gérer mes cookies » sous la recherche, l'annonce et les espaces connectés avec L1-10) · Testé en préprod : ☐

## S3 · semaine du 26 oct. · Recherche, annonce, back office minimum

- [x] **L1-15** Fonction `search_listings`, index, schéma `SearchFilters`, page `/acheter` liste + filtres + tri + URL · PR : #15 · Testé en préprod : ☐
- [x] **L1-16** Carte Google Maps avec les marqueurs de prix, synchronisation liste/carte, localisation de l'annonce et Street View, chargée au clic (regroupement et recherche dans la zone : L1-16b, S6) · PR : #51 · Testé en préprod : ☐
- [x] **L1-17** Page annonce complète (galerie photo, KeyFigures, KeyFacts, carte approximative, barre d'action), métadonnées,… · PR : #15 (carte de l'annonce avec L1-16, `DECISIONS.md`) · Testé en préprod : ☐
- [x] **L1-18** Favoris · PR : #18 · Testé en préprod : ☐
- [x] **L1-19** Back office v0 : `/admin/annonces` + détail, valider / refuser avec motif / suspendre (`suspended`) / remettre en ligne, audit, emails · PR : #19 (partie vendeur avec L1-14, `DECISIONS.md`) · Testé en préprod : ☐
- [x] **L1-20** Sitemap et robots (pages SEO par ville reportées en V3) · PR : #18 · Testé en préprod : ☐
- [x] **L1-41** Accueil en V2 (SPEC 8.1, décision du 19 octobre « V2 finale ») : « Je vends » / « J'achète » sur `BrandPanel`, « Les derniers biens », sections de la V1 en composants Façade, formulaire de contact, en-tête mobile et pied de page du site (tâche ajoutée le 19 octobre, d'abord numérotée L1-40 par erreur) · PR : #27 · Testé en préprod : ☐
- [x] **L1-42** `/concept`, `/tarifs`, `/faq` en V2 (décision du 19 octobre) : formules de `/tarifs` lues dans `plans`, FAQ dépliable · PR : #28 · Testé en préprod : ☐
- [x] **L1-43** `/investir`, `/qui-sommes-nous`, mentions légales et CGU en V2, `/estimer` dans l'en-tête V2, retrait du site V1 porté (décision du 19 octobre) · PR : #29 · Testé en préprod : ☐
- [x] **L1-44** Estimateur re-stylé (DESIGN 13.1 : Archivo, tokens, rayons), aucune modification de logique (tâche ajoutée le 19 octobre) ; plus aucune police V1 sur le site ; emojis retirés (DESIGN 1) · PR : #32 · Testé en préprod : ☐
- [x] **L1-45** Finitions de l'accueil et du site (demande de Younes du 20 octobre) : mots mis en valeur des titres V1 en bleu, titres de section à 40 px, mouvement des pages publiques inspiré de l'accueil V1 (DESIGN 9), « Qui sommes-nous » et « Contact » dans le menu, page `/contact`, colonne Leenkey du comparatif en aplat bleu · PR : #34 · Testé en préprod : ☐
- [x] **L1-47** Sections sombres de l'accueil (demande de Younes du 20 octobre) : « Ce que vous obtenez en quelques minutes » sur aplat navy avec la courbe de la V1 et ses quatre repères, aperçu de l'espace vendeur (« Ma vente » de la V2) avec des données d'exemple (étiquette « Exemple », légende de la V1) · PR : #35 · Testé en préprod : ☐
- [x] **L1-48** Section Tarifs de l'accueil en bleu foncé (demande de Younes du 20 octobre) : aplat navy, prix en grand lus dans `plans`, bouton « Voir le détail des formules » · PR : #37 · Testé en préprod : ☐
- [x] **L1-46** Photos de biens (DESIGN 7.2), première partie, photos fournies par Younes : photo du hero de l'accueil, trois maisons du seed (déposées par `db:seed` avec les comptes de seed), « Les derniers biens » avec photo d'abord · PR : #36 · Testé en préprod : ☐
- [x] **L1-49** Accueil dans la direction de la V1, design et parcours (demande de Younes du 23 octobre) : hero de la V1 avec sa carte « Exemple » calculée par le moteur, « Où en êtes-vous » juste après en cartes numérotées, surtitres, étapes numérotées, comparatif en tableau, questions dépliables, formules en cartes sombres, dernier appel ; « Les derniers biens » après l'espace vendeur · PR : #38 · Testé en préprod : ☐
- [x] **L1-50** Direction de la V1 sur les autres pages publiques (« oui » de Younes du 23 octobre) : `/concept`, `/tarifs`, `/faq`, `/investir`, `/qui-sommes-nous` avec les heros, surtitres, cartes et derniers appels de la V1 ; chiffres sans source toujours retirés (Q53) · PR : #39 · Testé en préprod : ☐
- [x] **L1-51** Sous-menu « Qui sommes-nous » (demande de Younes du 24 octobre) : « Leenkey et son fondateur » et « Investir dans Leenkey » dans la barre haute (survol, clic, clavier) et le menu mobile ; « Découvrir notre vision » mène à la vision de `/investir` · PR : #41 · Testé en préprod : ☐
- [x] **L1-52** Navigation (demandes de Younes du 26 octobre) : « Retour aux annonces » sur une annonce, « Voir l'annonce » ou « Voir mon bien » dans une conversation, « Voir le site » dans le Cockpit ; back office renommé « Cockpit » ; page `/vendre` avec l'analyse de valeur ou l'annonce directe · PR : #49 · Testé en préprod : ☐
- [x] **L1-46b** Photos des autres biens du seed (appartements, terrain, meulière, maison sur sous-sol, biens en attente) : 28 photos Unsplash (licence Unsplash) pour les 13 biens sans photo, de 1 à 5 par bien · PR : #44 · Testé en préprod : ☐
- [x] **L1-53** Refonte design, direction C (demande de Younes du 26 octobre, maquettes de `docs/design-handoff/`) : palette chaude sur tout le site, accueil refait (photo et carte de recherche à trois onglets, raccourcis, simulateur d'économies, biens autour d'Épinay-sur-Orge, étapes, formules, FAQ, bandeau final), adresse de l'accueil reprise par l'estimateur et la création du bien, barre haute, barre basse et pied de page restylés · PR : #50 · Testé en préprod : ☐
- [x] **L1-54** Recherche aux formes arrondies (demande de Younes du 26 octobre, « comme sur Airbnb ») : barre arrondie « Où ? · Type de bien · Budget max · Pièces » et menus arrondis à la place des listes natives (filtres, tri), champ et puces en pilules sur mobile, panneau des filtres sans liste native · PR : #52 · Testé en préprod : ☐
- [x] **L1-55** Fiches de biens façon Airbnb (demandes de Younes du 26 octobre) : résultats de la recherche en cartes à photos qui tournent (glissement du doigt, flèches), cadre bleu au survol et à la pression ; chiffres clés et atouts en bleu Leenkey au lieu du gris ; « Ce que vous savez avant de visiter » en grille à pictogrammes groupée · PR : #53 · Testé en préprod : ☐
- [x] **L1-56** Pleine page selon l'appareil (demande de Younes du 26 octobre) : pages sur toute la largeur de l'écran jusqu'à 1 920 px, marges par appareil, barre haute, contenu et pied de page alignés, une colonne de cartes de plus sur grand écran, espaces en pleine largeur · PR : · Testé en préprod : ☐

## S4 · semaine du 2 nov. · Messagerie, notifications, dashboard

- [x] **L1-21** Messagerie : création de conversation depuis l'annonce, liste, fil, Realtime, lu / non lu, signalement, limites anti-abus ; « Demander une visite » ouvre le premier message avec un texte de visite (jusqu'aux visites de L3) · PR : #33 · Testé en préprod : ☐
- [x] **L1-22** Notifications : `notify()`, table, cloche Realtime, préférences, cron d'envoi groupé, emails React Email… · PR : #40 (emails groupés : `CRON_SECRET`, clé de service et secrets du Vault à saisir, `DEMARRAGE.md`) · Testé en préprod : ☐
- [x] **L1-23** Moteur d'étapes : `emitEvent`, bascule de modèle, `getNextAction`, branchement sur les événements existants · PR : #48 (tâches cochées par la base ; règles 2 à 4 de la prochaine action avec les offres, le conseiller et les visites) · Testé en préprod : ☐
- [ ] **L1-24** Dashboard vendeur complet (en-tête navy, StepProgress, NextActionCard, StatTile, TaskList, conversations) · PR : · Testé en préprod : ☐
- [ ] **L1-25** Espace acquéreur v1 (accueil, profil projet et financement déclaratif, `FinancingBadge` côté vendeur) · PR : · Testé en préprod : ☐
- [ ] **L1-27** Embeddings (Edge Function `embed`), import de la FAQ de Cédric, `search_knowledge` (avancé depuis S5) · PR : · Testé en préprod : ☐
- [ ] **L1-38** En-têtes de sécurité et limitation de débit (`lib/rate-limit.ts`) · PR : · Testé en préprod : ☐
- [ ] **L1-39** Page `/compte` (informations, e-mail, mot de passe, notifications, rôles) · PR : · Testé en préprod : ☐

## S5 · semaine du 9 nov. · Paiement, assistant, back office → livraison lot 1 (ven. 13 nov.)

- [ ] **L1-26** Stripe : `startCheckout`, webhook idempotent, upgrade, écran de confirmation, page formule · PR : · Testé en préprod : ☐
- [ ] **L1-40** Vente conforme des formules : récapitulatif avant paiement, cases non précochées, « Commander et payer », e-mail récapitulatif, bouton de rétractation (14 jours), contact au 15e jour sans démarrage immédiat, retour en Autonomie à l'échéance · PR : · Testé en préprod : ☐
- [ ] **L1-33** `plan_entitlements`, `hasEntitlement`, contenu des formules dans `plans`, page formules avec tableau comparatif (déclencheurs : voir L2-09) · PR : · Testé en préprod : ☐
- [ ] **L1-28** Assistant : route de streaming, outils vendeur, confirmation, quotas, journalisation, panneau desktop +… · PR : · Testé en préprod : ☐
- [ ] **L1-30** Back office complet lot 1 : tableau de bord, utilisateurs, dossiers, signalements (résumé du jour par l'assistant : S6),… · PR : · Testé en préprod : ☐
- [ ] **L1-31** Passage à l’humain (`create_case`, fonction SQL `security definer`) côté vendeur · PR : · Testé en préprod : ☐
- [ ] **L1-34** Conversation conseiller : `kind = 'advisor'` sur la messagerie existante, créée au paiement, vue admin `/admin/messages`, outil `contact_advisor` · PR : · Testé en préprod : ☐
- [ ] **L1-32** Recette interne lot 1 : E2E 1, 2, 3, 7 verts, Lighthouse, axe, revue RLS · PR : · Testé en préprod : ☐

Toujours la semaine la plus risquée du projet. Ordre imposé : L1-26 et L1-33 (paiement) le lundi, L1-28 avant L1-29 et L1-31, L1-34 en dernier. Si L1-34 n'est pas prête jeudi soir, elle est livrée en S6 et la recette du lot 1 le dit explicitement.

## S6-S7 · semaines du 16 et 23 nov. · Lot 2 : offre d'achat et qualification → livraison ven. 27 nov.

Recette du lot 1 par Cédric du 16 au 20 novembre ; mise en ligne de la V2 la semaine du 23 novembre (P-05b, ci-dessous). Reportés du lot 1 (recalage du 15 octobre) :

- [ ] **L1-16b** Carte avancée : regroupement, recherche dans la zone (synchronisation liste/carte livrée avec L1-16) · PR : · Testé en préprod : ☐
- [ ] **L1-29** Suggestion de réponse en messagerie + rédaction de description · PR : · Testé en préprod : ☐
- [ ] **L1-35** `listing_revisions` simplifié : historique des champs prix, titre, description d’une annonce publiée, vendeur et admin · PR : · Testé en préprod : ☐
- [ ] **L1-30b** Résumé du jour par l'assistant dans le back office · PR : · Testé en préprod : ☐

Mise en ligne :

- [ ] **P-05b** Mise en ligne de la V2 (semaine du 23 nov., avant le 30 nov., sur go de Younes) : projet Supabase de production, migrations, seed `plans` et `sale_steps`, variables de production, Resend, vérification des modèles IA, Stripe live si CGV et médiateur prêts ; puis changement de la branche de production du projet Vercel de `leenkey.fr` (jamais de fusion dans `main`) ; retour arrière : remettre `main` · PR : · Testé en préprod : ☐

Lot 2 :

- [ ] **L2-01** Migration `offers` (enums `acquisition_mode`, `financing_mode`, `financing_progress`, référence, version,… · PR : · Testé en préprod : ☐
- [ ] **L2-02** Table `financing_documents` + RLS, justificatif de financement (type, date, fichier), contrôle admin « Marquer comme vérifié »,… · PR : · Testé en préprod : ☐
- [ ] **L2-03** Formulaire d'offre en 7 étapes (acquéreur et co-acquéreurs, bien prérempli, prix en lettres, financement,… · PR : · Testé en préprod : ☐
- [ ] **L2-04** Synthèse et « Analyse Leenkey » par gabarits (sans IA), carte vendeur, écran d'acceptation intermédiaire,… · PR : · Testé en préprod : ☐
- [ ] **L2-05** Résumé de l'annonce par l'assistant (page annonce) · PR : · Testé en préprod : ☐
- [ ] **L2-06** Assistant acquéreur : `search_listings`, `get_listing_public`, `prefill_offer`, `create_case` · PR : · Testé en préprod : ☐
- [ ] **L2-07** Outil vendeur `summarize_offer`, `summarize_contacts` ; back office offres · PR : · Testé en préprod : ☐
- [ ] **L2-09** Déclencheurs de montée en gamme : `upgrade_prompts`, `getUpgradePrompt`, `UpgradePrompt`, 6 déclencheurs (S6, déplacé depuis L1-33) · PR : · Testé en préprod : ☐
- [ ] **L2-10** RGPD : export JSON et suppression du compte depuis `/compte`, cron `anonymize-deleted` (S7) · PR : · Testé en préprod : ☐
- [ ] **L2-08** Recette lot 2 · PR : · Testé en préprod : ☐

## S8-S9 · semaines du 30 nov. et 7 déc. · Lot 3 : visites, documents, alertes → livraison ven. 11 déc.

- [ ] **L3-01** Migrations visites, documents, partages, demandes d'accès, alertes + RLS + tests · PR : · Testé en préprod : ☐
- [ ] **L3-02** Créneaux ponctuels, invitations avec jeton, réservation, `.ics`, annulation, adresse révélée, outil `propose_visit_slot` · PR : · Testé en préprod : ☐
- [ ] **L3-03** Retours de visite (cron J+1 et formulaires) · PR : · Testé en préprod : ☐
- [ ] **L3-04** Dossier de vente : checklist, dépôt, indicateur notaire, partage, demandes d'accès · PR : · Testé en préprod : ☐
- [ ] **L3-05** Analyse IA des documents (extraction, prompts par type, JSON validé), affichage vendeur, publication des… · PR : · Testé en préprod : ☐
- [ ] **L3-06** Alertes : création, gestion, cron digest, biens similaires après vente, outil `create_alert` · PR : · Testé en préprod : ☐
- [ ] **L3-07** `summarize_shared_documents`, tâches L3 dans le moteur d'étapes · PR : · Testé en préprod : ☐
- [ ] **L3-09** Déclencheurs de montée en gamme `visits_no_offer` et `file_incomplete` · PR : · Testé en préprod : ☐
- [ ] **L3-08** Recette lot 3 · PR : · Testé en préprod : ☐

## S10 · semaine du 14 déc. · Préprod validée → livraison ven. 18 déc.

- [ ] **P-01** Revue sécurité (RLS avec tous les comptes, en-têtes, rate limits, secrets, uploads) · PR : · Testé en préprod : ☐
- [ ] **P-02** Performance et accessibilité finales · PR : · Testé en préprod : ☐
- [ ] **P-03** Sauvegarde GitHub Action + restauration testée sur un projet vide · PR : · Testé en préprod : ☐
- [ ] **P-04** Guide back office (`docs/GUIDE-BACK-OFFICE.md` + PDF) · PR : · Testé en préprod : ☐
- [ ] **P-05** Répétition complète de la mise en production sur staging ; préprod validée par Cédric le 18 décembre · PR : · Testé en préprod : ☐

## Fin du projet

- [ ] **P-06** Tag `v2.0.0`, `CHANGELOG.md` complet · PR : · Testé en préprod : ☐

## Livraisons et paiements

| Échéance | Date cible | Recette Cédric | Paiement |
|---|---|---|---|
| Signature du contrat | avant S1 | — | 50 % · 8 499,00 € TTC |
| Fin de la semaine 5 (livraison lot 1) | ven. 13 nov. | ☐ | 30 % · 5 099,40 € TTC |
| Lot 2 | ven. 27 nov. | ☐ | — |
| Lot 3 | ven. 11 déc. | ☐ | — |
| Livraison : préprod complète validée | ven. 18 déc. | ☐ | 20 % · 3 399,60 € TTC |
| Mise en ligne de la V2 (décision du 15 octobre) | semaine du 23 nov. (avant le 30 nov.) | — | — |

Décision du 2026-10-07 : les 20 % sont dus à la livraison de la préprod validée (18 décembre), indépendamment de la date de mise en ligne.
