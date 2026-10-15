# Dossier juridique Leenkey V2

## Statut

- [`2026-10-09-dossier-juridique.md`](2026-10-09-dossier-juridique.md) : projet de textes daté du 9 octobre 2026, transmis le 15 octobre. Il contient une note de cadrage interne, des mentions légales, des CGU, des CGV, une politique de confidentialité, une politique de cookies, une politique de signalement et de modération, les mentions du parcours de souscription et le formulaire de rétractation, les notices courtes des formulaires, et une fiche d'intégration.
- **Non publiable en l'état** : le document le dit lui-même. Il ne vaut pas consultation d'avocat et contient des passages `[À COMPLÉTER]` et `[À CONFIRMER]`.
- Versions définitives relues par l'avocat de Leenkey attendues **avant le 27 novembre 2026** (`DECISIONS.md`, Q34). En attendant, la préprod affiche les pages légales « En cours de rédaction ».
- La note de cadrage est **interne** : elle ne doit jamais apparaître sur le site.

## Ce qui est déjà intégré au produit (décision du 2026-10-15)

| Exigence du dossier | Où |
|---|---|
| Acceptation datée et versionnée des CGU (inscription) et des CGU et CGV (commande) | `legal_acceptances`, L1-09 et L1-40 (SPEC section 4) |
| Récapitulatif avant paiement, cases non précochées, bouton « Commander et payer … € TTC » | L1-40 (SPEC section 11) |
| Démarrage immédiat sur demande expresse ; sinon premier contact au 15e jour | L1-40 (SPEC sections 11 et 11 bis) |
| Bouton de rétractation en ligne pendant 14 jours, accusé de réception, remboursement | L1-40 (SPEC section 11) |
| Durée de 12 mois sans renouvellement automatique, retour en Autonomie à l'échéance | `subscriptions.ends_at`, L1-05 et L1-40 |
| E-mail récapitulatif sur support durable (fiche formule, CGV, formulaire de rétractation) | L1-40 (SPEC section 11) |
| Signalement : motif à l'envoi, motif communiqué au vendeur, contestation auprès du back office | SPEC section 17 (version minimale) |
| Aucun justificatif de financement ni pièce d'identité envoyé à l'IA | SPEC section 12, principe 6 |
| Pas de « financement validé », pas de « solvabilité certifiée » | SPEC section 4 (statuts de financement) |
| Aucune action automatique d'acceptation d'offre ni d'envoi de message par l'IA | CLAUDE.md section 8 (confirmation obligatoire) |
| Liste des prestataires techniques | [`prestataires.md`](prestataires.md) |

Hors périmètre V2 : l'effacement automatique des données par catégorie (`BACKLOG-V3.md`).

## Questions à soumettre à l'avocat avec les textes

Elles accompagnent les textes ci-dessus. Le développement continue avec les valeurs provisoires de `DECISIONS.md` en attendant les réponses.

1. **Carte professionnelle** : au nom de quelle structure est-elle délivrée ? Si c'est SAS LEENKEY : numéro, CCI qui l'a délivrée, garant financier, assureur de responsabilité civile professionnelle, et mentions correspondantes à faire figurer sur le site.
2. **Mandat** : les formules Accompagné et Sérénité sont-elles vendues sous cette carte, avec un mandat, ou comme une prestation de services sans mandat ?
3. **Article 6 de la loi Hoguet** (aucune somme perçue avant la conclusion effective de la vente) : comment le concilier avec le paiement à la souscription de formules qui incluent « aide à la négociation », « accompagnement jusqu'à l'acceptation d'une offre » et « coordination avec le notaire » ?
4. **Rétractation après démarrage** : quel montant Leenkey peut-elle conserver si le client se rétracte après le début des prestations ? Valeur provisoire : remboursement intégral.
5. **Règlement sur les services numériques (DSA)** : quelles obligations s'appliquent à Leenkey, compte tenu de sa taille, et la version minimale du signalement retenue suffit-elle ?
6. **Transferts hors de l'Union européenne** : prestataires américains (voir [`prestataires.md`](prestataires.md)), mécanismes de transfert à citer dans la politique de confidentialité.
7. **Durées de conservation** par catégorie de données (comptes, annonces, messages, offres, justificatifs de financement, factures).
