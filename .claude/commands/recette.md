---
description: Préparer la recette d'un lot (ex. /recette 1)
argument-hint: <numéro de lot>
---
Prépare la recette du lot $ARGUMENTS.

1. Vérifie que toutes les tâches du lot sont cochées dans `docs/PLANNING.md` et que les E2E du lot (SPEC section 22) passent sur la préprod (`leenkey-v2.vercel.app`).
2. Lance la revue RLS : pour chaque table, test avec `seller_a`, `seller_b`, `buyer_c`, `buyer_d`, `admin` et un visiteur anonyme.
3. Mets à jour `docs/RECETTE.md` : comptes de test, scénarios du lot pas à pas tels que Cédric les jouera, résultats attendus, case à cocher par scénario.
4. Propose le tag `v2.0.0-lot$ARGUMENTS` et le message à Cédric pour lancer sa recette.
