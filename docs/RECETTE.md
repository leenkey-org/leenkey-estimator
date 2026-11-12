# RECETTE

Recette de Cédric sur la préprod (`leenkey-v2.vercel.app`) à chaque fin de lot. Claude Code complète ce fichier avec `/recette <lot>`.

## Accès

| | |
|---|---|
| URL | https://leenkey-v2.vercel.app |
| Identifiant et mot de passe de la préprod (`PREPROD_USER` / `PREPROD_PASSWORD`) | transmis séparément par Younes |
| Comptes de test | `seller_a@test.leenkey.fr`, `seller_b@test.leenkey.fr`, `buyer_c@test.leenkey.fr`, `buyer_d@test.leenkey.fr`, `admin@test.leenkey.fr` |
| Mot de passe des comptes | transmis séparément (`SEED_PASSWORD`) |
| Carte bancaire de test Stripe | 4242 4242 4242 4242, date future, CVC quelconque |
| Emails | tous redirigés vers la boîte de test, sujets préfixés `[PREPROD]` |

## Règles

- Un retour = une ligne dans le tableau du lot : écran, ce qui s'est passé, ce qui était attendu, capture.
- Classement : **bloquant** (empêche une étape de la vente), **majeur** (fonctionnalité incorrecte), **mineur** (texte, affichage).
- Le lot est validé quand il ne reste aucun bloquant ni majeur (contrat, article 6B : validation tacite après 5 jours ouvrés sans retour).

## Lot 1 · livraison prévue ven. 13 nov.

Recette de Cédric du 16 au 20 novembre. La pré-analyse des annonces, `/admin/assistant` et l'export CSV (L1-30d) arrivent avant cette semaine ; la carte avancée (L1-16b), l'historique des modifications d'une annonce (L1-35) et le résumé du jour (L1-30b) sont reportés au lot 2 (`docs/PLANNING.md`).

| # | Scénario | Compte | Attendu | OK |
|---|---|---|---|---|
| 1.1 | S'inscrire comme vendeur, créer un bien complet depuis le mobile (adresse, caractéristiques, DPE repris par son numéro, prix, description, photos), l'envoyer en validation | nouveau compte | Annonce « en attente », email reçu | ☐ |
| 1.2 | Valider l'annonce depuis le back office | admin | Annonce visible dans la recherche, email au vendeur | ☐ |
| 1.3 | Refuser une annonce avec un motif | admin | Motif visible par le vendeur, email reçu | ☐ |
| 1.4 | Chercher un appartement à Savigny-sur-Orge, filtrer, ouvrir l'annonce | visiteur | Filtres et carte cohérents ; mentions du DPE, sans adresse ni numéro du DPE | ☐ |
| 1.5 | Contacter le vendeur, échanger quelques messages | buyer_c / seller_a | Messages en temps réel, notification et email | ☐ |
| 1.6 | Répondre avec la suggestion de l'assistant | seller_a | Suggestion modifiable avant envoi | ☐ |
| 1.7 | Renseigner son projet et son financement | buyer_c | Le vendeur voit « Informations déclarées », jamais les montants | ☐ |
| 1.8 | Acheter Sérénité (carte de test), puis vérifier le dossier et la conversation conseiller | seller_a / admin | Formule active, email récapitulatif, dossier créé, échange conseiller possible | ☐ |
| 1.9 | Rester en Autonomie jusqu'à la publication | seller_b | Aucune étape bloquée ; conseiller grisé « Accessible avec la formule Accompagné » | ☐ |
| 1.10 | Modifier le prix d'une annonce publiée | seller_a / admin | Annonce toujours en ligne | ☐ |
| 1.11 | Essayer d'ouvrir le bien de seller_a avec seller_b | seller_b | Accès refusé | ☐ |
| 1.12 | Demander à l'assistant de modifier la description, puis d'écrire à l'équipe Leenkey | seller_b | Modification après confirmation ; demande reçue dans « Dossiers » et par email | ☐ |
| 1.13 | Renoncer à la formule pendant les 14 jours | seller_a | Accusé de réception, dossier « Rétractation » côté équipe | ☐ |
| 1.14 | Signaler une conversation, puis la traiter | buyer_c / admin | Signalement dans le back office, avertissement possible | ☐ |
| 1.15 | Suspendre puis rétablir un compte | admin | Email au compte, accès bloqué puis rendu | ☐ |

### Recette interne (Claude Code, L1-32, 2026-11-12)

Sur une pile locale fraîche (Supabase local, emails capturés, modèle de l'assistant et Stripe simulés), avec les comptes de seed.

| Contrôle | Résultat |
|---|---|
| Parcours obligatoires de la SPEC (section 22) 1 vendeur, 2 acquéreur, 3 paiement, 7 permissions (`tests/e2e/journeys-live.spec.ts`) | 4 verts, nouveaux comptes et nouvelle annonce à chaque passage. Parcours 7 : bien, étapes et conversation refusés à un autre vendeur et à l'acquéreur ; documents, offres et visites avec les lots 2 et 3 |
| Suite E2E complète (mobile, desktop, seed modifié) | 444 verts, 1 échec, 65 ignorés (passage complet du 2026-11-12 sur une pile neuve, avec les parcours obligatoires). L'échec : le focus du message « Votre nouvelle adresse email est enregistrée. » après la confirmation du second lien (`account-live.spec.ts`), non retrouvé sous la charge de la suite entière ; le fichier rejoué seul deux fois est vert. À surveiller : si le focus se perd en préprod, le message reste affiché mais n'est pas annoncé. |
| Accessibilité (axe, `npm run a11y`, mobile et desktop) | 63 écrans sans violation sérieuse ni critique |
| Lighthouse mobile (4G simulée) | Accessibilité 100. Bonnes pratiques 96 et SEO 69 en local seulement (script de Vercel Analytics absent, `noindex` hors production) : 100 attendus en production. Performance : LCP de 1,8 à 2,1 s en bridage réel après P-06 (objectif de moins de 2,5 s atteint), voir ci-dessous |
| Revue des permissions | Voir ci-dessous |

Lighthouse, page par page : mesure du 12 novembre, puis après P-06 (même jour, même pile locale, médiane de trois passages). Deux modes : **bridage réel** du navigateur (4G lente, 150 ms d'aller-retour, 1,6 Mbit/s, processeur ralenti quatre fois), le plus proche d'un téléphone ; **simulé** (mode par défaut de Lighthouse), qui ignore la priorité donnée à la photo principale et varie de 0,4 s d'un passage à l'autre.

| Page | LCP réel avant | LCP réel après P-06 | LCP simulé après | CLS | TBT réel après |
|---|---|---|---|---|---|
| Accueil | 2,1 s | 2,1 s | 3,5 s | 0 | 670 ms |
| Recherche | 2,8 s | **2,0 s** | 3,5 s | 0 | 480 ms |
| Annonce | 2,6 s | **2,0 s** | 3,5 s | 0 | 360 ms |
| Valoriser mon bien | 6,2 s | **1,8 s** | 4,4 s | 0 | 430 ms |
| Tarifs | 5,6 s | **1,8 s** | 0,8 s | 0 | 420 ms |

Objectif de la SPEC 21 (LCP sous 2,5 s sur la recherche et l'annonce, CLS sous 0,1) atteint en bridage réel ; le mode simulé reste au-dessus (3,5 s) : il compte comme concurrent de la photo tout ce que la page demande dans ses 200 premières millisecondes (environ 250 Ko de JavaScript, dont 100 Ko de React et Next). Ce qu'a changé P-06 (`DECISIONS.md` 2026-11-12) : le bandeau des cookies dans la page envoyée par le serveur ; les textes de l'interface découpés (200 Ko de JavaScript de moins sur chaque page) ; la première photo de la galerie de bureau plus téléchargée sur un téléphone ; la photo de l'accueil prioritaire ; les photos servies par `/img` sans redirection ; une seule police préchargée. À confirmer sur la production après la bascule (PageSpeed Insights, qui ne passe pas la protection de la préprod).

Revue des permissions (base locale et préprod, linter de sécurité de Supabase) :

- toutes les tables ont la RLS ; `rate_limits` et `stripe_events` n'ont aucune politique, à dessein (écrites seulement par des fonctions ou le webhook) ;
- aucune politique d'écriture ouverte (`using (true)` ou `with check (true)`), aucun droit d'écriture du rôle `anon` sur une table ;
- toutes les fonctions `security definer` ont un `search_path` fixé ; celles qu'un visiteur peut appeler sont les lectures publiques des annonces, la recherche, l'assistant du site (clé du serveur exigée), la limite de débit (clé du serveur), le compteur de vues et l'enregistrement d'une analyse de valeur ;
- **à noter** : ces deux dernières fonctions peuvent être appelées directement avec la clé publique, sans passer par les limites de débit du site : le nombre de vues d'une annonce peut être gonflé, et des analyses de valeur ajoutées en nombre (bornées en taille, purgées) ; risque faible, noté dans `docs/SECURITE.md` ;
- **à activer en production** : la protection contre les mots de passe divulgués de Supabase Auth (désactivée en préprod).

### Retours lot 1

| # | Écran | Constat | Attendu | Gravité | Corrigé |
|---|---|---|---|---|---|

## Lot 2 · livraison prévue ven. 27 nov.

| # | Scénario | Compte | Attendu | OK |
|---|---|---|---|---|
| 2.1 | Déposer un justificatif de financement | buyer_c | Statut « Justificatif fourni » | ☐ |
| 2.2 | Contrôler le justificatif | admin | « Contrôlé par Leenkey le … » côté vendeur | ☐ |
| 2.3 | Faire une offre avec prêt, en SCI en cours de constitution | buyer_c | Formulaire en 7 étapes, relecture, envoi ; PDF conforme au modèle | ☐ |
| 2.4 | Consulter l'offre reçue | seller_a | Carte « Nouvelle offre reçue », Analyse Leenkey, données personnelles masquées | ☐ |
| 2.5 | Accepter l'offre | seller_a | Écran intermédiaire, case obligatoire ; acquéreur notifié ; coordonnées visibles | ☐ |
| 2.6 | Retirer une offre envoyée, puis en refaire une | buyer_d | Retrait horodaté, nouvelle version, ancienne « remplacée » | ☐ |
| 2.7 | Laisser expirer une offre | buyer_d | « Offre expirée », plus de bouton Accepter | ☐ |
| 2.8 | Demander à l'assistant de chercher un bien en langage naturel | buyer_c | Filtres corrects | ☐ |

### Retours lot 2

| # | Écran | Constat | Attendu | Gravité | Corrigé |
|---|---|---|---|---|---|

## Lot 3 · livraison prévue ven. 11 déc.

| # | Scénario | Compte | Attendu | OK |
|---|---|---|---|---|
| 3.1 | Ouvrir des créneaux de visite et inviter un acquéreur | seller_a | Invitation dans la conversation | ☐ |
| 3.2 | Réserver un créneau | buyer_c | Confirmation, fichier calendrier, rappel la veille | ☐ |
| 3.3 | Réserver sans invitation | buyer_d | Refusé | ☐ |
| 3.4 | Déposer un PV d'AG et lire l'analyse | seller_a | Faits extraits, mention « aide à la lecture » | ☐ |
| 3.5 | Partager les documents avec un acquéreur | seller_a / buyer_c | Résumé acquéreur visible | ☐ |
| 3.6 | Créer une alerte et recevoir le digest | buyer_c | Email quotidien | ☐ |

### Retours lot 3

| # | Écran | Constat | Attendu | Gravité | Corrigé |
|---|---|---|---|---|---|
