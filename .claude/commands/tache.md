---
description: Réaliser une tâche du plan (ex. /tache L1-03)
argument-hint: <ID de tâche, ex. L1-03>
---
Tâche à réaliser : **$ARGUMENTS**.

1. Relis `CLAUDE.md`, `docs/DESIGN.md` si la tâche touche à l'interface ou à l'UX (et la capture PNG de l'écran concerné) ; en cas d'écart avec la SPEC sur l'UX, DESIGN.md l'emporte, la ligne $ARGUMENTS de `docs/SPEC-V2.md` section 23, et toutes les sections du SPEC qu'elle mentionne (tables, écrans, règles). Relis `docs/DECISIONS.md`.
2. Vérifie que les dépendances de la tâche sont cochées dans `docs/PLANNING.md`. Si ce n'est pas le cas, arrête-toi et dis-le.
3. Avant d'écrire du code, donne-moi en 10 lignes maximum : les fichiers que tu vas créer ou modifier, les migrations, les tests, et tout point du SPEC qui te semble ambigu. **Attends mon « go ».**
4. Après mon go : crée la branche `feature/$ARGUMENTS-<slug>`, code, écris les tests (RLS en premier pour toute table), lance `npm run lint && npm run typecheck && npm test`.
5. Une information manque ? Ne bloque pas : placeholder de la section 24, `// TODO(client): …`, ligne ajoutée dans `docs/DECISIONS.md`.
6. Une idée hors périmètre ? Ne l'implémente pas : ajoute-la dans `docs/BACKLOG-V3.md`.
7. Termine par : cochage de la tâche dans `docs/PLANNING.md`, entrée dans `docs/CHANGELOG.md`, commit, PR vers `v2` (fusionnée par Claude Code si la CI est verte et que `/revue` ne relève rien de bloquant) avec les critères d'acceptation de la tâche cochés un par un dans la description, et la liste de ce que je dois tester à la main en préprod (`leenkey-v2.vercel.app`) après fusion.
