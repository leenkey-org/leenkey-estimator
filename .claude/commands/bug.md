---
description: Corriger un bug signalé
argument-hint: <description du bug>
---
Bug signalé : $ARGUMENTS

1. Reproduis-le d'abord : écris un test (unitaire ou E2E) qui échoue.
2. Explique la cause en 3 lignes, puis corrige.
3. Le test passe, la suite complète passe. Branche `fix/<slug>`, PR vers `staging`, entrée dans `docs/CHANGELOG.md`.
