# Leenkey V2 — Refonte visuelle : specs de l'accueil

Version validée : **direction C** (design « vitrine photo » + parcours « vendeur d'abord »), épurée : **aucun fond bleu uni**, le bleu sert d'accent.

Fichiers de référence :
- `maquettes/accueil-ordinateur.html` (1440 px) et `maquettes/accueil-mobile.html` (390 px).
  Format « Design Component » : le balisage HTML et les styles inline sont lisibles ; les données (onglets, annonces, formules…) sont dans `renderVals()` en bas du fichier. **Référence visuelle uniquement, ne pas copier ce format dans le site.**
- `images/` : logo et photos d'exemple (basse résolution, issues de la préprod — à remplacer par les vraies photos des annonces).

---

## 1. Tokens

### Couleurs
| Rôle | Valeur |
|---|---|
| Bleu Leenkey (boutons principaux, onglet actif, icônes, liens) | `#1156FC` |
| Bleu foncé (hover, chiffres clés, texte de badge) | `#0B3FC4` |
| Bleu très clair (pastilles d'icône, encadrés, sélection) | `#EEF3FF` |
| Bleu bordure douce (hover de carte) | `#C9D8FE` |
| Texte principal | `#1C1B19` |
| Texte secondaire | `#5E574D` |
| Texte tertiaire / placeholder | `#6B6459` |
| Désactivé | `#B5ADA2` |
| Fond de page (neutre chaud) | `#FAF8F5` |
| Surface (cartes, header) | `#FFFFFF` |
| Fond sable (pied de page, pistes de barres) | `#F1EDE7` |
| Bordure | `#ECE6DD` |
| Bordure forte (champs, pilules) | `#DDD5CA` |
| Barre « agence » du comparatif | `#CFC7BB` |

Étiquettes DPE (fond, texte `#1C1B19`) : B `#C9E8B0` · C `#E3F0C2` · D `#FBF0A8` · E `#FBDDA6`. Compléter A, F, G avec l'échelle officielle, en gardant un contraste AA.

Règle : **pas de grand aplat bleu.** Le bleu plein est réservé aux boutons principaux, à l'avatar du compte et aux petites pastilles. Les sections mises en avant sont blanches, décorées de formes bleues légères (voir 4.8).

### Typographie
- Police unique : **Archivo** (Google Fonts, variable : `wdth 62..125`, `wght 400..800`).
- Titres : graisse 800, `font-stretch: 110%` à `115%`.
- Échelle :

| Élément | Ordinateur | Mobile |
|---|---|---|
| H1 accueil | 60 px / 1.03 | 34 px / 1.06 |
| H2 grand (simulateur, bandeau final) | 40–44 px / 1.06 | 26–28 px / 1.1 |
| H2 de section | 28 px | 22 px |
| Corps | 16 px / 1.5 | 16 px |
| Petit texte | 14–15 px | 13–14 px |
| Mentions | 13 px | 12 px |

### Arrondis
- Pilules (boutons, champs, filtres, onglets mobiles) : `999px`
- Cartes de bien, raccourcis : `16px`
- Grands blocs (photo hero, carte de recherche, formules, simulateur) : `20–28px`
- Pastilles d'icône : `12–14px` (24 px pour les grandes)

### Ombres
- Carte flottante (recherche) : `0 14px 44px rgba(11,42,122,.20), 0 1px 3px rgba(28,27,25,.08)`
- Champ en pilule : `0 4px 14px rgba(28,27,25,.08)`
- Bouton principal : `0 8px 20px rgba(17,86,252,.30)`
- Carte mise en avant (formule Accompagné) : `0 12px 32px rgba(17,86,252,.12)`
- Bloc blanc posé (simulateur) : `0 12px 40px rgba(28,27,25,.08)`
- Bouton flottant assistant : `0 10px 30px rgba(28,27,25,.28)`

### Mise en page
- Conteneur : `max-width 1280px`, marges latérales 32 px (16 px sur mobile).
- Espacement entre sections : 72–88 px (40–48 px sur mobile).
- Zones tactiles ≥ 44 px partout. Focus visible : `outline: 3px solid #1156FC; outline-offset: 2px`.

---

## 2. Composants

- **Bouton principal** : pilule bleue, texte blanc 700, hauteur 56–64 px, ombre bleue. Un seul par écran.
- **Bouton secondaire** : pilule, contour 1.5 px bleu, texte bleu (ex. « + Publier une annonce » dans le header).
- **Pilule de service / filtre** : fond blanc, bordure `#DDD5CA`, icône bleue, 44–48 px. Sélectionnée : fond `#EEF3FF`, bordure et texte bleus.
- **Bouton rond** : 44–48 px (flèches du carrousel, micro, favori).
- **Onglets** (carte de recherche) : icône + libellé ; actif = texte bleu + soulignement 3 px bleu ; inactif = `#5E574D`. Sur mobile : icône au-dessus du libellé, 3 onglets en largeur égale.
- **Barre de recherche segmentée** (onglet Acheter) : pilule « Où ? | Type de bien | Budget max » + bouton bleu « Rechercher ». Chaque segment ouvre son panneau flottant (à concevoir à l'étape suivante). Dessous : une ligne en langage naturel (icône étincelle bleue, champ, bouton micro rond) : l'assistant IA remplit les filtres.
- **Catégories** : icône 26 px au trait + libellé, soulignement 2 px bleu sur l'actif. Défilement horizontal sur mobile.
- **Carte de bien** : photo arrondie 16 px (ratio ≈ 1/0.95 sur ordinateur, 272 px de large sur mobile), badge blanc en haut à gauche (texte `#0B3FC4`, ex. « Dossier complet », « Nouveau »), cœur favori en haut à droite (zone 44 px), points du carrousel photo en bas, puis titre (Type · pièces · surface) + étiquette DPE, ville, prix souligné en 800.
- **Carrousel d'annonces** : 4 cartes par page sur ordinateur, flèches rondes + compteur « 1 / 3 », flèche grisée en bout de liste ; défilement au doigt avec accroche (`scroll-snap`) sur mobile.
- **Carte raccourci** : blanche, bordure, pastille d'icône `#EEF3FF`, titre, une phrase, lien d'action bleu avec flèche ; au survol, ombre bleue légère et bordure `#C9D8FE`.
- **Carte formule** : blanche ; la formule Accompagné a une bordure bleue, une ombre bleue légère et l'étiquette « Notre recommandation » (`#EEF3FF` / `#0B3FC4`) — libellé à faire valider.
- **Bouton flottant assistant IA** : pilule sombre `#1C1B19`, pastille bleue avec étincelle, « Une question ? L'assistant vous répond » ; collé en bas à droite (`position: sticky`/`fixed`).
- **Barre de navigation mobile** (collée en bas) : Chercher · Favoris · Messages · Compte (acquéreur) ; Ma vente · Dossier · Messages · Compte (vendeur). Actif en bleu.
- **Menu compte** (header) : pilule « icône menu + avatar rond bleu », ouvre un panneau flottant (Mon espace, Messages, Favoris, Alertes, Compte, Déconnexion).

---

## 3. Structure de l'accueil (dans l'ordre)

1. **Header** blanc : logo · Acheter, Vendre, Estimer, Tarifs, Qui sommes-nous ▾ · bouton secondaire « Publier une annonce » · menu compte.
2. **Hero** : grande photo arrondie 28 px (520 px de haut sur ordinateur, 380 px sur mobile), voile sombre léger à gauche `linear-gradient(90deg, rgba(10,24,64,.62) 0%, rgba(10,24,64,.30) 50%, rgba(10,24,64,0) 100%)` (sur mobile : même dégradé à 180deg, de haut en bas). Pastille « Ni agence, ni seul · 0 € de commission », H1 « Leenkey vous donne les clés de votre vente. », sous-titre existant.
3. **Carte de recherche** posée sur le bas de la photo (marge négative ≈ −124 px), onglets **Acheter · Vendre · Estimer mon bien**, **Estimer actif par défaut** :
   - Estimer : champ adresse + « Obtenir mon estimation » + « Gratuit · 2 minutes · Rapport PDF de 4 pages par email ».
   - Vendre : champ adresse + « Publier mon bien gratuitement ».
   - Acheter : barre segmentée + ligne en langage naturel.
4. **Pilules de service** : Estimer votre bien · Déposer une annonce · Carte des prix.
5. **« Que voulez-vous faire ? »** : 4 raccourcis (Estimer mon bien, Vendre mon bien, Être accompagné, Trouver un bien) — grille de 4 sur ordinateur, 2×2 sur mobile.
6. **« Combien vous économisez avec Leenkey »** : section blanche avec formes décoratives. Prix au choix en pilules (250 000 / 340 000 / 450 000 / 600 000 €), barres Agence (hypothèse 5 % du prix, affichée) / Accompagné 990 € / Autonomie 0 €, encadré « Vous économisez environ X € » (= 5 % × prix − 990). Mention : « Comparaison avec la formule Accompagné. Les frais d'agence varient selon les agences et les biens. »
7. **Catégories** + **« Biens à vendre près de chez vous »** (Autour d'Épinay-sur-Orge · 10 km) + carrousel d'annonces + lien « Voir les N biens » (N = nombre réel).
8. **« Trois étapes. Vous gardez les clés du début à la fin. »** : Estimez / Préparez / Signez (textes actuels), pastille d'icône blanche sur fond `#EEF3FF`.
9. **Formules** : Autonomie (Gratuit) · Accompagné (990 € TTC, mise en avant) · Sérénité (1 500 € TTC) + lien vers /tarifs.
10. **FAQ** : les 3 questions actuelles, en accordéon, bouton « + » rond `#EEF3FF`.
11. **Bandeau final** blanc avec formes : « Prêt à garder les clés de votre vente ? » + bouton bleu « Obtenir mon estimation ».
12. **Pied de page** sable `#F1EDE7` (liens et mentions légales actuels).
13. **Bouton assistant** flottant ; sur mobile, barre de navigation en bas.

---

## 4. Règles

1. **Mobile d'abord** : construire en 390 px, puis élargir.
2. **Accessibilité** : contrastes AA, zones tactiles ≥ 44 px, focus visible, vrais `<button>`, `<a>`, `<label>`, `aria-label` sur les boutons-icônes, `role="tablist"`/`tab` sur les onglets.
3. **Textes** : garder les textes actuels du site quand ils existent. Ne jamais écrire « financement validé » ni « peut financer ».
4. **Ne rien inventer** : pas d'avis, de notes ni de statistiques fictives. Les badges (« Dossier complet », « Nouveau ») viennent des vraies données de l'annonce. Le nombre de biens est calculé.
5. **Aucune étape bloquée** pour un vendeur gratuit : les options payantes se montrent (« Inclus en Accompagné ») mais ne verrouillent rien. Jamais « Débloquer », jamais de fenêtre bloquante.
6. **Icônes** : au trait, 1.6–1.8 px, cohérentes (utiliser la librairie d'icônes déjà présente dans le repo si elle existe, ex. lucide). Pas d'emoji.
7. **Formes décoratives** (simulateur et bandeau final) : un halo `radial-gradient(circle, rgba(17,86,252,.10), transparent 70%)`, un anneau `2px solid rgba(17,86,252,.14)`, un point `rgba(17,86,252,.30)`, placés derrière le contenu (`isolation: isolate` sur la section, `z-index: -1` sur les formes), animés par un flottement vertical lent (10–13 s, ±12–16 px), **désactivé avec `prefers-reduced-motion: reduce`**.
8. **Pas de régression** : ne pas casser les parcours existants (estimateur, connexion, espace vendeur) ; l'accueil réutilise les routes actuelles.
