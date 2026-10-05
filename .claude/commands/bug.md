---
description: Corriger un bug signalé
argument-hint: <description du bug>
---
Bug signalé : $ARGUMENTS

1. Reproduis-le d'abord : écris un test (unitaire ou E2E) qui échoue.
2. Explique la cause en 3 lignes, puis corrige.
3. Le test passe, la suite complète passe. Branche `fix/<slug>`, PR vers `v2` (ou `hotfix/<slug>` vers `main` si le bug touche le site V1 en ligne, sur go explicite de Younes), entrée dans `docs/CHANGELOG.md`.
