# Factures et avoirs Stripe : réglages à faire dans le tableau de bord

Pour Cédric (compte Stripe de SAS LEENKEY). Décision : `docs/DECISIONS.md`, 2026-11-26, « Factures, avoirs et emails des formules ».

Les factures et les avoirs des formules sont des documents **dessinés par Stripe**. Le site règle ce qui se décide commande par commande ; le logo, les couleurs et l'identité de la société se règlent **une fois, dans le tableau de bord Stripe**, et le site ne peut pas les poser à votre place.

Les noms de menus ci-dessous sont ceux du tableau de bord en français ; Stripe les renomme parfois. Ceux marqués *(libellé à vérifier dans Stripe)* n'ont pas pu être contrôlés depuis le projet.

## Ce que le site règle déjà (rien à faire)

| Sur le document | Réglé par |
|---|---|
| Adresse de facturation du client sur la facture | Le site la demande sur la page de paiement Stripe (obligatoire) |
| « Paiement : Facture acquittée » dans l'en-tête de la facture | Le site, à la création de la commande (la facture n'existe qu'une fois le paiement fait) |
| « TVA non applicable, article 293 B du CGI. » en pied de facture | Le site |
| Sur l'avoir : « Remboursement suite à l'exercice du droit de rétractation. TVA non applicable, article 293 B du CGI. » (ou « Remboursement. TVA non applicable… » sans rétractation) | Le site, dans la note de l'avoir |
| Facture en pièce jointe de l'email de confirmation de souscription, avoir en pièce jointe de l'email de confirmation du remboursement | Le site (emails Leenkey) |

Ce que le site **ne peut pas** changer : la mise en page de Stripe, dont la ligne « Montant dû » (0,00 € sur une facture payée) ou « Montant payé ». « Facture acquittée » s'ajoute dans l'en-tête ; la ligne de Stripe reste.

## À faire, d'abord en mode test, puis en mode réel

Le bouton « Mode test » est en haut du tableau de bord. Certains réglages sont communs aux deux modes, d'autres non *(à vérifier dans Stripe)* : faites le tour dans les deux.

1. **Image de marque** : Paramètres → Entreprise → *Image de marque* (« Branding ») *(libellé à vérifier dans Stripe)*.
   - Icône et logo de Leenkey (fichiers fournis par Nebula Creativ).
   - Couleur de la marque : `#2563EB` ; couleur d'accentuation : `#020D21` (charte du site).
2. **Informations publiques** : Paramètres → Entreprise → *Informations publiques* (« Public details ») *(libellé à vérifier dans Stripe)*.
   - Nom public de l'entreprise : `SAS LEENKEY`
   - Adresse : `36 rue Pierre Brossolette, 91360 Épinay-sur-Orge`
   - Email d'assistance : `contact@leenkey.fr`
   - Site : `https://leenkey.fr`
   Ce nom et cette adresse s'impriment en tête des factures et des avoirs.
3. **Modèle de facture** : Paramètres → Facturation → *Factures* → *Modèle de facture* (« Invoice template ») *(libellé à vérifier dans Stripe)*.
   - Pied de page par défaut : `SAS LEENKEY, RCS Évry 107 616 211. TVA non applicable, article 293 B du CGI.`
   - Attention : pour les factures des formules, le site envoie déjà son propre pied de page (« TVA non applicable, article 293 B du CGI. »), qui **remplace** le pied de page par défaut *(à vérifier sur une facture de test)*. Si vous voulez aussi « SAS LEENKEY, RCS Évry 107 616 211 » en pied de ces factures, dites-le : c'est une ligne à changer dans le site.
   - S'il existe un pied de page ou une note par défaut **pour les avoirs** *(libellé à vérifier dans Stripe)*, y mettre la même phrase.
   - Aucun taux de taxe n'est à créer (franchise en base de TVA).
4. **Emails envoyés par Stripe aux clients** : Paramètres → Entreprise → *E-mails aux clients* (« Customer emails ») *(libellé à vérifier dans Stripe)*.
   - Le site envoie désormais lui-même la facture (email de confirmation de souscription) et l'avoir (email de confirmation du remboursement). L'avoir n'est plus envoyé par Stripe.
   - « Paiements réussis » : si cette case reste cochée, le client reçoit **aussi** le reçu de Stripe, en plus de l'email Leenkey. À vous de choisir ; nous proposons de la décocher une fois l'email Leenkey vérifié en préprod.
   - « Remboursements » : même choix.

## À vérifier après un paiement de test (carte 4242 4242 4242 4242)

1. La page de paiement demande l'adresse de facturation.
2. La facture PDF montre : le logo, `SAS LEENKEY` et son adresse, l'adresse du client, « Paiement : Facture acquittée », « TVA non applicable, article 293 B du CGI. ».
3. L'email « Confirmation de votre souscription Leenkey » arrive dans la boîte de test avec la facture en pièce jointe (à défaut : un lien vers « Mes factures et paiements »).
4. Après un remboursement fait dans Stripe : l'avoir PDF porte la phrase de remboursement et la mention de TVA, et ne dit plus « Modification de commande » ; l'email « Confirmation de votre remboursement » arrive avec l'avoir en pièce jointe.
5. Sur le site, `/vendeur/formule` → « Mes factures et paiements » : le paiement, « Télécharger la facture », l'avoir et « Télécharger l'avoir ».
