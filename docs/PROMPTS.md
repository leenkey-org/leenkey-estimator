# PROMPTS · messages prêts à copier dans Claude Code

Les commandes `/tache`, `/revue`, `/bug`, `/vendredi` et `/recette` (dossier `.claude/commands/`) couvrent le travail courant. Les messages ci-dessous servent aux moments particuliers.

---

## Session 0 · lecture et cadrage (une seule fois, sans code)

```
Tu vas développer la V2 de Leenkey sur ce repo, qui contient déjà le site actuel et l'estimateur.

1. Lis en entier, dans cet ordre : CLAUDE.md, docs/SPEC-V2.md, docs/DECISIONS.md, docs/PLANNING.md. Regarde les captures de docs/maquettes/png/.
2. Explore le code existant : structure, dépendances, pages, estimateur, déploiement.
3. Ne modifie aucun fichier.

Rends-moi :
- un résumé du produit en 10 lignes, pour que je vérifie que tu l'as compris ;
- l'état du code existant et ce qu'il faut préserver ;
- les écarts entre l'existant et la structure attendue par CLAUDE.md, et comment tu proposes de migrer sans casser le site en ligne ;
- les incohérences ou ambiguïtés que tu relèves dans le SPEC, numérotées ;
- les actions humaines (comptes, clés, DNS) encore nécessaires avant L1-01.
```

---

## Après la session 0 · installation du pack corrigé

```
J'ai mis à jour le pack avec mes décisions (docs/DECISIONS.md, entrées du 2026-10-07) : Next.js avec reprise de l'estimateur, v2 = préprod, statut suspended, create_case en security definer, quotas IA par rôle, reports en V3, etc.

1. Installe le pack sur une branche docs/session-0 depuis v2.
2. Fusionne CLAUDE.md : le pack comme base, plus la section « Existant et règles éditoriales » complétée avec les règles éditoriales du CLAUDE.md actuel du site.
3. Relis les points de ta session 0 et dis-moi lesquels ne sont pas encore réglés dans les docs. Corrige ceux qui relèvent de la cohérence des docs ; pour le reste, propose.
4. Vérifie l'identifiant exact du modèle Sonnet sur docs.claude.com et corrige core/ai/models.ts dans le SPEC.
5. Recale docs/PLANNING.md sur la date de démarrage réelle : [date].
6. PR vers v2, liste des fichiers modifiés, puis attends mon go pour /tache L1-01.
```

---

## Reprise après une pause

```
Reprise du projet. Lis CLAUDE.md, docs/PLANNING.md et les 5 dernières entrées de docs/CHANGELOG.md. Dis-moi où on en est, la prochaine tâche et ses dépendances. Ne code rien.
```

---

## Avant une tâche lourde (migrations, paiement, offre)

```
Avant /tache <ID> : décris-moi le modèle de données concerné tel que tu vas l'écrire (tables, colonnes, contraintes, index, politiques RLS par rôle) et la liste des tests RLS. Compare avec docs/SPEC-V2.md section 4 et 5 et signale toute différence. Pas de code.
```

---

## Intégrer une réponse de Cédric

```
Cédric a répondu à la question <Qn> de docs/DECISIONS.md : « <réponse> ».
1. Déplace la question dans « Décisions reçues » avec la date du jour.
2. Mets à jour docs/SPEC-V2.md aux endroits concernés.
3. Liste le code déjà écrit qui utilise la valeur provisoire (cherche les TODO(client)) et propose les modifications. Attends mon accord avant de toucher au code.
```

---

## Demande nouvelle de Cédric en cours de route

```
Cédric demande : « <demande> ».
Dis-moi si c'est dans le périmètre de docs/SPEC-V2.md (cite la section) ou non. Si non : ajoute-la dans docs/BACKLOG-V3.md avec une estimation en jours et l'impact sur le planning. N'implémente rien.
```

---

## Appliquer la direction artistique sur un écran

```
L'écran <route> est fonctionnel. Applique la direction « Façade » (docs/SPEC-V2.md sections 6 et 7) : photo d'abord, bleu en aplats, neutres pierre, Archivo seule (titres élargis), angles 4 et 6 px, pas d'ombre sur les cartes, pas de majuscules espacées ni de monospace. Ne change ni la structure ni les textes. Montre-moi une capture à 390 px et à 1280 px avant et après.
```

---

## Préparer la mise en production (S10)

```
On prépare la mise en production. Suis docs/SPEC-V2.md section 23, tâches P-01 à P-06, et docs/SECURITE.md.
Commence par une répétition complète sur la préprod (`v2`, projet Vercel `leenkey-v2`) : liste les étapes exactes que tu vas jouer, les commandes, les variables à basculer, et le plan de retour arrière. Rien n'est fait en prod sans mon go étape par étape.
```

---

## Session qui part dans le mauvais sens

```
Stop. Ne continue pas. Résume en 5 lignes ce que tu as modifié depuis le début de la session et pourquoi. Puis propose : soit revenir à l'état du dernier commit, soit une correction ciblée. Attends mon choix.
```
