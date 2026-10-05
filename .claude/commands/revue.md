---
description: Relecture critique de la branche en cours avant fusion
---
Fais une relecture critique de la branche en cours par rapport à `staging` (`git diff staging...HEAD`), comme un développeur senior qui n'a pas écrit ce code.

Vérifie en priorité, dans cet ordre :
1. **Sécurité des données** : chaque nouvelle table a ses politiques RLS et ses tests ; aucune requête avec la clé service en dehors de `lib/supabase/admin.ts` ; aucune variable serveur lue côté client ; un vendeur ne peut pas lire les données d'un autre vendeur.
2. **Règles métier interdites** : aucun « financement validé », aucun « peut financer », aucune comparaison de nom de formule (seulement `hasEntitlement`), aucune étape essentielle bloquée par la formule, aucune offre envoyée modifiable.
3. **Conformité au SPEC** : écart entre le code et les sections concernées, textes client non repris mot pour mot.
4. **Qualité** : erreurs non gérées, états vide / chargement / erreur manquants, responsive 390 / 768 / 1280.

Rends une liste courte : bloquant / à corriger / suggestion, avec fichier et ligne. Ne corrige rien sans mon accord.
