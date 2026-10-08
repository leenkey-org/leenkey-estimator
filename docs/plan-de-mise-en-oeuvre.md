# Leenkey V2 : Plan de mise en œuvre

Document interne Nebula Creativ. Ne pas transmettre au client.
Stack : Next.js (App Router) · Supabase · Stripe · Anthropic API · Resend · Mapbox · Vercel Pro. Dev avec Claude Code.

---

## 0. Principes qui tiennent le planning

1. **Modèle de données et permissions d'abord.** Rien ne se code avant que le schéma soit posé et validé. C'est ce qui évite de tout refaire au lot 2.
2. **Modules génériques séparés du métier.** Auth, compte, moteur d'étapes, documents, assistant, paiement : dans des dossiers `core/`. Le métier immobilier (bien, annonce, offre) dans `leenkey/`. Le générique est réutilisable pour meykeet et les clients suivants.
3. **Une fonctionnalité = une branche = une PR = un déploiement preview Vercel.** Cédric teste sur l'URL de preview, jamais sur la prod avant la mise en production finale.
4. **Chaque semaine se termine par une démo.** Ce qui n'est pas démontrable le vendredi n'est pas fini.
5. **Le hors périmètre est noté, pas fait.** Un fichier `BACKLOG-V3.md` reçoit toute demande hors périmètre, avec la date. C'est le futur devis.

---

## 1. Avant le kick-off (cette semaine)

**Côté toi**
- [ ] Contrat signé, premier versement reçu. Pas de kick-off sans les deux.
- [ ] Repo GitHub `leenkey` : branche `main` protégée, `develop` pour l'intégration, Vercel connecté sur ton compte Pro avec previews automatiques.
- [ ] Projet Supabase `leenkey-prod` au nom de Cédric (il crée le compte, tu es invité), plan gratuit. Projet `leenkey-dev` sur ton compte pour développer.
- [ ] Compte Stripe au nom de Leenkey, en mode test. Compte Resend, Mapbox, clé API Anthropic (facturation Leenkey, ou la tienne au début refacturée).
- [ ] `CLAUDE.md` à la racine du repo : stack, conventions, structure des dossiers, règles RLS, règle « jamais de secret dans le code ». C'est ce qui rend Claude Code cohérent sur 10 semaines.
- [ ] Reprendre le code existant (site + estimateur) : lister ce qui se garde (estimateur, pages marketing, design tokens) et ce qui se remplace.

**Côté Cédric (à exiger pour le kick-off)**
- [ ] Contenu exact des trois formules : ce qui est inclus, ce que Cédric fait à chaque étape.
- [ ] Les étapes de vente par formule (c'est le moteur d'étapes du dashboard).
- [ ] FAQ vendeur et FAQ acquéreur, même brutes : c'est la base de connaissances de l'assistant.
- [ ] Son modèle d'offre d'achat actuel avec les mentions obligatoires.
- [ ] Textes légaux et CGV des formules.
- [ ] 5 biens de test avec photos et documents (DPE, un PV d'AG, un règlement de copro).

---

## 2. Semaine 1 : Cadrage et fondations

### Kick-off (2 h avec Cédric)
- Valider ensemble les étapes de vente par formule, en les écrivant sous forme de tableau : étape, formule concernée, qui fait quoi, quel événement la déclenche, quelle notification.
- Parcourir la base de connaissances et la structurer en fiches (une question, une réponse, une étape associée).
- Valider le modèle d'offre d'achat champ par champ.
- Fixer le créneau hebdo fixe du point d'avancement.

### Modèle de données (à valider avant tout code)

Entités et relations principales :

| Table | Rôle | Liens clés |
|---|---|---|
| `profiles` | Utilisateur, rôles `seller` / `buyer` / `admin` (un profil peut avoir les deux premiers) | `auth.users` |
| `buyer_profiles` | Projet, situation, financement déclaratif, statut de qualification | `profiles` |
| `properties` | Le bien : caractéristiques, adresse géolocalisée, DPE, lien estimation | `profiles` (owner) |
| `listings` | L'annonce publiée d'un bien : description, prix affiché, statut, dates | `properties` |
| `photos` | Photos d'un bien, ordre, variante principale | `properties` |
| `plans` | Formules : Autonomie, Accompagné, Sérénité, prix, contenu | |
| `subscriptions` | Formule active d'un vendeur, référence paiement Stripe | `profiles`, `plans` |
| `sale_steps` | Modèle d'étapes par formule (ordre, titre, déclencheur) | `plans` |
| `sale_progress` | Avancement réel d'un bien sur ses étapes, tâches, dates | `properties`, `sale_steps` |
| `conversations` / `messages` | Messagerie par annonce entre acquéreur et vendeur | `listings`, `profiles` |
| `contact_requests` | Première prise de contact avant ouverture de conversation | `listings`, `profiles` |
| `favorites` | Biens sauvegardés par un acquéreur | `listings`, `profiles` |
| `offers` | Offre d'achat structurée, statut, synthèse IA | `listings`, `buyer_profiles` |
| `visit_slots` / `visits` | Créneaux ouverts par le vendeur, réservations sur invitation | `properties`, `profiles` |
| `documents` | Fichiers du dossier de vente, type, partage, extraction IA | `properties` |
| `document_shares` | Partage sélectif d'un document à un acquéreur | `documents`, `profiles` |
| `alerts` | Critères de recherche sauvegardés pour notification | `profiles` |
| `cases` | Dossiers d'accompagnement Leenkey (issus de l'assistant ou d'une formule) | `profiles`, `properties` |
| `ai_conversations` / `ai_messages` | Historique de l'assistant par utilisateur et par bien | `profiles`, `properties` |
| `knowledge_base` | Fiches de la base de connaissances, avec embeddings (pgvector) | |
| `notifications` | File de notifications in-app et email | `profiles` |
| `reports` | Signalements de conversations | `conversations` |
| `audit_log` | Qui a fait quoi sur quoi (validation, refus, suspension) | |

Règles de statut à figer :
- `listings.status` : `draft → pending → published → paused → sold → rejected`
- `offers.status` : `draft → submitted → viewed → accepted → declined → expired`
- `visits.status` : `requested → confirmed → done → cancelled`
- `cases.status` : `new → in_progress → closed`
- `buyer_profiles.financing_status` : `not_provided → declared → document_uploaded → validated`

### Permissions (RLS Supabase)
À écrire table par table, testées avec trois utilisateurs de test (vendeur A, vendeur B, acquéreur C) et un admin :
- Un vendeur lit et modifie ses biens, ses annonces, ses documents, ses étapes.
- Une annonce `published` est lisible par tous ; `draft`, `pending`, `rejected` uniquement par son propriétaire et l'admin.
- Un acquéreur lit une conversation seulement s'il en est participant.
- Un document n'est lisible par un acquéreur que s'il existe une ligne `document_shares` pour lui.
- Un créneau de visite n'est réservable que si l'acquéreur a été invité par le vendeur.
- Une offre est lisible par son auteur, le vendeur du bien et l'admin.
- L'admin lit tout, modère, mais ne modifie pas les messages.
- Les Storage buckets (`photos`, `documents`) ont les mêmes règles que les tables qu'ils servent.

### Livrable semaine 1
- Schéma en migrations SQL dans le repo, RLS écrites et testées.
- Design system : tokens (couleurs Leenkey existantes), composants de base (bouton, champ, carte de bien, badge de statut, modale, toast, état vide). shadcn/ui comme base.
- Maquettes basse fidélité des parcours vendeur et acquéreur (mobile d'abord), validées avec Cédric au point hebdo.
- Squelette Next.js : layout public, layout `app` (connecté), layout `admin`, middleware d'auth.

---

## 3. Semaines 2 à 4 : Socle (lot 1, partie 1)

### Semaine 2 : Comptes, bien, annonce
- Auth email + mot de passe (Supabase Auth), pages inscription / connexion / mot de passe oublié, emails Resend.
- Onboarding : choix vendeur ou acquéreur (un compte peut être les deux), profil acquéreur avec projet et financement déclaratif.
- Fiche du bien : formulaire en étapes (type, adresse avec géocodage Mapbox, surface, pièces, DPE, caractéristiques), reprise automatique depuis l'estimateur existant.
- Upload photos : redimensionnement côté serveur (sharp), 15 max, réordonnancement, photo principale.
- Annonce : description (champ libre pour l'instant, l'IA arrive en semaine 5), prix, prévisualisation, envoi en validation.
- **Démo vendredi** : créer un compte, saisir un bien, envoyer l'annonce en validation.

### Semaine 3 : Recherche, page annonce, back office minimum
- Page recherche : liste + carte Mapbox, filtres combinables (ville / rayon, type, budget, surface, pièces, chambres, extérieur, DPE, étage / ascenseur), tri, filtres dans l'URL.
- Page annonce publique : galerie, caractéristiques, carte, bouton contact (compte acquéreur requis), favoris. Données structurées schema.org, métadonnées, sitemap.
- Back office v0 : liste des annonces `pending`, aperçu, valider / refuser avec motif (email au vendeur), suspendre.
- Formulaire de contact acquéreur → création d'une `contact_request` → email au vendeur.
- **Démo vendredi** : Cédric valide une annonce depuis le back office, elle apparaît dans la recherche, un acquéreur la contacte.

### Semaine 4 : Messagerie, dashboard vendeur, moteur d'étapes
- Messagerie : conversation par annonce, liste des conversations, envoi de messages, Supabase Realtime pour l'affichage, notification email sur nouveau message (regroupée si plusieurs en 10 min), signalement.
- Moteur d'étapes : `sale_steps` chargées depuis le tableau validé au kick-off, `sale_progress` créé à la publication, tâches, déclencheurs (annonce validée, premier contact, première visite, offre reçue), notifications in-app et email.
- Dashboard vendeur : étape en cours, prochaines actions, indicateurs (vues, contacts, conversations), liste des biens.
- Espace acquéreur : favoris, mes demandes de contact, mes conversations.
- **Démo vendredi** : parcours complet vendeur → acquéreur → conversation, avec le dashboard qui avance.

---

## 4. Semaine 5 : Paiement, assistant IA, back office (lot 1, partie 2)

### Stripe
- Produits et prix créés dans Stripe (Accompagné 990 €, Sérénité 1 500 €), Checkout Session, webhook `checkout.session.completed` → `subscriptions` + création d'un `case` + activation des étapes de la formule.
- Upgrade Accompagné → Sérénité par paiement de la différence.
- Page « Ma formule » dans l'espace vendeur. Reçus Stripe automatiques.
- Test complet en mode test avec cartes de test, puis passage en live à la mise en production.

### Assistant IA (v1 vendeur + back office)
- Base de connaissances : import des fiches, embeddings via pgvector, recherche sémantique.
- Assistant dans l'espace vendeur, avec outils (tool use) : `get_my_properties`, `update_listing_description`, `get_sale_progress`, `create_case` (passage à l'humain), `search_knowledge`.
- Prompt système : rôle, périmètre (pas d'avis juridique ou fiscal engageant), ton Leenkey, renvoi vers Cédric.
- Toute action de modification passe par une confirmation dans l'interface avant exécution.
- Quota : N messages par jour par utilisateur, compteur dans `profiles`.
- Réponses suggérées dans la messagerie : bouton « Suggérer une réponse », validation avant envoi.
- Assistant back office : résumé du jour (annonces à valider, dossiers, offres), synthèse d'un dossier.

### Back office complet
- Dashboard : biens par statut, inscriptions, formules vendues, dossiers ouverts, sur 30 jours.
- Utilisateurs : fiche, formule, dossiers, suspension.
- Dossiers (`cases`) : statut, notes internes, résumé IA, historique.
- Signalements, exports CSV.
- Notifications email à Cédric : annonce à valider, nouveau dossier.

### Livraison lot 1 (vendredi semaine 5)
- Déploiement sur une URL de recette (`staging.leenkey.fr` ou preview Vercel figée).
- Mail de livraison à Cédric : périmètre livré, URL, comptes de test, rappel des 5 jours ouvrés de recette. Ce mail vaut livraison contractuelle.
- **Facturation du versement de 30 %.**

---

## 5. Semaines 6 et 7 : Qualification et offres d'achat (lot 2)

### Semaine 6
- Recette lot 1 en parallèle : corrections dans un tableau partagé (anomalie / écart / hors périmètre), Cédric qualifie, tu tranches.
- Offre d'achat : formulaire prérempli (prix, apport, prêt, conditions suspensives, durée de validité, infos acquéreur), génération d'un PDF récapitulatif, soumission au vendeur, historique par bien.
- Statuts et notifications : offre soumise → vendeur notifié ; acceptée / déclinée → acquéreur notifié ; expiration automatique.

### Semaine 7
- Synthèse IA de l'offre pour le vendeur : écart au prix affiché, cohérence financement / prix, conditions suspensives, points de vigilance. Générée à la soumission, stockée dans `offers`.
- Qualification acquéreur : `financing_status`, upload d'un accord de principe dans un bucket privé, affichage du statut factuel au vendeur dans les contacts et les offres.
- Assistant côté acquéreur : recherche en langage naturel (outil `search_listings` qui traduit en filtres), résumé d'un bien, aide à remplir le profil financement et l'offre.
- **Livraison lot 2 (vendredi semaine 7).**

---

## 6. Semaines 8 et 9 : Visites, documents, base acheteur (lot 3)

### Semaine 8
- Agenda vendeur : créneaux de disponibilité (récurrents ou ponctuels), invitation d'un acquéreur depuis une conversation ou une offre, réservation par l'acquéreur invité uniquement, confirmation, rappels email J-1, retour de visite (formulaire court des deux côtés).
- Espace documents : upload par type (diagnostics, titre, taxe foncière, PV d'AG, règlement de copro, factures), classement, checklist du dossier notaire par formule, partage sélectif (`document_shares`) à un acquéreur qualifié.

### Semaine 9
- Analyse IA des documents : extraction du texte (PDF natif ; OCR seulement si nécessaire), analyse par type de document avec un prompt dédié (diagnostic : DPE, risques ; PV d'AG : travaux votés, procédures, charges ; règlement : restrictions d'usage), résumé simple pour le vendeur et version acquéreur sur les documents partagés. Mention « aide à la lecture, ne remplace pas le diagnostiqueur ni le notaire ».
- Alertes acheteur : critères sauvegardés depuis la recherche ou l'assistant, job quotidien (cron Vercel) qui envoie les nouveaux biens correspondants, plus notification des acquéreurs non retenus sur un bien vendu.
- **Livraison lot 3 (vendredi semaine 9).**

---

## 7. Semaine 10 : Recette globale et mise en production

- Recette complète avec les 5 biens de test et des comptes réels de Cédric.
- Passage des services en production : Stripe live, Supabase (rester en gratuit, planifier le passage Pro au premier client payant), domaine `leenkey.fr` sur le nouveau projet Vercel, redirections des anciennes URL.
- Sécurité : revue des RLS avec les trois utilisateurs de test, rate limiting sur les formulaires publics et l'assistant, en-têtes de sécurité, vérification qu'aucun secret n'est exposé côté client.
- Sauvegardes : GitHub Action nocturne de `pg_dump` vers un stockage privé (le plan gratuit Supabase n'en fait pas), ping quotidien pour éviter la mise en pause.
- Monitoring : Vercel Analytics, alertes erreurs (Sentry gratuit ou logs Vercel), tableau de bord des coûts API.
- Guide back office : 4 à 6 pages avec captures, remis en PDF.
- Mise en production, mail de PV de livraison, **facturation du solde de 20 %.**
- Ouverture de la période de garantie : 30 jours anomalies, 60 jours bugs majeurs. Un canal unique pour les remontées (email dédié ou formulaire), pas de WhatsApp.

---

## 8. Ordre de construction avec Claude Code

Pour chaque fonctionnalité, même séquence :
1. Migration SQL + RLS + test des permissions.
2. Types TypeScript générés depuis Supabase.
3. Server actions / route handlers.
4. Composants UI à partir du design system.
5. Emails et notifications.
6. Test manuel sur preview Vercel, capture pour la démo.

Ce qui se fait en premier dans la semaine : ce dont le reste dépend (tables, permissions). Ce qui se fait en dernier : les écrans de confort.

---

## 9. Rituel hebdomadaire

- **Lundi** : plan de la semaine dans `PLANNING.md` (3 à 5 objectifs démontrables).
- **En continu** : PR par fonctionnalité, preview Vercel, note dans le changelog.
- **Vendredi** : démo à Cédric sur la preview, décisions notées dans `DECISIONS.md` (date, question, décision, qui). Les demandes hors périmètre vont dans `BACKLOG-V3.md` avec une réponse claire : « noté pour la V3 ».
- **Après le point** : mail de 5 lignes à Cédric : fait, en cours, ce que j'attends de toi, prochaine démo.

---

## 10. Risques et parades

| Risque | Parade |
|---|---|
| Contenus Cédric en retard (formules, FAQ, modèle d'offre) | Bloquer au kick-off, rappeler que le retard décale d'autant (contrat art. 8). Développer avec des contenus placeholder clairement marqués. |
| Permissions mal conçues, fuite de données entre vendeurs | Semaine 1 sanctuarisée, tests RLS avec trois utilisateurs avant chaque livraison. |
| Assistant IA qui « invente » | Réponses ancrées sur la base de connaissances, refus explicite hors périmètre, journalisation des conversations pour relecture. |
| Coûts API qui dérivent | Quota par utilisateur, modèle léger pour les tâches simples, modèle plus capable uniquement pour l'analyse de documents et les synthèses d'offre. |
| Dérive de périmètre | `BACKLOG-V3.md`, réponse standard, contrat art. 6B. |
| Ton temps (job + projet) | Objectifs démontrables par semaine, pas de perfection sur les écrans de confort, le vendredi tranche. |
| Bugs post-prod dans les 60 jours | Canal unique, qualification bug majeur / mineur / évolution à chaque remontée, réponse écrite. |

---

## 11. Après la V2

- Semaine 11 : bilan avec Cédric, proposition maintenance si non signée, présentation du `BACKLOG-V3.md` chiffré.
- Extraction des briques génériques (moteur d'étapes, documents + analyse IA, agenda, assistant avec outils) vers ton socle réutilisable, en version réécrite et propre, pour meykeet et les clients suivants.
- Devis acquisition (SEO local sur l'estimateur, campagne, contenus) : c'est ce qui fera vivre la plateforme, et ta prestation suivante.
