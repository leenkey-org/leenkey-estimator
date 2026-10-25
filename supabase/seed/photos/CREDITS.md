# Photos des biens de démonstration

Photos du seed (local et préprod uniquement : `db:seed` refuse la production), déposées par `scripts/seed-photos.mjs` d'après `photos.json`, connecté avec le compte de seed du propriétaire (jamais la clé de service), seulement sur les biens sans photo que leur propriétaire peut encore modifier (ni supprimés, ni vendus, ni suspendus) : recadrées sans descendre sous le minimum de 800 × 600 des vendeurs, puis converties en WebP de 400, 800 et 1 600 px comme une photo envoyée par un vendeur (L1-12).

| Fichier | Bien du seed | Provenance |
|---|---|---|
| `08-sainte-genevieve-des-bois.webp` | n° 8, maison récente 6 pièces, Sainte-Geneviève-des-Bois | Fournie par Younes le 2026-10-20, droits confirmés |
| `02-epinay-sur-orge.webp` | n° 2, maison familiale 5 pièces, Épinay-sur-Orge | Fournie par Younes le 2026-10-20, droits confirmés |
| `14-la-ville-du-bois.webp` | n° 14, maison 4 pièces, La Ville-du-Bois | Fournie par Younes le 2026-10-20, droits confirmés |

Younes a confirmé ses droits sur ces photos le 2026-10-20 (`docs/DECISIONS.md` Q57) : ce sont des photos d'illustration, pas des photos d'annonces réelles. Provenance à préciser (source, outil et licence s'il s'agit d'images générées) ; la licence doit couvrir l'usage par SAS LEENKEY. Une photo ne sert qu'à un seul bien (`docs/DESIGN.md` 7.2).

La photo du haut de l'accueil (`public/images/accueil/`) vient du même envoi, droits confirmés (`leenkey/site/photos.ts`, `rights: "cleared"`).

## Photos Unsplash (L1-46b, 2026-10-25)

Photos libres de droits sous la [licence Unsplash](https://unsplash.com/license) : usage commercial permis, sans autorisation ni mention obligatoire ; interdit de les revendre telles quelles ou d'en faire un service concurrent. Choisies par Claude Code pour les treize biens du seed qui n'avaient pas de photo (`docs/DECISIONS.md` 2026-10-25), regardées une à une, une seule par bien. La recherche d'Unsplash étant fermée aux robots, chaque photo est citée par son adresse sur `images.unsplash.com`, d'où elle a été téléchargée en 1 600 px ; l'auteur n'est pas relevé (la licence ne le demande pas). Ce sont des photos d'illustration de biens fictifs, chargées en local et en préprod seulement.

| Fichier | Bien du seed | Provenance |
|---|---|---|
| `01-savigny-sur-orge-facade-de-la-residence.webp` | n° 1, façade de la résidence | Unsplash, [photo-1574362848149-11496d93a7c7](https://images.unsplash.com/photo-1574362848149-11496d93a7c7), licence Unsplash |
| `01-savigny-sur-orge-sejour.webp` | n° 1, séjour | Unsplash, [photo-1493809842364-78817add7ffb](https://images.unsplash.com/photo-1493809842364-78817add7ffb), licence Unsplash |
| `01-savigny-sur-orge-cuisine.webp` | n° 1, cuisine | Unsplash, [photo-1556911220-bff31c812dba](https://images.unsplash.com/photo-1556911220-bff31c812dba), licence Unsplash |
| `01-savigny-sur-orge-chambre.webp` | n° 1, chambre | Unsplash, [photo-1595526114035-0d45ed16cfbf](https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf), licence Unsplash |
| `01-savigny-sur-orge-salle-de-bains.webp` | n° 1, salle de bains | Unsplash, [photo-1552321554-5fefe8c9ef14](https://images.unsplash.com/photo-1552321554-5fefe8c9ef14), licence Unsplash |
| `03-morsang-sur-orge-sejour.webp` | n° 3, séjour | Unsplash, [photo-1502672260266-1c1ef2d93688](https://images.unsplash.com/photo-1502672260266-1c1ef2d93688), licence Unsplash |
| `03-morsang-sur-orge-salle-d-eau-refaite.webp` | n° 3, salle d'eau refaite | Unsplash, [photo-1584622650111-993a426fbf0a](https://images.unsplash.com/photo-1584622650111-993a426fbf0a), licence Unsplash |
| `04-montlhery-terrain.webp` | n° 4, terrain | Unsplash, [photo-1502082553048-f009c37129b9](https://images.unsplash.com/photo-1502082553048-f009c37129b9), licence Unsplash |
| `05-juvisy-sur-orge-sejour-et-vue-degagee.webp` | n° 5, séjour et vue dégagée | Unsplash, [photo-1560448204-e02f11c3d0e2](https://images.unsplash.com/photo-1560448204-e02f11c3d0e2), licence Unsplash |
| `05-juvisy-sur-orge-cuisine-ouverte.webp` | n° 5, cuisine ouverte | Unsplash, [photo-1556912173-3bb406ef7e77](https://images.unsplash.com/photo-1556912173-3bb406ef7e77), licence Unsplash |
| `05-juvisy-sur-orge-chambre.webp` | n° 5, chambre | Unsplash, [photo-1540518614846-7eded433c457](https://images.unsplash.com/photo-1540518614846-7eded433c457), licence Unsplash |
| `06-villiers-sur-orge-facade-et-jardin.webp` | n° 6, façade et jardin | Unsplash, [photo-1572120360610-d971b9d7767c](https://images.unsplash.com/photo-1572120360610-d971b9d7767c), licence Unsplash |
| `06-villiers-sur-orge-chambre.webp` | n° 6, chambre | Unsplash, [photo-1560185893-a55cbc8c57e8](https://images.unsplash.com/photo-1560185893-a55cbc8c57e8), licence Unsplash |
| `07-longjumeau-sejour.webp` | n° 7, séjour | Unsplash, [photo-1583847268964-b28dc8f51f92](https://images.unsplash.com/photo-1583847268964-b28dc8f51f92), licence Unsplash |
| `09-viry-chatillon-facade-de-la-residence.webp` | n° 9, façade de la résidence | Unsplash, [photo-1545324418-cc1a3fa10c00](https://images.unsplash.com/photo-1545324418-cc1a3fa10c00), licence Unsplash |
| `09-viry-chatillon-sejour.webp` | n° 9, séjour | Unsplash, [photo-1554995207-c18c203602cb](https://images.unsplash.com/photo-1554995207-c18c203602cb), licence Unsplash |
| `09-viry-chatillon-cuisine.webp` | n° 9, cuisine | Unsplash, [photo-1565538810643-b5bdb714032a](https://images.unsplash.com/photo-1565538810643-b5bdb714032a), licence Unsplash |
| `10-morangis-facade-et-jardin.webp` | n° 10, façade et jardin | Unsplash, [photo-1475855581690-80accde3ae2b](https://images.unsplash.com/photo-1475855581690-80accde3ae2b), licence Unsplash |
| `10-morangis-sejour.webp` | n° 10, séjour | Unsplash, [photo-1600121848594-d8644e57abab](https://images.unsplash.com/photo-1600121848594-d8644e57abab), licence Unsplash |
| `11-chilly-mazarin-facade-de-la-residence.webp` | n° 11, façade de la résidence | Unsplash, [photo-1515263487990-61b07816b324](https://images.unsplash.com/photo-1515263487990-61b07816b324), licence Unsplash |
| `11-chilly-mazarin-sejour.webp` | n° 11, séjour | Unsplash, [photo-1567767292278-a4f21aa2d36e](https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e), licence Unsplash |
| `11-chilly-mazarin-cuisine-ouverte.webp` | n° 11, cuisine ouverte | Unsplash, [photo-1484154218962-a197022b5858](https://images.unsplash.com/photo-1484154218962-a197022b5858), licence Unsplash |
| `12-athis-mons-sejour-et-cuisine-ouverte.webp` | n° 12, séjour et cuisine ouverte | Unsplash, [photo-1522708323590-d24dbb6b0267](https://images.unsplash.com/photo-1522708323590-d24dbb6b0267), licence Unsplash |
| `13-ballainvilliers-double-sejour.webp` | n° 13, double séjour | Unsplash, [photo-1560185007-cde436f6a4d0](https://images.unsplash.com/photo-1560185007-cde436f6a4d0), licence Unsplash |
| `13-ballainvilliers-salle-a-manger.webp` | n° 13, salle à manger | Unsplash, [photo-1617806118233-18e1de247200](https://images.unsplash.com/photo-1617806118233-18e1de247200), licence Unsplash |
| `13-ballainvilliers-salon.webp` | n° 13, salon | Unsplash, [photo-1505691938895-1758d7feb511](https://images.unsplash.com/photo-1505691938895-1758d7feb511), licence Unsplash |
| `15-villemoisson-sur-orge-sejour.webp` | n° 15, séjour | Unsplash, [photo-1586023492125-27b2c045efd7](https://images.unsplash.com/photo-1586023492125-27b2c045efd7), licence Unsplash |
| `16-grigny-facade-de-la-residence.webp` | n° 16, façade de la résidence | Unsplash, [photo-1460317442991-0ec209397118](https://images.unsplash.com/photo-1460317442991-0ec209397118), licence Unsplash |
