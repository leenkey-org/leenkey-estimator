# Photos des biens de démonstration

Photos du seed (local et préprod uniquement : `db:seed` refuse la production), déposées par `scripts/seed-photos.mjs` d'après `photos.json`, connecté avec le compte de seed du propriétaire (jamais la clé de service), seulement sur les biens sans photo : recadrées sans descendre sous le minimum de 800 × 600 des vendeurs, puis converties en WebP de 400, 800 et 1 600 px comme une photo envoyée par un vendeur (L1-12).

| Fichier | Bien du seed | Provenance |
|---|---|---|
| `08-sainte-genevieve-des-bois.webp` | n° 8, maison récente 6 pièces, Sainte-Geneviève-des-Bois | Fournie par Younes le 2026-10-20, droits confirmés |
| `02-epinay-sur-orge.webp` | n° 2, maison familiale 5 pièces, Épinay-sur-Orge | Fournie par Younes le 2026-10-20, droits confirmés |
| `14-la-ville-du-bois.webp` | n° 14, maison 4 pièces, La Ville-du-Bois | Fournie par Younes le 2026-10-20, droits confirmés |

Younes a confirmé ses droits sur ces photos le 2026-10-20 (`docs/DECISIONS.md` Q57) : ce sont des photos d'illustration, pas des photos d'annonces réelles. Provenance à préciser (source, outil et licence s'il s'agit d'images générées) ; la licence doit couvrir l'usage par SAS LEENKEY. Une photo ne sert qu'à un seul bien (`docs/DESIGN.md` 7.2).

La photo du haut de l'accueil (`public/images/accueil/`) vient du même envoi, droits confirmés (`leenkey/site/photos.ts`, `rights: "cleared"`).
