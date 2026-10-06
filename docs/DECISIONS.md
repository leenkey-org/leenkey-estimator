# DECISIONS

Journal des décisions client. Format : date · question · décision · qui. Les questions ouvertes sont en bas.

## Décisions reçues

| Date | Sujet | Décision | Qui |
|---|---|---|---|
| 2026-10-01 | Rattachement de la formule | Par bien, pas par compte. Garder la possibilité technique d'une remise multi-biens ou d'une formule investisseur (`plans.scope`, `subscriptions.discount_cents`, codes promo Stripe, droits via `plan_entitlements`). | Cédric |
| 2026-10-01 | Modification d'une annonce publiée | Elle reste en ligne. Historique des modifications importantes, notamment du prix (`listing_revisions`), contrôle a posteriori par l'admin. | Cédric |
| 2026-10-01 | Contre-offre | Négociation par la messagerie en V2. Historique complet des offres conservé dans le dossier du bien. | Cédric |
| 2026-10-01 | Délai de relecture des annonces | 24 h, même non ouvrées. | Cédric |
| 2026-10-01 | Délai de contact après achat d'une formule | 24 h, même non ouvrées. | Cédric |
| 2026-10-01 | Financement des acquéreurs | Jamais « validé ». Statuts : non renseigné → informations déclarées → justificatif fourni → justificatif vérifié. Justificatifs : accord de principe, attestation de courtier, simulation ou offre bancaire nominative de moins de 3 mois environ, preuve de fonds propres. Vérification manuelle par l'admin. Mention obligatoire : Leenkey vérifie la présence et la cohérence apparente des justificatifs, sans garantir le financement ni la solvabilité. | Cédric |
| 2026-10-01 | Validité d'une offre | 5 jours par défaut, de 2 à 10 jours. | Cédric |
| 2026-10-01 | Frais d'acquisition | Estimation indicative (environ 7,5 % dans l'ancien, logique différente pour le neuf), utilisée pour un budget global estimé, jamais pour déclarer que l'acquéreur « peut financer ». | Cédric |
| 2026-10-01 | Zone de lancement | Rayon d'environ 10 km autour d'Épinay-sur-Orge, zones 1 et 2 (SPEC-V2 section 20). | Cédric |
| 2026-10-01 | Emails | Utilisateurs : bonjour@leenkey.fr. Notifications internes : admin@leenkey.fr. | Cédric |
| 2026-10-01 | Formules | Nouvelle structure Autonomie / Accompagné / Sérénité, règle freemium, déclencheurs de montée en gamme contextuels, upgrade Accompagné → Sérénité à 510 € (SPEC-V2 section 11 bis). | Cédric |
| 2026-10-01 | Étapes de vente | Six étapes avec contenu par formule (SPEC-V2 section 9). | Cédric |
| 2026-10-01 | FAQ et règles de l'assistant | FAQ V2 (`supabase/seed/knowledge/faq-cedric-v2.md`) et règles impératives (SPEC-V2 section 12). | Cédric |
| 2026-10-01 | Retrait d'une offre | Trois états : envoyée (retrait possible, horodaté), acceptée (pas de bouton, orientation vers vendeur et notaire), avant-contrat signé (délai légal à partir de la date juridiquement pertinente uniquement) (SPEC-V2 section 13). | Cédric |
| 2026-10-01 | Conversation conseiller | Ajout d'une conversation vendeur ↔ équipe Leenkey dans la messagerie pour Accompagné et Sérénité (SPEC-V2 sections 4 et 8.6). | Younes |
| 2026-10-05 | Modèle d'offre d'achat | Modèle complet en 7 sections (acquéreur et co-acquéreurs, bien prérempli, prix en chiffres et en lettres, financement déclaré et situation, conditions par cases + précisions, validité, déclarations obligatoires), relecture puis envoi, textes repris mot pour mot (SPEC-V2 section 13). | Cédric |
| 2026-10-05 | Offre et qualification séparées | L'offre est un document, la qualification une analyse Leenkey. Le PDF ne contient jamais de statut de qualification ni l'écart au prix ; le tableau de bord vendeur les affiche. | Cédric |
| 2026-10-05 | Réception par le vendeur | Carte « Nouvelle offre reçue » dans le tableau de bord plutôt qu'un PDF. Actions : accepter, refuser, discuter (messagerie). Contre-offre structurée en V3. | Cédric |
| 2026-10-05 | Acceptation | Écran intermédiaire avec récapitulatif, mise en garde et case obligatoire avant « Confirmer mon acceptation ». | Cédric |
| 2026-10-05 | Traçabilité | Offre figée après envoi, jamais modifiée rétroactivement ; correction = nouvelle version. Gel garanti en base par trigger. | Cédric (gel en base : Younes) |
| 2026-10-05 | Statuts | Brouillon → Envoyée → Consultée → Acceptée / Refusée / Expirée / Retirée. Contre-offre en V3. | Cédric |
| 2026-10-05 | Analyse Leenkey de l'offre | Produite par gabarits en code, sans IA. Explication IA disponible à la demande (« Expliquer cette offre »). | Younes |
| 2026-10-05 | Mode de financement | Deux choix seulement : avec ou sans recours à un prêt immobilier. Si prêt : apport et montant prévisionnel du prêt. Pas de « financement mixte ». | Cédric |
| 2026-10-05 | Conditions de l'offre | La mention avec ou sans prêt est reprise automatiquement de la section financement. | Cédric |
| 2026-10-05 | Données personnelles de l'acquéreur | Avant acceptation, le vendeur voit nom, prénom et ville ; date de naissance, adresse, téléphone et e-mail après acceptation. | Cédric |
| 2026-10-05 | Acquisition via SCI | Dénomination, SCI constituée ou en cours de constitution, SIREN (obligatoire seulement si constituée), adresse du siège social, représentant. | Cédric |
| 2026-10-05 | Libellé du contrôle du justificatif | « Contrôlé par Leenkey le JJ/MM/AAAA » (badge « Justificatif vérifié » inchangé). | Cédric |
| 2026-10-05 | Stack | Nouveau projet Next.js 15 dans le repo existant. La V1 (Vite + TanStack Router) n'est pas en Next.js, contrairement au cahier des charges §5 ; la reprise de l'estimateur, des 4 endpoints (en route handlers, mêmes chemins), de GA4, GTM, Vercel Analytics, des redirections et des pages marketing fait partie de L1-01, précédée de tests de non-régression sur `estimation.ts` (≥ 20 cas réels). | Younes |
| 2026-10-05 | Branches et préprod | `v2` sert de staging (une branche par tâche, PR vers `v2`). Préprod sur `leenkey-v2.vercel.app` : `noindex`, bandeau « Environnement de test », mot de passe dans le middleware (`PREPROD_USER`, `PREPROD_PASSWORD`), pas l'option payante de Vercel. Tests manuels sur la préprod après fusion, pas sur les previews. `main` reste le site en ligne. | Younes |
| 2026-10-05 | Ordre de priorité des documents | Fonctionnel : DECISIONS > SPEC-V2 > CLAUDE. Technique et sécurité : CLAUDE l'emporte. Cahier des charges et plan de mise en œuvre : vérification du périmètre contractuel uniquement. Garantie : le contrat fait foi (60 jours bugs majeurs, 30 jours anomalies mineures). | Younes |
| 2026-10-05 | Périmètre conservé | Co-acquéreurs et SCI, `listing_revisions` simplifié (historique des champs prix, titre, description), export RGPD (L2-10), déclencheurs de montée en gamme (L2-09). | Younes |
| 2026-10-05 | Périmètre simplifié | Conversation conseiller = `kind = 'advisor'` sur la messagerie existante, en fin de lot 1 (L1-34). Visites : créneaux ponctuels seulement. | Younes |
| 2026-10-05 | Reporté en V3 | Pages SEO par ville (ex-L1-20), bouton « Expliquer cette offre », séries de créneaux (`BACKLOG-V3.md`). | Younes |
| 2026-10-05 | Statut `suspended` | Ajouté à `listing_status`. Posé et levé uniquement par l'admin (`listing_suspend` / `listing_unsuspend`, motif obligatoire) ; le vendeur ne peut pas en sortir. Conforme au cahier (« publiée → suspendue / vendue »). | Younes |
| 2026-10-05 | `create_case` | Fonction SQL `security definer`, jamais la clé service role. | Younes |
| 2026-10-05 | Rôles | `profiles.roles user_role[]` ; admin = `'admin' = any(roles)` (fonction `is_admin()`). | Younes |
| 2026-10-05 | Enums et crons | Liste de référence des enums : SPEC §4. Crons : SPEC §19. CLAUDE.md renvoie à ces sections. | Younes |
| 2026-10-05 | Justificatifs de financement | Table `financing_documents` créée en L2-02 ; `offers.financing_document_id` et `buyer_profiles.current_financing_document_id` y font référence. | Younes |
| 2026-10-05 | PDF d'offre | Bucket privé `offers`. | Younes |
| 2026-10-05 | Quotas IA | Dans `core/ai/quotas.ts`, par rôle (acquéreur 20, vendeur 30, vendeur avec au moins un bien sous formule payante 100, admin illimité ; valeurs provisoires). `plans.ai_daily_quota` supprimé. | Younes |
| 2026-10-05 | Outil `propose_visit_slot` | Ajouté à SPEC §12 (lot 3, L3-02), exigé par le cahier des charges. | Younes |
| 2026-10-05 | Comptes de seed | Cinq comptes partout : `seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin`. | Younes |
| 2026-10-05 | Modèles IA | Vérifiés sur platform.claude.com : `MODELS.smart = 'claude-sonnet-5-5'` (et non `claude-sonnet-5`, legacy), `MODELS.fast = 'claude-haiku-4-5-20251001'` (voir Q19). | Younes |
| 2026-10-05 | Règles éditoriales | Celles du site actuel s'appliquent à toute la V2 (CLAUDE.md §16) : « nous », « analyse de valeur » plutôt qu'« estimation » seul, lien de navigation « Valoriser mon bien », aucun pixel publicitaire, aucune mention « Prix ferme » (remplacée par « Sans commission d'agence » dans `PriceBlock` et la maquette AnnonceDesktop). | Younes |
| 2026-10-05 | Planning | Lot 1 rééquilibré sans toucher aux dates contractuelles. 18 décembre = livraison de la préprod validée ; bascule en production le lundi 4 janvier 2027 (à confirmer avec Cédric, Q17). | Younes |
| 2026-10-07 | Cadre juridique (loi Hoguet) | Cédric est agent immobilier, l'activité est couverte. Sujet clos. | Cédric |
| 2026-10-07 | Libellé « financement validé » du cahier des charges | Remplacé par « Justificatif vérifié » / « Contrôlé par Leenkey le … », confirmé par écrit à Cédric. | Younes |
| 2026-10-07 | Mise en production | Livraison de la préprod validée le 18 décembre (déclenche les 20 %), bascule en production le lundi 4 janvier, à confirmer par Cédric. | Younes |

## Questions ouvertes (valeur provisoire utilisée en attendant)

| # | Question | Valeur provisoire |
|---|---|---|
| Q1 | Résumé IA des documents : pour toutes les formules, ou réservé à Sérénité ? | Ouvert à tous ; Sérénité ajoute la revue humaine |
| Q2 | Seuils des déclencheurs de montée en gamme | < 3 contacts en 14 jours ; 5 contacts sans visite après 21 jours ; 3 visites sans offre ; ≥ 3 pièces manquantes après 30 jours |
| Q3 | Taux indicatif des frais d'acquisition dans le neuf | 2,5 % |
| Q4 | Limite de 3 mois : tous les justificatifs ou seulement les simulations ? | Avertissement pour tous les types |
| Q5 | Le vendeur voit-il le justificatif lui-même ou seulement son statut ? | Statut seulement |
| Q7 | Qui saisit la date de départ du délai de rétractation ? | Saisie possible par le vendeur et par l'admin |
| Q8 | Bilan de vente avec économie estimée face à une agence : V2 ou plus tard ? Taux de référence ? | Bilan sans économie estimée ; `sold_price_cents` stocké |
| Q9 | Les textes du modèle d'offre (encadré « Avant d'envoyer », mise en garde sur les conditions, écran d'acceptation) ont-ils été relus par la notaire ? | Textes de Cédric utilisés tels quels |
| Q10 | Textes légaux, adresse légale, biens de test | Pages « en cours de rédaction » en staging, `[ADRESSE LEENKEY]`, biens fictifs |
| Q15 | Offre sans visite préalable : autorisée sans restriction ? | Oui, mentionnée dans l'offre (prévu par le modèle de Cédric) |
| Q17 | Bascule en production le 4 janvier plutôt que le 18 décembre ? | 4 janvier (à confirmer par Cédric) |
| Q18 | Reformulations à la voix « nous » des phrases de Cédric (règle éditoriale du site). **Non appliquées** en attendant son accord : « Vous vendez. On vous accompagne à chaque étape. » → « Vous vendez. Nous vous accompagnons à chaque étape. » ; « On pilote avec vous jusqu'à la signature. » → « Nous pilotons avec vous jusqu'à la signature. » ; « C'est en ligne. On vous prévient au premier contact. » → « C'est en ligne. Nous vous prévenons au premier contact. » | Phrases d'origine conservées (SPEC §1, §6, §11 bis) |
| Q19 | Modèle IA rapide : Claude Haiku 4.5 est annoncé avec un retrait « pas avant le 15 octobre 2026 ». Le garder (moins cher) ou passer d'emblée sur `claude-sonnet-5-5` (2 fois plus cher en entrée et en sortie) ? | Haiku 4.5, surchargeable par `AI_MODEL_FAST` ; vérification des dépréciations avant la bascule (P-05) |
| Q20 | Point technique à trancher en L1-04 : la vue `public_listings` est déclarée `security_invoker = true`, donc soumise à la RLS de l'appelant. Un visiteur anonyme n'a aucun droit sur `properties` ni `profiles` : la vue ne lui renverrait rien. Options : vue sans `security_invoker` (droits du propriétaire, filtrage par statut dans la vue) ou fonction `security definer`. | Proposer la correction dans la PR L1-04, avec test anonyme |
| Q21 | Date de démarrage réelle : `PLANNING.md` reste calé sur le lundi 12 octobre 2026, seule date compatible avec les livraisons contractuelles (13 nov., 27 nov., 11 déc., 18 déc.). Tout démarrage plus tardif décale ces dates et demande un avenant. | 12 octobre 2026 |
| Q22 | **Urgent, site en ligne** : `api/estimate.ts` sur `main` appelle `claude-sonnet-4-5`, déprécié le 30 septembre 2026 et **retiré le 30 novembre 2026** (remplaçant recommandé : `claude-sonnet-5-5`). Sans correctif, l'analyse écrite de l'estimateur V1 tombera en erreur avant la bascule du 4 janvier. Le correctif doit aussi retirer `temperature: 0`, refusé (erreur 400) par les modèles 4.7 et suivants. Correctif `hotfix/estimate-model` vers `main` : sur go de Younes uniquement. | Aucun changement sur `main` sans go |
