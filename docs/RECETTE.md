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

| # | Scénario | Compte | Attendu | OK |
|---|---|---|---|---|
| 1.1 | S'inscrire comme vendeur, créer un bien complet depuis le mobile, l'envoyer en validation | nouveau compte | Annonce « en attente », email reçu | ☐ |
| 1.2 | Valider l'annonce depuis le back office | admin | Annonce visible dans la recherche, email au vendeur | ☐ |
| 1.3 | Refuser une annonce avec un motif | admin | Motif visible par le vendeur | ☐ |
| 1.4 | Chercher un appartement à Savigny-sur-Orge, filtrer, ouvrir l'annonce | visiteur | Filtres et carte cohérents | ☐ |
| 1.5 | Contacter le vendeur, échanger quelques messages | buyer_c / seller_a | Messages en temps réel, notification et email | ☐ |
| 1.6 | Répondre avec la suggestion de l'assistant | seller_a | Suggestion modifiable avant envoi | ☐ |
| 1.7 | Renseigner son projet et son financement | buyer_c | Le vendeur voit « Informations déclarées », jamais les montants | ☐ |
| 1.8 | Acheter Sérénité, puis vérifier le dossier et la conversation conseiller | seller_a / admin | Formule active, dossier créé, échange conseiller possible | ☐ |
| 1.9 | Rester en Autonomie jusqu'à la publication | seller_b | Aucune étape bloquée | ☐ |
| 1.10 | Modifier le prix d'une annonce publiée | seller_a / admin | Annonce toujours en ligne, historique visible côté admin | ☐ |
| 1.11 | Essayer d'ouvrir le bien de seller_a avec seller_b | seller_b | Accès refusé | ☐ |

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
