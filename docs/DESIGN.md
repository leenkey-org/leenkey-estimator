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
| `--lk-navy` | `#1A2B4A` | En-têtes sombres (dashboard vendeur), avatars | blanc dessus 14,1:1 |
| `--lk-ink` | `#0F1E35` | Texte principal, back office (barre latérale), bouton « sur fond sombre » | 16,7:1 sur blanc |
| `--lk-ink-2` | `#3E4757` | Texte de corps secondaire, valeurs sur pierre | 9,36:1 sur blanc |
| `--lk-ink-3` | `#5B6474` | Texte tertiaire (dates, libellés de chiffres, aides) | 5,97:1 sur blanc ; 5,07:1 sur `--lk-stone-2` |
| `--lk-bg` | `#F4F4F1` | Fond d'application (écrans connectés) | — |
| `--lk-surface` | `#FFFFFF` | Cartes, champs, barres d'en-tête et de navigation | — |
| `--lk-stone-2` | `#ECEDE8` | Tuiles (chiffres clés, boutons icône), en-têtes de tableau, puces DPE non choisies | — |
| `--lk-stone` | `#E3E4DE` | Aplats neutres larges (bandeaux, sections de page marketing) | — |
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
- Sur navy ou ink : texte principal blanc, secondaire `rgba(255,255,255,0.72)` (≥ 7:1).
- Les pages publiques (accueil, recherche, annonce) ont un fond blanc ; les espaces connectés (vendeur, acquéreur, compte) ont un fond `--lk-bg` avec cartes blanches.

### 2.2 `app/globals.css` (Tailwind 4)

À créer tel quel en `L1-07` (Tailwind 4, configuration CSS-first). Les noms de classes Tailwind générés sont indiqués en commentaire.

```css
@import "tailwindcss";

@theme {
  /* Couleurs : bg-lk-blue, text-lk-ink-3, border-lk-line, etc. */
  --color-lk-blue: #1156FC;
  --color-lk-blue-hover: #0D47E0;
  --color-lk-blue-tint: #EEF4FF;
  --color-lk-blue-line: #DBEAFE;
  --color-lk-on-blue-2: #F0F4FF;
  --color-lk-navy: #1A2B4A;
  --color-lk-ink: #0F1E35;
  --color-lk-ink-2: #3E4757;
  --color-lk-ink-3: #5B6474;
  --color-lk-bg: #F4F4F1;
  --color-lk-surface: #FFFFFF;
  --color-lk-stone: #E3E4DE;
  --color-lk-stone-2: #ECEDE8;
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

  /* Ombres : shadow-float uniquement */
  --shadow-float: 0 2px 6px rgba(15, 30, 53, 0.18);
  --shadow-sheet: 0 -8px 24px rgba(15, 30, 53, 0.16);

  /* Points de rupture : md (768), lg (1024), xl (1280) */
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;

  /* Mouvement */
  --ease-out-lk: cubic-bezier(0.2, 0.7, 0.2, 1);
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

Graisses utilisées : 400, 500, 600, 700. Largeurs utilisées : 100 % (texte) et 116 % (titres). Ne pas charger d'autre police.

### 3.2 Échelle

Valeurs : taille px / interligne / graisse. « Large » = `font-stretch: 116%; letter-spacing: -0.02em` (classe `text-wide`).

| Rôle | Mobile (< 768) | Desktop (≥ 1024) | Largeur | Exemples |
|---|---|---|---|---|
| Display | 36 / 1.05 / 700 | 56 / 1.0 / 700 | Large | « Bonjour Thomas » (30 px dans la maquette desktop, accepté de 30 à 56 selon la place) |
| H1 | 26 / 1.15 / 700 | 32 / 1.1 / 700 | Large | « Créez votre compte », titre d'annonce desktop (26) |
| H2 | 20 / 1.2 / 700 | 22–24 / 1.15 / 700 | Large | « Votre dossier fait la différence auprès des vendeurs » |
| Titre d'en-tête d'app | 20 / 1.2 / 700 | — | Large | « Ma vente » |
| H3 / titre de section | 16 / 1.3 / 600 | 17 / 1.3 / 600 | Normale | « À faire », « Le bien », « Conversations » |
| Titre de barre | 15 / 1.3 / 600 | 15 | Normale | « Choisir ma formule », « Mon bien » |
| Prix principal | 26 / 1.0 / 700 | 30–32 / 1.0 / 700 | Large, tabulaire | « 350 000 € » |
| Prix de carte | 17 / 1.1 / 700 | 16–18 / 1.1 / 700 | Large, tabulaire | cartes de recherche |
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

### 3.3 Formatage des nombres et du texte

- Montants : `Intl.NumberFormat('fr-FR')` puis espace insécable fine (U+202F) avant `€` : « 350 000 € ». En carte de carte géographique : « 350 k€ ».
- Surfaces : « 68 m² » avec U+202F. Prix au m² : « 5 147 € / m² ».
- Dates : « mardi 22 septembre », « 3 oct. à 10 h », « il y a 2 h ». Jamais de format `22/09/2026` dans l'interface (sauf PDF juridique et tableaux admin).
- Pièces : « 3 pièces » en titre, « 3 p » seulement dans les cartes compactes.
- Casse normale partout, y compris boutons, onglets et en-têtes de tableau.

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
| Bulles de message | 6 px, coin côté expéditeur 2 px | reçues : 1 px `--lk-line` | aucune |
| Bandeaux pleine largeur (`BrandPanel`, en-tête navy) | 0 | — | aucune |

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
| Grille « Résultats de votre dernière recherche » | ratio 4:3 environ (150 px de haut sur 1280) |
| Vignette dashboard, admin, conversation | 56 × 56, 56 × 44, 44 × 44 ; rayon 4 |
| Grille de photos du formulaire | carrés, 4 colonnes, 8 px d'écart |

- Superpositions sur photo : badge « Nouveau » (fond `--lk-blue`, texte blanc, 11 px 600, pastille) ; « Prix en baisse » (fond `--lk-success`) ; compteur « 1 / 9 » (fond `rgba(15,30,53,0.8)`, texte blanc, pastille) ; tuile « + 8 photos » (voile `rgba(15,30,53,0.55)`, texte blanc 13 px 600).
- Boutons sur photo (retour, favori) : 44 × 44, fond blanc, rayon 4, `shadow-float`.
- Chargement : fond `--lk-stone-2` puis fondu de 160 ms. Erreur ou absence : `facade.svg` centré sur `--lk-stone-2`.
- Texte alternatif : « Séjour, appartement 3 pièces à Savigny-sur-Orge » (pièce + bien + ville si la pièce est connue, sinon « Photo 2 sur 12 de l'appartement… »).

### 7.2 Photos de démonstration

Le seed utilise des photos libres de droits (Unsplash, licence Unsplash), stockées dans `supabase/seed/photos/`, jamais des photos d'annonces réelles. Une photo n'apparaît que pour un seul bien.

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
| Hero de la page d'accueil publique | 380 × 210 | blanc sur aplat bleu | 55 % |
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
| Survol, pression (couleur, fond) | 140 ms | `--ease-out-lk` |
| Ouverture de panneau, feuille, menu | 220 ms | `--ease-out-lk`, translation + opacité |
| Fondu d'image chargée | 160 ms | linéaire |
| Toast | entrée 220 ms, sortie 160 ms | — |

- Aucune animation d'entrée de section au défilement. Aucun effet de parallaxe.
- Un seul moment orchestré autorisé : l'écran de fin de parcours (« C'est envoyé », « C'est activé ») avec le dessin `facade.svg` qui apparaît en fondu (360 ms).
- `prefers-reduced-motion` respecté (section 2.2).

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
| `inverse` | blanc | `--lk-blue` 600 | — | sur aplat bleu uniquement (`BrandPanel`, fin de parcours) |

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

**ChipToggle** (atouts, filtres rapides) : hauteur 40 px (36 px dans la barre de filtres mobile), padding 0 12–14 px, 13 px 500, rayon 4. Inactif : fond blanc, bordure 1,5 px `--lk-line`, texte `--lk-ink`. Actif : fond `--lk-blue-tint`, bordure 1,5 px `--lk-blue`, texte `--lk-blue`. `aria-pressed`.

**SegmentedPicker** (DPE A à G, choix du projet) : boutons égaux de 44 px, écart 6 px, rayon 4. Inactif : fond `--lk-stone-2`, texte `--lk-ink-2` 600 14 px. Actif : fond `--lk-blue`, texte blanc. Rôle `radiogroup`.

**RoleCard** (« Je vends » / « J'achète ») : 76 px de haut, 2 colonnes, écart 10 px, rayon 6, padding 0 14 px. Inactive : bordure 1,5 px `--lk-line`. Active : fond `--lk-blue-tint`, bordure 2 px `--lk-blue`, titre en bleu. Titre 14 px 600, sous-titre 12 px `--lk-ink-2`.

**Tabs** : texte 14 px 500 `--lk-ink-3`, actif `--lk-ink` 600 avec soulignement 2 px `--lk-blue` collé au bas. Pas de fond.

**FilterPill** (onglets de statut du back office et du panneau de notifications) : hauteur 34–36 px, padding 0 14 px, 12 px, rayon 4. Actif : fond `--lk-navy` (`--lk-ink` dans les notifications), texte blanc 600. Inactif : fond blanc, bordure 1,5 px `--lk-line`, texte `--lk-ink` 500. Compteur intégré au libellé : « En attente · 3 ».

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

**InfoNote** (« Repris de votre estimation… ») : fond `--lk-blue-tint`, rayon 6, padding 14 × 16, icône 18 px `--lk-blue`, texte 13 px `--lk-navy`.

**PlanCard** (formules)
- Carte blanche, bordure 1,5 px `--lk-line`, rayon 6, padding 16, écart 10.
- Ligne de tête : nom 16 px 600 ; prix 20 px 700 large + « TTC » 11 px `--lk-ink-3`.
- Accroche 13 px `--lk-ink-3` (textes de Cédric, `SPEC-V2` section 11 bis).
- Liste à coches : icône `Check` 16 px `--lk-blue`, 13 px.
- Bouton plein largeur : `secondary` (Accompagné) ou `primary` (Sérénité).
- Formule recommandée : bordure 2 px `--lk-blue`, étiquette « Le plus complet » en pastille bleue 11 px 600 posée à cheval sur le bord haut (−12 px, gauche 16 px). Aucune ombre.
- Formule actuelle : ligne « Formule actuelle » 12 px 600 `--lk-success` avec coche.
- Pied : encart blanc bordure `--lk-line` : cadenas `--lk-success` + « Paiement sécurisé par carte via Stripe… » 12 px `--lk-ink-2`.

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

**AssistantNote** (« Résumé par l'assistant ») : fond `--lk-blue-tint`, rayon 6, padding 16 × 18, icône `Sparkles` 20 px bleu, titre 13 px 600 `--lk-navy`, texte 12 px.

**AssistantFab** (bouton flottant) : en bas à droite à 24 px, hauteur 48, padding 0 18, fond blanc, bordure 1,5 px `--lk-ink`, rayon 4, `shadow-float`, icône `Sparkles` bleue + « Assistant Leenkey » 14 px 600. En mobile : masqué au profit de l'onglet ou du bouton d'en-tête.

### 10.6 Navigation et structure

**TopNav desktop** : hauteur 72, fond blanc, bordure basse `--lk-line`, padding 0 40, écart 32. Logo « Leenkey » 20 px 700 large. Liens 14 px 500 `--lk-ink` (actif `--lk-blue`), écart 24. À droite, écart 6 : « Vendre mon bien » (`primary md` avec `Plus`, marge droite 10) ; cloche (`IconButton tint`, point bleu 9 px bordé de blanc si non lu) ; favoris (`IconButton` transparent) ; avatar 42 px fond `--lk-ink` initiale blanche 14 px 600 (ou « Mon compte » `secondary` si non connecté).

**BottomNav mobile** : fond blanc, bordure haute `--lk-line`, padding 10 × 20 × 22 (zone de sécurité iOS incluse via `env(safe-area-inset-bottom)`), grille de 4. Élément : icône 22 + libellé 11 px, écart 4 ; actif `--lk-blue` 600, inactif `--lk-ink-3` 500. Onglets par rôle : acquéreur « Chercher / Favoris / Messages / Compte » ; vendeur « Ma vente / Dossier / Messages / Compte » ; admin « Annonces / Dossiers / Utilisateurs / Assistant ».

**BrandPanel** : aplat pleine largeur, angles droits. Variantes `blue` (fond `--lk-blue`, titre blanc, secondaire `--lk-on-blue-2`, dessin `facade.svg` à droite à 55 %) et `navy` (fond `--lk-navy`). Hauteur de l'accueil acquéreur : 210 px desktop. Une carte peut chevaucher le bas du panneau (« Reprendre votre dernière recherche ») : carte blanche, bordure `--lk-line`, rayon 6, padding 24 × 26, **pas d'ombre** ; le chevauchement suffit à la détacher.

**AdminShell** : barre latérale 240 px fond `--lk-ink`, padding 24 × 16, écart 24. Logo + « Back office » 11 px blanc 60 %. Liens 42 px, padding 0 12, rayon 4, icône 18 + libellé 14 px 500 blanc 80 % ; actif fond `--lk-blue` blanc 600 ; compteur pastille à droite (blanc sur bleu pour l'actif, `rgba(255,255,255,0.15)` sinon). Bas : carte utilisateur (avatar 34 px bleu, nom 13 px 600, rôle 11 px 60 %). Contenu : fond `--lk-bg`, padding 28 × 32, titre de page 24 px 700 large + sous-titre 13 px `--lk-ink-3`, actions à droite.

**AdminMobileHeader** : fond `--lk-ink`, padding 20 × 20 × 16. « Back office » 11 px 60 % + « Aujourd'hui » 20 px 700 large ; avatar 40 px bleu. Trois tuiles compteurs (grille 3, écart 8, rayon 4, padding 12 × 10) : la première en `--lk-blue`, les autres `rgba(255,255,255,0.1)` ; chiffre 22 px 700 large, libellé 11 px.

### 10.7 Notifications

**NotificationBell** : `IconButton tint` 42 × 42 en desktop (pastille bleue 9 px si non lu), icône `Bell` 20 px. Annonce lecteur d'écran : « Notifications, 3 nouvelles ».

**NotificationPanel** : panneau latéral droit de 420 px (desktop) ou plein écran (mobile), fond blanc, bordure gauche `--lk-line`, ouverture 220 ms depuis la droite, fond de page assombri `rgba(15,30,53,0.4)`.
- En-tête 72 px : bouton fermer rond 40 px (bordure 1,5 px `--lk-ink`), « Notifications » 15 px 600, réglages `Settings` à droite.
- Filtres `FilterPill` : « Toutes », « Mes recherches », « Visites et offres » (acquéreur) ; « Toutes », « Messages », « Offres et visites » (vendeur).
- Groupes « Aujourd'hui », « Cette semaine », « Plus ancien » : 11 px 600 `--lk-ink-3`, casse normale, padding 10 × 16 × 4.
- `NotificationItem` : padding 14 × 16, écart 12, séparateur `--lk-line`. Visuel 40 px (rond pour un événement : fond selon le type ; carré rayon 4 pour une vignette de bien). Titre 13 px 600, détail 12 px `--lk-ink-2`, horodatage 11 px `--lk-ink-3`. Non lue : fond `--lk-blue-tint`, séparateur `--lk-blue-line`, point 8 px `--lk-blue` à droite.
- Pied : « Tout marquer comme lu » `ghost` + « Assistant Leenkey » `outline-ink sm`.
- État vide : `facade.svg` 150 px, titre 20 px 700 large centré, texte 13 px `--lk-ink-2`, bouton `primary` (« Créer une alerte » pour l'acquéreur, « Compléter mon annonce » pour le vendeur).

### 10.8 Retours et états

**EmptyState** : centré, largeur max 360 px, écart 18 : `facade.svg`, titre 20 px 700 large, phrase utile 13–14 px `--lk-ink-2`, une action. Textes : `SPEC-V2` section 6 (« Le ton »).

**Skeleton** : blocs `--lk-stone-2`, rayon identique à l'élément remplacé, pulsation d'opacité 0,6 → 1 en 1,2 s (désactivée en mouvement réduit). Jamais de spinner plein écran.

**Toast** : en bas au centre (mobile, au-dessus de la `BottomNav`) ou en bas à droite (desktop). Fond `--lk-ink`, texte blanc 14 px, rayon 4, padding 12 × 16, action en `--lk-on-blue-2` 600. Durée 5 s, `role="status"`.

**Alert inline** : fond `--lk-warning-bg` / `--lk-danger-bg` / `--lk-blue-tint`, rayon 6, padding 10 × 12, icône 14 px, texte 12–13 px de la couleur `-fg`.

**Dialog / écran de confirmation** : desktop = dialogue centré 520 px, fond blanc, rayon 6, padding 24, titre 20 px 700 large, actions alignées à droite. Mobile = écran plein (pas de modale) avec en-tête retour. Les confirmations à portée juridique (acceptation d'offre) sont **toujours** des écrans pleins, jamais des dialogues (section 13.3).

**EndOfFlow** (« C'est envoyé », « C'est activé ») : `BrandPanel blue` plein écran (mobile) ou 60 % de la hauteur (desktop), `facade.svg`, titre display, texte 15 px `--lk-on-blue-2`, bouton blanc à texte `--lk-blue` 600 (variante `inverse` du bouton, réservée aux aplats bleus).

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
| **G10 Page légale** | texte 15 px / 1,6, largeur 640, titres H2 | idem, centré |

---

## 12. Écrans dessinés : spécification détaillée

Capture de référence entre parenthèses. Les valeurs non citées suivent les composants de la section 10.

### 12.1 Inscription `/inscription` (`Inscription.png`, G5 simplifié)
Fond blanc. En-tête : retour `stone` / « Leenkey » 18 px 700 large / espace 44. Bloc titre (padding 28 × 24 × 0) : H1 « Créez votre compte » 26 px ; « Un seul compte pour vendre votre bien ou pour chercher le vôtre. » 14 px `--lk-ink-3`. `RoleCard` ×2. Champs (écart 14) : Prénom et nom, Email, Téléphone (facultatif), Mot de passe. Case CGU avec liens. « Créer mon compte » `primary lg` plein largeur ; « Déjà un compte ? Se connecter ». Pied collé en bas : cadenas `--lk-success` + « Vos données restent confidentielles. Aucune diffusion à des tiers. » 12 px.

### 12.2 Création du bien, étape 2 `/vendeur/biens/nouveau` (`Bien.png`, G5)
Fond `--lk-bg`. `AppHeader` « Mon bien » + « Enregistrer » + `ProgressBar` « Étape 2 sur 4 · Caractéristiques / 50 % ». `InfoNote` de reprise d'estimation. Type de bien (select). Grille 2 × 2 : Surface (`UnitInput` m²), Pièces, Chambres, Étage. DPE (`SegmentedPicker` A–G). Atouts (`ChipToggle` en flex-wrap, écart 8). `PhotoUploader`. Barre d'actions collée Précédent / Continuer.

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

### 12.14 Planche design system (`Main.png`)
Référence de la page `/design` à construire en `L1-07` : palette, typographie, boutons, champs (dont état d'erreur), statuts, carte de bien. La page `/design` reprend cette planche avec les vrais composants et ajoute tous les composants de la section 10. Elle n'est accessible qu'en local et en préprod.

---

## 13. Écrans non dessinés : règles de construction

### 13.1 Correspondance écran → gabarit

| Écran (`SPEC-V2` plan des écrans) | Gabarit | Composants principaux |
|---|---|---|
| Accueil public `/` | G1 | `BrandPanel blue` hero (titre display 56 px, deux entrées « Je vends » / « J'achète » en `on-dark` blanc et `outline` blanc), 3 `PropertyCard tile` récentes |
| Estimateur `/estimer` | existant, re-stylé : police Archivo, tokens, rayons ; aucune modification de logique | — |
| Pages par ville | V3 | — |
| Connexion, mot de passe oublié | G5 simplifié (comme 12.1) | — |
| Pages légales | G10 | — |
| Fiche du bien (onglets) | G9 + `Tabs` | `KeyFigures` en tête, `Tabs` Infos / Photos / Annonce / Documents / Visites / Offres |
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

### 13.2 Règles générales pour un écran non dessiné

1. Choisir le gabarit dans 13.1, puis composer **uniquement** avec les composants de la section 10. Un nouveau composant = l'ajouter à `/design` et à ce document dans la même PR.
2. Une seule action `primary` visible par écran (deux sur une barre Précédent / Continuer, dont une seule bleue pleine).
3. Photo dès qu'un bien apparaît (vignette minimale 44 × 44).
4. Titres d'écran en H1 large ; titres de section en H3 normal ; pas d'étiquette décorative au-dessus d'un titre, sauf « Pour vous » / « Prochaine action » qui portent une information.
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

**Emails (React Email)** : fond `#F4F4F1`, carte blanche 560 px, rayon 6, bandeau haut 8 px `#1156FC`, logo « Leenkey » texte 20 px 700, titres Archivo avec repli Arial gras (les clients mail ignorent `font-stretch` : prévoir le rendu en Arial), corps 15 px / 1,6 `#0F1E35`, bouton principal `#1156FC` 48 px rayon 4 texte blanc 600, pied 12 px `#5B6474`. Préfixe `[PREPROD]` hors prod.

**PDF de l'offre** (`@react-pdf/renderer`) : A4, marges 20 mm, police Archivo embarquée (fichiers TTF dans `public/fonts/`), titre « OFFRE D'ACHAT LEENKEY » 18 pt 700 (seul texte en majuscules autorisé, car c'est le titre juridique fourni par Cédric), sections numérotées 1 à 7 (séquence réelle du document), corps 10 pt / 1,5, filet bleu 2 pt sous l'en-tête, pied avec référence, version et pagination. Aucun statut de qualification (`SPEC-V2` section 13).

**Image de partage (Open Graph)** `/api/og/[slug]` : 1200 × 630, photo principale à gauche (60 %), bandeau `#1156FC` à droite : prix 64 px 700 large blanc, « Appartement 3 pièces · 68 m² » 28 px, ville 24 px `#F0F4FF`, « Leenkey » 24 px en bas. Image par défaut : `facade.svg` blanc sur bleu + « Leenkey ».

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
- [ ] Police Archivo seule ; titres, prix et chiffres en `text-wide` 700 ; aucun `uppercase`, aucun `tracking-wide`, aucune police mono.
- [ ] Rayons : 4 px contrôles (y compris filtres et puces), 6 px conteneurs, `rounded-full` seulement pour statuts, compteurs, avatars, marqueurs de carte.
- [ ] Aucune ombre sauf `shadow-float` sur un élément flottant.
- [ ] Une seule action `primary` par vue.
- [ ] Chaque bien affiché a sa photo (ou `facade.svg`), jamais un bloc gris.
- [ ] Champs de saisie bordés `--lk-field` ; focus visible.
- [ ] États vide, chargement, erreur présents.
- [ ] Captures 390, 768 et 1280 px jointes, comparées à la maquette PNG correspondante.
- [ ] Contrastes conformes à la section 2.1 ; cibles ≥ 44 px.
- [ ] Textes en casse normale, montants et surfaces formatés (section 3.3), textes client repris mot pour mot.

---

## 17. Écarts connus des maquettes

Les maquettes sont des pages statiques. Ces points ne sont **pas** à reproduire :

| Maquette | Écart | À faire |
|---|---|---|
| `RechercheDesktop` | « Plus de filtres » et « Créer une alerte » passent sur plusieurs lignes | `whitespace-nowrap`, regroupement sous 1280 px (10.3) |
| `AnnonceDesktop` | le contenu dépasse la hauteur de la planche (900 px) | page défilante normale |
| `AccueilDesktop` | titre « Bonjour Thomas » à 30 px | 36 à 44 px selon la place (12.10) |
| `Dashboard` | barre de navigation basse incluse dans la planche | `BottomNav` partagé, collé en bas |
| Toutes | liens internes `#ancre` fictifs | routes de `SPEC-V2` section 3 |
| Toutes | photos encodées dans le HTML | photos servies par `/img` (7.1) |
| `Main` | planche partielle | la page `/design` couvre toute la section 10 |
| `PlanEcrans` (canvas) | ancien style | sans objet : schéma de travail, pas un écran |
| `AccueilDesktop`, `AnnonceDesktop`, `RechercheDesktop` (PNG) | « Estimer mon bien » | « Valoriser mon bien » (règle éditoriale, `CLAUDE.md` section 16 ; corrigé dans les HTML) |
| `Bien` (InfoNote) | « Repris de votre estimation… » | « Repris de votre analyse de valeur du [date]. Vérifiez et complétez. » (SPEC-V2 8.3) |
| `AccueilDesktop` | ligne « Identité vérifiée » du dossier acquéreur | aucune vérification d'identité n'est prévue : libellé en attente de `DECISIONS.md` Q25 |
| `AccueilDesktop` | « Calculer mon budget », « Prix au m² de la zone » dans « Nos services » | fonctions non spécifiées : `DECISIONS.md` Q25 |
