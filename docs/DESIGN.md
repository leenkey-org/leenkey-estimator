# DESIGN · Leenkey V2 · direction « Façade »

Version du 8 octobre 2026. Direction validée par écrit par Cédric le 8 octobre 2026 (`DECISIONS.md`).

Ce document est la **référence visuelle exécutable** de la V2 : valeurs exactes, composants, écrans. Il complète `SPEC-V2.md` (le quoi) en disant le comment visuel.

**Ordre de priorité en cas d'écart :** `DESIGN.md` > captures `docs/maquettes/png/` > sources `docs/maquettes/*.dc.html`. Les maquettes sont la référence de composition ; ce document est la référence des valeurs. Un écart entre les deux se signale dans la PR et se tranche en faveur de ce document.

**Usage par Claude Code :**
- Lire ce document en entier avant `L1-07` (design system) et le relire avant chaque tâche qui crée un écran.
- Ouvrir la capture PNG de l'écran concerné avant de le coder.
- Ne jamais écrire une couleur, une taille de police, un rayon ou une ombre en dur dans un composant : toujours un token (section 2) ou une classe Tailwind qui le référence.
- Avant chaque PR qui touche à l'interface, passer la checklist de la section 16.

---

## Sommaire

1. Principes
2. Couleurs et tokens
3. Typographie
4. Espacement, grilles, points de rupture
5. Formes, bordures, élévation, couches
6. Icônes
7. Photos et dessin de marque
8. Cartes géographiques
9. Mouvement
10. Composants
11. Gabarits d'écran
12. Écrans dessinés, spécification détaillée
13. Écrans non dessinés : règles de construction
14. Supports hors interface (emails, PDF, image de partage)
15. Accessibilité
16. Checklist de conformité design
17. Écarts connus des maquettes

---

## 1. Principes

**Intention.** Leenkey vend des logements, pas un logiciel. L'interface fait voir les biens d'abord et s'efface derrière eux.

**Les quatre signatures** (à respecter sur chaque écran) :

1. **La photo d'abord.** Sur annonce, recherche, cartes de bien et accueil acquéreur, la photo prend la plus grande place possible. Jamais de bloc gris « Photo » : sans photo, on affiche `facade.svg` sur fond pierre.
2. **Le bleu en aplat.** `--lk-blue` en surfaces pleines pour les moments qui comptent : bandeau d'accueil, bouton principal, sélection, marqueur de carte sélectionné, fins de parcours. Le navy pour les en-têtes sombres (dashboard vendeur, back office).
3. **La typographie élargie.** Une seule famille, Archivo. Titres, prix et chiffres clés en Archivo élargie (`font-stretch: 116%`, 700, `letter-spacing: -0.02em`). Tout le reste en Archivo normale. Casse normale partout.
4. **Des formes nettes.** Angles 4 px (contrôles) et 6 px (conteneurs). Bordure 1 px plutôt qu'ombre. Pastilles arrondies seulement pour statuts, marqueurs de carte, avatars, compteurs.

**Interdits** (bloquants en revue) :

- Dégradés ; ombres colorées ou diffuses sur les cartes ; `backdrop-blur` décoratif.
- Texte en majuscules (`uppercase`) et interlettrage positif sur les libellés ; police monospace dans l'interface.
- Numérotation décorative « 01 · … ». Seules les étapes réelles d'un parcours sont numérotées, en toutes lettres : « Étape 2 sur 4 ».
- Plus de deux séparateurs « · » dans un même libellé.
- Rayons supérieurs à 6 px sur un conteneur (hors pastilles et avatars).
- Icônes de maison ou de clé hors logo et `facade.svg`. Emoji. Illustrations 3D, isométriques, personnages.
- Bordure colorée sur un seul côté d'une carte.
- Flèche « → » ajoutée en fin de texte de bouton (une icône de flèche est permise dans les liens « Voir les 12 biens »).
- Texte gris clair sur fond gris (contraste < 4,5:1).

**Exception : les pages vitrines, dans la direction de la V1** (décisions de Younes du 2026-10-23, L1-49 puis L1-50, `DECISIONS.md`). Les pages vitrines sont l'accueil `/`, `/contact` (qui reprend sa section Contact), `/concept`, `/tarifs`, `/faq`, `/investir` et `/qui-sommes-nous` ; pas les pages légales, la recherche, l'annonce, l'estimateur ni les espaces connectés. Sur elles seulement, la V1 revient : dégradés du bleu de marque (heros, mots mis en valeur des titres, appels à l'action, dernier appel, chiffres), trame de points, ombres bleues des cartes (`shadow-lk-card`, `shadow-lk-cta`, `shadow-lk-lift`), surtitres en capitales interlettrées au-dessus des titres de section, numérotation « 01 » à « 04 » (situations de l'accueil, parties de l'outil de `/concept`), « Option 1 », « Option 2 » et « Source 1 » à « Source 3 », carré numéroté des étapes, rayons de 12 et 16 px, pastilles (badge du hero, « Exemple », phases et jalons de `/investir`), cartes de verre sur navy, flèche `ArrowRight` des appels à l'action, guillemet du message de `/investir`, courbe de la photo du hero de l'accueil, photo de Cédric dans le hero de `/qui-sommes-nous`. Restent interdits même là : couleurs hors charte (violet de la V1), texte sous 4,5:1 (le bleu clair d'un dégradé sous un texte blanc est `--lk-blue-mid`), chiffres non sourcés et projections (Q53), soulèvement au survol d'une carte qui ne se clique pas, icônes de maison ou de clé, emojis. Détail en 13.1. Les autres pages et les espaces connectés suivent les interdits ci-dessus.

---

## 2. Couleurs et tokens

### 2.1 Palette

| Token | Hex | Usage | Contraste |
|---|---|---|---|
| `--lk-blue` | `#1156FC` | Aplats de marque, bouton principal, liens, sélection, focus | blanc dessus 5,58:1 ; sur blanc 5,58:1 |
| `--lk-blue-hover` | `#0D47E0` | Survol et pression du bleu | blanc dessus 7,01:1 |
| `--lk-blue-tint` | `#EEF4FF` | Fond de sélection, encart d'aide, suggestion de l'assistant | bleu dessus 5,06:1 |
| `--lk-blue-line` | `#DBEAFE` | Bordure des boutons secondaires et des encarts bleus | décoratif |
| `--lk-on-blue-2` | `#F0F4FF` | Texte secondaire sur aplat bleu | 5,08:1 sur bleu |
| `--lk-navy` | `#1A2B4A` | En-têtes sombres (dashboard vendeur), avatars ; sections vitrines de l'accueil (L1-47, L1-48) | blanc dessus 14,1:1 |
| `--lk-blue-light` | `#93B4FF` | Sur navy : mots mis en valeur d'un titre, courbe, contours des repères (L1-47) ; surtitres, pictogrammes et liens sur navy des pages vitrines (L1-49, L1-50) | 6,86:1 sur navy |
| `--lk-blue-mid` | `#2464FC` | Pages vitrines (L1-49, L1-50, section 1) : bout clair des dégradés sous un texte blanc (appels à l'action `cta`, dernier appel, carrés numérotés, encart chiffré de `/investir`) | blanc dessus 4,88:1 |
| `--lk-blue-bright` | `#4C80FD` | Pages vitrines (L1-49, L1-50) : bout clair du dégradé des mots mis en valeur d'un titre et des chiffres de `/qui-sommes-nous` (24 px et plus), début de celui des heros sur navy | 3,61:1 sur blanc, 3,37:1 sur `--lk-mist` (grand texte) ; 4,6:1 sur `--lk-ink` |
| `--lk-ink` | `#0F1E35` | Texte principal, back office (barre latérale), bouton « sur fond sombre » | 16,7:1 sur blanc |
| `--lk-ink-2` | `#3E4757` | Texte de corps secondaire, valeurs sur pierre | 9,36:1 sur blanc |
| `--lk-ink-3` | `#5B6474` | Texte tertiaire (dates, libellés de chiffres, aides) | 5,97:1 sur blanc ; 5,07:1 sur `--lk-stone-2` |
| `--lk-bg` | `#F4F4F1` | Fond d'application (écrans connectés) | — |
| `--lk-surface` | `#FFFFFF` | Cartes, champs, barres d'en-tête et de navigation | — |
| `--lk-stone-2` | `#ECEDE8` | Tuiles (chiffres clés, boutons icône), en-têtes de tableau, puces DPE non choisies | — |
| `--lk-stone` | `#E3E4DE` | Aplats neutres larges (bandeaux, sections de page marketing) | — |
| `--lk-mist` | `#F5F7FB` | Pages vitrines (L1-49, L1-50) : fond clair froid des sections de la V1, en alternance avec le blanc ; puces de la carte d'exemple | bleu dessus 5,2:1 ; `--lk-ink-3` 5,6:1 |
| `--lk-mist-line` | `#E2E8F0` | Pages vitrines (L1-49, L1-50) : bordure des cartes de la V1 | décoratif |
| `--lk-line` | `#D9DBD3` | Bordures de cartes et séparateurs (décoratifs) | 1,4:1, décoratif uniquement |
| `--lk-field` | `#8A909A` | Bordure des champs de saisie, cases à cocher, sélecteurs | 3,21:1 sur blanc (WCAG 1.4.11) |
| `--lk-success` | `#047857` | Bouton « Valider », statut « Publiée », icônes de validation, texte de succès | blanc dessus 5,48:1 |
| `--lk-success-bg` | `#D1FAE5` | Fond de badge succès | texte `#065F46` 6,78:1 |
| `--lk-warning` | `#B45309` | Icônes et texte d'alerte sur blanc | 5,02:1 |
| `--lk-warning-bg` | `#FEF3C7` | Fond de badge et d'encart d'alerte | texte `#92400E` 6,37:1 |
| `--lk-danger` | `#B91C1C` | Erreurs de champ, actions destructrices | 6,47:1 |
| `--lk-danger-bg` | `#FEE2E2` | Fond de badge et d'encart d'erreur | texte `#991B1B` 6,8:1 |

Badges DPE (fond / texte) : A `#D1FAE5`/`#065F46` · B `#DCFCE7`/`#166534` · C `#ECFCCB`/`#3F6212` · D `#FEF9C3`/`#854D0E` · E `#FEF3C7`/`#92400E` · F `#FFEDD5`/`#9A3412` · G `#FEE2E2`/`#991B1B`.

Règles :
- Le bleu n'est jamais utilisé pour du texte de plus de 2 lignes.
- Sur aplat bleu : texte principal blanc, secondaire `--lk-on-blue-2`, jamais de gris.
- Sur navy ou ink : texte principal blanc, secondaire `rgba(255,255,255,0.72)` (≥ 7:1) ; accent `--lk-blue-light`, jamais `--lk-blue` (2,5:1 sur navy).
- Les pages publiques (accueil, recherche, annonce) ont un fond blanc ; les espaces connectés (vendeur, acquéreur, compte) ont un fond `--lk-bg` avec cartes blanches.

### 2.2 `app/globals.css` (Tailwind 4)

À créer tel quel en `L1-07` (Tailwind 4, configuration CSS-first). Les noms de classes Tailwind générés sont indiqués en commentaire.

> **Mise en œuvre (L1-07, PR #12).** Tant que les pages V1 sont servies par la V2, les jetons Façade portent le préfixe `lk` pour ne pas modifier les pages V1 : couleurs `bg-lk-*` / `text-lk-*`, rayons `rounded-lk-sm` (4 px) et `rounded-lk-md` (6 px) au lieu de `rounded-sm` / `rounded-md` (et `rounded-*-lk-xs`, 2 px, pour le coin d'une bulle de message, L1-21), échelle typographique en jetons de rôle `text-lk-*` (section 3.2). Les styles de base et les variables shadcn s'appliquent dans la portée `.facade`, posée par `<FacadeRoot>` (`components/shared/facade-root.tsx`). À l'arrêt des pages V1, un rechercher-remplacer ramène les noms de cette section.

```css
@import "tailwindcss";

@theme {
  /* Couleurs : bg-lk-blue, text-lk-ink-3, border-lk-line, etc. */
  --color-lk-blue: #1156FC;
  --color-lk-blue-hover: #0D47E0;
  --color-lk-blue-tint: #EEF4FF;
  --color-lk-blue-line: #DBEAFE;
  --color-lk-on-blue-2: #F0F4FF;
  --color-lk-blue-light: #93B4FF; /* accent sur navy, L1-47 */
  --color-lk-blue-mid: #2464FC; /* pages vitrines, L1-49 : dégradés sous un texte blanc */
  --color-lk-blue-bright: #4C80FD; /* pages vitrines, L1-49 : dégradé des mots d'un titre */
  --color-lk-navy: #1A2B4A;
  --color-lk-ink: #0F1E35;
  --color-lk-ink-2: #3E4757;
  --color-lk-ink-3: #5B6474;
  --color-lk-bg: #F4F4F1;
  --color-lk-surface: #FFFFFF;
  --color-lk-stone: #E3E4DE;
  --color-lk-stone-2: #ECEDE8;
  --color-lk-mist: #F5F7FB; /* pages vitrines, L1-49 */
  --color-lk-mist-line: #E2E8F0; /* pages vitrines, L1-49 */
  --color-lk-line: #D9DBD3;
  --color-lk-field: #8A909A;
  --color-lk-success: #047857;
  --color-lk-success-bg: #D1FAE5;
  --color-lk-success-fg: #065F46;
  --color-lk-warning: #B45309;
  --color-lk-warning-bg: #FEF3C7;
  --color-lk-warning-fg: #92400E;
  --color-lk-danger: #B91C1C;
  --color-lk-danger-bg: #FEE2E2;
  --color-lk-danger-fg: #991B1B;

  /* Police : font-sans */
  --font-sans: var(--font-archivo), system-ui, -apple-system, "Segoe UI", Arial, sans-serif;

  /* Rayons : rounded-sm (4px), rounded-md (6px), rounded-full */
  --radius-sm: 4px;
  --radius-md: 6px;
  /* Pages vitrines seulement (L1-49, L1-50, section 1) : rounded-lk-lg, rounded-lk-xl */
  --radius-lk-lg: 12px;
  --radius-lk-xl: 16px;

  /* Ombres : shadow-float uniquement (hors accueil et /contact, section 1) */
  --shadow-float: 0 2px 6px rgba(15, 30, 53, 0.18);
  --shadow-sheet: 0 -8px 24px rgba(15, 30, 53, 0.16);
  /* Pages vitrines seulement (L1-49, L1-50) : cartes, appels à l'action, cartes et photos des heros */
  --shadow-lk-card: 0 4px 24px rgba(17, 86, 252, 0.08);
  --shadow-lk-cta: 0 4px 16px rgba(17, 86, 252, 0.28);
  --shadow-lk-cta-hover: 0 10px 24px rgba(17, 86, 252, 0.36);
  --shadow-lk-raised: 0 8px 24px rgba(0, 0, 0, 0.16);
  --shadow-lk-lift: 0 24px 50px rgba(15, 30, 53, 0.3);
  --shadow-lk-photo: 0 24px 60px -20px rgba(0, 0, 0, 0.4);

  /* Pages vitrines seulement (L1-49, L1-50) : surtitres et libellés en capitales, titres de section */
  --tracking-lk-eyebrow: 0.14em;
  --tracking-lk-caps: 0.1em;
  --text-lk-showcase: 3rem; /* 48 px */
  --text-lk-eyebrow: 0.9375rem; /* 15 px */
  --text-lk-eyebrow-lg: 1.0625rem; /* 17 px */

  /* Points de rupture : md (768), lg (1024), xl (1280) */
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;

  /* Mouvement */
  --ease-out-lk: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-reveal-lk: cubic-bezier(0.16, 1, 0.3, 1); /* pages publiques, L1-45 */
}

/* Variables shadcn/ui alignées sur Leenkey */
:root {
  --background: #FFFFFF;
  --foreground: #0F1E35;
  --card: #FFFFFF;
  --card-foreground: #0F1E35;
  --popover: #FFFFFF;
  --popover-foreground: #0F1E35;
  --primary: #1156FC;
  --primary-foreground: #FFFFFF;
  --secondary: #ECEDE8;
  --secondary-foreground: #0F1E35;
  --muted: #ECEDE8;
  --muted-foreground: #5B6474;
  --accent: #EEF4FF;
  --accent-foreground: #1156FC;
  --destructive: #B91C1C;
  --border: #D9DBD3;
  --input: #8A909A;
  --ring: #1156FC;
  --radius: 0.375rem; /* 6px */
}

/* Utilitaires de marque */
@utility text-display {
  font-weight: 700;
  font-stretch: 116%;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
@utility text-wide {
  font-stretch: 116%;
  letter-spacing: -0.02em;
}
@utility tabular {
  font-variant-numeric: tabular-nums;
}

html { -webkit-font-smoothing: antialiased; }
body { background: var(--color-lk-surface); color: var(--color-lk-ink); font-family: var(--font-sans); }
:focus-visible { outline: 2px solid var(--color-lk-blue); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }
}
```

Les composants shadcn/ui installés sont ensuite ajustés pour respecter les rayons de la section 5 (`rounded-sm` pour les contrôles, `rounded-md` pour les conteneurs) : modifier leurs classes par défaut dans `components/ui/` au moment de l'installation, une fois, et le noter dans la PR.

---

## 3. Typographie

### 3.1 Chargement

> **Mise en œuvre (L1-07, PR #12 ; L1-44).** Archivo est déclarée dans `lib/fonts.ts`. Chargée d'abord par `<FacadeRoot>` seulement, pour que les pages V1 ne la téléchargent pas, elle est posée sur `<html>` par `app/layout.tsx` depuis L1-44 : c'est la seule police du site (les polices V1 sont retirées).

`app/layout.tsx` :

```tsx
import { Archivo } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],           // axe de largeur, indispensable pour font-stretch
  display: "swap",
  variable: "--font-archivo",
});

// <html lang="fr" className={archivo.variable}>
```

Graisses utilisées : 400, 500, 600, 700 ; 800 sur les pages vitrines seulement (titres des heros, surtitres, numéros et valeurs de la V1, L1-49, L1-50). Largeurs utilisées : 100 % (texte) et 116 % (titres). Ne pas charger d'autre police.

### 3.2 Échelle

Valeurs : taille px / interligne / graisse. « Large » = `font-stretch: 116%; letter-spacing: -0.02em` (classe `text-wide`).

| Rôle | Mobile (< 768) | Desktop (≥ 1024) | Largeur | Exemples |
|---|---|---|---|---|
| Display | 36 / 1.05 / 700 | 56 / 1.0 / 700 | Large | « Bonjour Thomas » (30 px dans la maquette desktop, accepté de 30 à 56 selon la place) ; hero des pages publiques à 44 px de 768 à 1 023 px (L1-45) |
| H1 | 26 / 1.15 / 700 | 32 / 1.1 / 700 | Large | « Créez votre compte », titre d'annonce desktop (26) |
| Titre de section des pages publiques | 26 / 1.15 / 700 | 40 / 1.05 / 700 | Large | « Un forfait fixe. Jamais de commission. » (`MarketingSection`, L1-45) |
| Chapeau de section des pages publiques | 15 / 1.55 / 400 (16 à partir de 768) | 18 / 1.55 / 400 | Normale | « Vous choisissez votre niveau d'accompagnement… » (L1-45) |
| Titre de section des pages vitrines (L1-49, L1-50) | 32 / 1.1 / 700 (40 à partir de 768) | 48 / 1.1 / 700 | Large | « Où en êtes-vous dans votre vente ? » (`look="showcase"`, jeton `text-lk-showcase`) ; heros des pages vitrines en 800 |
| Surtitre des pages vitrines (L1-49, L1-50) | 15 / 1.3 / 800, capitales, interlettrage 0,14 em | 17 / 1.3 / 800 | Normale | « VOTRE PROJET » (jetons `text-lk-eyebrow`, `text-lk-eyebrow-lg`, `tracking-lk-eyebrow`) ; libellés en capitales des cartes (« MA VALEUR IMMOBILIÈRE », numéros « 01 », « OPTION 1 », « MAINTENANT », « FAIT ») en `tracking-lk-caps` (0,1 em) ; exception de la section 1 |
| H2 | 20 / 1.2 / 700 | 22–24 / 1.15 / 700 | Large | « Votre dossier fait la différence auprès des vendeurs » |
| Titre d'en-tête d'app | 20 / 1.2 / 700 | — | Large | « Ma vente » |
| H3 / titre de section | 16 / 1.3 / 600 | 17 / 1.3 / 600 | Normale | « À faire », « Le bien », « Conversations » |
| Titre de barre | 15 / 1.3 / 600 | 15 | Normale | « Choisir ma formule », « Mon bien » |
| Prix principal | 26 / 1.0 / 700 | 30–32 / 1.0 / 700 | Large, tabulaire | « 350 000 € » |
| Prix de carte | 17 / 1.1 / 700 | 16–18 / 1.1 / 700 | Large, tabulaire | cartes de recherche |
| Prix d'une formule sur l'accueil | 36 / 1.05 / 700 | 36 / 1.05 / 700 | Large, tabulaire | « 990 € » de `PlanCard` `priceSize="large"` (L1-48, jeton `text-lk-display`) |
| Chiffre clé / indicateur | 15–22 / 1.0 / 700 | 17–22 | Large, tabulaire | « 248 », « 68 m² » |
| Corps | 15 / 1.55 / 400 | 15–16 / 1.6 / 400 | Normale | description d'annonce (14 accepté en mobile dense) |
| Corps compact | 13–14 / 1.5 / 400 | 13–14 | Normale | lignes de liste, messages |
| Libellé de champ | 13 / 1.3 / 500 | 13 | Normale | « Prénom et nom » |
| Bouton | 14–15 / 1 / 600 | 14–15 | Normale | — |
| Secondaire | 12–13 / 1.5 / 400 | 13–14 | Normale, `--lk-ink-3` | « Savigny-sur-Orge · centre » |
| Étiquette | 12 / 1.3 / 600 | 12 | Normale | « Prochaine action » (en `--lk-blue`), « Pour vous » (en `--lk-ink-3`) |
| Micro | 11 / 1.3 / 500–600 | 11 | Normale | badges, libellés de barre de navigation, compteurs |

Règles :
- Pas de texte sous 11 px. Le corps de lecture longue n'est jamais sous 14 px.
- Longueur de ligne maximale du corps : 68 caractères environ (`max-w-[640px]` en desktop).
- Titres : `text-wrap: balance`. Paragraphes : `text-wrap: pretty`.
- Chiffres : `tabular-nums` sur tous les montants, surfaces, compteurs et dates en tableau.
- Mots mis en valeur (les mots en dégradé des titres de la V1, `DECISIONS.md` 2026-10-20), le plus souvent la fin du titre (« Combien vaut *vraiment* votre bien ? » au milieu) : sur fond clair, en `--lk-blue` plein (« Où en êtes-vous dans *votre vente ?* » ; sur les pages vitrines depuis L1-49 et L1-50, en dégradé du bleu, `lk-text-grad`, section 1) ; sur un aplat bleu, la ligne de cote de `facade.svg` sous les mots (« de *votre vente.* » du hero), d'un seul tenant jusqu'à 14 caractères ; au-delà, un trait de même épaisseur sous chacune de leurs lignes, sans les traits de cote (« enfin simple, humaine et transparente. », qui passe à la ligne). Un seul accent par titre, jamais dans un texte courant, jamais de dégradé.

### 3.3 Formatage des nombres et du texte

- Montants : `Intl.NumberFormat('fr-FR')` puis espace insécable fine (U+202F) avant `€` : « 350 000 € ». En carte de carte géographique : « 350 k€ ».
- Surfaces : « 68 m² » avec U+202F. Prix au m² : « 5 147 € / m² ».
- Dates : « mardi 22 septembre », « 3 oct. à 10 h », « il y a 2 h ». Jamais de format `22/09/2026` dans l'interface (sauf PDF juridique et tableaux admin).
- Pièces : « 3 pièces » en titre, « 3 p » seulement dans les cartes compactes.
- Casse normale partout, y compris boutons, onglets et en-têtes de tableau ; seule exception, les surtitres et libellés de la V1 sur les pages vitrines (L1-49, L1-50, section 1).

---

## 4. Espacement, grilles, points de rupture

### 4.1 Échelle

Multiples de 4 px. Valeurs utilisées : 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 72.

| Usage | Valeur |
|---|---|
| Marge latérale mobile | 20 px (24 px sur les écrans de formulaire d'authentification) |
| Marge latérale desktop (barres, back office) | 40 px |
| Espace entre sections d'un écran mobile | 16 px |
| Espace entre sections d'une page desktop | 32 à 40 px |
| Padding intérieur d'une carte | 14 à 16 px (mobile), 16 à 22 px (desktop) |
| Espace titre de section → contenu | 8 à 10 px |
| Espace entre cartes d'une liste | 12 px |
| Espace libellé → champ | 6 px |
| Espace entre champs | 14 px |

### 4.2 Points de rupture

Conception mobile d'abord, en 390 px.

| Nom | Largeur | Comportement |
|---|---|---|
| base | < 768 | 1 colonne, navigation basse (`BottomNav`), en-têtes d'app |
| `md` | ≥ 768 | 2 colonnes pour les listes de cartes, navigation haute (`TopNav`), plus de `BottomNav` |
| `lg` | ≥ 1024 | Mises en page desktop des maquettes (recherche liste + carte, annonce avec colonne de prix) |
| `xl` | ≥ 1280 | Largeur de référence des maquettes desktop |

### 4.3 Conteneurs

| Conteneur | Largeur max | Padding |
|---|---|---|
| Pages publiques (accueil, annonce) | 1200 px centré | 40 px desktop, 20 px mobile |
| Accueil acquéreur connecté | 820 px de contenu centré (maquette : marges de 230 px sur 1280) | — |
| Formulaires (création de bien, offre) | 560 px centré en desktop | — |
| Recherche desktop | pleine largeur : liste 620 px + carte sur le reste | liste : 20 px 24 px 20 px 40 px |
| Back office | barre latérale 240 px + contenu fluide | contenu 28 px 32 px |

---

## 5. Formes, bordures, élévation, couches

| Élément | Rayon | Bordure | Ombre |
|---|---|---|---|
| Bouton, champ, select, case à cocher, puce de filtre carrée, vignette photo, bouton icône | 4 px (`rounded-sm`) | voir composant | aucune |
| Carte, panneau, encart, tableau, bulle de message, galerie | 6 px (`rounded-md`) | 1 px `--lk-line` | aucune |
| Badge de statut, compteur, marqueur de prix sur carte, avatar, segments de progression | `rounded-full` | — | marqueur : `shadow-float` |
| Bouton flottant (assistant), menu déroulant, panneau de notifications | 4–6 px | 1,5 px `--lk-ink` (bouton assistant) | `shadow-float` |
| Feuille mobile (bottom sheet) | 6 px en haut | — | `shadow-sheet` |
| Bulles de message | 6 px, coin côté expéditeur 2 px (`rounded-*-lk-xs`) | reçues : 1 px `--lk-line` | aucune |
| Bandeaux pleine largeur (`BrandPanel`, en-tête navy) | 0 | — | aucune |
| Pages vitrines seulement (L1-49, L1-50, section 1) : cartes de la V1 (situations, réponse, questions, options, jalons, sources, phases, valeurs) ; cartes d'étapes et de formules, tableau comparatif, formulaire, carte d'exemple, photos des heros | 12 px (`rounded-lk-lg`) ; 16 px (`rounded-lk-xl`) | 1 px `--lk-mist-line` (sur navy : blanc à 10 %) | `shadow-lk-card` (cartes), `shadow-lk-cta` (appels à l'action), `shadow-lk-lift` (carte et pastille posées sur la photo du hero) |

Couches (`z-index`) : contenu 0 · en-tête collant 20 · `BottomNav` 30 · bouton assistant 40 · panneau latéral et feuilles 50 · dialogue 60 · toast 70.

---

## 6. Icônes

- Bibliothèque : `lucide-react` (fournie avec shadcn/ui). Aucune autre.
- Trait 2 px (2,5 px pour les coches de validation), extrémités arrondies.
- Tailles : 14 (dans un texte), 16 (dans un bouton), 18 à 20 (bouton icône, en-tête), 22 (`BottomNav`).
- Couleur : héritée du texte ; `--lk-blue` pour une icône d'action ; `--lk-success` pour une validation ; `--lk-warning` pour une alerte.
- Correspondances utilisées dans les maquettes : recherche `Search`, filtres `SlidersHorizontal`, favoris `Heart`, messages `MessageSquare`, compte `User`, notifications `Bell`, calendrier `Calendar`, assistant `Sparkles` (étoile), retour `ChevronLeft`, cadenas `Lock`, document `FileText`, horloge `Clock`, baisse de prix `TrendingDown`, réglages `Settings`, fermer `X`, envoyer `Send`, aperçu `Eye`, ajouter `Plus`.
- Tout bouton icône a un `aria-label`.

---

## 7. Photos et dessin de marque

### 7.1 Photos de biens

- Servies par la route `/img` en WebP, tailles 400, 800, 1600 (`SPEC-V2` section 4, storage). `next/image` avec `sizes` exacts.
- Toujours `object-fit: cover`, `object-position: center`. Jamais de déformation.
- Ratios :

| Emplacement | Taille / ratio |
|---|---|
| Galerie annonce mobile | pleine largeur × 280 px |
| Galerie annonce desktop | grille `2fr 1fr 1fr`, 2 rangées de 150 px (180 px à partir de 1440), 10 px d'écart, rayon 6 |
| Carte de recherche mobile | 110 × 96 px, rayon 4 |
| Carte de recherche desktop | 200 × 140 px, rayon 4 |
| Tuile « Nouveaux biens » (accueil) | pleine largeur de tuile × 120 px, rayon 6 en haut |
| Tuile « Les derniers biens » (accueil public) | pleine largeur de tuile, ratio 3:2, rayon 6 en haut (L1-45 : tuiles plus larges, la photo d'abord ; L1-46 : les annonces récentes qui ont une photo avant les autres) |
| Grille « Résultats de votre dernière recherche » | ratio 4:3 environ (150 px de haut sur 1280) |
| Vignette dashboard, admin, conversation | 56 × 56, 56 × 44, 44 × 44 ; rayon 4 |
| Grille de photos du formulaire | carrés, 4 colonnes, 8 px d'écart |

- Superpositions sur photo : badge « Nouveau » (fond `--lk-blue`, texte blanc, 11 px 600, pastille) ; « Prix en baisse » (fond `--lk-success`) ; compteur « 1 / 9 » (fond `rgba(15,30,53,0.8)`, texte blanc, pastille) ; tuile « + 8 photos » (voile `rgba(15,30,53,0.55)`, texte blanc 13 px 600).
- Boutons sur photo (retour, favori) : 44 × 44, fond blanc, rayon 4, `shadow-float`.
- Chargement : fond `--lk-stone-2` puis fondu de 160 ms. Erreur ou absence : `facade.svg` centré sur `--lk-stone-2`.
- Texte alternatif : « Séjour, appartement 3 pièces à Savigny-sur-Orge » (pièce + bien + ville si la pièce est connue, sinon « Photo 2 sur 12 de l'appartement… »).

### 7.2 Photos de démonstration

Le seed utilise des photos d'illustration, jamais des photos d'annonces réelles : fournies par Younes (L1-46, `DECISIONS.md` 2026-10-20, droits confirmés : Q57) ou libres de droits (Unsplash, licence Unsplash), stockées dans `supabase/seed/photos/` avec leur provenance (`CREDITS.md`), recadrées sans descendre sous le minimum de 800 × 600 des vendeurs, et déposées par `db:seed` avec le compte de seed de leur propriétaire (jamais avec la clé de service), seulement sur les biens sans photo que leur propriétaire peut encore modifier. Une photo n'apparaît que pour un seul bien. Les photos des pages publiques sont dans `public/images/` (`leenkey/site/photos.ts`), en WebP de 400, 800 et 1 600 px : une photo dont les droits ne sont pas confirmés ne s'affiche jamais en production.

### 7.3 Dessin de marque `public/brand/facade.svg`

Dessin au trait d'une maison et de son annexe, avec une ligne de cote. Couleur par `currentColor` pour être blanc sur aplat bleu et `--lk-ink-3` sur fond clair.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 210" fill="none" aria-hidden="true">
  <g stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <path d="M60 200V90l90-60 90 60v110"/>
    <path d="M60 200h300"/>
    <path d="M240 200V120h100v80"/>
    <rect x="90" y="120" width="40" height="40"/>
    <rect x="170" y="120" width="40" height="40"/>
    <path d="M135 200v-34h30v34"/>
    <rect x="262" y="140" width="56" height="30"/>
  </g>
  <g stroke="currentColor" stroke-width="1">
    <path d="M60 22h180"/>
    <path d="M60 16v12M240 16v12"/>
  </g>
  <text x="150" y="14" fill="currentColor" font-family="Archivo, sans-serif" font-size="10" text-anchor="middle">9,40 m</text>
</svg>
```

Usages et réglages :

| Emplacement | Taille | Couleur | Opacité |
|---|---|---|---|
| Bandeau de l'accueil acquéreur (droite) | 380 × 210 | blanc | 55 % |
| Hero de la page d'accueil publique (remplacé par la photo de l'accueil depuis L1-46, s'il ne peut l'afficher) | 380 × 210 | blanc sur aplat bleu | 55 % |
| État vide | 150 × 83 | `--lk-ink-3` | 100 % |
| Annonce ou carte sans photo | 40 % de la largeur du cadre | `--lk-ink-3` sur `--lk-stone-2` | 100 % |
| Page 404, image de partage par défaut | libre | blanc sur bleu | 55 % |

---

## 8. Cartes géographiques

- Mapbox GL JS. Style : partir de `mapbox/light-v11` et désaturer (saturation globale −50 %), routes principales en gris chaud, eau en `#CFE0F0`. Noms de communes visibles à partir du zoom 11. Le style est enregistré dans le compte Mapbox de Leenkey et référencé par son URL dans `NEXT_PUBLIC_MAPBOX_STYLE` (à ajouter à `.env.example`).
- Zoom initial recherche : 12, centré sur Épinay-sur-Orge (48.6736, 2.3256), zone de lancement visible.
- Marqueur de prix : pastille, padding 6 × 10 px (mobile) ou 8 × 12 px (desktop), 12–13 px 600 tabulaire, fond blanc, texte `--lk-ink`, bordure 1,5 px `--lk-line`, `shadow-float`. Sélectionné ou survolé : fond `--lk-blue`, texte blanc, sans bordure, `z-index` au-dessus. Regroupement au-delà de 3 marqueurs qui se chevauchent : pastille ronde navy avec le nombre.
- Synchronisation liste ↔ carte : survol d'une carte de liste = marqueur sélectionné ; clic sur un marqueur = défilement vers la carte de liste et contour 2 px `--lk-blue` pendant 1,2 s.
- Localisation sur l'annonce : jamais l'adresse exacte. Cercle de 400 m de rayon centré sur `public_location`, remplissage `rgba(17,86,252,0.18)`, contour 2 px `--lk-blue`, étiquette blanche en bas à gauche « Secteur approximatif, centre de Savigny-sur-Orge » (11 px 600).
- Attribution Mapbox / OpenStreetMap toujours visible (exigence de licence), en bas à droite, 9–10 px.
- Hauteurs : carte de recherche mobile 200 px (repliée) ; desktop pleine hauteur sous les filtres ; annonce mobile 130 px ; annonce desktop 168 px.

---

## 9. Mouvement

| Interaction | Durée | Courbe |
|---|---|---|
| Survol, pression (couleur, fond) ; un bouton pressé : échelle 0,98 | 140 ms | `--ease-out-lk` |
| Trait sous un lien de la `TopNav` au survol, flèche d'un `MoreLink` qui avance | 220 ms | `--ease-out-lk` |
| Ouverture de panneau, feuille, menu ; contenu remplacé sur place (réponse de « Où en êtes-vous ») | 220 ms | `--ease-out-lk`, translation + opacité |
| Zoom de la photo d'une carte de bien au survol (1,04) | 500 ms | `--ease-out-lk` |
| Fondu d'image chargée | 160 ms | linéaire |
| Toast | entrée 220 ms, sortie 160 ms | — |
| Pages publiques : entrée du hero (les mots du titre un à un, 45 ms d'écart, puis le texte et les actions) ; montée des blocs d'une section quand ils entrent dans l'écran (24 px) ; cartes d'une grille décalées de 80 ms | 700 ms | `--ease-reveal-lk` (celle de l'accueil V1) |
| Pages publiques : dessin `facade.svg` qui se trace (hero, aplat final) ; ligne de cote sous l'accent d'un titre | 1,6 s ; 0,8 s | `--ease-reveal-lk` |
| Accueil : aperçu de l'espace vendeur monté en place, la tâche faite qui se coche (léger dépassement de l'échelle), puis un anneau autour de la tâche en cours, une fois | 450 ms ; 1,2 s | `--ease-out-lk` |
| Accueil : les étapes de l'aperçu qui se remplissent depuis la gauche ; la courbe de la valorisation qui se trace, ses quatre éléments qui arrivent quand elle les atteint à partir de 1 024 px (0,25 s, 0,35 s, 0,45 s, 0,7 s), l'un après l'autre en dessous, sans courbe | 1 s ; 1,6 s | `--ease-reveal-lk` |

- Montée des sections au défilement (décision de Younes du 2026-10-20, qui remplace « aucune animation d'entrée de section ») : pages publiques seulement (`PublicPage` : accueil, concept, tarifs, FAQ, investir, qui sommes-nous, contact), jamais dans les espaces connectés, les formulaires, la recherche ni l'annonce ; une seule fois par bloc. Ce qui est à l'écran à l'arrivée n'est jamais caché ; sans JavaScript, avec `prefers-reduced-motion` ou à l'impression, rien n'est caché.
- Repris de l'accueil V1 : montée des blocs et décalage des cartes, entrée mot à mot du titre, trait sous les liens du menu, réaction des boutons à la pression ; sur les pages vitrines depuis L1-49 et L1-50 (section 1), les appels à l'action `cta` qui s'élèvent de 2 px au survol et leur flèche qui avance, les situations qui s'élèvent de 2 px au survol (ce sont des boutons), le « + » des questions qui devient « − » (220 ms). Non repris (sections 1 et 5) : dégradés hors des pages vitrines (`text-grad`, trait en dégradé), flou, reflet animé des boutons, ombres au survol, élévation de cartes non cliquables (une fausse promesse de clic), parallaxe et zoom en boucle, compteurs animés (pas de chiffres inventés), pulsations sans fin.
- Aucun effet de parallaxe.
- Moments orchestrés : l'écran de fin de parcours (« C'est envoyé », « C'est activé ») avec le dessin `facade.svg` qui apparaît en fondu (360 ms) ; l'entrée du hero des pages publiques.
- `prefers-reduced-motion` respecté (section 2.2).

> **Mise en œuvre (L1-45).** `app/globals.css` (« Motion of the public pages ») et `components/shared/reveal-on-scroll.tsx`, monté par `PublicPage` : à l'arrivée, ce qui est sous l'écran reçoit `data-reveal-pending` (caché), puis `data-revealed` quand il entre dans l'écran (marge de 10 % en bas) ; `data-reveal` pour un bloc, `data-reveal-stagger` pour les enfants d'une grille, `data-reveal-draw` pour un dessin. `MarketingSection` fait monter son titre, puis son contenu (`revealContent`, ou sa grille en `data-reveal-stagger`). `BrandPanel` `hero` : mots du titre en `lk-rise`, dessin `lk-drawing-in` ; `page` : dessin tracé à son entrée dans l'écran. L'aperçu de l'espace vendeur de l'accueil coche son étape faite, puis signale l'étape en cours d'un anneau, une fois. Avec `prefers-reduced-motion`, la règle de 2.2 annule aussi les délais : rien n'attend. Les tests E2E tournent avec le mouvement ; chaque analyse axe passe d'abord en mouvement réduit (rien n'attend, les contrastes sont lus en entier) ; `tests/e2e/site-motion.spec.ts` vérifie le mouvement sur les sept pages publiques, avec et sans `prefers-reduced-motion`, et sans JavaScript.

---

## 10. Composants

Pour chaque composant : anatomie, dimensions, variantes, états. Les composants vivent dans `components/shared/` (génériques) ou `leenkey/<domaine>/components/` (métier), conformément à `CLAUDE.md`.

### 10.1 Contrôles

**Button**

| Variante | Fond | Texte | Bordure | Usage |
|---|---|---|---|---|
| `primary` | `--lk-blue` (survol `--lk-blue-hover`) | blanc 600 | — | une seule action principale par vue |
| `secondary` | blanc (survol `--lk-blue-tint`) | `--lk-blue` 600 | 1,5 px `--lk-blue-line` | action alternative |
| `outline-ink` | blanc (survol `--lk-stone-2`) | `--lk-ink` 600 | 1,5 px `--lk-ink` | actions de page publique : « Nouvelle recherche », « Voir les 12 biens », services de l'accueil |
| `ghost` | transparent | `--lk-blue` 600 (ou `--lk-ink-3` pour « Ignorer ») | — | actions tertiaires, « Enregistrer » en en-tête |
| `on-dark` | `--lk-ink` | blanc 600 | — | sur fond clair quand le bleu est déjà pris |
| `success` | `--lk-success` | blanc 600 | — | « Valider et publier » (back office uniquement) |
| `danger` | blanc | `--lk-danger` 600 | 1,5 px `--lk-danger` | « Retirer mon offre », « Supprimer » |
| `inverse` | blanc | `--lk-blue` 600 | — | sur aplat bleu (`BrandPanel`, fin de parcours, dernier appel) ; sur les fonds sombres des pages vitrines aussi (message de `/investir`, L1-50), anneau de focus blanc |
| `outline-inverse` | transparent (survol blanc 12 %) | blanc 600 | 1,5 px blanc | sur aplat bleu, à côté d'un bouton `inverse` ; sur navy, formules payantes de `/tarifs` (L1-50) |
| `cta` | dégradé `--lk-blue` → `--lk-blue-mid`, ombre `shadow-lk-cta` (survol : s'élève de 2 px, `shadow-lk-cta-hover`) | blanc 600 | — | pages vitrines seulement (L1-49, L1-50, section 1) : appels à l'action de la V1, avec `trailingIcon={ArrowRight}` |

| Taille | Hauteur | Padding horizontal | Police |
|---|---|---|---|
| `lg` | 52 px | 20 px | 15 px 600 |
| `md` | 44–48 px | 16 px | 14 px 600 |
| `sm` | 36–40 px | 12–14 px | 13 px 600 |

- Rayon 4 px. Icône à gauche, 16 px, écart 8 px.
- États : focus (anneau 2 px bleu, décalage 2 px), pressé (fond hover), désactivé (opacité 0,45, curseur interdit, pas de survol), chargement (libellé conservé, icône `Loader2` qui tourne à gauche, bouton désactivé).
- Boutons côte à côte en bas d'écran mobile : `Précédent` (`secondary`, flex 1) + `Continuer` (`primary`, flex 1,4), écart 10 px.

**IconButton** : 44 × 44 (40 × 40 dans le panneau de notifications), rayon 4. Variantes : `stone` (fond `--lk-stone-2`, retour en en-tête), `white-float` (fond blanc + `shadow-float`, sur photo), `tint` (fond `--lk-blue-tint`, cloche active), `on-dark` (fond `rgba(255,255,255,0.12)`), `outline` (bordure 1,5 px `--lk-ink`, fermer un panneau, rond). Icône 20 px.

**Input / Select / UnitInput / Textarea**

- Hauteur 48 px (44 px en barre de filtres desktop), padding 0 14 px, police 15 px 400, fond blanc, bordure 1,5 px `--lk-field`, rayon 4.
- Focus : bordure `--lk-blue` + anneau 3 px `--lk-blue-line`.
- Erreur : bordure `--lk-danger`, message dessous 12 px `--lk-danger`, icône `AlertCircle` 14 px, `aria-invalid` et `aria-describedby`.
- Libellé au-dessus : 13 px 500 `--lk-ink`, écart 6 px. Mention « (facultatif) » en `--lk-ink-3` 400.
- `UnitInput` : unité (`m²`, `€`) à droite dans le champ, 13 px `--lk-ink-3`.
- `Select` : chevron `ChevronDown` 16 px à droite ; select natif sur mobile.
- Textarea : hauteur minimale 120 px, padding 12 × 14.
- Barre de recherche (`SearchInput`) : icône `Search` 18 px à gauche, padding 0 14 px, écart 10 px.

**Checkbox** : 20 × 20, rayon 4, bordure 1,5 px `--lk-field`, cochée = fond `--lk-blue` + coche blanche. Libellé 12–13 px `--lk-ink-2`, cliquable.

**FilterSelect** (select de la `FilterBar` desktop) : 44 px, valeur courte affichée au-dessus d'un select natif transparent, jamais sur deux lignes, teinte bleue quand une valeur est choisie (L1-15).

**ChipButton** : forme d'un `ChipToggle` inactif ; ouvre le panneau des filtres sur son champ au lieu de basculer un état (L1-15).

**ChipToggle** (atouts, filtres rapides) : hauteur 40 px (36 px dans la barre de filtres mobile), padding 0 12–14 px, 13 px 500, rayon 4. Inactif : fond blanc, bordure 1,5 px `--lk-line`, texte `--lk-ink`. Actif : fond `--lk-blue-tint`, bordure 1,5 px `--lk-blue`, texte `--lk-blue`. `aria-pressed`.

**SegmentedPicker** (DPE A à G, choix du projet) : boutons égaux de 44 px, écart 6 px, rayon 4. Inactif : fond `--lk-stone-2`, texte `--lk-ink-2` 600 14 px. Actif : fond `--lk-blue`, texte blanc. Rôle `radiogroup`. Sombre (`tone="dark"`, `/tarifs` sur navy, L1-50, pages vitrines seulement) : cadre de verre (blanc à 6 %, filet blanc à 12 %, rayon 12, padding 4, écart 4), options blanc à 80 % de 44 px au moins (deux lignes possibles à 390 px), rayon 6 ; l'option choisie en blanc à texte `--lk-blue` (le bleu plein n'atteindrait que 2,5:1 contre le navy), anneau de focus blanc.

**RoleCard** (« Je vends » / « J'achète ») : 76 px de haut, 2 colonnes, écart 10 px, rayon 6, padding 0 14 px. Inactive : bordure 1,5 px `--lk-line`. Active : fond `--lk-blue-tint`, bordure 2 px `--lk-blue`, titre en bleu. Titre 14 px 600, sous-titre 12 px `--lk-ink-2`.

**Tabs** : texte 14 px 500 `--lk-ink-3`, actif `--lk-ink` 600 avec soulignement 2 px `--lk-blue` collé au bas. Pas de fond.

> **Mise en œuvre (L1-14).** `components/shared/link-tabs.tsx` (`LinkTabs`) : onglets en liens vers les pages d'un même objet (Infos, Photos, Annonce d'un bien), dans une `nav` nommée, l'onglet courant marqué `aria-current="page"` ; 44 px de haut, écart 24, ligne 1 px `--lk-line` sous la rangée, soulignement de l'onglet courant posé sur elle ; sous 768 px, la rangée va bord à bord et défile horizontalement.

**FilterPill** (onglets de statut du back office et du panneau de notifications) : hauteur 34–36 px, padding 0 14 px, 12 px, rayon 4. Actif : fond `--lk-navy` (`--lk-ink` dans les notifications), texte blanc 600. Inactif : fond blanc, bordure 1,5 px `--lk-line`, texte `--lk-ink` 500. Compteur intégré au libellé : « En attente · 3 ».

> **Mise en œuvre (L1-19).** `components/shared/filter-pills.tsx` : des liens (le filtre est dans l'adresse), `aria-current="page"` sur l'actif, zone tactile de 44 px (5 px de marge au-dessus et au-dessous de la liste qui défile, pour ne pas la couper) ; la liste défile de côté en mobile et passe à la ligne à partir de 768 px. Dans le back office, un statut sans annonce n'a pas de pastille, sauf « En attente de validation » et le filtre actif. `components/shared/textarea.tsx` : champ multiligne sur le modèle d'`Input` (libellé, aide, erreur), 120 px de haut au moins. `InlineAlert` accepte `live={false}` : sans rôle, dans une région annoncée déjà présente dans la page.

### 10.2 Affichage de données

**StatusBadge** : pastille, padding 4–5 × 8–10 px, 11 px 600. Libellés : ceux de `SPEC-V2` section 7 (table des statuts) ; la couleur est celle d'ici.

| Statut | Fond | Texte |
|---|---|---|
| Brouillon | `--lk-stone-2` | `--lk-ink-2` |
| En attente | `--lk-warning-bg` | `--lk-warning-fg` |
| Publiée | `--lk-success` | blanc |
| En pause | `--lk-blue-tint` | `--lk-blue` |
| Vendu | `--lk-ink` | blanc |
| Refusée (« À corriger » côté vendeur) | `--lk-danger-bg` | `--lk-danger-fg` |
| Suspendue | `--lk-danger-bg` | `--lk-danger-fg` (« Suspendue par Leenkey ») |
| Formule Sérénité | `--lk-navy` | blanc |
| Formule Accompagné | `--lk-blue-tint` | `--lk-blue` |
| Formule Autonomie | `--lk-stone-2` | `--lk-ink-2` |

**DpeBadge** : pastille, 11–12 px 600, couleurs de la section 2.1. Texte « DPE C » en annonce ; « C » seul dans les cartes compactes.

**FinancingBadge** : libellés exacts (`SPEC-V2` section 13) et couleurs :

| Statut | Libellé | Fond | Texte |
|---|---|---|---|
| `not_provided` | Financement non renseigné | `--lk-stone-2` | `--lk-ink-2` |
| `declared` | Informations déclarées | `--lk-warning-bg` | `--lk-warning-fg` |
| `document_provided` | Justificatif fourni | `--lk-blue-tint` | `--lk-blue` |
| `document_checked` | Justificatif vérifié | `--lk-success-bg` | `--lk-success-fg` |

Ligne de détail possible sous le badge : « Contrôlé par Leenkey le 30/09/2026 » (12 px `--lk-ink-3`). La mention obligatoire de `SPEC-V2` s'affiche au survol (desktop) ou au toucher (mobile) d'une icône `Info` 14 px.

**KeyFigures** (chiffres clés) : 4 tuiles (mobile, `grid-cols-4`, écart 8) ou 6 tuiles (desktop, `grid-cols-6`, écart 10). Tuile : fond `--lk-stone-2`, rayon 4, padding 10 × 6 (mobile, centré) ou 12 (desktop, aligné à gauche). Valeur 15 px (mobile) / 17 px (desktop) 700 large tabulaire `--lk-ink` ; libellé 11 px `--lk-ink-3`.

**KeyFactsTable** (« Ce que vous savez avant de visiter ») : conteneur rayon 6, bordure 1 px `--lk-line`. Lignes padding 11–12 × 14 px, séparateur 1 px `--lk-line`, 13 px. Libellé `--lk-ink-3`, valeur 600 `--lk-ink` alignée à droite. Valeurs d'état colorées : « Complets » `--lk-success`, « Sur demande » ou « Demander l'accès » `--lk-blue` (lien).

**PriceBlock** : prix 26–30 px 700 large tabulaire ; dessous « 5 147 € / m², sans commission » 12 px `--lk-ink-3`.

**StatTile** : carte blanche, bordure 1 px `--lk-line`, rayon 6, padding 14 × 12. Chiffre 22 px 700 large ; libellé 11 px `--lk-ink-3`. Par 3 en grille, écart 10.

**DataTable** (back office) : conteneur rayon 6, bordure `--lk-line`. En-tête : fond `--lk-stone-2`, 12 px 600 `--lk-ink-3`, casse normale, padding 12 × 20. Lignes : padding 14 × 20, 13 px, séparateur `--lk-line`, hauteur minimale 56 px. Actions de ligne alignées à droite sous la ligne (boutons `sm`). Indicateur de pré-analyse : pastille 8 px (`--lk-success` ou `--lk-warning`) + texte 12 px.

> **Mise en œuvre (L1-19).** `components/shared/data-table.tsx` : `DataTable` (nom accessible obligatoire), `DataTableHeader`, `DataTableRow`, `DataTableCell`, et `DataTableActions`, une ligne sous la ligne de données, sans séparateur entre les deux ; `DataTableRowHeader` (`<th scope="row">`) pour la cellule qui nomme la ligne ; texte des lignes en 13 px ; chaque annonce est un `<tbody>`. Indicateur de pré-analyse avec L1-30.

### 10.3 Biens et recherche

**PropertyCard**

| Variante | Mise en page | Contenu |
|---|---|---|
| `compact` (recherche mobile) | ligne, padding 10, écart 12, rayon 6, bordure `--lk-line`, fond blanc ; photo 110 × 96 rayon 4 | prix 17 px 700 large + DpeBadge (lettre seule) à droite ; « Appartement 3 p · 68 m² » 13 px 600 ; ville 12 px `--lk-ink-3` ; une ligne d'info 11 px (« Dossier complet » en `--lk-success` 600, ou « Publié il y a 2 jours » en `--lk-ink-3`) |
| `wide` (recherche desktop) | ligne, padding 12, écart 16, rayon 6 ; photo 200 × 140 rayon 4 | prix 22 px 700 large + DpeBadge « DPE C » ; titre 15 px 600 « Appartement 3 pièces · 68 m² » ; lieu + étage 13 px `--lk-ink-3` ; 2–3 puces d'atouts (fond `--lk-stone-2`, 11 px, rayon 4, padding 4 × 8) ; info de dossier 12 px |
| `tile` (accueil, biens similaires) | colonne, rayon 6, bordure `--lk-line` ; photo 120 px de haut | prix 16 px 700 large ; « 3 p · 64 m² · DPE C » 12 px `--lk-ink-2` ; ville 12 px `--lk-ink-3` ; badges sur photo (section 7.1) |

- Toute la carte est un lien (`<a>` englobant), focus visible sur la carte entière. Le bouton favori, s'il est présent, est un bouton séparé (44 × 44) en haut à droite de la photo.
- Survol desktop : bordure `--lk-ink-3`, aucun changement d'ombre ni de taille.

**SearchBar mobile** : `SearchInput` (flex 1) + bouton filtres 48 × 48 `primary` avec compteur de filtres actifs (pastille navy 20 px, bordure 2 px blanche, en haut à droite). Dessous, rangée de `ChipToggle` défilante horizontalement sans barre visible.

**FilterBar desktop** : fond blanc, padding 16 × 40, bordure basse `--lk-line`. `SearchInput` 300 px, selects 44 px (actifs : fond `--lk-blue-tint`, bordure `--lk-blue`, texte `--lk-blue`), « Plus de filtres » (`outline`), « Créer une alerte » (`secondary` avec icône `Bell`) poussé à droite. Les libellés ne passent jamais à la ligne (`whitespace-nowrap`) ; sous 1280 px, « Plus de filtres » regroupe Surface et DPE.

**ResultsHeader** : « 12 biens autour d'Épinay-sur-Orge » 14 px 600 ; tri à droite « Prix croissant » `ghost` avec `ChevronDown`.

**Gallery**

- Mobile : une photo pleine largeur 280 px, défilement horizontal à l'aimant (`scroll-snap`), compteur « 1 / 12 » en bas à droite, boutons retour et favori en haut. Toucher = plein écran.
- Desktop : mosaïque (section 7.1). Clic = visionneuse plein écran (fond `--lk-ink` 95 %, flèches 44 px, compteur, `Échap` pour fermer, focus piégé).

**FavoriteButton** (L1-18, `leenkey/favorites/components/favorite-button.tsx` : il appelle une action serveur, il n'est donc pas dans `components/shared`) : `IconButton` 44 × 44, cœur `Heart` `--lk-blue`, plein quand le bien est sauvegardé. `white-float` sur une photo (galerie mobile en haut à droite, `PropertyCard` de la page Favoris), `stone` à droite du prix dans la `PriceColumn` desktop (`AnnonceDesktop` n'en dessine pas). Bouton bascule : nom constant « Ajouter aux favoris » (« Ajouter aux favoris : Appartement 3 pièces · 68 m², Savigny-sur-Orge » sur la page Favoris, où plusieurs cœurs se suivent), `aria-pressed`, état affiché tout de suite puis remis si l'enregistrement échoue (refus, réseau), message pour les lecteurs d'écran (« Ajouté à vos favoris. »). Les cœurs d'une même annonce restent d'accord dans l'onglet ; une page lue après le changement (nouvelle visite, autre compte, autre onglet) l'emporte. Sans session : lien vers l'inscription acquéreur avec retour à l'annonce. Dans `/design`, section « Cartes ». Pas de cœur sur les cartes de la recherche (absent des maquettes `Recherche` et `RechercheDesktop`).

**Page Favoris** (L1-18, G2 sans carte) : nombre de biens 14 px `--lk-ink-3`, puis `PropertyCard compact` avec le cœur, une colonne, deux à partir de 768 px. Une carte retirée reste jusqu'à la visite suivante (le geste s'annule). Favoris qui ne sont plus en ligne (vendus, en pause, retirés) : sous la liste, la phrase « 1 bien de vos favoris n'est plus en ligne : vendu, en pause ou retiré. » 14 px `--lk-ink-3` et le bouton `ghost sm` « Les retirer de mes favoris » ; la confirmation 12 px `--lk-ink-3` s'affiche à la même place et reçoit le focus (le bouton disparaît avec ces favoris). Sans bien en ligne : `EmptyState` « Vos favoris ne sont plus en ligne » (la phrase en description, « Voir les biens »), le bouton centré dessous ; sans aucun favori : « Aucun favori pour l'instant ».

**ContactCard** (vendeur sur l'annonce) : avatar initiales 40 px navy, « Camille, propriétaire » 14 px 600, « Vente accompagnée par Leenkey · répond sous 24 h » 12 px `--lk-ink-3`, icône de vérification `--lk-success` à droite. Carte bordure `--lk-line` rayon 6 (mobile) ou tuile `--lk-stone-2` (desktop, dans la colonne prix).

**ActionBar annonce mobile** (collée en bas) : fond blanc, bordure haute `--lk-line`, padding 14 × 20 × 24. « Contacter le vendeur » `primary lg` (flex 1) + bouton icône calendrier 52 × 52 `secondary`.

**PriceColumn annonce desktop** (380 px, collante à 96 px du haut) : carte blanche bordure `--lk-line` rayon 6 padding 22, écart 16 : `PriceBlock`, `ContactCard`, « Contacter le vendeur » `primary lg`, grille 2 × « Demander une visite » / « Faire une offre » `secondary md`, mention 11 px centrée `--lk-ink-3`. Dessous : `AssistantNote`.

### 10.4 Vendeur

**AppHeader mobile** (écrans de formulaire et sous-pages) : fond blanc, bordure basse `--lk-line`, padding 20 × 20 × 14. Gauche : `IconButton stone` retour ; centre : titre 15 px 600 ; droite : action `ghost` (« Enregistrer ») ou espace de 44 px pour centrer. Option : barre de progression dessous (écart 14).

**ProgressBar** : libellés au-dessus (« Étape 2 sur 4 · Caractéristiques » 12 px `--lk-ink-3`, « 50 % » 12 px 600 `--lk-blue`), barre 6 px `rounded-full`, fond `--lk-line`, remplissage `--lk-blue`.

**SellerHeader** (dashboard « Ma vente ») : fond `--lk-navy`, angles droits, padding 20 × 20 × 24, écart 16, texte blanc.
- Ligne 1 : « Bonjour Camille » 12 px blanc 72 % / « Ma vente » 20 px 700 large ; à droite `IconButton on-dark` assistant.
- Carte du bien : fond `rgba(255,255,255,0.08)`, rayon 6, padding 12 : vignette 56 × 56 rayon 4, titre 14 px 600, « 350 000 € · publié le 18 sept. » 12 px 72 %, `StatusBadge` à droite.
- `StepProgress` compact : « Étape 3 sur 6 · Contacts et visites » à gauche, formule en blanc 600 à droite ; 6 segments de 6 px, écart 4, `rounded-full`, faits = `--lk-blue`, à venir = `rgba(255,255,255,0.2)`.

**NextActionCard** : étiquette « Prochaine action » 12 px 600 `--lk-blue` au-dessus ; carte blanche bordure `--lk-line` rayon 6 padding 16 : icône 40 × 40 fond `--lk-blue-tint` rayon 4, titre 15 px 600, détail 13 px `--lk-ink-3` ; deux boutons `md` (primary + secondary, flex 1).

**TaskList** : carte unique rayon 6, lignes padding 14 séparées par `--lk-line`. Rond 22 px : fait = plein `--lk-success` + coche blanche, texte barré `--lk-ink-3` ; en cours = contour 2 px `--lk-blue` ; à venir = contour 2 px `--lk-line`. Titre 14 px 500, détail 12 px `--lk-ink-3`, chevron à droite si cliquable. En-tête « À faire » 16 px 600 + lien « Toutes les étapes » 13 px 600.

**PhotoUploader** : grille 4 colonnes de carrés (rayon 4), première photo marquée « Principale » (pastille blanche 10 px 600 en bas à gauche). Compteur « 4 / 15 ». Bouton « Ajouter des photos » 48 px, bordure 1,5 px pointillée `--lk-blue-line`, texte `--lk-blue`. Glisser pour réordonner (poignée visible au focus clavier, flèches gauche/droite pour déplacer).

> **Mise en œuvre (L1-12).** `leenkey/properties/components/photo-uploader.tsx`, à la fin de l'étape 2 (après « Charges et copropriété », juste avant la barre d'actions, comme dans `Bien.png`). Titre « Photos » 13 px 500 (comme « Atouts »), compteur « 6 / 15 » `--lk-ink-3` (lu « 6 photos sur 15 »), phrase d'aide 12 px (formats, 10 Mo, la première est la principale) ; grille de 4 carrés, écart 8 px, rayon 4 ; « Principale » en pastille blanche 11 px 600 (`text-lk-micro`, pas de jeton de 10 px) ; poignée `GripVertical` blanche en haut à droite au focus clavier ; pendant l'envoi, un carré pierre avec `Loader2` et « Envoi… » par photo ; « Ajouter des photos » 48 px pointillé, désactivé à 15 (« 15 photos au maximum ») ; dépôt de fichiers sur tout le bloc (contour bleu pointillé) ; refus listés dans un `InlineAlert` danger, un par fichier, avec sa raison. Chaque photo est un bouton (« Photo 2 sur 6, Séjour, photo principale ») qui ouvre sa fiche : plein écran en mobile (`AppHeader` avec retour), dialogue de 520 px à partir de 768 px, comme les dialogues du back office ; photo en 4:3 sur pierre, légende (`Input` facultatif), « En faire la photo principale », « Déplacer avant » / « Déplacer après », « Supprimer la photo » `danger` avec confirmation ; ses messages sont lus dans la fiche (la page est masquée aux lecteurs d'écran pendant qu'elle est ouverte). `components/shared/property-thumb.tsx` montre la photo principale.

**InfoNote** (« Repris de votre estimation… ») : fond `--lk-blue-tint`, rayon 6, padding 14 × 16, icône 18 px `--lk-blue`, texte 13 px `--lk-navy`.

**PlanCard** (formules)
- Carte blanche, bordure 1,5 px `--lk-line`, rayon 6, padding 16, écart 10.
- Ligne de tête : nom 16 px 600 ; prix 20 px 700 large + « TTC » 11 px `--lk-ink-3`.
- Accroche 13 px `--lk-ink-3` (textes de Cédric, `SPEC-V2` section 11 bis).
- Liste à coches : icône `Check` 16 px `--lk-blue`, 13 px.
- Bouton plein largeur : `secondary` (Accompagné) ou `primary` (Sérénité).
- Formule recommandée : bordure 2 px `--lk-blue`, étiquette « Le plus complet » en pastille bleue 11 px 600 posée à cheval sur le bord haut (−12 px, gauche 16 px). Aucune ombre.
- Formule actuelle : ligne « Formule actuelle » 12 px 600 `--lk-success` avec coche.
- Prix en grand (`priceSize="large"`, section Tarifs de l'accueil, L1-48) : la ligne de tête ne garde que le nom ; le prix 36 px 700 large en bas de la carte, « TTC » 12 px `--lk-ink-3`, la note dessous ; les prix de cartes côte à côte restent alignés.
- Sombre (`tone="dark"`, accueil et `/tarifs`, L1-49, L1-50) : la carte de verre de la V1 sur navy, fond blanc à 4,5 %, filet blanc à 10 %, rayon 16, padding 28 × 24 ; nom 20 px 600 blanc, accroche blanc à 72 %, prix blanc, « TTC » et note blanc à 60 %.
- Pied : encart blanc bordure `--lk-line` : cadenas `--lk-success` + « Paiement sécurisé par carte via Stripe… » 12 px `--lk-ink-2`.

> **Mise en œuvre (L1-41).** `components/shared/plan-card.tsx` : liste à coches, note de pied (« Forfait fixe · payé à la souscription ») et action facultatives ; sans elles, la carte compacte (nom, prix, accroche, note) ; sur l'accueil, depuis L1-48, la variante à prix en grand (`priceSize="large"`, 10.4). Prix venant de la table `plans` (`core/billing/plans.ts`), « Gratuit » à 0 €. `/tarifs` (L1-42) : ligne de prix (« Forfait fixe TTC · payé à la souscription ») sous le nom, première ligne du texte de la formule en gras avant la liste (« Tout Autonomie, plus : »), lignes suivantes après ; formule mise en avant pendant le lancement : Autonomie (« Disponible gratuitement »), seule action `primary`.

**UpgradePrompt** : encart fond `--lk-blue-tint`, bordure 1 px `--lk-blue-line`, rayon 6, padding 14 × 16. Titre 14 px 600, texte 13 px, lien d'action `ghost` bleu. Toujours placé **après** le contenu utile (jamais avant, jamais en modale). Bouton de fermeture `X` 16 px.

### 10.5 Messagerie et assistant

**ConversationHeader** : fond blanc, bordure basse, padding 16 × 16 × 12. Retour (`IconButton stone`) ; vignette du bien 44 × 44 rayon 4 ; titre 14 px 600 tronqué (« Appartement 3 p · Savigny-sur-Orge ») ; sous-titre 12 px `--lk-ink-3` « Avec Thomas · justificatif vérifié » ; menu `MoreVertical`.

**MessageBubble** : largeur max 82 %, padding 12 × 14, 14 px / 1,5.
- Reçu : fond blanc, bordure `--lk-line`, rayon `6 6 6 2`.
- Envoyé : fond `--lk-blue`, texte blanc, rayon `6 6 2 6`.
- Méta dessous 11 px `--lk-ink-3` : « Thomas · 9:12 » / « Vous · 9:40 ».
- Séparateur de date centré 11 px `--lk-ink-3`.
- Message système (offre, visite) : pleine largeur, fond `--lk-stone-2`, rayon 6, 13 px, icône à gauche, lien d'action.

**AssistantSuggestion** : collée au-dessus du champ de saisie. Fond `--lk-blue-tint`, bordure `--lk-blue-line`, rayon 6, padding 12 × 14, écart 10. En-tête : `Sparkles` 16 px + « Réponse suggérée par l'assistant » 12 px 600 `--lk-blue`. Texte 13 px `--lk-navy`. Actions : « Utiliser » (`primary sm`, flex 1), « Modifier » (`secondary sm`, flex 1), « Ignorer » (`ghost` gris).

**Composer** : fond blanc, bordure haute, padding 10 × 12 × 22. Bouton calendrier (inviter à une visite, `IconButton stone`), champ 44 px **rectangulaire rayon 4** bordure `--lk-field`, bouton envoyer 44 × 44 `primary` rayon 4.

> **Mise en œuvre (L1-21).** `components/shared/conversation-header.tsx`, `message-bubble.tsx` (`MessageBubble`, `SystemMessage`, `MessageDate`) et `composer.tsx`, au catalogue `/design` (section « Messagerie »). `ConversationHeader` : le titre est le H1 de la page ; quand le bien a une page (fiche du bien pour le vendeur, annonce en ligne pour l'acquéreur), la vignette et le titre y mènent (lien étendu, cible de 44 px) ; sous-titre « Avec Chloé », et pour le vendeur seulement « Avec Chloé · Informations déclarées » (libellés de `FinancingBadge`). `MessageBubble` : coin de 2 px côté expéditeur (`rounded-bl-lk-xs` reçue, `rounded-br-lk-xs` envoyée, jeton `--radius-lk-xs`), sauts de ligne gardés, mot trop long coupé ; méta « Thomas · 9:12 » (heure de Paris). Fil : `role="log"` nommé « Messages de la conversation » (les nouveaux messages sont annoncés), un séparateur « Mardi 22 septembre » avant le premier message de chaque jour. `Composer` : libellé « Votre message » pour les lecteurs d'écran et en texte indicatif, champ de 44 px qui grandit jusqu'à cinq lignes puis défile, 4 000 caractères au plus ; bouton « Envoyer » (icône `Send`) inactif tant que le champ est vide, jamais pendant l'envoi (il garde le focus, une roue remplace l'icône) ; Entrée envoie au clavier et à la souris, Maj + Entrée passe à la ligne, Entrée passe à la ligne sur un écran tactile. Erreur d'envoi : `InlineAlert` danger au-dessus du champ, liée à lui ; conversation close : `InlineAlert` info à la place du champ. Bouton calendrier (L3) et `AssistantSuggestion` (L1-29) pas encore là. Menu `MoreVertical` (`IconButton` transparent) : menu Radix comme l'`AccountMenu`, « Signaler la conversation » ouvre le dialogue de 10.8 (motif), le focus revient au bouton ; la confirmation s'affiche sous l'en-tête. Focus : anneau à l'intérieur des lignes de la liste (la carte coupe ce qui dépasse), autour de la vignette et du titre pour le lien de l'en-tête (le titre tronqué le cacherait).

**AssistantNote** (« Résumé par l'assistant ») : fond `--lk-blue-tint`, rayon 6, padding 16 × 18, icône `Sparkles` 20 px bleu, titre 13 px 600 `--lk-navy`, texte 12 px.

**AssistantFab** (bouton flottant) : en bas à droite à 24 px, hauteur 48, padding 0 18, fond blanc, bordure 1,5 px `--lk-ink`, rayon 4, `shadow-float`, icône `Sparkles` bleue + « Assistant Leenkey » 14 px 600. En mobile : masqué au profit de l'onglet ou du bouton d'en-tête.

### 10.6 Navigation et structure

**TopNav desktop** : hauteur 72, fond blanc, bordure basse `--lk-line`, padding 0 40, écart 32. Logo officiel (`Logo` : la maison et sa clé, « leenkey », `public/brand/logo.svg`, `DECISIONS.md` 2026-10-18), 32 px de haut. Liens 14 px 500 `--lk-ink` (actif `--lk-blue`), écart 24. À droite, écart 6 : « Vendre mon bien » (`primary md` avec `Plus`, marge droite 10) ; cloche (`IconButton tint`, point bleu 9 px bordé de blanc si non lu) ; favoris (`IconButton` transparent) ; avatar 42 px fond `--lk-ink` initiale blanche 14 px 600 (ou « Mon compte » `secondary` si non connecté).

> **Mise en œuvre (L1-10).** `components/shared/top-nav.tsx`, collante en haut (couche 20), masquée sous 768 px. De 768 à 1023 px, padding 0 20 et écart 24 pour tenir dans 768 px ; 0 40 et 32 à partir de 1024 px. Cloche, favoris et avatar de 42 px, zone tactile de 44 px. Lien courant (`aria-current="page"`) : le plus long préfixe de l'adresse ; « Acheter » l'est aussi sur une annonce (`AnnonceDesktop`). Sans session : « Vendre mon bien », puis « Mon compte » (connexion, avec retour à la page et à ses filtres) ; ni cloche, ni favoris. L'avatar ouvre l'`AccountMenu`. Liens de Leenkey : « Acheter », « Vendre » (la page d'accueil, écrite pour les vendeurs), « Tarifs » (à partir de 1 024 px seulement : à 768 px il chevaucherait « Vendre mon bien » ; L1-41, `DECISIONS.md` 2026-10-19), « Valoriser mon bien » ; pas de « Guides » (`DECISIONS.md`, 2026-10-17).

> **Mise en œuvre (L1-45).** Liens de la `TopNav` (`DECISIONS.md` 2026-10-20) : « Acheter », « Vendre », « Tarifs » (à partir de 1 024 px), « Valoriser mon bien », « Qui sommes-nous » (à partir de 1 280 px), « Contact » (`/contact`, à partir de 1 024 px) ; en dessous de leur largeur, ils toucheraient « Vendre mon bien » : le menu mobile et le pied de page les ont. Sous chaque lien, un trait bleu de 2 px : tracé depuis la gauche au survol (220 ms), présent sous le lien courant.

> **Mise en œuvre (L1-51).** « Qui sommes-nous » est un groupe (`NavItem.items`, `DECISIONS.md` 2026-10-24) : un bouton au style des liens, `ChevronDown` 16 px après le libellé (écart 4, retourné à l'ouverture en 220 ms), qui montre « Leenkey et son fondateur » (`/qui-sommes-nous`) et « Investir dans Leenkey » (`/investir`) sous lui. Ouverture au survol de la souris (200 ms), au clic, à Entrée ou à Espace ; le clic qui suit une ouverture au survol la laisse ouverte. Fermeture : Échap (le focus revient au bouton), clic ailleurs, focus ou pointeur qui quitte le groupe (150 ms), lien suivi. Panneau de l'`AccountMenu` (blanc, bordure 1 px `--lk-line`, rayon 6, padding 6, `shadow-float`, 220 px de large au moins), à 8 px sous le bouton, le texte de ses lignes aligné sur le libellé ; lignes de 44 px, 14 px 500 `--lk-ink`, fond `--lk-stone-2` au survol et au focus, page ouverte en `--lk-blue` avec `aria-current`. Le bouton est en bleu et souligné sur les deux pages du groupe, et tant qu'il est ouvert. Accessibilité : motif « disclosure » (`aria-expanded`, `aria-controls`, liens dans l'ordre de tabulation), pas de rôle `menu`.

**SiteMenu** (en-tête mobile des pages publiques, G1 ; L1-41, `components/shared/site-menu.tsx`) : sous 768 px, collé en haut (couche 20), hauteur 60, fond blanc, bordure basse `--lk-line`, padding 0 20 : logo 28 px à gauche, `IconButton stone` « Menu » (`Menu`) à droite. Le menu est un dialogue Radix plein écran, ouvert du haut en 220 ms (aucun mouvement réduit) : en-tête de 60 px (logo, fermer `outline` rond), liens de 48 px (16 px 500, séparés par `--lk-line`, courant en `--lk-blue` avec `aria-current`) : ceux de la `TopNav` (contact compris ; ceux d'un groupe sous son intitulé, 13 px 600 `--lk-ink-3`, en retrait de 16 px : « Qui sommes-nous », L1-51) puis les autres pages du site (concept, FAQ) ; en bas, « Vendre mon bien » `primary lg` et « Mon compte » (« Mon espace » une fois connecté) `secondary lg`. Échap ou un lien suivi le referment, le focus revient au bouton.

**BottomNav mobile** : fond blanc, bordure haute `--lk-line`, padding 10 × 20 × 22 (zone de sécurité iOS incluse via `env(safe-area-inset-bottom)`), grille de 5 (4 dans le back office). Élément : icône 22 + libellé 11 px, écart 4 ; actif `--lk-blue` 600, inactif `--lk-ink-3` 500. Onglets par espace : acquéreur « Chercher / Favoris / Vendre / Messages / Compte » ; vendeur « Ma vente / Dossier / Acheter / Messages / Compte » ; admin « Annonces / Dossiers / Utilisateurs / Assistant ». Un même compte achète et vend (`DECISIONS.md`, 2026-10-19) : l'onglet du milieu mène à l'autre côté, « Messages » et « Compte » gardent leur place.

> **Mise en œuvre (L1-10).** `components/shared/bottom-nav.tsx` : fixée en bas (couche 30), `aria-current="page"` sur l'onglet du plus long préfixe de l'adresse (« Dossier », `/vendeur/dossier`, l'emporte sur « Ma vente », `/vendeur`) ; aucun onglet courant sur une page hors de la barre (accueil acquéreur `/acquereur`). Zone tactile de 48 px de haut. Dans les espaces connectés, les onglets sont ceux de l'espace de la page, suivi à chaque navigation (`SpaceProvider`, mise en page racine) ; une page sans espace propre (messages, compte, assistant, annonce) garde le dernier espace visité, recherche comprise. Une page qui l'affiche réserve sa hauteur (`BOTTOM_NAV_OFFSET`, `components/shared/nav-items.ts`) : la fin du contenu n'est jamais cachée. Icônes : `LayoutDashboard` pour « Ma vente » et `ClipboardList` pour « Annonces » (la maison des maquettes est réservée au logo et au dessin de marque, section 1 ; `DECISIONS.md`, 2026-10-17), `FileText`, `MessageSquare`, `User`, `Search` (« Chercher » et « Acheter »), `Heart`, `SquarePlus` (« Vendre », le plus de « Vendre mon bien »), `Folder`, `Users`, `Sparkles` (l'étoile de l'assistant, section 6). La recherche montre la barre acquéreur à tout visiteur ; une annonce n'en a pas (galerie et `ActionBar` seules). « Vendre » mène à `/vendeur` une fois connecté (le bien à créer, ou la vente en cours), à la page d'accueil écrite pour les vendeurs sans session (comme le lien « Vendre » de la `TopNav`). Le catalogue force l'onglet courant (`activeHref`) et place la barre dans le flux (`inline`).

**BrandPanel** : aplat pleine largeur, angles droits. Variantes `blue` (fond `--lk-blue`, titre blanc, secondaire `--lk-on-blue-2`, dessin `facade.svg` à droite à 55 %) et `navy` (fond `--lk-navy`). Hauteur de l'accueil acquéreur : 210 px desktop. Une carte peut chevaucher le bas du panneau (« Reprendre votre dernière recherche ») : carte blanche, bordure `--lk-line`, rayon 6, padding 24 × 26, **pas d'ombre** ; le chevauchement suffit à la détacher. Le hero de l'accueil n'est plus un `BrandPanel` depuis L1-49 (13.1), ni ceux des autres pages vitrines depuis L1-50 (`ShowcaseHero`) ; leur titre mot à mot et la ligne de cote sous l'accent viennent du même code (`components/shared/hero-title.tsx`).

**ShowcaseHero** (L1-50, `components/shared/showcase-hero.tsx`, pages vitrines seulement, section 1) : le hero de la V1, celui de l'accueil mis en commun. Fond `lk-hero-bg` et trame de points `lk-dots`, au-dessus du titre la pastille de l'accueil et de `/concept` (blanc à 10 %, filet blanc à 16 %, icône 14 px, 12 px 600) ou le surtitre des autres pages (13 px 700, capitales, interlettrage 0,14 em, `--lk-blue-light`) ; titre display 36, 44 puis 56 px 800 large, mot à mot, ses mots mis en valeur en `lk-text-grad-light` sur la ligne de cote `--lk-blue-light` (un trait sous chaque ligne au-delà de 14 caractères) ; texte 16 puis 18 px blanc à 80 %, 560 px au plus (un paragraphe ou plusieurs) ; actions (`cta lg` avec sa flèche ; leur anneau de focus est blanc, posé une fois sur leur conteneur) ; ce qui suit (les trois promesses de l'accueil). Une colonne de droite à partir de 1 024 px (1,05 / 0,95), dessous avant : la photo de l'accueil et ses cartes, celle de Cédric. Sans elle, le texte garde 760 px au plus. Le titre est lu entier (`aria-label`), les mots cachés des aides techniques.

**CtaPanel** (L1-49, L1-50, `leenkey/site/components/cta-panel.tsx`) : dernier appel des pages vitrines, le « cta-final » de la V1. Bleu (`lk-cta-bg`, halo blanc à 10 % derrière le titre, trame de points ronds) : titre 32, 40 puis 48 px 700 large centré, ses mots mis en valeur sur la ligne de cote, texte 16 puis 18 px blanc, action `inverse lg` avec sa flèche et `shadow-lk-raised`, une seconde en `outline-inverse` à côté à partir de 768 px, note 13 px avec `ShieldCheck` dans la ligne. Clair (`tone="light"`, `/qui-sommes-nous`, comme sa page V1) : fond blanc, mots mis en valeur en `lk-text-grad`, texte `--lk-ink-2`, action `cta lg` avec sa flèche, la seconde en `secondary`.

**NumberBadge** (L1-50, `leenkey/site/components/number-badge.tsx`) : le carré numéroté de la V1 (« step-n »), dégradé `--lk-blue` → `--lk-blue-mid` 135°, chiffre blanc 800 tabulaire, `shadow-lk-cta`. `md` 40 px rayon 12, chiffre 15 px (étapes de la vente de l'accueil) ; `sm` 32 px rayon 6, deux chiffres 13 px (« 01 » à « 04 » de l'outil de `/concept`). Caché des aides techniques : la liste ordonnée dit l'ordre.

**AdminShell** : barre latérale 240 px fond `--lk-ink`, padding 24 × 16, écart 24. Logo + « Back office » 11 px blanc 60 %. Liens 42 px, padding 0 12, rayon 4, icône 18 + libellé 14 px 500 blanc 80 % ; actif fond `--lk-blue` blanc 600 ; compteur pastille à droite (blanc sur bleu pour l'actif, `rgba(255,255,255,0.15)` sinon). Bas : carte utilisateur (avatar 34 px bleu, nom 13 px 600, rôle 11 px 60 %). Contenu : fond `--lk-bg`, padding 28 × 32, titre de page 24 px 700 large + sous-titre 13 px `--lk-ink-3`, actions à droite.

> **Mise en œuvre (L1-10).** `components/shared/admin-shell.tsx` : barre latérale (`admin-sidebar.tsx`) collante sur toute la hauteur à partir de 768 px ; en dessous, `AdminMobileHeader`, contenu à 20 px des bords et `BottomNav` admin. Ordre d'`AdminDesktop` : Tableau de bord (`LayoutGrid`, courant sur `/admin` seulement), Annonces (`ClipboardList`), Utilisateurs (`Users`), Dossiers (`Folder`), Offres (`FileText`), Signalements (`Flag`), Assistant (`Sparkles`) ; « Messages clients » arrive avec L1-34. Pastille de compteur seulement pour un nombre non nul : aucune avant les données du back office (L1-19, L1-30). La carte utilisateur ouvre l'`AccountMenu`, au-dessus d'elle. Focus en blanc sur `--lk-ink`. Sous 768 px, le titre de page (H1) reste pour les lecteurs d'écran, l'en-tête l'affiche.

**AdminMobileHeader** : fond `--lk-ink`, padding 20 × 20 × 16. « Back office » 11 px 60 % + « Aujourd'hui » 20 px 700 large ; avatar 40 px bleu. Trois tuiles compteurs (grille 3, écart 8, rayon 4, padding 12 × 10) : la première en `--lk-blue`, les autres `rgba(255,255,255,0.1)` ; chiffre 22 px 700 large, libellé 11 px.

> **Mise en œuvre (L1-10).** Le grand titre est celui de la page (libellé de l'élément courant de la barre latérale, « Back office » sinon) plutôt que « Aujourd'hui » ; l'avatar ouvre l'`AccountMenu`. Les trois tuiles compteurs arrivent avec les données du back office (L1-19, L1-30).

**AccountMenu** (L1-10, `components/shared/account-menu.tsx`) : menu déroulant ouvert par l'avatar de la `TopNav` (42 px, `--lk-ink`, initiale blanche 14 px 600), par celui de l'`AdminMobileHeader` (40 px, `--lk-blue`, 13 px) ou par la carte utilisateur de l'`AdminShell`. Panneau blanc, bordure 1 px `--lk-line`, rayon 6, padding 6, `shadow-float`, 220 px de large au moins, à 8 px du déclencheur, ouverture en 220 ms (fondu et translation, aucun mouvement réduit). Lignes de 44 px, padding 0 12, 14 px 500 `--lk-ink`, fond `--lk-stone-2` au survol et au clavier : « Mon espace » (accueil du rôle), « Mon compte » (`/compte`), séparateur 1 px `--lk-line`, « Se déconnecter ». Clavier : Entrée, Espace ou flèche bas ouvrent, flèches pour se déplacer, Échap referme et rend le focus. Non modal : la page garde sa barre de défilement et reste lisible par les technologies d'assistance. Sans prénom, une icône `User` remplace l'initiale.

### 10.7 Notifications

**NotificationBell** : `IconButton tint` 42 × 42 en desktop (pastille bleue 9 px si non lu), icône `Bell` 20 px. Annonce lecteur d'écran : « Notifications, 3 nouvelles ».

> **Mise en œuvre (L1-10).** `components/shared/notification-bell.tsx`. En mobile (`DECISIONS.md` Q26), en haut à droite de l'en-tête d'app ou du titre de chaque page des espaces (`SpacePage` ; l'accueil acquéreur n'est pas un onglet), 44 × 44 : `tint` sur fond clair ; `on-dark` sur un en-tête sombre tant que rien n'est non lu (`tone="dark"`). Nom accessible « Notifications », « Notifications, 3 nouvelles » quand il y a des non lues. Rien de non lu jusqu'aux notifications (L1-22, Realtime). Le back office n'a pas encore de cloche.

**NotificationPanel** : panneau latéral droit de 420 px (desktop) ou plein écran (mobile), fond blanc, bordure gauche `--lk-line`, ouverture 220 ms depuis la droite, fond de page assombri `rgba(15,30,53,0.4)`.
- En-tête 72 px : bouton fermer rond 40 px (bordure 1,5 px `--lk-ink`), « Notifications » 15 px 600, réglages `Settings` à droite.
- Filtres `FilterPill` : « Toutes », « Mes recherches », « Visites et offres » (acquéreur) ; « Toutes », « Messages », « Offres et visites » (vendeur).
- Groupes « Aujourd'hui », « Cette semaine », « Plus ancien » : 11 px 600 `--lk-ink-3`, casse normale, padding 10 × 16 × 4.
- `NotificationItem` : padding 14 × 16, écart 12, séparateur `--lk-line`. Visuel 40 px (rond pour un événement : fond selon le type ; carré rayon 4 pour une vignette de bien). Titre 13 px 600, détail 12 px `--lk-ink-2`, horodatage 11 px `--lk-ink-3`. Non lue : fond `--lk-blue-tint`, séparateur `--lk-blue-line`, point 8 px `--lk-blue` à droite.
- Pied : « Tout marquer comme lu » `ghost` + « Assistant Leenkey » `outline-ink sm`.
- État vide : `facade.svg` 150 px, titre 20 px 700 large centré, texte 13 px `--lk-ink-2`, bouton `primary` (« Créer une alerte » pour l'acquéreur, « Compléter mon annonce » pour le vendeur).

> **Mise en œuvre (L1-10).** Dialogue Radix : en-tête de 72 px (fermer, titre, réglages vers `/compte`) et état vide « Aucune notification » avec une phrase selon l'espace (vendeur : messages, visites et offres ; acquéreur : réponses des vendeurs et nouveautés des recherches), sans bouton : « Créer une alerte » attend les alertes (L3-06), « Compléter mon annonce » la fiche du bien et ses tâches (L1-14) ; avant, il ne mènerait qu'à la liste de « Ma vente », à un onglet de chaque page (`DECISIONS.md`, création du bien). Filtres, groupes, `NotificationItem` et pied arrivent avec les notifications (L1-22). Un lien du panneau le referme.

> **Mise en œuvre (L1-22).** La cloche compte les non lues en temps réel (Supabase Realtime, sous la RLS du destinataire) ; la pastille et « Notifications, 3 nouvelles » suivent. Sous l'en-tête du panneau : les filtres en `FilterPillButtons` (boutons `aria-pressed`, même dessin que `FilterPill`), « Toutes », « Messages », « Offres et visites » pour le vendeur, « Toutes », « Mes recherches », « Visites et offres » pour l'acquéreur, aucun dans le back office (un seul type) ; un filtre vide dit « Aucune notification de ce type pour l'instant. ». Groupes « Aujourd'hui », « Cette semaine » (les six jours d'avant), « Plus ancien », à l'heure de Paris, en casse normale (11 px 600 `--lk-ink-3`, padding 10 × 16 × 4). `NotificationItem` (`components/shared/notification-item.tsx`) comme ci-dessus : visuel rond de 40 px (message : fond `--lk-blue-tint`, bordure 1,5 px et icône `--lk-blue` ; annonce en ligne : `--lk-success-bg` ; annonce à corriger : `--lk-warning-bg` ; annonce à valider et autres : `--lk-stone-2`), horodatage « Il y a 12 min », « Hier », « Mardi », puis « 3 oct. » ; non lue : « , non lue » pour les lecteurs d'écran. Ouvrir une notification la marque lue et ferme le panneau ; ouvrir la conversation marque lues ses notifications de message. Pied : « Tout marquer comme lu » `ghost sm` (désactivé sans non lue) ; « Assistant Leenkey » arrive avec l'assistant (L1-28). Chargement : trois lignes `Skeleton` ; erreur : `InlineAlert` avec « Réessayer ». Les 50 dernières notifications. La roue mène à `/compte/notifications`. Cloche du back office : dans la barre latérale à droite du logo et dans l'en-tête mobile avant l'avatar (`tone="dark"`), état vide « Nous vous prévenons ici des annonces envoyées en relecture. » et « Voir les annonces à valider ».

### 10.8 Retours et états

**EmptyState** : centré, largeur max 360 px, écart 18 : `facade.svg`, titre 20 px 700 large, phrase utile 13–14 px `--lk-ink-2`, une action. Textes : `SPEC-V2` section 6 (« Le ton »).

**Skeleton** : blocs `--lk-stone-2`, rayon identique à l'élément remplacé, pulsation d'opacité 0,6 → 1 en 1,2 s (désactivée en mouvement réduit). Jamais de spinner plein écran.

**ComingSoon** (L1-10, `components/shared/coming-soon.tsx`) : page dont l'écran arrive avec une tâche suivante. Sous le H1 de la page, un `EmptyState` (marges de 40 puis 56 px en hauteur) : titre « Vos réglages arrivent », une phrase sur l'écran qui arrive, jamais une date ; au plus une action (« Se déconnecter » sur le compte jusqu'à L1-39). Textes : `lib/i18n/fr.ts`, `placeholders`.

**Toast** : en bas au centre (mobile, au-dessus de la `BottomNav`) ou en bas à droite (desktop). Fond `--lk-ink`, texte blanc 14 px, rayon 4, padding 12 × 16, action en `--lk-on-blue-2` 600. Durée 5 s, `role="status"`.

**Alert inline** (`InlineAlert`, L1-15) : fond `--lk-warning-bg` / `--lk-danger-bg` / `--lk-blue-tint`, rayon 6, padding 10 × 12, icône 14 px, texte 12–13 px de la couleur `-fg`.

**Dialog / écran de confirmation** : desktop = dialogue centré 520 px, fond blanc, rayon 6, padding 24, titre 20 px 700 large, actions alignées à droite. Mobile = écran plein (pas de modale) avec en-tête retour. Les confirmations à portée juridique (acceptation d'offre) sont **toujours** des écrans pleins, jamais des dialogues (section 13.3).

> **Mise en œuvre (L1-14).** `components/shared/confirm-dialog.tsx` (`ConfirmDialog`), sur le gabarit du dialogue de motif du back office (L1-19) : en mobile, écran plein avec l'en-tête de l'`AppHeader` (retour, titre 15 px 600 centré) ; à partir de 768 px, dialogue de 520 px au centre, titre 20 px 700 large et croix ; couche 60 ; texte 13 px `--lk-ink-2`, champs facultatifs dessous (prix de vente final), puis « Annuler » `outline-ink` et la confirmation `primary` ou `danger` avec son état de chargement. Fermé par Échap, la croix ou « Annuler », jamais pendant l'action ; une erreur reste dans le dialogue, dans une région lue dès qu'elle apparaît ; sans décision, le focus revient au bouton qui l'a ouvert.

**EndOfFlow** (« C'est envoyé », « C'est activé ») : `BrandPanel blue` plein écran (mobile) ou 60 % de la hauteur (desktop), `facade.svg`, titre display, texte 15 px `--lk-on-blue-2`, bouton blanc à texte `--lk-blue` 600 (variante `inverse` du bouton, réservée aux aplats bleus).

**ConsentBanner** (bandeau cookies, L1-37) : non modal, la page reste utilisable. Mobile : feuille basse pleine largeur (rayon 6 en haut, bordure haute `--lk-line`, `shadow-sheet`, padding 20, zone de sécurité iOS) ; à partir de `md` : carte de 420 px en bas à gauche (marge 24, rayon 6, bordure). Couche 50 (feuilles) ; `shadow-sheet` en mobile, `shadow-float` en carte ; entrée 220 ms (fondu et montée), aucune en mouvement réduit. Titre 15 px 600, texte 13 px `--lk-ink-2` qui dit comment changer d'avis (« Gérer mes cookies », en bas de page), avec lien « Politique cookies ». « Refuser » et « Accepter » côte à côte, **même forme** (`outline-ink`, deux colonnes) : refuser est aussi simple qu'accepter (CNIL). « Personnaliser » en `ghost sm` dessous. Vue « Vos préférences » (Personnaliser, « Gérer mes cookies ») : « Nécessaires » toujours actifs, case « Mesure d'audience » décochée par défaut, « Refuser » (`outline-ink`) et « Enregistrer mes choix » (`primary`) ; à l'ouverture depuis le pied de page, le focus va au titre.

**FaqList** (L1-42, `components/shared/faq-list.tsx`) : questions dépliables en `<details>` natifs (clavier et lecteurs d'écran sans script, réponse trouvée par la recherche du navigateur). Depuis L1-50, les cartes de la V1 (pages vitrines seulement, section 1) : une carte de rayon 12 par question, écart 14 ; question 16 puis 17 px 600, hauteur 56 px au moins, padding 20 puis 22 × 24 ; à droite, le « + » de la V1 (deux traits de 2 × 17 px) qui devient « − » à l'ouverture (220 ms, aucun mouvement réduit) ; réponse 15 px, 640 px au plus. Claire (`tone="light"`, accueil, `/investir`) : carte blanche bordée de `--lk-mist-line`, ouverte bordée de `--lk-blue-line` avec `shadow-lk-card`, question `--lk-ink`, signe `--lk-blue`, réponse `--lk-ink-2`. Sombre (`tone="dark"`, `/faq` sur navy) : carte de verre (blanc à 4,5 %, filet blanc à 10 % ; ouverte, filet blanc à 24 % et `shadow-lk-raised`), question blanche, signe `--lk-blue-light`, réponse blanc à 72 %, liens `--lk-blue-light` (`RichText tone="dark"`). Les cartes montent l'une après l'autre (section 9). Fermées au départ.

**StagePill** (L1-43, `leenkey/site/components/stage-pill.tsx`) : étape d'un jalon de `/investir`, en toutes lettres, même pastille que `StatusBadge` (10.2, 11 px 600) : « Fait » `--lk-success-bg` / `--lk-success-fg`, « En cours » `--lk-blue-tint` / `--lk-blue`, « À venir » `--lk-stone-2` / `--lk-ink-2`. À droite du titre de la carte, aligné sur sa première ligne.

**SiteFooter** (pied de page des pages V2, L1-36) : fond `--lk-bg`, bordure haute `--lk-line`, conteneur 1200 px, padding 32 × 20 (40 en `md`). D'abord les pages du site (L1-41 : « Découvrir Leenkey », concept, tarifs, FAQ, investir, qui sommes-nous), 14 px 500 `--lk-ink`, écart 24 ; puis les liens légaux 13 px `--lk-ink-2` en ligne qui passe à la ligne (écart 20, chaque lien haut de 44 px), soulignés au survol, puis « Gérer mes cookies » (bouton à l'allure d'un lien). Dessous, 12 px `--lk-ink-3` : « SAS LEENKEY, RCS Évry … · adresse légale », puis « © 2026 Leenkey ». Sous toutes les pages (le pied V1 a disparu avec L1-43) : pages du site, estimateur (au-dessus de la barre fixe du formulaire, qui lui laisse 80 px), pages légales, authentification, recherche, annonce (sous 1024 px, 96 px de plus dessous pour la barre d'action fixe, affichée jusqu'à 1023 px), espaces vendeur et acquéreur, back office (sous le contenu, à côté de la barre latérale : prop `footer` d'`AdminShell`). Avec la `BottomNav`, il reste au-dessus de la barre en fin de page ; sur une page courte, il est en bas de l'écran (`main` en `flex-1`).

---

## 11. Gabarits d'écran

Tout écran de la V2 relève d'un de ces gabarits.

| Gabarit | Mobile | Desktop |
|---|---|---|
| **G1 Page publique** | `TopNav` simplifié (logo + menu), contenu sur blanc, marges 20 | `TopNav`, conteneur 1200, fond blanc |
| **G2 Liste + carte** | barre de recherche, carte repliable 200 px, liste | `FilterBar`, liste 620 px + carte |
| **G3 Fiche** | galerie 280 px, contenu, `ActionBar` collée | galerie mosaïque, colonne de contenu + colonne collante 380 px |
| **G4 Tableau de bord** | en-tête navy (`SellerHeader`) ou `BrandPanel`, cartes sur `--lk-bg`, `BottomNav` | `TopNav`, `BrandPanel` 210 px, contenu centré 820 px |
| **G5 Formulaire à étapes** | `AppHeader` + `ProgressBar`, champs, barre d'actions collée (Précédent / Continuer) | contenu centré 560 px, même ordre, barre d'actions en bas du formulaire |
| **G6 Conversation** | `ConversationHeader`, fil, `AssistantSuggestion`, `Composer` | liste des conversations 360 px à gauche + fil à droite |
| **G7 Back office** | `AdminMobileHeader`, `FilterPill`, cartes d'action, `BottomNav` admin | `AdminShell`, titre, `FilterPill`, `DataTable` |
| **G8 Fin de parcours** | `EndOfFlow` plein écran | `EndOfFlow` sur 60 % + récapitulatif dessous |
| **G9 Réglages / compte** | `AppHeader`, sections en cartes blanches sur `--lk-bg`, lignes de 56 px | colonne de 720 px centrée, sommaire à gauche (200 px) |
| **G10 Page légale** | texte 15 px / 1,6, largeur 640, titres H2, encart « en cours de rédaction » tant que le texte définitif manque, adresse légale, `SiteFooter` | idem, centré |

> **Mise en œuvre (L1-41).** G1 : `PublicPage` (`leenkey/site/components/public-page.tsx`) = `TopNav` à partir de 768 px, `SiteMenu` dessous, contenu sur blanc, `SiteFooter`. Le contenu se compose de `MarketingSection` (`components/shared/marketing-section.tsx`) : pleine largeur, fond blanc ou `--lk-stone` en alternance (`--lk-navy` pour les sections vitrines de l'accueil depuis L1-47 et L1-48, section 13.1 ; sur les pages vitrines depuis L1-49 et L1-50, `look="showcase"` : tête de section de la V1, `eyebrow`, fond `--lk-mist`, tête à gauche avec `align="start"` au-dessus de deux colonnes, voir section 1 et 13.1), conteneur 1200 px, padding 48 puis 72 px en hauteur ; titre h2 au rôle H1 (26 puis 32 px, large, `text-wrap: balance` ; 26 puis 40 px depuis L1-45, section 3.2) sous le titre display du hero, texte de 640 px au plus (15 puis 16 px `--lk-ink-2` ; 15, 16 puis 18 px depuis L1-45), lien à droite à partir de 768 px ; aucune étiquette au-dessus du titre (13.2). Sur `--lk-stone`, le bleu n'atteint que 4,4:1 : le texte y est en `--lk-ink` ou `--lk-ink-2`, les liens en encre ; seuls les mots mis en valeur d'un titre (26 px et plus, gras : grand texte, seuil 3:1) y sont en bleu (L1-45, 3.2). `MoreLink` (`components/shared/more-link.tsx`) : « Voir les 12 biens », « Toutes les questions », 14 px 600 avec l'icône `ArrowRight` 16 px, bleu sur blanc, encre sur pierre. Cartes de contenu : blanches, bordure `--lk-line`, rayon 6, padding 20 puis 24.

> **Mise en œuvre (L1-43).** `/investir` et `/qui-sommes-nous` ont suivi G1 en « Façade » (`BrandPanel` hero, `MarketingSection` en alternance blanc / pierre, `BrandPanel` final) jusqu'à L1-50 ; elles sont depuis dans la direction de la V1 (section 1, 13.1). G10 : `LegalPage` (`app/(public)/_components/legal-page.tsx`) avec la date de mise à jour en 12 px `--lk-ink-3` sous le titre, sans l'encart « en cours de rédaction » pour les textes en vigueur (mentions légales, CGU) ; `LegalSections` : titre de section en h2 17 puis 18 px 600 avec son ancre, intertitres 15 px 600, listes à puces `--lk-ink-3`, identité de l'éditeur et de l'hébergeur sur une tuile `--lk-stone-2`, encart « Important » en `InlineAlert` `warning` sans annonce ; sommaire des CGU en cadre bordé, liens 13 px vers chaque article. `/estimer` : le wizard V1 garde ses styles (hors portée `.facade`) sous l'en-tête V2 collé en haut, sa barre de progression collée sous lui (60 puis 72 px), en attendant son re-stylage (L1-44).

---

## 12. Écrans dessinés : spécification détaillée

Capture de référence entre parenthèses. Les valeurs non citées suivent les composants de la section 10.

### 12.1 Inscription `/inscription` (`Inscription.png`, G5 simplifié)
Fond blanc. En-tête : retour `stone` / logo 28 px de haut / espace 44. Bloc titre (padding 28 × 24 × 0) : H1 « Créez votre compte » 26 px ; « Un seul compte pour vendre votre bien ou pour chercher le vôtre. » 14 px `--lk-ink-3`. `RoleCard` ×2. Champs (écart 14) : Prénom et nom, Email, Téléphone (facultatif), Mot de passe. Case CGU avec liens. « Créer mon compte » `primary lg` plein largeur ; « Déjà un compte ? Se connecter ». Pied collé en bas : cadenas `--lk-success` + « Vos données restent confidentielles. Aucune diffusion à des tiers. » 12 px.

### 12.2 Création du bien, étape 2 `/vendeur/biens/nouveau` (`Bien.png`, G5)
Fond `--lk-bg`. `AppHeader` « Mon bien » + « Enregistrer » + `ProgressBar` « Étape 2 sur 4 · Caractéristiques / 50 % ». `InfoNote` de reprise d'estimation. Type de bien (select). Grille 2 × 2 : Surface (`UnitInput` m²), Pièces, Chambres, Étage. DPE (`SegmentedPicker` A–G). Atouts (`ChipToggle` en flex-wrap, écart 8). `PhotoUploader`. Barre d'actions collée Précédent / Continuer.

> **Mise en œuvre (L1-11).** `app/(forms)` : écrans plein écran, sans `TopNav` ni onglets, sur `--lk-bg`, colonne de 560 px. `components/shared/app-header.tsx` (retour `IconButton stone`, titre 15 px 600, « Enregistrer » `ghost sm`, progression dessous), `progress-bar.tsx` (`role="progressbar"`, libellé et pourcentage au-dessus), `form-action-bar.tsx` (sous 768 px, en bas de l'écran même sous un formulaire court, avec la zone de sécurité iOS et sans le pied de page dessous ; à la fin du formulaire ensuite ; « Précédent » flex 1, « Continuer » flex 1,4, écart 10 px, section 10.1). Étape 1 (pas de maquette) : titre « Où se trouve votre bien ? » 20 px 700 large, phrase sur la confidentialité de l'adresse, champ d'adresse en `combobox` (liste déroulante rayon 6, `shadow-float`, flèches haut et bas, Entrée, Échap ; nombre d'adresses annoncé), puis l'adresse choisie dans une carte blanche avec « Changer d'adresse », le focus sur « Continuer » et l'adresse annoncée. Étape 2 dans l'ordre de `Bien.png` (type, grille 2 × 2 surface, pièces, chambres, étage, DPE, atouts), puis Carrez, étages, année, chauffage, GES et « Charges et copropriété » ; les champs qui ne concernent pas le type sont masqués, comme la page annonce les montre (maison et autre bien : ni étage ni ascenseur, « Niveaux » au lieu des étages de l'immeuble, Carrez facultative pour un lot de copropriété ; terrain : surface et taxe foncière, sans le bloc « Charges et copropriété ») ; les erreurs s'affichent sous chaque champ et le focus va au premier. `PhotoUploader` à la fin (section 10.4, L1-12).

### 12.3 Ma vente `/vendeur` (`Dashboard.png`, G4)
Fond `--lk-bg`. `SellerHeader`. Contenu padding 20, écart 16 : `NextActionCard` ; 3 `StatTile` (vues · 7 j, contacts, qualifiés) ; `TaskList` « À faire » ; « Conversations » : lignes (avatar 40 rond, nom 14 px 600 + heure 11 px, aperçu 13 px tronqué, point non lu 10 px bleu). `BottomNav` vendeur.

### 12.4 Formules `/vendeur/formule` (`Formule.png`)
Fond `--lk-bg`. `AppHeader` « Choisir ma formule ». H1 22 px large « Un forfait fixe par bien. Jamais de commission. » + texte 13 px. `PlanCard` Autonomie (actuelle), Accompagné, Sérénité (recommandée). Encart paiement Stripe.

### 12.5 Recherche mobile `/acheter` (`Recherche.png`, G2)
En-tête blanc padding 18 × 20 × 12 : `SearchBar` + puces (Appartement, ≤ 400 k€, 3 pièces + actives ; Extérieur, DPE inactives). Carte 200 px avec marqueurs. `ResultsHeader` « 12 biens / Prix croissant ». Liste de `PropertyCard compact` (écart 12, padding 0 20). `BottomNav` acquéreur. Option : carte agrandissable en plein écran (bouton « Carte » flottant en bas au-dessus de la liste au défilement).

### 12.6 Recherche desktop (`RechercheDesktop.png`, G2)
`TopNav` ; `FilterBar` ; grille `620px | 1fr`. Liste : `ResultsHeader`, `PropertyCard wide` (écart 14). Carte : pleine hauteur, bordure gauche `--lk-blue-line`. Corriger l'écart connu (section 17) : « Créer une alerte » ne passe pas à la ligne.

### 12.7 Annonce mobile `/annonce/[slug]` (`Annonce.png`, G3)
Galerie 280 px (retour, favori, compteur). Bloc padding 20 × 20 × 0, écart 14 : prix 26 px + `DpeBadge` « DPE C » ; titre 15 px 600 ; lieu 13 px `--lk-ink-3`. `KeyFigures` (68 m², 3 pièces, 2 chambres, 3e étage). `ContactCard`. « Le bien » : description 14 px / 1,6 tronquée à 6 lignes + « Lire la suite ». « Ce que vous savez avant de visiter » : `KeyFactsTable`. « Localisation » : carte 130 px avec secteur. `ActionBar` collée.

### 12.8 Annonce desktop (`AnnonceDesktop.png`, G3)
`TopNav` ; fil d'Ariane 13 px `--lk-ink-3` (« Acheter › Savigny-sur-Orge › Appartement 3 pièces, centre ») ; galerie mosaïque ; grille `1fr | 380px`, écart 40. Colonne gauche : H1 26 px large + lieu 14 px ; badges DPE et « Dossier complet » à droite ; `KeyFigures` 6 tuiles ; « Le bien » ; grille 2 colonnes `KeyFactsTable` + Localisation (168 px). Colonne droite : `PriceColumn` + `AssistantNote`.

### 12.9 Messagerie `/messages/[id]` (`Messagerie.png`, G6)
Fond `--lk-bg`. `ConversationHeader`. Fil padding 16, écart 12. `AssistantSuggestion` collée en bas du fil. `Composer`.

> **Mise en œuvre (L1-21).** La page défile : l'en-tête reste collé en haut (sous la `TopNav` à partir de 768 px) et le `Composer` en bas ; à l'ouverture, le fil montre son dernier message, puis un message qui arrive garde le lecteur en bas, sauf s'il est remonté lire. Sous 768 px : ni `BottomNav` ni pied de page (le champ resterait sous la barre), retour « Toutes les conversations » ; le clavier réduit la page (`interactive-widget=resizes-content`). À partir de 768 px, `TopNav` et pied de page (sous la conversation). À partir de 1 024 px (G6 desktop) : la liste à gauche (360 px, son propre défilement, la conversation ouverte en `--lk-blue-tint` avec `aria-current`), la conversation à droite, sans bouton retour ; `/messages` y montre « Choisissez une conversation » (`EmptyState`). Liste `/messages` (mobile, gabarit des espaces : H1 et cloche, `BottomNav`) : lignes dans une carte blanche bordée, vignette 44 × 44, prénom 14 px 600 et heure 11 px, le bien en 12 px `--lk-ink-3`, le dernier message en 13 px sur une ligne (`--lk-ink` 600 et point bleu de 10 px quand il est non lu), groupes titrés (`SectionTitle`) par bien pour un vendeur de plusieurs biens. Premier message `/messages/nouveau` : même gabarit, en-tête du bien (retour vers l'annonce), une `InfoNote` « Présentez-vous et posez vos questions : Bruno vous répond ici. », le `Composer`.

### 12.10 Accueil acquéreur connecté `/acquereur` (`AccueilDesktop.png`, G4)
- `TopNav` connecté.
- `BrandPanel blue` 210 px : « Bonjour Thomas » display (30 px dans la maquette ; 36–44 px accepté) + « Des biens vendus directement par leurs propriétaires. Sans frais d'agence. » 14 px `--lk-on-blue-2` ; `facade.svg` à droite.
- Carte « Reprendre votre dernière recherche ? » (600 px, chevauche le bas du bandeau) : titre 18 px 600, critères 13 px `--lk-ink-3`, badge « 3 nouveaux biens » (`--lk-blue-tint` / bleu), boutons « Reprendre » (`primary md`) et « Nouvelle recherche » (`outline-ink md`) en 2 colonnes.
- Section « Pour vous » (étiquette 12 px `--lk-ink-3`) + H2 « Votre dossier fait la différence auprès des vendeurs ». Conteneur bordure `--lk-line` rayon 6 padding 14, grille `290px | 1fr` : panneau dossier (fond `--lk-stone-2`, rayon 4, padding 18 : compteur « 2/3 » dans un carré blanc 52 px, titre 15 px 600, 3 lignes à coches, texte d'explication, « Ajouter mon justificatif » `primary`) ; carrousel « Nouveaux biens dans votre alerte » (3 `PropertyCard tile`, flèches 34 px rondes bordées).
- « Nos services » : 4 boutons `outline-ink sm` (Estimer mon bien, Vendre sans commission, Calculer mon budget, Prix au m² de la zone).
- « Vos visites et offres » : 2 cartes (pavé date 52 px fond `--lk-blue-tint` « SAM. / 3 » ou icône horloge fond `--lk-warning-bg`, titre 14 px 600, détail 12 px, lien d'action à droite).
- « Résultats de votre dernière recherche » : icône dans un carré 36 px `--lk-stone-2`, titre 15 px 600 + critères 12 px ; « Voir les 12 biens » `outline-ink sm` avec flèche ; grille de 4 photos.
- `AssistantFab`.
- Mobile : même ordre, carrousel horizontal, `BottomNav` acquéreur, pas de `AssistantFab`.

### 12.11 Notifications (`Notifications.png`)
Voir 10.7. Deux états dessinés : liste et vide.

### 12.12 Back office annonces desktop `/admin/annonces` (`AdminDesktop.png`, G7)
`AdminShell` ; titre « Annonces » + « 3 en attente de validation · 12 publiées · 2 vendues ce mois » ; recherche 260 px + « Exporter CSV » ; `FilterPill` de statuts ; `DataTable` (Bien avec vignette 56 × 44, Vendeur, Prix, Formule, Reçu, Pré-analyse IA), actions sous chaque ligne : Aperçu, Refuser avec motif (`secondary sm`), Valider et publier (`success sm`).

### 12.13 Back office mobile (`AdminAnnonces.png`, G7)
`AdminMobileHeader` ; `FilterPill` ; cartes d'annonce (vignette 72 × 64, prix 15 px 700 large + statut, titre 13 px 600, vendeur · formule · délai 12 px) ; encart de pré-analyse (`--lk-blue-tint` si conforme, `--lk-warning-bg` si points d'attention) ; actions Valider (`success`) / Refuser (`secondary`) / Aperçu (`IconButton`). `BottomNav` admin.

> **Mise en œuvre (L1-19).** `/admin/annonces` : résumé (« 3 en attente de validation · 12 en ligne »), recherche (référence, ville, code postal, vendeur), `FilterPills` des statuts, puis cartes sous 1024 px (prix 15 px 700 large ; ville et référence ajoutées sous le titre, avec « Hors zone » en dehors de la zone de lancement ; « Refuser » et « Valider » côte à côte, Aperçu en `IconButton`) et `DataTable` à partir de 1024 px (Aperçu `ghost sm`, « Refuser avec motif » `secondary sm`, « Valider et publier » `success sm` ; « Suspendre » `danger sm` sur une annonce en ligne ou en pause, « Remettre en ligne » `secondary sm` sur une annonce suspendue). Refus et suspension : écran plein en mobile, avec l'en-tête de l'`AppHeader` (retour, titre 15 px 600 centré), dialogue de 520 px au centre ensuite (titre 20 px 700 large, « Fermer » en croix), comme DESIGN 10.8, couche 60 (section 5), avec les motifs fréquents en boutons qui remplissent le champ, motif obligatoire (le focus va au champ s'il manque), « Annuler » `outline-ink` et confirmation `primary` (refus) ou `danger` (suspension) avec son état de chargement ; un nouveau dialogue à chaque ouverture, et le focus revient au bouton qui l'a ouvert. Le résultat s'affiche en `InlineAlert` en haut de la liste, dans une région annoncée toujours présente (hors de la mise en page tant qu'elle est vide), et prend le focus ; sans réponse du serveur, rien n'est rechargé d'office (« Recharger la page » est proposé) et, dans le dialogue, le motif reste ; y compris quand l'annonce quitte la liste filtrée ; il ne suit pas vers un autre filtre. Liste coupée à 200 annonces, dite en `InlineAlert` info. Détail `/admin/annonces/[id]` : lien « Toutes les annonces » au-dessus du titre (visible aussi en mobile, où l'en-tête donne la rubrique), carte de statut (référence, vendeur, formule, date de réception, motif), décisions, aperçu (prix, chiffres clés, description, caractéristiques), historique. Pas encore : panneau de détail de 420 px en desktop, pré-analyse, export CSV, « Modifier » (L1-30).

### 12.14 Planche design system (`Main.png`)
Référence de la page `/design` à construire en `L1-07` : palette, typographie, boutons, champs (dont état d'erreur), statuts, carte de bien. La page `/design` reprend cette planche avec les vrais composants et ajoute tous les composants de la section 10. Elle n'est accessible qu'en local et en préprod.

---

## 13. Écrans non dessinés : règles de construction

### 13.1 Correspondance écran → gabarit

| Écran (`SPEC-V2` plan des écrans) | Gabarit | Composants principaux |
|---|---|---|
| Accueil public `/` | G1, dans la direction de la V1 (L1-49, section 1) | **Hero** (`leenkey/site/components/home-hero.tsx`, un `ShowcaseHero` depuis L1-50) : fond `lk-hero-bg` (du `--lk-ink` au `--lk-navy`, vers `--lk-blue` dans le coin bas, deux halos bleus) et trame de points `lk-dots` ; à gauche, le badge « Ni agence, ni seul · Vendre accompagné » (pastille blanc à 10 %, filet blanc à 16 %, `Handshake` 14 px, 12 px 600), le titre display 36, 44 puis 56 px 800 large mot à mot, « votre vente. » en dégradé clair `lk-text-grad-light` sur la ligne de cote `--lk-blue-light`, le texte 16 puis 18 px blanc à 80 %, « Voir ma valorisation » `cta lg` avec sa flèche et, à côté à partir de 768 px (dessous avant), le lien blanc « Je cherche un bien à acheter » avec sa flèche ; un filet blanc à 10 % puis les trois promesses de la V1, 14 px 500 blanc à 86 %, chacune derrière un carré de 34 px (blanc à 10 %, rayon 12, pictogramme `--lk-blue-light` : `Euro`, `ListChecks`, `Users`). À droite à partir de 1 024 px (colonnes 1,05 / 0,95), dessous avant (512 px au plus) : la photo de la maison, la courbe de la V1 sur son côté gauche (`lk-organic` : 140 / 220 px, 40 / 60 px sous 768 px), carrée puis haute de 40 % de la largeur de l'écran (440 à 580 px), ombre `shadow-lk-photo`, affichée dès l'arrivée ; la pastille « Rapport PDF · Quatre pages, par email » en haut à droite (débordant de 32 px ; carré `--lk-blue-tint`, `FileText` `--lk-blue` ; rien n'y qualifie le chiffre de la carte), la carte « Exemple de valorisation » sur son bas (330 px, rayon 16, `shadow-lk-lift`, débordant de 44 px à gauche ; remontée de 96 px sur la photo avant 1 024 px) : « Exemple » en pastille, « Maison contemporaine », lieu, trois puces `--lk-mist`, « Ma valeur immobilière » 11 px 700 en capitales et la valeur 26 px 800 calculées par le moteur de l'estimateur sur ses prix de référence, sans les ventes du secteur, la fourchette, « Analyse gratuite en 2 minutes » ; un groupe nommé, sans contrôle. **Puis**, dans l'ordre : « Où en êtes-vous » (`--lk-mist`), « Comment ça marche » (blanc), les deux sections sombres (ligne suivante), « Les derniers biens » (blanc, 3 `PropertyCard tile`, défilement horizontal en mobile, 3 colonnes à partir de 768 px, « Voir les 12 biens » centré dessous), le comparatif (`--lk-mist`), les formules (navy), les questions (blanc), le contact (`--lk-mist`), le dernier appel. Chaque section en `MarketingSection look="showcase"` : surtitre de la V1 15 puis 17 px 800 en capitales interlettrées (0,14 em) `--lk-blue` (`--lk-blue-light` sur navy), titre centré 32, 40 puis 48 px, mots mis en valeur en dégradé `lk-text-grad` (`lk-text-grad-light` sur navy), chapeau centré, 56, 72 puis 96 px de marge verticale. « Où en êtes-vous » : quatre situations en boutons pressables (`aria-pressed`, 2 colonnes puis 4 à partir de 1 024 px) : rayon 12, bordure 2 px `--lk-mist-line`, numéro « 01 » à « 04 » 12 px 800 `--lk-blue` (non lu), libellé 15 px 700 ; la choisie bordée `--lk-blue` sur `--lk-blue-tint` avec `shadow-lk-card` ; la réponse dans une carte blanche (rayon 12, `shadow-lk-card`), titre 20 px 700 et texte à gauche, son action `cta lg` à droite à partir de 768 px. Étapes : trois cartes (rayon 16, padding 28 × 24, `shadow-lk-card`), le numéro dans un carré de 40 px en dégradé (rayon 12, `shadow-lk-cta`, non lu : la liste dit l'ordre), le pictogramme 26 px `--lk-blue` (`ChartLine`, `FileText`, `ShieldCheck`), titre 17 puis 20 px 600, texte 15 px, étiquette 12 px 600 `--lk-blue` ; un pointillé `--lk-blue-line` d'une carte à l'autre à partir de 1 024 px. Comparatif : un tableau à partir de 768 px (carte de rayon 16, `shadow-lk-card` ; colonne des critères sur `--lk-mist`, en-têtes de ligne ; colonne Leenkey encadrée de 2 px `--lk-blue` sur `--lk-blue-tint`) ; avant, une carte par façon de vendre, celle de Leenkey encadrée ; devant chaque valeur, `CircleCheck` `--lk-success` ou `CircleX` `--lk-ink-3`, dits « Point fort : » ou « Point faible : » aux lecteurs d'écran. Questions : trois `<details>` en cartes blanches (rayon 12, bordure `--lk-mist-line`, ouvertes : bordure `--lk-blue-line` et `shadow-lk-card`), le « + » bleu de la V1 qui devient « − », puis « Toutes les questions » `secondary lg` avec sa flèche. Contact : le formulaire `look="showcase"` dans une carte blanche de 720 px (rayon 16, `shadow-lk-card`), « Envoyer ma demande » `cta` pleine largeur avec sa flèche, la note centrée. Dernier appel : `lk-cta-bg` (dégradé `--lk-blue` → `--lk-blue-mid`, halo blanc à 10 % derrière le titre) et trame de points ronde, titre 32, 40 puis 48 px blanc centré, texte blanc, « Valoriser mon bien gratuitement » `inverse lg` avec sa flèche et `shadow-lk-raised`, la note blanche, `ShieldCheck` dans la ligne. Historique : L1-41 (refait en V2), L1-45 (accents, mouvement), L1-46 (photo du hero, derniers biens avec photo d'abord), L1-49 (direction de la V1 : hero de la V1, « Où en êtes-vous » juste après lui, derniers biens après l'espace vendeur ; il remplace le `BrandPanel` bleu et ses deux entrées égales « Je vends » / « J'achète »). |
| Contact `/contact` | G1 | la `MarketingSection` « Parlons-en ensemble. » de l'accueil en h1, son formulaire (`source` « contact ») (L1-45) ; depuis L1-49, dans la direction de la V1 comme sur l'accueil (surtitre « Une question, un projet ? », carte du formulaire, bouton `cta`, section 1) |
| Accueil, sections vitrines (L1-47) | G1 | les deux sections sombres de la V1 (`DECISIONS.md` 2026-10-20), `MarketingSection` `look="showcase"` `tone="navy"` (aplat navy plein), l'une après l'autre, avec leur surtitre de la V1 depuis L1-49 (« Le point de départ », « Votre espace Leenkey ») : « Ce que vous obtenez en quelques minutes. » avec `ValueCurve` (à partir de 1 024 px, la courbe de la V1 en `--lk-blue-light` 2 px, sans aplat dessous, quatre repères ronds de 44 px bordés de `--lk-blue-light` posés dessus, titre 16 puis 17 px 600 et texte 14 px blanc à 72 % centrés dessous ; en dessous de 1 024 px, les repères à gauche reliés par une ligne de 2 px, le texte à droite ; icônes `ChartLine`, `MapPin`, `ChartNoAxesColumn`, `FileText`) puis « Valoriser mon bien gratuitement » `cta lg` avec sa flèche ; « Vous savez toujours quoi faire ensuite. » avec `SellerSpacePreview` : fenêtre du site (barre blanche, adresse `leenkey.fr/vendeur` dans un champ de rayon 4, « Exemple » 12 px 600 `--lk-blue` à droite), « Ma vente » comme le dessinent `Dashboard.png` et 10.4, avec leurs données d'exemple (`SellerHeader` avec « Étape 3 sur 6 · Contacts et visites » et ses 6 segments, `PropertyThumb` et `StatusBadge`, `NextActionCard` sans bouton, 3 `StatTile`, `TaskList` « À faire » ; deux conversations à partir de 768 px ; deux colonnes à partir de 1 024 px), et la légende de la V1 « Aperçu de l'espace vendeur, avec des données d'exemple. » ; une image pour les technologies d'assistance (`role="img"`, nommée par la description de ce qu'elle montre, la légende lue ensuite), rien n'y est un contrôle. L1-48, L1-49 : « Un forfait fixe. Jamais de commission. » (`#tarifs`) aussi sur l'aplat navy, surtitre « Nos formules », `PlanCard` à prix en grand en cartes de verre de la V1 (`tone="dark"`, 10.4), « Voir le détail des formules » `cta lg` centré dessous. |
| Concept `/concept` | G1, dans la direction de la V1 (L1-50, section 1) | `ShowcaseHero` (pastille « Le concept » avec `Search`, « Valoriser mon bien » `cta`) ; « L'idée de départ » : les deux options en cartes de la V1 (« Option 1 », « Option 2 » 12 px 700 en capitales `--lk-danger` avec `CircleX`), « ou » dans un rond de 44 px entre elles à partir de 1 024 px, puis la question centrée, sa fin en `lk-text-grad` ; « Le cœur du concept » sur navy : quatre cartes de verre numérotées `NumberBadge sm` « 01 » à « 04 » avec leur libellé `--lk-blue-light`, coches `--lk-blue-light`, puis la phrase de la V1 dans un cadre `--lk-blue-light` à 25 % sur `--lk-blue` à 15 % avec sa tuile `ChartLine` en dégradé ; « Ce que Leenkey ouvre ensuite » : quatre cartes avec leur tuile d'icône (`Camera`, `LayoutPanelLeft`, `Users`, `Euro`) ; `CtaPanel` bleu |
| Tarifs `/tarifs` | G1, dans la direction de la V1 (L1-50) | `MarketingSection` h1 `showcase` `navy` avec le surtitre « Phase de lancement · Freemium » ; `SegmentedPicker tone="dark"` « Gratuit pendant le lancement / Mon économie vs agence » centré ; trois `PlanCard tone="dark"` (cartes de verre) sur 1 100 px, « Commencer gratuitement » `cta` avec sa flèche sur la formule mise en avant, `outline-inverse` sur les payantes |
| FAQ `/faq` | G1, dans la direction de la V1 (L1-50) | `MarketingSection` h1 `showcase` `navy` avec le surtitre « Questions fréquentes » ; `FaqList tone="dark"` centrée, 880 px au plus |
| Investir `/investir` | G1, dans la direction de la V1 (L1-50) | `ShowcaseHero` (surtitre « Opportunité d'investissement · Proptech France 2026 », deux paragraphes, « Rejoindre l'aventure » `cta` vers `#formulaire`), sans la bande de chiffres de la V1 (Q53) ; constat centré sur blanc en 26, 32 puis 40 px 700 (« des milliards d'euros » en `lk-text-grad`, la raison en `--lk-ink-3`) ; marché et vision : tête de section à gauche (`align="start"`) au-dessus de deux colonnes à partir de 1 024 px, l'encart « 15 000 € prélevés sur une seule vente à 300 000 € » en dégradé bleu (36, 44 puis 56 px 800), les quatre parties de la plateforme en cartes à tuile d'icône (`Sparkles`, `MessageSquareMore`, `CircleCheck`, `Network`), l'objectif dans un cadre `--lk-blue-tint` ; état d'avancement en frise centrée de 720 px (rond de 44 px : `Check` sur `--lk-success-bg`, `RefreshCw` sur `--lk-blue-tint`, `Clock` bordé ; trait `--lk-mist-line` entre eux ; `StagePill` en capitales à côté du titre) ; « Source 1 » à « Source 3 » (point bleu, étiquette en pastille `--lk-blue-tint`, la troisième « À venir »), sans les projections (Q53) ; timing et raisons en cartes à tuile d'icône (`Users`, `Globe`, `Lightbulb` ; `Lightbulb`, `Layers`, `ChartLine`, `Users`), « C'est Leenkey. » en bleu au bout de la dernière carte du timing ; feuille de route en trois cartes larges de 920 px, libellé de phase en pastille (dégradé, navy, teinte) à côté du titre, points sur deux colonnes à partir de 768 px ; message sur le fond du hero (guillemet `--lk-blue-light`, phrase 32 puis 40 px, sa fin en `lk-text-grad-light`, « Parlons-en » `inverse`) ; `FaqList` claire ; `#formulaire` sur navy : WhatsApp et email en cartes de verre (tuile `--lk-success-bg`, tuile en dégradé), formulaire dans sa carte blanche `showcase` ; `CtaPanel` bleu. Alternance blanc / `--lk-mist` |
| Qui sommes-nous `/qui-sommes-nous` | G1, dans la direction de la V1 (L1-50) | `ShowcaseHero` (surtitre « Qui sommes-nous », « Découvrir notre vision » `cta` vers `/investir`) avec, à droite à partir de 1 024 px (dessous avant), la photo de Cédric 3:4 de 440 px au plus (rayon 16, filet blanc à 10 %, `shadow-lk-photo`, chargée en priorité, fixe au premier affichage) et sa carte blanche posée sur le coin bas gauche (initiales « CD » dans un rond de 42 px en dégradé, nom 15 px 700, rôle 12 px `--lk-ink-3`, `shadow-lk-lift`) ; chiffres centrés sur blanc en `lk-text-grad`, 32 puis 44 px 800 (à confirmer, Q53) ; histoire centrée sur `--lk-mist`, 640 px (la largeur de lecture de 3.2 ; 880 px en V1), 16 puis 18 px, sa conviction dans un cadre `--lk-blue-tint` à filet gauche de 4 px `--lk-blue` ; valeurs sur navy en quatre cartes de verre, tuile de 48 px en dégradé (`Plus`, `CircleCheck`, `User`, `Activity`) ; `CtaPanel tone="light"` (« Nous contacter » `cta` vers `/contact`, « Valoriser mon bien gratuitement » `secondary`) |
| Estimateur `/estimer` | existant, re-stylé : police Archivo, tokens, rayons ; aucune modification de logique (L1-44) | cartes de choix sur le modèle de `RoleCard`, `ChipToggle`, chiffres et DPE au format du `SegmentedPicker`, `InfoNote`, `InlineAlert`, dialogue 10.8 |
| Pages par ville | V3 | — |
| Connexion, mot de passe oublié | G5 simplifié (comme 12.1) | — |
| Pages légales | G10 | — |
| Fiche du bien (onglets) | G9 + `Tabs` | `KeyFigures` en tête, `Tabs` Infos / Photos / Annonce / Documents / Visites / Offres (L1-14a : Infos, Photos, Annonce ; les autres avec L3 et L2) |
| Création du bien, étapes 1, 3, 4 | G5 | adresse avec autocomplétion Mapbox (liste déroulante rayon 6, `shadow-float`) ; prix `UnitInput` + rappel d'estimation en `InfoNote` ; aperçu = page annonce réelle dans un cadre bordé |
| Conseiller Leenkey | G6 | conversation épinglée en tête de liste, avatar « LK » fond `--lk-blue` |
| Assistant `/assistant` | G6 | bulles de l'assistant fond `--lk-blue-tint` ; actions proposées = cartes de confirmation (avant / après) avec « Confirmer » `primary` et « Annuler » `ghost` |
| Offres reçues, visites, documents (vendeur) | G9 / G7 | listes en cartes, `StatusBadge` |
| Favoris, alertes (acquéreur) | G2 sans carte | `PropertyCard compact` / lignes d'alerte avec interrupteur |
| Projet et financement | G5 | `SegmentedPicker` projet, `UnitInput`, `FinancingBadge` en tête, encart explicatif permanent en `InfoNote` |
| Faire une offre | G5 (section 13.3) | — |
| Réserver une visite | G5 court | créneaux en grille de boutons `ChipToggle` (date en titre de groupe) |
| Compte | G9 | lignes 56 px avec chevron, zone de danger en bas (« Supprimer mon compte » `danger`) |
| Back office : tableau de bord, détail d'annonce, utilisateurs, dossiers, messages clients, offres, signalements, assistant | G7 | `StatTile`, `DataTable`, panneau de détail à droite 420 px (desktop) |
| 404 | G8 variante | `facade.svg`, « Cette page n'existe pas. », bouton « Retour à l'accueil » |

> **Mise en œuvre (L1-14a).** Fiche du bien `/vendeur/biens/[id]` (G9, colonne de 720 px, sous la `TopNav` en desktop et avec la `BottomNav` vendeur en mobile, « Dossier » courant) : lien retour « Ma vente » 13 px 500 `--lk-ink-2` avec `ChevronLeft`, nom du bien en H1 (26 puis 32 px, large), adresse et référence 13 px `--lk-ink-3`, `StatusBadge` dessous et la cloche à droite du titre sous 768 px ; `KeyFigures` (surface, pièces, étage ou niveaux, prix au m²) ; ce que veut dire le statut en `InlineAlert` (info en relecture, en pause et pour un brouillon ; warning pour une remarque ; success en ligne et vendu ; danger pour une suspension, avec l'adresse de contact) ; les actions du statut en rangée qui passe à la ligne (une seule `primary` : « Reprendre la création », « Corriger mon annonce » ou « Remettre en ligne » ; « Mettre en pause », « Marquer comme vendu » et « Voir l'annonce en ligne » en `secondary` ; « Supprimer le brouillon » en `danger`), le résultat lu dessous et focalisé ; puis `LinkTabs`. Onglets : sections au titre de 16 puis 17 px 600 avec « Modifier » `ghost sm` à droite tant que les étapes de la création changent le bien ; Infos = adresse et `InfoNote` (jamais publiée), puis `KeyFactsTable` des caractéristiques ; Photos = grille 2 puis 3 colonnes de vignettes 4:3 rayon 6, « Photo principale » en pastille encre à 80 % sur la vignette, légende 12 px dessous ; Annonce = liste bordée (prix 26 px 700 large et prix au m², titre, description, référence).

> **Mise en œuvre (L1-14b).** Une annonce en relecture, en ligne ou en pause se modifie depuis sa fiche et garde son statut. « Modifier » (`ghost sm`) des sections Caractéristiques (Infos) et Annonce mène à `/vendeur/biens/[id]/modifier/caracteristiques` et `/modifier/annonce` : G5 sans étapes, `AppHeader` « Modifier votre bien » avec retour vers la fiche, les champs des étapes 2 et 3 (sans les photos), une `InfoNote` qui dit ce que la modification change selon le statut (« Votre annonce reste en ligne : vos modifications sont visibles dès leur enregistrement. »), puis « Annuler » (`secondary`, lien) et « Enregistrer » (`primary`) dans la `FormActionBar`. Après l'enregistrement, retour à l'onglet, où un `InlineAlert` success en tête (« Vos modifications sont enregistrées et visibles sur votre annonce. ») prend le focus, puis `?modifie=1` quitte l'adresse. Onglet Photos : le `PhotoUploader` de l'étape 2 (titre en h2 de 16 puis 17 px 600, compteur à droite, `InfoNote` du statut sous l'aide) tant que l'annonce se modifie, brouillon compris ; la grille en lecture seule de L1-14a une fois l'annonce suspendue ou vendue. L'adresse ne change plus une fois l'annonce envoyée : pas de « Modifier » sur la section Adresse, une seconde ligne dans son `InfoNote` avec l'adresse de contact (`DECISIONS.md`, 2026-10-19). Le motif d'une suspension passe sur sa propre ligne dans l'`InlineAlert` danger.

> **Mise en œuvre (L1-44).** `/estimer` entier dans `FacadeRoot`, sur fond blanc comme les autres pages publiques (2.1), sans changer la logique ni les mots de la V1 (`DECISIONS.md`, 2026-10-19). Wizard : barre de progression blanche collée sous l'en-tête du site (nom de l'étape 12 px 600 `--lk-ink`, « Étape 3 sur 12 · 25% » 12 px `--lk-ink-3` tabulaire, piste `--lk-line` de 6 px et remplissage `--lk-blue`, lue comme `progressbar`) ; titre de l'étape en H1 26 puis 32 px 700 large, sans étiquette au-dessus ; cartes de choix sur le modèle de `RoleCard` (bordure 1,5 px `--lk-line`, rayon 6, active `--lk-blue-tint` et bordure `--lk-blue`, titre 14 px 600, description 13 px `--lk-ink-2`, rond ou case à droite, sans pictogramme), puces `ChipToggle`, chiffres (pièces, étages) et lettres du DPE au format du `SegmentedPicker` (44 px, `--lk-stone-2`, actif `--lk-blue`), champs de 48 px bordés `--lk-field` (en erreur : bordure et anneau `--lk-danger`, `aria-invalid`, message lié par `aria-describedby`), boutons d'une question groupés sous son libellé (`role="group"`), notes en `InfoNote`, erreur de l'étape en `InlineAlert` danger ; barre d'actions fixe blanche (bordure haute `--lk-line`, zone de sécurité iOS), « Retour » `ghost` et « Continuer » `primary lg`, que le pied de page laisse passer. Panneaux « Votre profil énergétique » et « Rentabilité de l'immeuble » : cartes blanches bordées `--lk-blue-line`, rayon 6, collées à 160 px du haut à partir de 1024 px seulement. Résultat : référence du dossier dans un bandeau blanc (le logo est déjà dans l'en-tête), « Bonjour, voici la valeur estimée de votre bien » en H1, cartes blanches bordées, prix estimé 36 puis 56 px 700 large, chiffres clés en cartes sans pictogramme, puces d'atouts de 4 px, tuiles DVF `--lk-stone-2`, « Données historiques » en `InlineAlert` warning, « Prochaines étapes » avec une coche verte (fait) ou un cercle (à faire), une seule action `primary` (« Créer mon annonce ») ; « Recevoir mon rapport complet par email » et « Prendre contact avec un conseiller » en `secondary`, « Refaire une analyse » `ghost` atténué ; « Prendre contact » ouvre le dialogue de 10.8 (plein écran en mobile, 520 px au centre ensuite), qui dit « Demande envoyée ! » puis se referme. Aucun emoji ni flèche de texte (section 1).

### 13.2 Règles générales pour un écran non dessiné

1. Choisir le gabarit dans 13.1, puis composer **uniquement** avec les composants de la section 10. Un nouveau composant = l'ajouter à `/design` et à ce document dans la même PR.
2. Une seule action `primary` visible par écran (deux sur une barre Précédent / Continuer, dont une seule bleue pleine).
3. Photo dès qu'un bien apparaît (vignette minimale 44 × 44).
4. Titres d'écran en H1 large ; titres de section en H3 normal ; pas d'étiquette décorative au-dessus d'un titre, sauf « Pour vous » / « Prochaine action » qui portent une information, et les surtitres de la V1 sur les pages vitrines (L1-49, L1-50, section 1, 13.1).
5. États vide, chargement et erreur obligatoires, conçus avec `EmptyState`, `Skeleton` et `Alert`.
6. Vérifier à 390, 768 et 1280 px avant la PR et joindre les trois captures.

### 13.3 Écrans de l'offre d'achat (lot 2, non dessinés)

Contenu et textes : `SPEC-V2` section 13 (modèle de Cédric). Mise en forme :

**Formulaire `/offres/nouvelle`** (G5)
- `AppHeader` « Faire une offre » + `ProgressBar` « Étape 3 sur 7 · Mon offre ».
- Étape 2 « Le bien » : carte en lecture seule (vignette 72 × 64, titre, adresse, surface, annexes, référence) sur fond `--lk-stone-2`, mention « Repris de l'annonce, non modifiable » 12 px.
- Étape 3 « Mon offre » : `UnitInput` € en grand (48 px de haut, valeur 20 px 700 large) ; montant en lettres dessous, 13 px `--lk-ink-2` ; encart d'écart (tuile `--lk-stone-2` : « Prix affiché 350 000 € / Offre 338 000 € / Écart −12 000 € · −3,4 % », valeurs tabulaires, couleur neutre, jamais rouge ni vert).
- Étape 4 « Financement » : `SegmentedPicker` « Avec prêt » / « Sans prêt » ; champs ; encart « Budget global estimé » en tuile `--lk-stone-2` ; libellés « Déclaré par l'acquéreur » (12 px `--lk-ink-3`) et `FinancingBadge`.
- Étape 5 « Conditions » : encart d'avertissement de Cédric en `Alert` warning **affiché en tête** ; mention de financement en lecture seule ; cases à cocher ; champ « Précisions » (textarea, compteur « 0 / 500 »).
- Étape 7 « Déclarations » : encart « Avant d'envoyer votre offre » : fond `--lk-blue-tint`, bordure 1,5 px `--lk-blue`, rayon 6, padding 16, titre 16 px 700 large, texte 14 px / 1,6 ; choix visite en `RoleCard` ×2 ; quatre cases obligatoires espacées de 12 px ; « Relire mon offre » `primary lg` désactivé tant que tout n'est pas coché.
- Relecture : rendu du document (fond blanc, bordure `--lk-line`, padding 24, typographie 14 px, titres de sections H3) puis « Envoyer mon offre au vendeur » `primary lg` et « Modifier » `ghost`.

**Carte « Nouvelle offre reçue » (vendeur)** : carte blanche bordure 1,5 px `--lk-blue`, rayon 6, padding 16. En-tête : « Nouvelle offre reçue » 16 px 700 large + compte à rebours « 4 jours et 7 heures restantes » (pastille `--lk-warning-bg`). Grille 2 colonnes de lignes libellé / valeur (Prix demandé, Offre reçue en 20 px 700 large, Écart, Financement déclaré, Justificatif). « Analyse Leenkey » : bloc fond `--lk-stone-2`, titre 13 px 600, paragraphes 13 px / 1,55. Actions : « Accepter l'offre » `primary`, « Refuser l'offre » `secondary`, « Discuter avec l'acquéreur » `ghost`, « Voir l'offre complète » lien.

**Écran d'acceptation `/offres/[id]/accepter`** : écran plein (jamais une modale). Titre H1 « Vous êtes sur le point d'accepter cette offre ». Récapitulatif en `KeyFactsTable`. Texte d'avertissement de Cédric en `Alert` warning. Case obligatoire. « Confirmer mon acceptation » `primary lg` désactivé tant que la case n'est pas cochée ; « Revenir à l'offre » `ghost`.

**États de l'offre côté acquéreur** : `StatusBadge` Envoyée (`--lk-blue-tint`), Consultée (`--lk-blue-tint` + icône œil), Acceptée (`--lk-success`), Refusée (`--lk-danger-bg`), Expirée (`--lk-stone-2`), Retirée (`--lk-stone-2`), Remplacée (`--lk-stone-2`).

---

## 14. Supports hors interface

**Emails (React Email)** : fond `#F4F4F1`, carte blanche 560 px, rayon 6, bandeau haut 8 px `#1156FC`, logo « Leenkey » texte 20 px 700 (le logo en image viendra avec les emails de L1-22 : la plupart des clients mail n'affichent pas un SVG), titres Archivo avec repli Arial gras (les clients mail ignorent `font-stretch` : prévoir le rendu en Arial), corps 15 px / 1,6 `#0F1E35`, bouton principal `#1156FC` 48 px rayon 4 texte blanc 600, pied 12 px `#5B6474`. Préfixe `[PREPROD]` hors prod.

**PDF de l'offre** (`@react-pdf/renderer`) : A4, marges 20 mm, police Archivo embarquée (fichiers TTF dans `public/fonts/`), titre « OFFRE D'ACHAT LEENKEY » 18 pt 700 (seul texte en majuscules autorisé, car c'est le titre juridique fourni par Cédric), sections numérotées 1 à 7 (séquence réelle du document), corps 10 pt / 1,5, filet bleu 2 pt sous l'en-tête, pied avec référence, version et pagination. Aucun statut de qualification (`SPEC-V2` section 13).

**Image de partage (Open Graph)** `/api/og/[slug]` : 1200 × 630, photo principale à gauche (60 %), bandeau `#1156FC` à droite : prix 64 px 700 large blanc, « Appartement 3 pièces · 68 m² » 28 px, ville 24 px `#F0F4FF`, logo blanc de 32 px de haut en bas (`public/brand/logo-white.svg`, le mot « Leenkey » 24 px sans son fichier). Image par défaut : `facade.svg` blanc sur bleu + « Leenkey ».

---

## 15. Accessibilité

- Contrastes : toutes les paires de la section 2.1 sont validées ; ne pas en créer d'autres sans vérification (outil : `npm run a11y` avec axe en E2E).
- Cibles tactiles : 44 × 44 px minimum (boutons, icônes, cases cliquables via leur libellé).
- Focus : anneau 2 px `--lk-blue` décalé de 2 px sur tout élément interactif, y compris cartes de bien et marqueurs de carte.
- Champs : `<label>` lié, erreurs annoncées (`aria-live="polite"` sur le résumé d'erreurs du formulaire).
- `SegmentedPicker` : `role="radiogroup"` ; `ChipToggle` : `aria-pressed` ; onglets : `role="tablist"`.
- Carte géographique : la liste reste la source accessible ; les marqueurs sont des boutons avec `aria-label` « 350 000 €, appartement 3 pièces à Savigny-sur-Orge ».
- Images : texte alternatif selon 7.1 ; `facade.svg` et icônes décoratives en `aria-hidden`.
- Langue : `lang="fr"`. Lecture d'écran testée sur le parcours E2E 1 (VoiceOver iOS).
- Mouvement réduit respecté ; aucune information portée seulement par la couleur (les statuts ont toujours un libellé).

---

## 16. Checklist de conformité design

À cocher dans chaque PR qui touche à l'interface (la commande `/revue` la vérifie).

- [ ] Aucune couleur, taille, rayon ou ombre en dur : tokens ou classes Tailwind `lk-*` uniquement.
- [ ] Police Archivo seule ; titres, prix et chiffres en `text-wide` 700 ; aucun `uppercase`, aucun `tracking-wide`, aucune police mono (sauf les surtitres et libellés de la V1 sur les pages vitrines, section 1).
- [ ] Rayons : 4 px contrôles (y compris filtres et puces), 6 px conteneurs, `rounded-full` seulement pour statuts, compteurs, avatars, marqueurs de carte (pages vitrines : 12 et 16 px et pastilles de la V1, section 5).
- [ ] Aucune ombre sauf `shadow-float` sur un élément flottant (et les ombres `shadow-lk-*` des pages vitrines, section 1).
- [ ] Une seule action `primary` par vue.
- [ ] Chaque bien affiché a sa photo (ou `facade.svg`), jamais un bloc gris.
- [ ] Champs de saisie bordés `--lk-field` ; focus visible.
- [ ] États vide, chargement, erreur présents.
- [ ] Captures 390, 768 et 1280 px jointes, comparées à la maquette PNG correspondante.
- [ ] Contrastes conformes à la section 2.1 ; cibles ≥ 44 px.
- [ ] Textes en casse normale, montants et surfaces formatés (section 3.3), textes client repris mot pour mot.
- [ ] Mouvement (section 9) : rien de caché sans JavaScript ni avec `prefers-reduced-motion` ; montée au défilement sur les pages publiques seulement.

---

## 17. Écarts connus des maquettes

Les maquettes sont des pages statiques. Ces points ne sont **pas** à reproduire :

| Maquette | Écart | À faire |
|---|---|---|
| `RechercheDesktop` | « Plus de filtres » et « Créer une alerte » passent sur plusieurs lignes | `whitespace-nowrap`, regroupement sous 1280 px (10.3) |
| `AnnonceDesktop` | le contenu dépasse la hauteur de la planche (900 px) | page défilante normale |
| `AccueilDesktop` | titre « Bonjour Thomas » à 30 px | 36 à 44 px selon la place (12.10) |
| `Dashboard` | barre de navigation basse incluse dans la planche | `BottomNav` partagé, collé en bas |
| `Dashboard`, `Recherche` (`BottomNav`) | 4 onglets, aucun vers l'autre côté | 5 onglets : « Acheter » au milieu côté vendeur, « Vendre » côté acquéreur (10.6, `DECISIONS.md` 2026-10-19) |
| Toutes | liens internes `#ancre` fictifs | routes de `SPEC-V2` section 3 |
| Toutes | photos encodées dans le HTML | photos servies par `/img` (7.1) |
| `Main` | planche partielle | la page `/design` couvre toute la section 10 |
| `PlanEcrans` (canvas) | ancien style | sans objet : schéma de travail, pas un écran |
| `AccueilDesktop`, `AnnonceDesktop`, `RechercheDesktop` (PNG) | « Estimer mon bien » | « Valoriser mon bien » (règle éditoriale, `CLAUDE.md` section 16 ; corrigé dans les HTML) |
| `Bien` (InfoNote) | « Repris de votre estimation… » | « Repris de votre analyse de valeur du [date]. Vérifiez et complétez. » (SPEC-V2 8.3) |
| `AccueilDesktop` | ligne « Identité vérifiée » du dossier acquéreur | aucune vérification d'identité n'est prévue : libellé en attente de `DECISIONS.md` Q25 |
| `AccueilDesktop` | « Calculer mon budget », « Prix au m² de la zone » dans « Nos services » | fonctions non spécifiées : `DECISIONS.md` Q25 |
| `Annonce`, `AnnonceDesktop` (`ContactCard`) | « Vente accompagnée par Leenkey · répond sous 24 h » affiché pour tout vendeur | « Vente accompagnée par Leenkey » seulement si la formule est payante ; « Répond en général sous 24 h » seulement si le temps de réponse médian réel est inférieur à 24 h, sinon rien (`SPEC-V2` 8.5) |
| `Annonce`, `AnnonceDesktop` | bouton de partage non dessiné | non construit en V2 : galerie avec retour et favori uniquement (`SPEC-V2` 8.5) |
| `Messagerie` (`ConversationHeader`) | sous-titre « Avec Thomas · justificatif vérifié » | « Avec [prénom] · [libellé exact du statut de financement] » (libellés de `FinancingBadge`, 10.2), visible du vendeur seulement ; l'acquéreur voit « Avec [prénom] » ; jamais « validé » (`SPEC-V2` 8.6 et 13) |
| `RechercheDesktop`, `Notifications`, `AccueilDesktop` | « Créer une alerte », état vide « Créer une alerte », carrousel « Nouveaux biens dans votre alerte » | masqués jusqu'au lot 3 (alertes = L3, `SPEC-V2` 8.4 et 16) |
| `AccueilDesktop` (`TopNav`) | lien « Guides » | absent : aucune page « Guides » dans la SPEC (`DECISIONS.md`, 2026-10-17) |
| `AccueilDesktop` (`TopNav`) | cloche ronde | `IconButton tint`, rayon 4 (10.1, 10.7) |
| `Dashboard`, `AdminAnnonces`, `AdminDesktop` (`BottomNav`, `AdminSidebar`) | icône de maison pour « Ma vente » et « Annonces » | `LayoutDashboard` et `ClipboardList` : la maison est réservée au logo et au dessin de marque (section 1, `DECISIONS.md` 2026-10-17) |
| `AdminAnnonces` (`AdminMobileHeader`) | titre « Aujourd'hui » et trois tuiles compteurs | titre de la page courante ; tuiles avec les données du back office (L1-19, L1-30) |
| `AnnonceDesktop`, `RechercheDesktop` (`TopNav` sans session) | « Mon compte » sur fond `--lk-blue-tint`, sans « Vendre mon bien » | `TopNav` de 10.6 : « Vendre mon bien » puis « Mon compte » `secondary` |
| `AnnonceDesktop` (`PriceColumn`) | « Faire une offre » | affiché à partir du lot 2 seulement (`SPEC-V2` 8.5) |
| 13.3 (non dessiné) | badge « Remplacée » parmi les états de l'offre côté acquéreur | `superseded` est un statut interne (`SPEC-V2` 13, « Statuts ») : pas de badge « Remplacée » dans le suivi de l'acquéreur, qui voit la nouvelle version et son statut ; « Remplacée » n'apparaît que dans l'historique de l'onglet « Offres » du vendeur et dans le back office. Toute autre exposition passe par `DECISIONS.md` |
| `Main`, `Dashboard`, `AdminDesktop`, `AdminAnnonces`, 10.2 (`StatusBadge`) | libellés « Publiée », « En attente » | libellés de `SPEC-V2` section 7 (« En ligne », « En attente de validation », etc.) avec les couleurs de 10.2 |
