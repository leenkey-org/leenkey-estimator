# Prompt à coller dans Claude Code

> Avant : place le dossier `design-handoff/` à la racine du repo Leenkey V2, sur une branche dédiée (ex. `feat/refonte-accueil`). Ne rien fusionner sur `main`. Ajoute si possible les SVG officiels du logo et la photo HD du bandeau dans `design-handoff/images/`.

---

On lance la refonte visuelle de Leenkey V2, en commençant par la page d'accueil, dans la charte Leenkey (nuit, dégradé bleu → violet, police Sora).

Tout est dans `design-handoff/` :
- `SPECS.md` : tokens (couleurs charte + couleurs AA, dégradés, effets, typo, arrondis, ombres), composants, structure de la page et règles. **C'est la source de vérité.**
- `maquettes/accueil-ordinateur.html` et `maquettes/accueil-mobile.html` : la maquette validée. Format « Design Component » : lis le balisage et les styles inline comme référence visuelle (données dans `renderVals()` en bas, images en `/_blob/…` = fichiers de `images/`), mais **ne copie pas ce format** : refais la page avec la stack et les composants du repo.
- `images/` : logos et photos provisoires (basse résolution).

Ce que je te demande :
1. **Avant de coder**, explore le repo : framework, système de styles (Tailwind ? CSS modules ?), composants UI existants, librairie d'icônes, route et composant actuels de l'accueil, source des annonces. Propose un plan court (fichiers touchés, composants à créer ou modifier, où mettre les tokens). Attends mon accord.
2. Mets en place les **tokens** de `SPECS.md` (variables CSS et/ou thème Tailwind : couleurs, dégradés, ombres, rayons) et la police **Sora**, sans casser les autres pages.
3. Crée ou adapte les **composants réutilisables** : boutons (dégradé, secondaire sur fond nuit, pilule, rond), carte de recherche à onglets, carte de bien, carrousel, carte raccourci, carte formule (avec contour dégradé), étiquettes, bouton flottant assistant, barre de navigation mobile, menu compte, et les éléments décoratifs (halo, orbe, trame de points, vague) en composants simples et `aria-hidden`.
4. Refais **l'accueil** dans l'ordre de la section 3 de `SPECS.md`, mobile d'abord (390 px) puis ordinateur (1440 px) :
   - bandeau nuit pleine largeur avec l'en-tête intégré, photo à droite découpée par la vague, carte de recherche à cheval sur le bas du bandeau, onglet **Estimer** actif par défaut ;
   - annonces, nombre et badges issus des **vraies données** ;
   - simulateur « Combien vous économisez » = 5 % × prix − 990 €, hypothèse affichée ;
   - onglets et raccourcis branchés sur les parcours existants (estimateur, dépôt d'annonce, recherche).
5. Respecte les règles de la section 4 : AA (boutons à texte blanc en dégradé `#2563EB → #7C3AED`, pas en `#3B82F6 → #8B5CF6`), 44 px, aucun texte ni chiffre inventé, jamais « financement validé » / « peut financer » / « Débloquer », animations coupées sous `prefers-reduced-motion`.
6. Vérifie le rendu en 390 px et 1440 px (captures si possible), lance lint et build, et liste ce qui reste à faire ou à valider.

Travaille sur la branche courante, commits clairs, ne fusionne rien sur `main`.
