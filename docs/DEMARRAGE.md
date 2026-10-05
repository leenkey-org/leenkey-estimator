# DÉMARRAGE · Leenkey V2

Guide pour Younes. Claude Code ne lit pas ce fichier en priorité : il lit `CLAUDE.md` puis `docs/SPEC-V2.md`.

## 1. Ce que contient le pack

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Règles permanentes du repo, lues par Claude Code à chaque session |
| `.claude/commands/` | Commandes Claude Code : `/tache`, `/revue`, `/bug`, `/vendredi`, `/recette` |
| `.env.example` | Liste des variables d'environnement |
| `docs/SPEC-V2.md` | Spécification complète : données, écrans, règles, plan de 57 tâches |
| `docs/DECISIONS.md` | Décisions de Cédric et questions ouvertes avec leur valeur provisoire |
| `docs/PLANNING.md` | Les 57 tâches à cocher, semaine par semaine |
| `docs/RECETTE.md` | Scénarios de recette de Cédric par lot |
| `docs/SECURITE.md` | Checklist avant la mise en production |
| `docs/BACKLOG-V3.md` | Tout ce qui est hors périmètre |
| `docs/CHANGELOG.md` | Journal des PR |
| `docs/PROMPTS.md` | Messages prêts à copier dans Claude Code |
| `docs/maquettes/` | Maquettes : `png/` (captures), `html/` (pages autonomes), sources `.dc.html` |
| `docs/client/` | Documents bruts de Cédric (modèle d'offre) |
| `supabase/seed/knowledge/faq-cedric-v2.md` | FAQ de Cédric pour l'assistant IA (73 fiches) |
| `docs/cahier-des-charges.md`, `docs/plan-de-mise-en-oeuvre.md` | Documents contractuels de référence |

## 2. Prérequis (avant la première session)

- [ ] Contrat signé, acompte de 8 499 € TTC reçu
- [ ] Node 20+, Git, Supabase CLI (`npm i -g supabase`), Stripe CLI, Claude Code à jour
- [ ] Docker Desktop lancé (Supabase en local)
- [ ] Supabase : projets `leenkey-dev` et `leenkey-staging` créés, région Europe (Paris ou Francfort)
- [ ] Vercel Pro : projet relié au repo, branche `staging` → `preprod.leenkey.fr`, protection par mot de passe, `main` → `leenkey.fr` (ne pas basculer le domaine avant S10)
- [ ] DNS : enregistrement `preprod` chez le registrar de Cédric
- [ ] Stripe (mode test) : produits Accompagné 990 €, Sérénité 1 500 €, surclassement 510 €, codes promo autorisés
- [ ] Resend : compte créé, `EMAIL_TEST_INBOX` = ta boîte de test
- [ ] Clé Anthropic avec plafond de dépenses mensuel
- [ ] Clé Mapbox restreinte à `localhost` et `preprod.leenkey.fr`
- [ ] `.env.local` rempli à partir de `.env.example`, variables staging saisies dans Vercel

## 3. Installer le pack dans le repo

Le développement se fait dans le repo existant de Leenkey (celui de l'estimateur), sans casser le site actuel.

```bash
git checkout main && git pull
git checkout -b staging && git push -u origin staging
# copier le contenu du pack à la racine du repo (CLAUDE.md, .claude/, .env.example, docs/, supabase/)
git add CLAUDE.md .claude .env.example docs supabase
git commit -m "docs: pack de démarrage V2"
git push
```

`main` reste le site en ligne jusqu'à la semaine 10. Tout le travail V2 arrive sur `staging` par PR.

## 4. Première session Claude Code

Ouvre Claude Code à la racine du repo et colle le message « Session 0 » de `docs/PROMPTS.md`. Il lit tout, résume, pose ses questions, sans coder. Ne passe à `/tache L1-01` qu'après avoir validé son résumé.

## 5. Routine de travail

- **Une tâche = une session = une branche = une PR.** `/tache L1-03`, tu lis son plan, tu dis « go ».
- **Avant de fusionner** : `/revue`, puis tu testes toi-même en préprod la liste qu'il t'a donnée, puis tu fusionnes dans `staging`.
- **Contexte saturé ou session qui dérive** : `/clear` ou nouvelle session, et tu relances la tâche. Ne pas « rattraper » une session partie dans le mauvais sens.
- **Bug** : `/bug <description>`.
- **Vendredi** : `/vendredi`, tu relis et tu envoies le message à Cédric.
- **Fin de lot** : `/recette 1`, puis tag et message à Cédric.

## 6. Points de vigilance

1. **Sécurité des données** : une table sans RLS testée ne se fusionne pas. C'est le risque n° 1 du projet.
2. **Migrations** : jamais modifier une migration déjà appliquée en staging ; en écrire une nouvelle. Toute migration passe 24 h en staging avant prod.
3. **Textes de Cédric** : repris mot pour mot, centralisés dans `lib/i18n/fr.ts`.
4. **Mots interdits** : « financement validé », « peut financer ». Un test le vérifie.
5. **Coûts** : surveille la console Anthropic chaque semaine. Les tests E2E tournent avec `AI_MOCK=1`.

## 7. Ce qui dépend de Cédric

| Élément | Nécessaire avant | Statut |
|---|---|---|
| Relecture des textes de l'offre par la notaire (Q9) | S6 | En attente |
| Textes légaux (7 documents) | S9 | Demandés le 5 octobre |
| Adresse légale | S9 | En attente |
| Biens de test réels (facultatif) | S8 | En attente |
| Compte Supabase prod (sur son compte) | S10 | À créer avec lui |
| Accès DNS de `leenkey.fr` | S1 (préprod) et S10 (prod) | À demander |
