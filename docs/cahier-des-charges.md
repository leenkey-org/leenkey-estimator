# Leenkey V2 : Plateforme complète
## Cahier des charges et proposition

**Client :** Cédric, Leenkey
**Prestataire :** Nebula Creativ, Younes Amhil
**Date :** 16 septembre 2026
**Version :** 4.0

---

## 1. Vision

Leenkey devient une plateforme immobilière où chaque annonce est complète, chaque acheteur est identifié et qualifié, et chaque vente est accompagnée. Les annonces sont publiées exclusivement sur Leenkey. La plateforme s'adresse à deux publics : le propriétaire vendeur, qui achète une formule, et l'acquéreur, qui accède gratuitement aux biens en échange d'un profil renseigné.

L'outil d'estimation existant devient l'entrée du parcours vendeur : estimation → compte → publication du bien.

## 2. Conception et design (inclus dans le lot 1)

- Maquettes d'environ 25 écrans couvrant les deux parcours (vendeur et acquéreur) : compte, bien, annonce, recherche, messagerie, dashboard, documents, offres, visites, back office.
- Approche mobile-first : chaque écran conçu pour le téléphone, puis adapté tablette et desktop.
- Design system : composants réutilisables (cartes de bien, statuts, formulaires, notifications), états vides, erreurs et chargements.
- Identité Leenkey étendue du site à l'application.
- Architecture conçue en semaine 1 : modèle de données relationnel (dix entités liées), permissions codées en base, moteur d'étapes et de notifications.

## 3. Périmètre par lot

### Lot 1 · Socle plateforme

**Espace client (vendeur et acquéreur)**
- Inscription / connexion par email + mot de passe.
- Un seul compte, deux rôles possibles : vendeur (mes biens, ma formule, mes documents) et acquéreur (mon profil, mes biens sauvegardés, mes demandes).
- Profil acquéreur à l'inscription : situation, type de projet, état du financement (déclaratif).
- Paramètres du compte, notifications.

**Gestion du bien et publication de l'annonce**
- Fiche du bien centralisée : type, adresse géolocalisée, surface, pièces, DPE, caractéristiques, prix, photos (jusqu'à 15, redimensionnées).
- Reprise automatique des données de l'estimation.
- Rédaction et optimisation de l'annonce assistées par l'IA.
- Prévisualisation, publication après validation Leenkey, modification, pause, « vendu ».
- Statuts : brouillon → en attente → publiée → suspendue / vendue.

**Consultation des annonces**
- Recherche liste + carte, filtres combinables (localisation ville / rayon, type de bien, budget min / max, surface, nombre de pièces, chambres, extérieur, DPE, étage / ascenseur), tri par prix, date, surface ; filtres conservés dans l'URL pour partage et SEO.
- Pages annonces indexables (SEO, données structurées).
- Compte acquéreur requis pour contacter, sauvegarder ou demander une visite.

**Messagerie interne**
- Conversation par annonce entre acquéreur et vendeur, historique, notifications email.
- Réponses suggérées par l'IA, envoyées après validation du vendeur.
- Signalement d'une conversation.

**Dashboard vendeur**
- Avancement de la vente par étapes selon la formule (préparation, publication, contacts, visites, offre, compromis, signature), prochaines étapes et tâches.
- Indicateurs : vues, contacts, conversations en cours.
- Notifications.

**Paiement Stripe**
- Formules telles que présentées sur leenkey.fr : Autonomie (gratuite), Accompagné (990 € TTC), Sérénité (1 500 € TTC), paiement unique par carte.
- Activation automatique de la formule et création du dossier de suivi dans le back office.
- Passage à la formule supérieure par paiement de la différence.

**Assistant IA**
Disponible en conversation dans l'espace vendeur, l'espace acquéreur et le back office. Il agit sur les données de la plateforme ; toute action qui engage un utilisateur est soumise à validation.
- Côté vendeur : rédige, améliore et modifie l'annonce à la demande ; conseille sur le prix (à partir de l'estimation), les photos et les éléments manquants avant publication ; suit le dossier (étapes à venir, documents à fournir, relances) ; analyse les contacts reçus et les offres (écart au prix, financement, conditions) ; prépare les réponses aux acquéreurs, validées avant envoi ; prépare la checklist du dossier notaire.
- Côté acquéreur : recherche en langage naturel avec application automatique des filtres, création d'alertes ; résumé d'un bien et de ses documents partagés ; préparation de visite (questions, points à vérifier) ; aide à structurer le financement et à préremplir l'offre d'achat.
- Côté Leenkey (back office) : résumé du jour (annonces à valider, dossiers en attente, offres, visites) ; pré-analyse d'une annonce avant validation ; synthèse d'un dossier avant un appel ; rédaction des messages de refus, relance et suivi.
- Actions déclenchables depuis la conversation en V2 : modifier l'annonce, créer une alerte, proposer un créneau de visite, ouvrir un dossier d'accompagnement, préremplir une offre. Toute action est confirmée par l'utilisateur avant exécution.
- Mémoire par dossier : l'assistant connaît l'historique du bien, des échanges et des documents.
- Base de connaissances Leenkey fournie par Cédric au démarrage : son expertise répond, pas un contenu générique.
- Passage à l'humain : création d'un dossier dans le back office avec résumé de la conversation ; clients Accompagné et Sérénité en priorité.
- Cadre : pas d'avis juridique ou fiscal engageant, renvoi vers Cédric sur les sujets sensibles ; quota d'utilisation par utilisateur.

**Back office Leenkey**
- Tableau de bord : biens par statut, inscriptions, formules vendues, dossiers ouverts.
- Biens et annonces : validation, refus motivé, suspension, édition.
- Utilisateurs : fiche, formule, dossiers, suspension.
- Dossiers d'accompagnement : statut, notes, historique, résumé IA.
- Signalements, exports CSV.
- Notification email à Cédric à chaque annonce à valider et nouveau dossier.

**Transversal** : emails transactionnels, pages légales (textes fournis), cookies, responsive.

### Lot 2 · Qualification et offres d'achat

**Offre d'achat structurée**
- Formulaire prérempli généré par Leenkey : prix, apport, prêt, conditions suspensives, durée de validité, informations acquéreur. Modèle et mentions fournis par Cédric.
- Soumission au vendeur, historique des offres par bien.
- Synthèse pour le vendeur : écart au prix affiché, état du financement, points de vigilance avant décision.

**Qualification acquéreur**
- Statut factuel visible par le vendeur : financement validé / en cours / non renseigné, justificatif déposé ou non.
- Dépôt de justificatif (accord de principe bancaire) dans l'espace acquéreur.

### Lot 3 · Visites, documents, base acheteur

**Agenda et visites**
- Créneaux de disponibilité définis par le vendeur.
- Demande de visite par l'acquéreur, validation par le vendeur ; la réservation d'un créneau n'est ouverte qu'aux acquéreurs invités.
- Suivi des visites, rappels, recueil des retours de visite.

**Espace documents et dossier de vente**
- Dépôt et classement : diagnostics, titre de propriété, taxe foncière, PV d'AG, règlement de copropriété, factures.
- Partage sélectif de documents aux acquéreurs qualifiés.
- Checklist du dossier notaire et suivi.

**Analyse des documents par IA**
- Extraction des informations clés (DPE, charges, procédures en cours, travaux votés, servitudes), points de vigilance, résumé en langage simple pour le vendeur et pour l'acquéreur.
- Aide à la lecture : ne remplace pas le diagnostiqueur ni le notaire, mention affichée.

**Alertes acheteur**
- Alertes par critères et notification des acquéreurs non retenus lors de la publication de nouveaux biens.

### Lot 4 · Option recommandée

**Signature électronique** via Yousign : offres d'achat et mandats signés depuis la plateforme, valeur légale eIDAS. Abonnement Yousign à la charge du client.

## 4. Hors périmètre

- Diffusion des annonces sur des portails externes (choix stratégique : exclusivité Leenkey).
- Application mobile native, multi-langue, import depuis un logiciel métier.
- Édition de la base de connaissances IA depuis le back office (V3).
- Services additionnels vendus à l'unité, portail client Stripe (V3).

## 5. Socle technique

Next.js (existant), hébergé sur le Vercel Pro de Nebula Creativ (inclus dans la maintenance) ; Supabase (base, auth, stockage) sur un compte au nom de Leenkey, plan gratuit puis Pro au premier client payant ; Stripe ; Anthropic API ; Resend ; Mapbox. Code sur le GitHub du client (plan gratuit). Supabase, Stripe et GitHub au nom de Leenkey. Réversibilité : sur demande, livraison du code et de la procédure de déploiement.

## 6. Ce que le client fournit

- Textes légaux, CGV des formules, contenu détaillé de chaque formule.
- Base de connaissances de l'assistant (FAQ vendeur, étapes de la vente), session commune au kick-off.
- Modèle d'offre d'achat et mentions à y faire figurer.
- Liste des étapes de vente par formule pour le dashboard.
- Accès aux comptes tiers, annonces de test avec photos.
- Recette sous 5 jours ouvrés après chaque livraison.

## 7. Planning : 10 semaines

| Semaine | Contenu |
|---|---|
| 1 | Kick-off, modèle de données, permissions, session base de connaissances |
| 2–3 | Espace client, fiche du bien, annonce, recherche, SEO |
| 4 | Messagerie interne, dashboard vendeur |
| 5 | Stripe, assistant IA, back office → livraison test lot 1 |
| 6 | Recette lot 1, offre d'achat |
| 7 | Qualification acquéreur, corrections → livraison test lot 2 |
| 8 | Agenda et visites, espace documents |
| 9 | Analyse IA des documents, alertes acheteur → livraison test lot 3 |
| 10 | Recette globale, corrections, mise en production |

Tout retard de recette ou de fourniture de contenu côté client décale d'autant.

**Suivi du projet** : chef de produit et développeur dédiés au projet pendant les 10 semaines ; un point hebdomadaire (avancées, démonstration de ce qui est livré, arbitrages).

## 8. Budget

| Lot | HT | TTC |
|---|---|---|
| Lot 1 · Socle plateforme | 10 000 € | 12 000 € |
| Lot 2 · Qualification et offres d'achat | 3 585 € | 4 302 € |
| Lot 3 · Visites, documents, analyse IA, alertes acheteur | 5 500 € | 6 600 € |
| Sous-total | 19 085 € | 22 902 € |
| Remise partenaire, engagement sur les 3 lots | − 4 920 € | − 5 904 € |
| **Total** | **14 165 €** | **16 998 €** |
| Option recommandée : Signature électronique Yousign | 1 500 € | 1 800 € |

Conditions : 50 % à la commande (7 082,50 € HT / 8 499 € TTC), 30 % à 5 semaines à la livraison du lot 1 (4 249,50 € HT / 5 099,40 € TTC), 20 % à la mise en production (2 833 € HT / 3 399,60 € TTC). Périmètre figé : toute demande hors du présent document est chiffrée séparément.

À titre de comparaison, un périmètre équivalent en agence web se situe entre 45 000 et 60 000 € HT (TJM 600 à 800 €, cadrage et gestion de projet inclus).

## 9. Hébergement et maintenance (option recommandée)

200 € HT / 240 € TTC par mois, engagement 6 mois : hébergement Vercel Pro pris en charge par Nebula Creativ, correction des bugs, audits réguliers (sécurité, performance, SEO), mises à jour et surveillance, sauvegardes, ajustement de l'assistant IA.


## 10. Coûts récurrents à la charge du client (indicatifs)

| Service | Coût |
|---|---|
| Hébergement Vercel Pro | inclus dans la maintenance |
| Supabase | gratuit, puis ~25 $/mois au premier client payant |
| GitHub | gratuit |
| Resend | gratuit jusqu'à 3 000 emails/mois, puis ~20 $/mois |
| Anthropic API | 20 à 100 €/mois selon usage |
| Mapbox | gratuit jusqu'à 50 000 chargements/mois |
| Stripe | 1,5 % + 0,25 € par transaction |
| Yousign (option recommandée) | ~35 à 80 €/mois selon plan |

Aucun frais fixe fournisseur au lancement hors maintenance. Ensuite 25 $/mois de Supabase et l'API IA selon l'évolution de l'activité (utilisateurs actifs, documents analysés, transactions). Tarifs constatés à ce jour.

## 11. Garantie

Correction des anomalies du périmètre livré pendant 30 jours après mise en production.
