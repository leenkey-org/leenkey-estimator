# Leenkey V2 — Refonte visuelle : specs de l'accueil (version D)

Version validée : **D**, c'est-à-dire la charte du moodboard Leenkey (nuit, bleu → violet, Sora, dégradés) appliquée à la mise en page « combinée » : grand bandeau nuit, carte de recherche à cheval sur le bas du bandeau, parcours vendeur d'abord.

Fichiers de référence :
- `maquettes/accueil-ordinateur.html` (1440 px) et `maquettes/accueil-mobile.html` (390 px).
  Format « Design Component » : le balisage HTML et les styles inline sont lisibles ; les données (onglets, annonces, formules…) sont dans `renderVals()` en bas du fichier. Les images y sont référencées en `/_blob/…` : voir `images/` pour les fichiers. **Référence visuelle uniquement, ne pas copier ce format dans le site.**
- `images/` :
  - `logo-clair.png` (fond clair) et `logo-sur-fond-sombre.png` : découpés du moodboard, **basse résolution → utiliser les SVG officiels du logo**.
  - `hero-sejour.jpg` : photo du bandeau (issue du moodboard, basse résolution → à remplacer par la photo HD).
  - `p-*.jpg`, `t-*.jpg` : photos des annonces de démo (préprod). Dans le site, les vraies photos des annonces.

---

## 1. Tokens

### Couleurs (charte)
| Rôle | Valeur |
|---|---|
| Nuit (fond du bandeau, bandeau final) | `#020D21` |
| Encre (texte principal, bouton flottant) | `#0F172A` |
| Indigo profond | `#1E1B4B` |
| Bleu charte | `#3B82F6` |
| Violet charte | `#8B5CF6` |
| Bordures | `#E2E8F0` |
| Fond de page | `#F8FAFC` |
| Surface | `#FFFFFF` |

### Couleurs fonctionnelles (accessibilité AA)
| Rôle | Valeur |
|---|---|
| Bleu « texte » (liens, boutons à texte blanc) | `#2563EB` (hover `#1D4ED8`) |
| Violet « texte » (fin du dégradé des boutons) | `#7C3AED` |
| Indigo accent (petits textes colorés, étiquettes) | `#4338CA` |
| Fond d'étiquette clair | `#EEF2FF` |
| Texte secondaire | `#475569` |
| Texte tertiaire / placeholder | `#64748B` |
| Texte sur fond nuit (sous-titres) | `#CBD5E1` / `#E2E8F0` |
| Bordure de champ | `#CBD5E1` |
| Désactivé | `#94A3B8` |
| Succès (coche) | `#059669` |

**Pourquoi deux bleus/violets** : du texte blanc sur `#3B82F6` ou `#8B5CF6` ne passe pas AA. Tout bouton ou badge portant du texte utilise donc le dégradé `#2563EB → #7C3AED`. Les couleurs charte `#3B82F6 → #8B5CF6` servent aux titres en dégradé, halos, orbes, barres, avatar.

Étiquettes DPE (fond, texte `#0F172A`) : B `#C9E8B0` · C `#E3F0C2` · D `#FBF0A8` · E `#FBDDA6`. Compléter A, F, G avec l'échelle officielle, contraste AA.

### Dégradés
- **Bouton / badge / pilule sélectionnée** : `linear-gradient(90deg, #2563EB, #7C3AED)`, texte blanc 600.
- **Texte en dégradé sur fond clair** : `linear-gradient(90deg, #2563EB, #7C3AED)` + `background-clip: text; color: transparent`.
- **Texte en dégradé sur fond nuit** : `linear-gradient(90deg, #60A5FA, #A78BFA)` (plus clair, lisible).
- **Pastilles décoratives / avatar / orbes** : `linear-gradient(135deg, #3B82F6, #8B5CF6)`.
- **Fond de pastille d'icône** : `linear-gradient(135deg, rgba(59,130,246,.12), rgba(139,92,246,.14))`.
- **Icônes au trait en dégradé** : un `<linearGradient>` SVG `#2563EB → #7C3AED` réutilisé en `stroke="url(#…)"` (ou équivalent dans la librairie d'icônes).
- **Contour dégradé** (formule Accompagné) : `border: 2px solid transparent; background: linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#3B82F6,#8B5CF6) border-box`.

### Effets du moodboard
- **Halos** sur fond nuit : `radial-gradient(circle, rgba(59,130,246,.30), transparent 65%)` (bleu, en bas à gauche) et `radial-gradient(circle, rgba(139,92,246,.20), transparent 65%)` (violet, en haut), très grands (500–850 px), pulsation d'opacité lente (8 s).
- **Trame de points** : `background-image: radial-gradient(rgba(255,255,255,.55) 1.3px, transparent 1.6px); background-size: 18px 18px` (version bleue `rgba(59,130,246,.45)` sur fond clair).
- **Orbe** : disque `linear-gradient(135deg,#3B82F6,#8B5CF6)`, en grand flouté (`opacity .14; filter: blur(30px)`) ou en petit plein (46 px, `opacity .85`), flottement lent.
- **Vague** : la photo du bandeau est découpée à gauche par une courbe (SVG `path d="M0 0 H100 C58 16 26 38 40 60 C52 80 34 93 0 100 Z"` en `#020D21`, `preserveAspectRatio="none"`, 240 px de large). Sur mobile : coin haut-gauche arrondi à 130 px.
- **Animations** : flottement 10–13 s (±12–16 px), pulsation des halos 8 s, légère montée des boutons au survol. **Tout est coupé avec `prefers-reduced-motion: reduce`.**

### Typographie
- Police unique : **Sora** (Google Fonts, 400 à 800).
- Titres 700, `letter-spacing: -0.02em` à `-0.03em`. Corps 400–500, interligne 1.55.

| Élément | Ordinateur | Mobile |
|---|---|---|
| H1 accueil | 52 px / 1.08 | 34 px / 1.1 |
| H2 grand (simulateur, bandeau final) | 40–42 px / 1.1 | 25–26 px / 1.15 |
| H2 de section | 28 px | 21 px |
| Corps | 16 px | 15–16 px |
| Petit texte | 13–15 px | 12–14 px |

### Arrondis, ombres, mise en page
- Pilules `999px` · cartes de bien 18 px · raccourcis/étapes 18–20 px · grands blocs (carte de recherche, formules, simulateur, bandeau final) 22–28 px · pastilles d'icône 12–14 px.
- Ombres : carte de recherche `0 20px 50px rgba(15,23,42,.18), 0 1px 3px rgba(15,23,42,.08)` · bouton dégradé `0 10px 24px rgba(79,70,229,.32)` · formule mise en avant `0 18px 44px rgba(79,70,229,.16)` · bloc simulateur `0 20px 50px rgba(15,23,42,.08)` · carte « Exemple » `0 24px 50px rgba(2,13,33,.35)` · bouton assistant `0 12px 32px rgba(15,23,42,.30)`.
- Conteneur 1280 px (bandeau : 1376 px), marges 32 px (16 px mobile). Sections espacées de 64–88 px (36–44 px mobile).
- Zones tactiles ≥ 44 px. Focus visible : `outline: 3px solid #3B82F6; outline-offset: 2px`.

---

## 2. Composants

- **Bouton principal** : pilule en dégradé bouton, texte blanc 600, 54–62 px, flèche à droite, ombre violette. Un seul par écran.
- **Bouton secondaire sur fond nuit** : pilule `border: 1px solid rgba(255,255,255,.35); background: rgba(2,13,33,.55)`, texte blanc (« + Publier une annonce », menu compte).
- **Pilule de service** : fond blanc, bordure `#E2E8F0`, icône au trait dégradé.
- **Pilule de choix** (prix du simulateur) : blanche bordure `#CBD5E1` ; sélectionnée = dégradé bouton, texte blanc.
- **Onglets** de la carte de recherche : actif = texte `#0F172A`, icône dégradée, soulignement 3 px `#4F46E5` ; inactif = `#64748B`.
- **Barre de recherche segmentée** (Acheter) : « Où ? | Type de bien | Budget max » + bouton dégradé « Rechercher » ; dessous, ligne en langage naturel (étincelle dégradée, champ, micro rond). Chaque segment ouvrira un panneau flottant (étape suivante).
- **Catégories** : icône 26 px au trait (dégradée si active) + libellé, soulignement `#4F46E5`.
- **Carte de bien** : photo arrondie 18 px, badge dégradé en haut à gauche (« Dossier complet », « Nouveau »), cœur en haut à droite (zone 44 px), points du carrousel, titre + DPE, ville, prix 700.
- **Carrousel** : 4 cartes par page, flèches rondes 44 px + compteur « 1 / 3 » (flèche grisée `#94A3B8` en bout) ; mobile : défilement au doigt avec `scroll-snap`.
- **Carte raccourci** : blanche, bordure, pastille d'icône à fond dégradé léger, lien d'action `#2563EB` ; survol : ombre bleue légère, bordure `#C7D2FE`.
- **Étape** : numéro dans un carré dégradé, étiquette `#EEF2FF`/`#4338CA`, icône dégradée.
- **Formule** : blanche ; Accompagné avec contour dégradé + étiquette dégradée « Notre recommandation » (libellé à valider).
- **Carte « Exemple »** (ordinateur, sur la photo) : blanche, badge dégradé « Exemple », valeur 26 px 700, coche verte « Analyse gratuite en 2 minutes ». Contenu repris du site actuel, toujours étiqueté « Exemple ».
- **Bouton flottant assistant IA** : pilule `#0F172A`, pastille ronde dégradée avec étincelle, « Une question ? L'assistant vous répond ».
- **Barre de navigation mobile** : Chercher · Favoris · Messages · Compte (acquéreur) / Ma vente · Dossier · Messages · Compte (vendeur) ; actif = texte `#0F172A` + icône dégradée.

---

## 3. Structure de l'accueil

1. **Bandeau nuit pleine largeur** (`#020D21`) avec halos, photo `hero-sejour` à droite (46 % de la largeur) découpée par la vague, trame de points. Contient :
   - **l'en-tête** : logo sur fond sombre · Acheter, Vendre, Estimer, Tarifs, Qui sommes-nous ▾ (blanc) · « + Publier une annonce » · menu compte ;
   - pastille « Ni agence, ni seul · 0 € de commission » ;
   - H1 « Vendez votre bien autrement. » + ligne en dégradé « Moins de frais, plus de contrôle. » ;
   - sous-titre « Leenkey vous donne les outils et l'accompagnement pour vendre votre bien en toute simplicité, sans agence et à votre rythme. » ;
   - (ordinateur) carte « Exemple » d'estimation posée sur la photo, en haut à droite ;
   - (mobile) la photo passe sous le texte, coin haut-gauche arrondi 130 px ;
   - marge basse ≈ 170 px (≈ 104 px mobile) pour accueillir la carte de recherche.
2. **Carte de recherche à cheval** sur le bas du bandeau (marge négative ≈ −112 px ; −84 px mobile), max 960 px, onglets **Acheter · Vendre · Estimer mon bien**, **Estimer actif par défaut** :
   - Estimer : champ adresse + « Estimer mon bien gratuitement » + « Gratuit · 2 minutes · Rapport PDF de 4 pages par email » ;
   - Vendre : champ adresse + « Publier mon bien gratuitement » ;
   - Acheter : barre segmentée + ligne en langage naturel.
3. **Pilules de service** : Estimer votre bien · Déposer une annonce · Carte des prix.
4. **« Que voulez-vous faire ? »** : 4 raccourcis (Estimer, Vendre, Être accompagné, Trouver un bien).
5. **« Combien vous économisez avec Leenkey »** : section blanche, orbes et trame. Prix en pilules (250 000 / 340 000 / 450 000 / 600 000 €), barres Agence (hypothèse 5 %, affichée) / Accompagné 990 € (barre dégradée) / Autonomie 0 €, encadré « Vous économisez environ X € » (= 5 % × prix − 990), chiffre en dégradé, mention sur la variabilité des frais d'agence.
6. **Catégories** + **« Biens à vendre près de chez vous »** (Autour d'Épinay-sur-Orge · 10 km) + carrousel + « Voir les N biens » (N réel).
7. **« Trois étapes. Vous gardez les clés du début à la fin. »** : Estimez / Préparez / Signez (textes actuels).
8. **Formules** : Autonomie (Gratuit) · Accompagné (990 € TTC, mise en avant) · Sérénité (1 500 € TTC) + lien /tarifs.
9. **FAQ** : les 3 questions actuelles, en accordéon.
10. **Bandeau final** : carte nuit arrondie 28 px avec halos et trame, « Prêt à garder **les clés de votre vente** ? » (dégradé), bouton « Estimer mon bien gratuitement ».
11. **Pied de page** blanc : logo clair, liens, mentions légales actuelles.
12. **Bouton assistant** flottant ; sur mobile, barre de navigation collée en bas.

---

## 4. Règles

1. **Mobile d'abord** : 390 px, puis 1440 px.
2. **Accessibilité** : contrastes AA (voir couleurs fonctionnelles), zones tactiles ≥ 44 px, focus visible, vrais `<button>` / `<a>` / `<label>`, `aria-label` sur les boutons-icônes, `role="tablist"`/`tab`, éléments décoratifs en `aria-hidden`.
3. **Textes** : garder ceux du site et de la charte. Jamais « financement validé » ni « peut financer ».
4. **Ne rien inventer** : pas d'avis, de notes ni de chiffres non sourcés (ne pas reprendre « Jusqu'à 70 % d'économies » ni « 100 % sécurisé » du moodboard sans justification). Badges et nombre de biens issus des vraies données.
5. **Aucune étape bloquée** pour un vendeur gratuit : options payantes visibles (« Inclus en Accompagné ») mais jamais verrouillées ; jamais « Débloquer », jamais de fenêtre bloquante.
6. **Icônes** : au trait 1.6–1.9 px, librairie du repo si elle existe (ex. lucide). Pas d'emoji.
7. **Animations** décoratives seulement, toutes coupées sous `prefers-reduced-motion: reduce`.
8. **Pas de régression** sur les parcours existants (estimateur, connexion, espace vendeur).
