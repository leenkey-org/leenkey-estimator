# Prompt à coller dans Claude Code

> Avant : place le dossier `design-handoff/` à la racine du repo Leenkey V2, sur une branche dédiée (ex. `feat/refonte-accueil`). Ne rien fusionner sur `main`.

---

On lance la refonte visuelle de Leenkey V2, en commençant par la page d'accueil.

Tout est dans `design-handoff/` :
- `SPECS.md` : tokens (couleurs, typo, arrondis, ombres), composants, structure de la page et règles à respecter. **C'est la source de vérité.**
- `maquettes/accueil-ordinateur.html` et `maquettes/accueil-mobile.html` : la maquette validée. Ce sont des fichiers au format « Design Component » : lis le balisage et les styles inline comme référence visuelle (les données sont dans `renderVals()` en bas), mais **ne copie pas ce format** : refais la page avec la stack et les composants du repo.
- `images/` : logo et photos d'exemple (provisoires).

Ce que je te demande :
1. **Avant de coder**, explore le repo : framework, système de styles (Tailwind ? CSS modules ?), composants UI existants, librairie d'icônes, route et composant actuels de l'accueil, source des annonces. Fais-moi un plan court : fichiers touchés, composants à créer ou modifier, où mettre les tokens. Attends mon accord.
2. Mets en place les **tokens** de `SPECS.md` (variables CSS et/ou thème Tailwind) et la police Archivo, sans casser les autres pages.
3. Crée ou adapte les **composants réutilisables** : boutons (principal, secondaire, pilule, rond), carte de recherche à onglets, carte de bien, carrousel d'annonces, carte raccourci, carte formule, bouton flottant assistant, barre de navigation mobile, menu compte. Ils serviront aux autres écrans ensuite.
4. Refais **l'accueil** dans l'ordre de la section 3 de `SPECS.md`, en mobile d'abord (390 px), puis ordinateur (1440 px).
   - Les annonces du carrousel, leur nombre et leurs badges viennent des **vraies données** (pas de données en dur).
   - Le simulateur « Combien vous économisez » calcule 5 % × prix − 990 €, avec l'hypothèse affichée.
   - Les onglets Acheter / Vendre / Estimer mènent aux parcours existants (estimateur, dépôt d'annonce, recherche).
5. Respecte les règles de la section 4 (accessibilité AA, 44 px, aucun texte inventé, jamais « financement validé » ni « peut financer », jamais « Débloquer », `prefers-reduced-motion`).
6. Vérifie le rendu en 390 px et en 1440 px (captures si possible), lance le lint et le build, et liste ce qui reste à faire ou à valider.

Travaille sur la branche courante, fais des commits clairs, ne fusionne rien sur `main`.
