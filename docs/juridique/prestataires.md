# Prestataires techniques de la V2 (liste de travail)

Demandée par le dossier juridique (« liste nominative, localisation et rôle exact : à compléter après audit de Younes »). État au 15 octobre 2026, établi à partir de l'architecture réelle de la V2. Chaque ligne marquée « à vérifier » doit l'être sur le contrat ou l'accord de traitement des données (DPA) du prestataire avant d'être reprise dans la politique de confidentialité.

| Prestataire | Rôle dans Leenkey | Données concernées | Lieu de traitement | À vérifier |
|---|---|---|---|---|
| Vercel Inc. (États-Unis) | Hébergement du site et des fonctions serveur | Toutes les requêtes (adresse IP, pages, journaux techniques) | Fonctions serveur à Paris (région `cdg1`) ; réseau de diffusion mondial | DPA, mécanisme de transfert hors UE |
| Supabase Inc. (États-Unis) | Base de données, authentification, stockage des fichiers | Comptes, biens, annonces, messages, offres, documents, justificatifs de financement, journaux de l'assistant | Paris (`eu-west-3`) pour staging ; production à créer en `eu-west-3` | DPA, accès du support depuis les États-Unis |
| Stripe (Stripe Payments Europe Ltd, Irlande) | Paiement des formules, factures | Nom, e-mail, montant, références de paiement ; les numéros de carte restent chez Stripe | Union européenne, avec transferts possibles | DPA, entité contractante, compte au nom de SAS LEENKEY (Q33) |
| Anthropic PBC (États-Unis) | Assistant IA, rédaction de l'analyse de valeur, analyse des documents du dossier de vente | Messages adressés à l'assistant, textes d'annonce, documents du dossier de vente. Jamais de justificatif de financement ni de pièce d'identité (SPEC section 12) | États-Unis | Durée de conservation des données de l'API, absence d'usage pour l'entraînement à confirmer contractuellement avant toute mention publique |
| Resend (États-Unis) | Envoi des e-mails transactionnels | Adresse e-mail, prénom, contenu des notifications | États-Unis | DPA, mécanisme de transfert |
| Mapbox (États-Unis) | Cartes, suggestions d'adresses et géocodage | Adresses saisies, position approximative des biens, adresse IP des visiteurs (tuiles de carte) | États-Unis | DPA, mécanisme de transfert |
| Google (Google Analytics 4, Google Tag Manager) | Mesure d'audience, en production uniquement et après consentement (L1-37) | Identifiants de cookies, pages vues | Union européenne et États-Unis | Paramétrage du consentement, durée de conservation |
| Vercel Analytics | Mesure d'audience sans cookie | Pages vues, données agrégées | Voir Vercel | À confirmer dans la politique de cookies |
| GitHub (Microsoft) | Code source | Aucune donnée d'utilisateur (comptes de test uniquement) | États-Unis | — |
| IONOS | Noms de domaine `leenkey.fr` et `leenkey.com` (compte de Cédric) | Aucune donnée d'utilisateur | Union européenne | — |
| Etalab (data.gouv.fr) | Fichiers publics des ventes immobilières (DVF) pour les comparables | Aucune donnée personnelle envoyée | France | — |

Comptes à ouvrir au nom de Leenkey pour la production (Q36) : Supabase, Stripe, Anthropic, Resend, Mapbox.
